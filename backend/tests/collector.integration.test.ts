import { describe, expect, it, vi } from 'vitest';
import { createDatabase } from '../src/db/connection';
import { Collector, type CollectorApi } from '../src/jobs/collector';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { history, prepare } from './collector-test.repository';

describe.skipIf(!process.env.WORKER_TEST_DATABASE_URL)('worker em PostgreSQL exclusivo', () => {
  it('preserva IDs/histórico/região, reativa retorno, desfaz coleta/estado e espera transação na parada', async () => {
    const db = createDatabase(process.env.WORKER_TEST_DATABASE_URL!);
    await prepare(db);
    let now = 0;
    const a = { id: 'a', name: 'A', metricsPath: '/metrics/a', location: { regionCode: 'br-sudeste',
      country: 'BR', region: 'Sudeste', city: null, latitude: null, longitude: null } };
    const raw = { collection_interval_seconds: 1, metrics: { cpu_percent: 50 }, extra: { kept: true } };
    const api: CollectorApi = { listServices: vi.fn(async () => [a]), getServiceMetrics: vi.fn(async () => ({
      status: 'ok', raw, metrics: { collectionIntervalSeconds: 1, cpuPercent: 50, memoryGb: 1, diskGb: 0, networkGb: 0 } })) };
    const worker = new Collector(db, api, 1000, () => now, vi.fn());
    try {
      await worker.run();
      const repo = new ServiceRepository(db);
      const first = (await repo.findAll())[0]; expect(first.id).toBe('9007199254740993');
      vi.mocked(api.listServices).mockRejectedValueOnce(new Error('descoberta indisponível')); await worker.run();
      expect((await repo.findById(first.id))?.status).toBe('indisponivel');
      const failed = await history(db); expect(failed).toHaveLength(2);
      expect(failed[1]).toMatchObject({ status: 'erro', cpu_percent: null, calculation_status: 'nao_calculado' });
      expect((await repo.findById(first.id))?.last_seen_at).toEqual(first.last_seen_at);
      now = 1000; a.location.regionCode = 'eu-west'; await worker.run();
      expect((await history(db)).map(row => row.region_code)).toEqual(['br-sudeste', 'br-sudeste', 'eu-west']);
      expect((await repo.findById(first.id))?.status).toBe('ativo');
      vi.mocked(api.listServices).mockResolvedValueOnce([]); await worker.run();
      expect((await repo.findById(first.id))?.status).toBe('removido');
      await worker.run(); expect((await repo.findById(first.id))?.first_seen_at).toEqual(first.first_seen_at);
      expect((await repo.findById(first.id))?.status).toBe('ativo');
      const before = (await history(db)).length;
      vi.spyOn(ServiceRepository.prototype, 'updateStatus').mockRejectedValueOnce(new Error('falha após insert'));
      now = 2000; await worker.run(); expect(await history(db)).toHaveLength(before);
      expect((await repo.findById(first.id))?.status).toBe('ativo');
      vi.restoreAllMocks();
      let entered!: () => void; let release!: () => void;
      const started = new Promise<void>(resolve => { entered = resolve; });
      const gate = new Promise<void>(resolve => { release = resolve; });
      const original = ServiceRepository.prototype.updateStatus;
      vi.spyOn(ServiceRepository.prototype, 'updateStatus').mockImplementation(async function(id, status) {
        entered(); await gate; return original.call(this, id, status);
      });
      now = 3000; const running = worker.run(); await started;
      let stopped = false; const stopping = worker.stop().then(() => { stopped = true; });
      await Promise.resolve(); expect(stopped).toBe(false); release(); await running; await stopping;
      const rows = await history(db); expect(rows).toHaveLength(before + 1);
      expect(rows.every(row => row.service_id === first.id && row.calculation_status === 'nao_calculado')).toBe(true);
      expect(rows[0].metrics).toEqual(raw);
    } finally { vi.restoreAllMocks(); await worker.stop(); await db.close(); }
  });
});
