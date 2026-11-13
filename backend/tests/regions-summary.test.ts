import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { sign } from 'jsonwebtoken';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import type { CarbonApi } from '../src/integrations/carbon-api';
import { createDatabase, type QueryExecutor } from '../src/db/connection';
import { CollectionRepository } from '../src/modules/collections/collections.repository';
import { RegionsSummaryRepository } from '../src/modules/regions/regions-summary.repository';
import type { RegionsSummaryResponse } from '../src/modules/regions/regions-summary.service';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { UserRepository } from '../src/modules/usuarios/usuarios.repository';
import { DatabaseError } from '../src/shared/errors';
import { manualRegions, partialEnergy, regionalPlan, seedPlanVolume, seedRegions, transaction } from './regions-summary-test.repository';

const auth = { jwtSecret: 'regions-summary-test-key', jwtExpiresIn: '1h' as const };
const token = sign({ email: 'test@example.test' }, auth.jwtSecret, { subject: '1', expiresIn: '1h' });
const from = new Date('2026-04-01T00:00:00Z'), middle = new Date('2026-04-02T00:00:00Z'), to = new Date('2026-04-03T00:00:00Z');
const servers: Server[] = [];
async function serve(db: QueryExecutor, carbonApi?: CarbonApi) {
  const app = createApp(async () => {}, new CollectionRepository(db), new ServiceRepository(db), [], new UserRepository(db), auth,
    undefined, carbonApi, new RegionsSummaryRepository(db));
  const server = createServer(app); servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
}
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  })));
});
const headers = { Authorization: `Bearer ${token}` };
describe('GET /api/regions/summary', () => {
  it('mantém a listagem da #319 e o resumo regional na mesma aplicação', async () => {
    const carbonApi: CarbonApi = {
      getIntensity: vi.fn(),
      listRegions: vi.fn().mockResolvedValue({ regions: [], source: 'api', fetchedAt: 0 }),
    };
    const base = await serve({ query: vi.fn().mockResolvedValue({ rows: [] }) }, carbonApi);
    const list = await fetch(base + '/regions', { headers });
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual({ regions: [], source: 'api', fetchedAt: '1970-01-01T00:00:00.000Z' });
    const summary = await fetch(base + '/regions/summary', { headers });
    expect(summary.status).toBe(200);
    expect(await summary.json()).toMatchObject({ regions: [] });
    expect(carbonApi.listRegions).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, 'invalid', sign({ email: 'test@example.test' }, auth.jwtSecret, { subject: '1', expiresIn: -1 })])(
    'recusa token ausente/inválido/expirado antes do banco', async bearer => {
      const query = vi.fn(); const base = await serve({ query });
      expect((await fetch(base + '/regions/summary', { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} })).status).toBe(401);
      expect(query).not.toHaveBeenCalled();
    });
  it.each(['from=2026-04-01T00:00:00Z', 'to=2026-04-02T00:00:00Z', 'from=x&to=y',
    'from=2026-04-01&to=2026-04-02', 'from=2026-02-29T00:00:00Z&to=2026-03-02T00:00:00Z',
    'from=2026-04-02T00:00:00Z&to=2026-04-01T00:00:00Z',
    'from=2026-04-01T00:00:00Z&to=2026-04-01T00:00:00Z',
    'from=2026-04-01T00:00:00Z&to=2026-05-03T00:00:00Z'])('recusa período inválido: %s', async search => {
    const query = vi.fn(); const base = await serve({ query });
    const response = await fetch(base + '/regions/summary?' + search, { headers });
    expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(query).not.toHaveBeenCalled();
  });
  it('devolve lista vazia e período padrão de 24 horas sem inventar regiões', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] }); const base = await serve({ query });
    const response = await fetch(base + '/regions/summary', { headers });
    const body = await response.json() as RegionsSummaryResponse;
    expect(response.status).toBe(200); expect(body.regions).toEqual([]);
    expect(Date.parse(body.to) - Date.parse(body.from)).toBe(86400000);
    expect(query.mock.calls[0][1]).toEqual([new Date(body.from), new Date(body.to)]);
  });
  it('mantém erro tipado do banco no envelope global', async () => {
    const base = await serve({ query: vi.fn().mockRejectedValue(new DatabaseError()) });
    const response = await fetch(base + '/regions/summary', { headers });
    expect(response.status).toBe(500); expect(await response.json()).toMatchObject({ error: { code: 'DATABASE_ERROR' } });
  });
});

const url = process.env.REPOSITORY_TEST_DATABASE_URL;
describe.skipIf(!url)('regions summary no PostgreSQL real', () => {
  const db = createDatabase(url ?? 'postgresql://localhost/test');
  afterAll(() => db.close());
  it('confere SQL manual, resumo HTTP, estados distintos, NULL, zero, removidos e fronteiras', async () => {
    await db.withClient(async tx => {
      await transaction(tx, true);
      try {
        const prefix = `r320-${randomUUID()}-`, ids = await seedRegions(tx, prefix);
        const collections = new CollectionRepository(tx);
        const reading = (id: string, at: Date, energy: string, co2e: string) => ({ service_id: id, collected_at: at,
          status: 'ok', region_code: 'snapshot-antigo', collection_interval_seconds: 60, cpu_percent: '10', memory_gb: '1',
          disk_gb: '1', network_gb: '1', metrics: {}, error_message: null, calculation_status: 'disponivel',
          carbon_intensity_gco2e_per_kwh: '100', power_watts: '10', energy_kwh: energy, co2e_grams: co2e, calculation_error_message: null } as const);
        for (const [id, at, energy, co2e] of [[ids[0], from, '1', '10'], [ids[0], middle, '2', '20'],
          [ids[0], to, '999', '999'], [ids[0], new Date(from.getTime() - 1), '999', '999'],
          [ids[1], from, '4', '5'], [ids[2], from, '0', '0'], [ids[3], from, '0.5', '2'], [ids[4], middle, '0.25', '3']] as const)
          await collections.insert(reading(id, at, energy, co2e));
        await partialEnergy(tx, ids[0], middle);
        for (const status of ['erro', 'sem_metricas'] as const) await collections.insert({ service_id: ids[2], collected_at: middle,
          status, region_code: null, collection_interval_seconds: null, cpu_percent: null, memory_gb: null, disk_gb: null,
          network_gb: null, metrics: {}, error_message: status === 'erro' ? 'Timeout' : null, calculation_status: 'nao_calculado',
          carbon_intensity_gco2e_per_kwh: null, power_watts: null, energy_kwh: null, co2e_grams: null, calculation_error_message: null });
        const base = await serve(tx);
        for (const [start, end, energy, co2e] of [[from, to, 7.75, 40], [from, middle, 5.5, 17],
          [new Date('2025-01-01T00:00:00Z'), new Date('2025-01-02T00:00:00Z'), null, null]] as const) {
          const search = new URLSearchParams({ from: start.toISOString(), to: end.toISOString() });
          const regional = await fetch(base + '/regions/summary?' + search, { headers }); expect(regional.status).toBe(200);
          const body = await regional.json() as RegionsSummaryResponse;
          const global = await (await fetch(base + '/services/summary?' + search, { headers })).json() as { energyKwh: number | null; co2eGrams: number | null };
          const sum = (key: 'energyKwh' | 'co2eGrams') => body.regions.every(row => row[key] === null) ? null : body.regions.reduce((total, row) => total + (row[key] ?? 0), 0);
          expect(sum('energyKwh')).toBe(global.energyKwh); expect(sum('co2eGrams')).toBe(global.co2eGrams);
          expect(global).toMatchObject({ energyKwh: energy, co2eGrams: co2e });
          const manual = await manualRegions(tx, start, end);
          for (const row of manual) expect(body.regions.find(item => item.code === row.code)).toMatchObject({
            energyKwh: row.energy === null ? null : Number(row.energy), co2eGrams: row.co2e === null ? null : Number(row.co2e) });
          expect(body.regions.find(row => row.code === prefix + 'a')).toMatchObject({ services: { ativo: 1, indisponivel: 1, sem_metricas: 0 }, worstStatus: 'indisponivel' });
          expect(body.regions.find(row => row.code === prefix + 'b')).toMatchObject({ worstStatus: 'sem_metricas' });
          expect(body.regions.find(row => row.code === prefix + 'empty')).toMatchObject({ collections: 0, energyKwh: null, co2eGrams: null, worstStatus: 'ativo' });
          expect(body.regions.find(row => row.code === prefix + 'removed')).toMatchObject({ services: { ativo: 0, indisponivel: 0, sem_metricas: 0 }, worstStatus: null });
          expect(body.regions.filter(row => row.code === null)).toHaveLength(1);
          if (end === to) expect(body.regions.find(row => row.code === prefix + 'b')).toMatchObject({ collections: 3, failed: 2, notCalculated: 2, energyKwh: 0 });
          console.log('REGIONS320 totals', start.toISOString(), end.toISOString(), JSON.stringify({ energy: sum('energyKwh'), co2e: sum('co2eGrams'), global, manual }));
        }
        let sql = '', params: unknown[] = [];
        const capture: QueryExecutor = { async query(text, values = []) { sql = text; params = values; return { rows: [], fields: [], command: 'SELECT', rowCount: 0, oid: 0 }; } };
        await new RegionsSummaryRepository(capture).summarize(from, to);
        await seedPlanVolume(tx, ids);
        const plan = await regionalPlan(tx, sql, params); expect(plan).toContain('Execution Time:');
        console.log('REGIONS320 EXPLAIN', JSON.stringify(params), '\n' + plan);
      } finally { await transaction(tx, false); }
    });
  });
});
