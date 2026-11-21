import { afterAll, describe, expect, it } from 'vitest';
import { createDatabase, type QueryExecutor } from '../src/db/connection';
import { CollectionRepository } from '../src/modules/collections/collections.repository';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { manualTotals, periodServiceId, seedReading, seedService, transaction } from './repositories-period-test.repository';

/**
 * #349 (RF14, RNF03, critério BD04): fixa no PostgreSQL de verdade o recorte de período de `rankByPeriod`,
 * `compareByIds` e `findSeries` contra totais escritos à mão, e prova que o intervalo é `[from, to)`.
 */
const url = process.env.REPOSITORY_TEST_DATABASE_URL;

describe.skipIf(!url)('totais por período em PostgreSQL descartável (#349)', () => {
  const db = createDatabase(url ?? 'postgresql://localhost/test');
  afterAll(() => db.close());

  const dayOne = new Date('2026-06-01T00:00:00Z');
  const dayTwo = new Date('2026-06-02T00:00:00Z');
  const dayThree = new Date('2026-06-03T00:00:00Z');
  const oneSecondBefore = new Date(dayOne.getTime() - 1000);
  const oneSecondBeforeTo = new Date(dayThree.getTime() - 1000);

  // Valores fixados para a conta fechar na mão em `[dayOne, dayThree)`: 0,4 + 0,6 + 0,05 = 1,05 kWh e 40 + 60 + 5 = 105 g.
  const reportId = periodServiceId();
  const billingId = (BigInt(reportId) + 1n).toString();
  const ids = [reportId, billingId];

  interface Period {
    tx: QueryExecutor;
    services: ServiceRepository;
    collections: CollectionRepository;
  }

  const seedPeriod = async (tx: QueryExecutor): Promise<void> => {
    await seedService(tx, reportId, 'Relatórios');
    await seedService(tx, billingId, 'Cobrança');
    // Relatórios: um dia inteiro, uma coleta `indisponivel` (tem energia, não tem CO₂e) e a virada exata de `to`.
    await seedReading(tx, { serviceId: reportId, collectedAt: dayOne, calculationStatus: 'disponivel', energyKwh: '0.4', co2eGrams: '40' });
    await seedReading(tx, { serviceId: reportId, collectedAt: dayOne, calculationStatus: 'indisponivel', energyKwh: '5', co2eGrams: null });
    await seedReading(tx, { serviceId: reportId, collectedAt: dayTwo, calculationStatus: 'disponivel', energyKwh: '0.6', co2eGrams: '60' });
    await seedReading(tx, { serviceId: reportId, collectedAt: oneSecondBeforeTo, calculationStatus: 'disponivel', energyKwh: '0.05', co2eGrams: '5' });
    await seedReading(tx, { serviceId: reportId, collectedAt: dayThree, calculationStatus: 'disponivel', energyKwh: '9.9', co2eGrams: '990' });
    // Cobrança: exatamente em `from` (entra, o intervalo é fechado à esquerda) e um segundo antes de `from` (fica fora).
    await seedReading(tx, { serviceId: billingId, collectedAt: dayOne, calculationStatus: 'disponivel', energyKwh: '0.1', co2eGrams: '10' });
    await seedReading(tx, { serviceId: billingId, collectedAt: dayTwo, calculationStatus: 'disponivel', energyKwh: '0.2', co2eGrams: '20' });
    await seedReading(tx, { serviceId: billingId, collectedAt: oneSecondBefore, calculationStatus: 'disponivel', energyKwh: '7', co2eGrams: '700' });
  };

  /**
   * Mesmo padrão de `regions-summary.test.ts`: seed, repositories e oráculo na mesma conexão, dentro de uma transação
   * desfeita no `finally`. Nada é commitado, então `repositories.integration.test.ts` — que compara a tabela `services`
   * inteira — não vê estes dois serviços, e não há corrida entre os arquivos nem linha sobrando no banco.
   */
  const withPeriod = <T>(work: (period: Period) => Promise<T>): Promise<T> => db.withClient(async tx => {
    await transaction(tx, true);
    try {
      await seedPeriod(tx);
      return await work({ tx, services: new ServiceRepository(tx), collections: new CollectionRepository(tx) });
    } finally {
      await transaction(tx, false);
    }
  });

  const ranking = async (services: ServiceRepository, from: Date, to: Date) => {
    const rows = (await services.rankByPeriod('energy', from, to)).filter(row => ids.includes(row.id));
    return new Map(rows.map(row => [row.id, row]));
  };
  /** Total ausente não pode virar 0: se o repository devolver NULL onde o teste espera valor, o teste falha aqui. */
  const num = (value: string | null | undefined): number => {
    if (value === null || value === undefined) throw new Error('esperado um total no período, veio NULL');
    return Number(value);
  };

  it('ranqueia o período com os totais do SUM escrito no teste', () => withPeriod(async ({ tx, services }) => {
    const ranked = await ranking(services, dayOne, dayThree);
    const report = ranked.get(reportId);
    const billing = ranked.get(billingId);

    // A coleta `indisponivel` tem 5 kWh gravados e não entra: sem o FILTER de `disponivel`, a energia seria 6,05 kWh.
    expect(num(report?.energy_kwh)).toBeCloseTo(1.05, 10);
    expect(num(report?.co2e_grams)).toBeCloseTo(105, 10);
    expect(num(billing?.energy_kwh)).toBeCloseTo(0.3, 10);
    expect(num(billing?.co2e_grams)).toBeCloseTo(30, 10);
    expect(report).toMatchObject({ collections: '4', failed: '0', not_calculated: '1' });
    expect(billing).toMatchObject({ collections: '2', failed: '0', not_calculated: '0' });

    const expected = await manualTotals(tx, ids, dayOne, dayThree);
    expect(expected).toHaveLength(2);
    for (const row of expected) {
      const actual = ranked.get(row.id);
      expect(num(actual?.energy_kwh)).toBeCloseTo(num(row.energy_kwh), 10);
      expect(num(actual?.co2e_grams)).toBeCloseTo(num(row.co2e_grams), 10);
      expect(actual?.collections).toBe(row.collections);
    }
    // Ordenação de RF14: maior energia primeiro, os dois serviços do teste em ordem estável pelo nome.
    expect([...ranked.keys()]).toEqual([reportId, billingId]);
  }));

  it('muda os totais ao trocar a janela e os dois dias somam o período sem contar coleta duas vezes', () => withPeriod(async ({ tx, services }) => {
    const full = await ranking(services, dayOne, dayThree);
    const firstDay = await ranking(services, dayOne, dayTwo);
    const secondDay = await ranking(services, dayTwo, dayThree);

    expect([num(firstDay.get(reportId)?.energy_kwh), num(secondDay.get(reportId)?.energy_kwh), num(full.get(reportId)?.energy_kwh)])
      .toEqual([0.4, 0.65, 1.05]);
    expect([num(firstDay.get(reportId)?.co2e_grams), num(secondDay.get(reportId)?.co2e_grams), num(full.get(reportId)?.co2e_grams)])
      .toEqual([40, 65, 105]);
    expect([num(firstDay.get(billingId)?.energy_kwh), num(secondDay.get(billingId)?.energy_kwh), num(full.get(billingId)?.energy_kwh)])
      .toEqual([0.1, 0.2, 0.3]);
    expect(num(firstDay.get(reportId)?.energy_kwh) + num(secondDay.get(reportId)?.energy_kwh))
      .toBeCloseTo(num(full.get(reportId)?.energy_kwh), 10);

    const firstExpected = await manualTotals(tx, ids, dayOne, dayTwo);
    expect(firstExpected.map(row => [row.id, num(row.energy_kwh)])).toEqual(expect.arrayContaining([[reportId, 0.4], [billingId, 0.1]]));
    expect(firstDay.get(billingId)?.collections).toBe('1');
    expect(secondDay.get(billingId)?.collections).toBe('1');
  }));

  it('deixa de fora a coleta gravada exatamente em `to`', () => withPeriod(async ({ services }) => {
    const closed = await ranking(services, dayOne, dayThree);
    const opened = await ranking(services, dayOne, new Date(dayThree.getTime() + 1));
    expect(num(closed.get(reportId)?.energy_kwh)).toBeCloseTo(1.05, 10);
    expect(closed.get(reportId)?.collections).toBe('4');
    expect(num(opened.get(reportId)?.energy_kwh)).toBeCloseTo(10.95, 10);
    expect(num(opened.get(reportId)?.co2e_grams)).toBeCloseTo(1095, 10);
    expect(opened.get(reportId)?.collections).toBe('5');
  }));

  it('compara os mesmos serviços com os mesmos totais de período', () => withPeriod(async ({ tx, services }) => {
    const compared = await services.compareByIds(ids, dayOne, dayThree);
    expect(compared.map(row => row.id)).toEqual([reportId, billingId].sort((left, right) => (BigInt(left) < BigInt(right) ? -1 : 1)));
    // Literais à mão, independentes do oráculo que repete o mesmo FILTER e a mesma borda.
    expect(num(compared.find(row => row.id === reportId)?.energy_kwh)).toBeCloseTo(1.05, 10);
    expect(num(compared.find(row => row.id === reportId)?.co2e_grams)).toBeCloseTo(105, 10);
    expect(num(compared.find(row => row.id === billingId)?.energy_kwh)).toBeCloseTo(0.3, 10);
    expect(num(compared.find(row => row.id === billingId)?.co2e_grams)).toBeCloseTo(30, 10);
    for (const row of await manualTotals(tx, ids, dayOne, dayThree)) {
      const actual = compared.find(item => item.id === row.id);
      expect(num(actual?.energy_kwh)).toBeCloseTo(num(row.energy_kwh), 10);
      expect(num(actual?.co2e_grams)).toBeCloseTo(num(row.co2e_grams), 10);
      expect(actual?.collections).toBe(row.collections);
    }
    expect(compared.find(row => row.id === reportId)).toMatchObject({ collections: '4', failed: '0', not_calculated: '1' });
    expect(compared.find(row => row.id === billingId)).toMatchObject({ collections: '2', failed: '0', not_calculated: '0' });
  }));

  it('fecha a série por bucket e o total do período com o mesmo recorte', () => withPeriod(async ({ collections }) => {
    const series = await collections.findSeries({ serviceId: reportId, from: dayOne, to: dayThree, bucket: '1d' });
    const total = series.find(row => row.bucket_start === null);
    const buckets = series.filter(row => row.bucket_start !== null);
    expect(buckets.map(row => row.bucket_start?.toISOString())).toEqual(['2026-06-01T00:00:00.000Z', '2026-06-02T00:00:00.000Z']);
    expect(buckets.map(row => num(row.energy_kwh))).toEqual([0.4, 0.65]);
    expect(buckets.map(row => row.not_calculated)).toEqual(['1', '0']);
    expect(total).toMatchObject({ collections: '4', failed: '0', not_calculated: '1' });
    expect(num(total?.energy_kwh)).toBeCloseTo(1.05, 10);
    expect(num(total?.co2e_grams)).toBeCloseTo(105, 10);
    expect(num(total?.co2e_min_grams)).toBeCloseTo(5, 10);
    expect(num(total?.co2e_max_grams)).toBeCloseTo(60, 10);
    expect(num(total?.carbon_intensity_gco2e_per_kwh)).toBeCloseTo(100, 10);
    expect(num(total?.energy_kwh)).toBeCloseTo(buckets.reduce((sum, row) => sum + num(row.energy_kwh), 0), 10);
  }));
});
