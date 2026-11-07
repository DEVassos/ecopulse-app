import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../src/db/connection';
import { withTransaction } from '../src/db/transaction.repository';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { CollectionRepository } from '../src/modules/collections/collections.repository';
import { UserRepository } from '../src/modules/usuarios/usuarios.repository';
import type { DiscoveredService, NewCollection } from '../src/shared/persistence.types';
import { DatabaseError } from '../src/shared/errors';
import { prepare } from './repositories-test.repository';
import { getServices } from '../src/modules/services/services.service';

// URL exclusiva de teste; schema aplicado antes em banco descartável vazio, fixture no beforeAll.
const url = process.env.REPOSITORY_TEST_DATABASE_URL;
describe.skipIf(!url)('repositories em PostgreSQL descartável', () => {
  const db = createDatabase(url ?? 'postgresql://localhost/test');
  const services = new ServiceRepository(db);
  const collections = new CollectionRepository(db);
  const first = new Date('2026-10-11T10:00:00Z');
  const second = new Date('2026-10-11T11:00:00Z');
  // Estado inicial do cálculo; o worker preenche os campos quando o cálculo roda.
  const notCalculated = {
    calculation_status: 'nao_calculado',
    carbon_intensity_gco2e_per_kwh: null,
    power_watts: null,
    energy_kwh: null,
    co2e_grams: null,
    calculation_error_message: null,
  } as const;
  const service = (external_id: string): DiscoveredService => ({ external_id, name: external_id,
    region_code: 'br-sudeste', country: 'Brazil', region: 'Sudeste', city: null, latitude: null, longitude: null });
  const reading = (service_id: string): NewCollection => ({ service_id, collected_at: first,
    region_code: 'br-sudeste', status: 'ok', collection_interval_seconds: 27, cpu_percent: '62.67',
    memory_gb: '3.17', disk_gb: '19.26', network_gb: '0.45', error_message: null, ...notCalculated,
    metrics: { collection_interval_seconds: 27, metrics: { cpu_percent: 62.67, memory_gb: 3.17, disk_gb: 19.26, network_gb: 0.45 } } });
  beforeAll(() => prepare(db));
  afterAll(() => db.close());
  it('preserva bigint, upsert, datas, ausência/reaparecimento e histórico', async () => {
    const a = await services.upsert(service("a' OR '1'='1"), first);
    expect(BigInt(a.id)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
    expect(typeof a.id).toBe('string');
    expect(await services.findById(a.id)).toEqual(a);
    expect(await services.findById('9223372036854775807')).toBeNull();
    const one = await collections.insert(reading(a.id));
    const two = await collections.insert(reading(a.id));
    expect(one.id).not.toBe(two.id);
    expect(await collections.findAll({ serviceId: null, from: null, to: null, limit: 10 }))
      .toContainEqual(expect.objectContaining({ id: one.id, collection_interval_seconds: 27 }));
    expect(one).toMatchObject({ service_id: a.id, calculation_status: 'nao_calculado',
      carbon_intensity_gco2e_per_kwh: null, power_watts: null, energy_kwh: null,
      co2e_grams: null, calculation_error_message: null, cpu_percent: '62.67' });
    await services.updateStatus(a.id, 'sem_metricas');
    const updated = await services.upsert({ ...service(a.external_id), region_code: 'eu-west' }, second);
    expect(updated).toMatchObject({ id: a.id, first_seen_at: first, last_seen_at: second, status: 'sem_metricas' });
    expect(one.region_code).toBe('br-sudeste');
    const b = await services.upsert(service('b'), first);
    expect((await services.markMissingAsRemoved([b.external_id])).map(row => row.id)).toContain(a.id);
    expect((await services.findById(a.id))?.status).toBe('removido');
    expect((await services.upsert(service(a.external_id), second)).status).toBe('ativo');
    await services.markMissingAsRemoved([]);
    expect((await services.findAll()).every(row => row.status === 'removido')).toBe(true);
  });
  it('commit une coleta e estado; falhas desfazem alterações de ambos', async () => {
    const a = await services.upsert(service('transaction'), first);
    await withTransaction(db, async tx => {
      await new CollectionRepository(tx).insert(reading(a.id));
      await new ServiceRepository(tx).updateStatus(a.id, 'indisponivel');
    });
    expect((await services.findById(a.id))?.status).toBe('indisponivel');
    let rolledBackId = '';
    await expect(withTransaction(db, async tx => {
      const repo = new ServiceRepository(tx);
      const added = await repo.upsert(service('rolled-back'), first);
      rolledBackId = added.id;
      await new CollectionRepository(tx).insert(reading(added.id));
      // Valor deliberadamente inválido: o CHECK deve abortar toda a transação.
      await repo.updateStatus(added.id, 'invalid' as 'ativo');
    })).rejects.toBeInstanceOf(DatabaseError);
    expect(await services.findById(rolledBackId)).toBeNull();
    await expect(withTransaction(db, async tx => {
      await new ServiceRepository(tx).updateStatus(a.id, 'ativo');
      await new CollectionRepository(tx).insert({ ...reading(a.id), collection_interval_seconds: 0 });
    })).rejects.toBeInstanceOf(DatabaseError);
    expect((await services.findById(a.id))?.status).toBe('indisponivel');
  });
  it('reconciliação parcial é desfeita em falha e conexão continua utilizável', async () => {
    const previous = await services.findAll();
    await expect(withTransaction(db, async tx => {
      const repo = new ServiceRepository(tx);
      await repo.markMissingAsRemoved([]);
      await repo.upsert({ ...service('bad'), latitude: '91' }, first);
    })).rejects.toBeInstanceOf(DatabaseError);
    expect(await services.findAll()).toEqual(previous);
  });
  it.each(['erro', 'sem_metricas'] as const)('insere diagnóstico %s sem fabricar métricas', async status => {
    const a = await services.upsert(service(status), first);
    const result = await collections.insert({ service_id: a.id, collected_at: first, region_code: null,
      status, collection_interval_seconds: null, cpu_percent: null, memory_gb: null,
      disk_gb: null, network_gb: null, metrics: {}, error_message: status === 'erro' ? 'Timeout' : null, ...notCalculated });
    expect(result).toMatchObject({ status, calculation_status: 'nao_calculado', cpu_percent: null, co2e_grams: null });
  });
  it('resumo soma só coletas calculadas em [from, to) e conta cada serviço uma vez no estado atual', async () => {
    // Janela própria: as outras coletas desta suíte são de 11/10 e não entram nos totais
    const from = new Date('2026-09-01T10:00:00Z');
    const to = new Date('2026-09-01T10:10:00Z');
    const calculated = (service_id: string, minute: number, energy: string, co2e: string): NewCollection => ({
      ...reading(service_id), collected_at: new Date(from.getTime() + minute * 60_000),
      calculation_status: 'disponivel', carbon_intensity_gco2e_per_kwh: '100', power_watts: '10',
      energy_kwh: energy, co2e_grams: co2e, calculation_error_message: null });
    const a = await services.upsert(service('summary-a'), first);
    const b = await services.upsert(service('summary-b'), first);
    for (const minute of [0, 3, 6]) await collections.insert(calculated(a.id, minute, '0.001', '0.1'));
    for (const minute of [1, 4]) await collections.insert(calculated(b.id, minute, '0.002', '0.2'));
    await collections.insert({ ...reading(b.id), collected_at: new Date(from.getTime() + 5 * 60_000) });
    await collections.insert(calculated(a.id, 10, '9', '900')); // em `to`: fica de fora
    await services.updateStatus(b.id, 'removido');
    const row = await services.findSummary(from, to);
    expect(Number(row.energy_kwh)).toBeCloseTo(0.007, 12);
    expect(Number(row.co2e_grams)).toBeCloseTo(0.7, 12);
    // Contagem pelo estado atual de cada serviço, sem multiplicar pelas coletas do join
    const all = await services.findAll();
    const count = (status: string) => String(all.filter(service => service.status === status).length);
    expect(row).toMatchObject({ active: count('ativo'), unavailable: count('indisponivel'),
      without_metrics: count('sem_metricas'), removed: count('removido') });
    expect(Number(row.removed)).toBeGreaterThanOrEqual(1);
    const empty = await services.findSummary(new Date('2026-08-01T00:00:00Z'), new Date('2026-08-02T00:00:00Z'));
    expect(empty).toMatchObject({ energy_kwh: null, co2e_grams: null });
  });
  it('ranqueia no PostgreSQL por métrica, preserva null/zero e inclui removidos com histórico', async () => {
    const from = new Date('2026-09-10T00:00:00Z');
    const to = new Date('2026-09-11T00:00:00Z');
    const prefix = `ranking-${randomUUID()}`;
    const create = async (name: string, suffix: string, status?: 'removido' | 'sem_metricas') => {
      const saved = await services.upsert({ ...service(`${prefix}-${suffix}`), name }, first);
      if (status) await services.updateStatus(saved.id, status);
      return saved;
    };
    const calculated = (service_id: string, collected_at: Date, energy: string, co2e: string): NewCollection => ({
      ...reading(service_id), collected_at, calculation_status: 'disponivel',
      carbon_intensity_gco2e_per_kwh: '100', power_watts: '10', energy_kwh: energy,
      co2e_grams: co2e, calculation_error_message: null });
    const tie1 = await create('Tie', 'tie-1');
    const tie2 = await create('Tie', 'tie-2');
    const removed = await create('Removed', 'removed', 'removido');
    await create('Removed without history', 'removed-empty', 'removido');
    const failed = await create('No calculation', 'failed', 'sem_metricas');
    const notCalculatedService = await create('Not calculated', 'not-calculated');
    const noHistory = await create('No collection', 'no-history');
    await collections.insert(calculated(tie1.id, from, '0', '2'));
    await collections.insert(calculated(tie1.id, to, '99', '99'));
    await collections.insert(calculated(tie2.id, from, '0', '2'));
    await collections.insert(calculated(removed.id, from, '3', '1'));
    await collections.insert({ ...reading(failed.id), collected_at: from, status: 'erro',
      collection_interval_seconds: null, cpu_percent: null, memory_gb: null, disk_gb: null,
      network_gb: null, error_message: 'Timeout' });
    await collections.insert({ ...reading(notCalculatedService.id), collected_at: from });

    const energy = await services.rankByPeriod('energy', from, to);
    expect(energy.filter(row => row.energy_kwh !== null).map(row => row.id)).toEqual([removed.id, tie1.id, tie2.id]);
    expect(energy.slice(0, 3).map(row => Number(row.energy_kwh))).toEqual([3, 0, 0]);
    expect(energy.filter(row => row.energy_kwh === null).length).toBeGreaterThanOrEqual(3);
    expect(energy.find(row => row.id === tie1.id)).toMatchObject({ collections: '1', failed: '0', not_calculated: '0' });
    expect(energy.find(row => row.id === failed.id)).toMatchObject({ collections: '1', failed: '1', not_calculated: '1' });
    expect(energy.find(row => row.id === notCalculatedService.id)).toMatchObject({ collections: '1', failed: '0', not_calculated: '1' });
    expect(energy.find(row => row.id === noHistory.id)).toMatchObject({ collections: '0', failed: '0', not_calculated: '0' });
    expect(energy.some(row => row.name === 'Removed without history')).toBe(false);

    const co2e = await services.rankByPeriod('co2e', from, to);
    expect(co2e.slice(0, 3).map(row => row.id)).toEqual([tie1.id, tie2.id, removed.id]);
  });
  it('ordena numericamente as métricas no PostgreSQL, com decimais, empates, zero, null e removidos', async () => {
    const from = new Date('2026-09-20T00:00:00Z');
    const to = new Date('2026-09-21T00:00:00Z');
    const prefix = `ranking-order-${randomUUID()}`;
    const entries: Array<{
      suffix: string; name: string; energy: string | null; co2e: string | null;
      status?: 'removido' | 'sem_metricas';
    }> = [
      { suffix: 'energy-100', name: 'Energy 100', energy: '100', co2e: '9' },
      { suffix: 'energy-20', name: 'Energy 20', energy: '20', co2e: '100' },
      { suffix: 'energy-10', name: 'Energy 10', energy: '10', co2e: '20' },
      { suffix: 'energy-9-5', name: 'Energy 9.5', energy: '9.5', co2e: '10' },
      { suffix: 'energy-9', name: 'Energy 9', energy: '9', co2e: '9.5' },
      { suffix: 'tie-alpha', name: 'Alpha', energy: '5', co2e: '5' },
      { suffix: 'tie-first', name: 'Tie', energy: '5', co2e: '5' },
      { suffix: 'tie-second', name: 'Tie', energy: '5', co2e: '5' },
      { suffix: 'zero', name: 'Zero', energy: '0', co2e: '0' },
      { suffix: 'null', name: 'Null', energy: null, co2e: null, status: 'sem_metricas' },
      { suffix: 'removed', name: 'Removed', energy: '30', co2e: '30', status: 'removido' },
      { suffix: 'removed-empty', name: 'Removed without history', energy: null, co2e: null, status: 'removido' },
    ];
    const saved: Array<{ entry: typeof entries[number]; id: string }> = [];
    for (const entry of entries) {
      const current = await services.upsert({ ...service(`${prefix}-${entry.suffix}`), name: entry.name }, first);
      if (entry.status) await services.updateStatus(current.id, entry.status);
      saved.push({ entry, id: current.id });
      if (entry.energy === null || entry.co2e === null) {
        if (entry.suffix !== 'removed-empty') {
          await collections.insert({ ...reading(current.id), collected_at: from, status: 'sem_metricas',
            collection_interval_seconds: null, cpu_percent: null, memory_gb: null, disk_gb: null,
            network_gb: null, metrics: {}, ...notCalculated });
        }
      } else {
        await collections.insert({ ...reading(current.id), collected_at: from,
          calculation_status: 'disponivel', carbon_intensity_gco2e_per_kwh: '100', power_watts: '10',
          energy_kwh: entry.energy, co2e_grams: entry.co2e, calculation_error_message: null });
      }
    }
    const id = (suffix: string) => saved.find(item => item.entry.suffix === suffix)!.id;
    const energy = await services.rankByPeriod('energy', from, to);
    const energyValues = energy.filter(row => row.energy_kwh !== null);
    expect(energyValues.map(row => row.id)).toEqual([
      id('energy-100'), id('removed'), id('energy-20'), id('energy-10'), id('energy-9-5'),
      id('energy-9'), id('tie-alpha'), id('tie-first'), id('tie-second'), id('zero'),
    ]);
    expect(energyValues.map(row => Number(row.energy_kwh))).toEqual([100, 30, 20, 10, 9.5, 9, 5, 5, 5, 0]);
    expect(energy.slice(energyValues.length).every(row => row.energy_kwh === null)).toBe(true);
    expect(energyValues.findIndex(row => row.id === id('tie-alpha')))
      .toBeLessThan(energyValues.findIndex(row => row.id === id('tie-first')));
    expect(energyValues.findIndex(row => row.id === id('tie-first')))
      .toBeLessThan(energyValues.findIndex(row => row.id === id('tie-second')));
    expect(energy.some(row => row.name === 'Removed without history')).toBe(false);

    const co2e = await services.rankByPeriod('co2e', from, to);
    const co2eValues = co2e.filter(row => row.co2e_grams !== null);
    expect(co2eValues.map(row => row.id)).toEqual([
      id('energy-20'), id('removed'), id('energy-10'), id('energy-9-5'), id('energy-9'),
      id('energy-100'), id('tie-alpha'), id('tie-first'), id('tie-second'), id('zero'),
    ]);
    expect(co2eValues.map(row => Number(row.co2e_grams))).toEqual([100, 30, 20, 10, 9.5, 9, 5, 5, 5, 0]);
    expect(co2e.slice(co2eValues.length).every(row => row.co2e_grams === null)).toBe(true);
  });
  it('busca email sem distinção de caixa e não interpreta entrada como SQL', async () => {
    const repo = new UserRepository(db);
    expect(await repo.findByEmail('REVIEW@example.test')).toMatchObject({ id: '9007199254740993', email: 'review@example.test' });
    expect(await repo.findByEmail("' OR true --")).toBeNull();
  });
  it('motivo usa última coleta, desempata por id e desaparece na recuperação', async () => {
    const a = await services.upsert(service('status-reason'), first);
    const latest = new Date('2026-11-03T10:00:00Z');
    const error = { ...reading(a.id), collected_at: latest, status: 'erro' as const,
      collection_interval_seconds: null, cpu_percent: null, memory_gb: null, disk_gb: null, network_gb: null };
    await collections.insert({ ...error, error_message: 'Timeout' });
    await collections.insert({ ...error, error_message: 'Serviço indisponível (HTTP 500).' });
    await services.updateStatus(a.id, 'indisponivel');
    const current = async () => (await getServices(services)).services.find(item => item.id === a.id)!;
    expect((await current()).statusReason).toBe('Serviço indisponível (HTTP 500).');
    for (const status of ['ativo', 'sem_metricas', 'removido'] as const) {
      await services.updateStatus(a.id, status);
      expect((await current()).statusReason).toBeNull();
    }
    await collections.insert({ ...reading(a.id), collected_at: new Date(latest.getTime() + 1000) });
    await services.updateStatus(a.id, 'ativo');
    expect((await current()).statusReason).toBeNull();
    await services.updateStatus(a.id, 'indisponivel');
    expect((await current()).statusReason).toBeNull();
    const empty = await services.upsert(service('status-without-reading'), first);
    await services.updateStatus(empty.id, 'indisponivel');
    expect((await getServices(services)).services.find(item => item.id === empty.id)?.statusReason).toBeNull();
  });
  it('expõe região, intervalo, recursos, potência e fator da última coleta (#297)', async () => {
    const a = await services.upsert(service('reading-fields'), first);
    const current = async () => (await getServices(services)).services.find(item => item.id === a.id)!;
    const none = { collectionIntervalSeconds: null, memoryGb: null, diskGb: null, networkGb: null, powerWatts: null, carbonIntensityGco2ePerKwh: null };
    expect(await current()).toEqual(expect.objectContaining({ regionCode: 'br-sudeste', lastReadingAt: null, ...none }));
    await collections.insert({ ...reading(a.id), calculation_status: 'disponivel', carbon_intensity_gco2e_per_kwh: '85',
      power_watts: '64.06035', energy_kwh: '0.000480452625', co2e_grams: '0.040838473125' });
    expect(await current()).toEqual(expect.objectContaining({ regionCode: 'br-sudeste', collectionIntervalSeconds: 27, memoryGb: 3.17, diskGb: 19.26,
      networkGb: 0.45, powerWatts: 64.06035, carbonIntensityGco2ePerKwh: 85, energyKwh: 0.000480452625 }));
    // Uma coleta com erro mais recente: os campos da leitura caem para null e a região do cadastro continua
    await collections.insert({ ...reading(a.id), collected_at: second, status: 'erro', collection_interval_seconds: null, cpu_percent: null,
      memory_gb: null, disk_gb: null, network_gb: null, error_message: 'Timeout' });
    expect(await current()).toEqual(expect.objectContaining({ regionCode: 'br-sudeste', cpuPercent: null, ...none }));
    const noRegion = await services.upsert({ ...service('reading-no-region'), region_code: null }, first);
    expect((await getServices(services)).services.find(item => item.id === noRegion.id)?.regionCode).toBeNull();
  });
});
