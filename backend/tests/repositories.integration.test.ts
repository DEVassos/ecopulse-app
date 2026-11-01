import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db/connection';
import { withTransaction } from '../src/db/transaction.repository';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { CollectionRepository } from '../src/modules/collections/collections.repository';
import { UserRepository } from '../src/modules/usuarios/usuarios.repository';
import type { DiscoveredService, NewCollection } from '../src/shared/persistence.types';
import { DatabaseError } from '../src/shared/errors';
import { prepare } from './repositories-test.repository';

// URL exclusiva de teste; schema aplicado antes em banco descartável vazio, fixture no beforeAll.
const url = process.env.REPOSITORY_TEST_DATABASE_URL;
describe.skipIf(!url)('repositories em PostgreSQL descartável', () => {
  const db = createDatabase(url ?? 'postgresql://localhost/test');
  const services = new ServiceRepository(db);
  const collections = new CollectionRepository(db);
  const first = new Date('2026-10-11T10:00:00Z');
  const second = new Date('2026-10-11T11:00:00Z');
  const service = (external_id: string): DiscoveredService => ({ external_id, name: external_id,
    region_code: 'br-sudeste', country: 'Brazil', region: 'Sudeste', city: null, latitude: null, longitude: null });
  // Campos de cálculo obrigatórios desde o #139; o worker grava 'nao_calculado' quando não calcula
  const notCalculated = { calculation_status: 'nao_calculado', carbon_intensity_gco2e_per_kwh: null, power_watts: null,
    energy_kwh: null, co2e_grams: null, calculation_error_message: null } as const;
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
  it('busca email sem distinção de caixa e não interpreta entrada como SQL', async () => {
    const repo = new UserRepository(db);
    expect(await repo.findByEmail('REVIEW@example.test')).toMatchObject({ id: '9007199254740993', email: 'review@example.test' });
    expect(await repo.findByEmail("' OR true --")).toBeNull();
  });
});
