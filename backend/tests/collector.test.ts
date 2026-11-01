import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Collector, observation, type CollectorApi } from '../src/jobs/collector';
import type { CarbonApi } from '../src/integrations/carbon-api';
import { ExternalApiError } from '../src/shared/errors';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { CollectionRepository } from '../src/modules/collections/collections.repository';
import type { Database } from '../src/db/connection';
import type { StoredService } from '../src/shared/persistence.types';

const a = { id: 'a', name: 'A', metricsPath: '/metrics/a', location: {
  regionCode: 'br-sudeste', country: 'BR', region: 'Sudeste', city: null, latitude: null, longitude: null } };
const raw = { collection_interval_seconds: 2, metrics: { cpu_percent: 50, memory_gb: 2, disk_gb: 1, network_gb: 0 }, extra: true };
const ok = { status: 'ok' as const, raw,
  metrics: { collectionIntervalSeconds: 2, cpuPercent: 50, memoryGb: 2, diskGb: 1, networkGb: 0 } };
const stored = { id: '9007199254740993', external_id: 'a', region_code: 'br-sudeste' } as StoredService;
let now: number;
let api: CollectorApi;
let worker: Collector;
let database: Database;
let insert: ReturnType<typeof vi.spyOn>;
const report = vi.fn();
beforeEach(() => {
  now = 0; report.mockClear();
  const query = vi.fn(async () => ({ rows: [], rowCount: 0, fields: [], command: '', oid: 0 }));
  database = { query, close: vi.fn(), withClient: async work => work({ query }) } as Database;
  vi.spyOn(ServiceRepository.prototype, 'upsert').mockImplementation(async s => ({ ...stored, ...s }));
  vi.spyOn(ServiceRepository.prototype, 'markMissingAsRemoved').mockResolvedValue([]);
  vi.spyOn(ServiceRepository.prototype, 'updateStatus').mockResolvedValue(stored);
  insert = vi.spyOn(CollectionRepository.prototype, 'insert').mockImplementation(async r => ({ ...r } as never));
  api = { listServices: vi.fn(async () => [a]), getServiceMetrics: vi.fn(async () => ok) };
  worker = new Collector(database, api, 1000, () => now, report);
});
afterEach(async () => { await worker.stop(); vi.restoreAllMocks(); vi.useRealTimers(); });

it.each([0, -1, 1.5, 2147483648])('recusa intervalo SQL %s antes do INSERT', value => {
  expect(() => observation(stored, { ...ok, metrics: { ...ok.metrics, collectionIntervalSeconds: value } }, new Date()))
    .toThrow('representáveis');
});
it.each([1, 2147483647])('aceita intervalo SQL %s e preserva bigint/raw', value => {
  expect(observation(stored, { ...ok, metrics: { ...ok.metrics, collectionIntervalSeconds: value } }, new Date()))
    .toMatchObject({ service_id: stored.id, metrics: raw, collection_interval_seconds: value });
});
it.each([{ cpuPercent: 100.001 }, { memoryGb: 1e11 }, { diskGb: -1 },
  { networkGb: Infinity }])('recusa faixa inválida %j', metric => {
  expect(() => observation(stored, { ...ok, metrics: { ...ok.metrics, ...metric } }, new Date())).toThrow();
});
it('arredonda resíduo de float à escala da coluna e preserva o original no JSON bruto', () => {
  const real = { ...raw, metrics: { ...raw.metrics, cpu_percent: 51.248000000000005 } };
  expect(observation(stored, { ...ok, raw: real, metrics: { ...ok.metrics, cpuPercent: 51.248000000000005,
    memoryGb: 1.0000000001, diskGb: 1e-10 } }, new Date()))
    .toMatchObject({ cpu_percent: '51.25', memory_gb: '1.000000000', disk_gb: '0.000000000', metrics: real });
});
it('falha de descoberta preserva cadastro; vazia válida reconcilia sem coleta', async () => {
  vi.mocked(api.listServices).mockRejectedValueOnce(new Error('rede'));
  await worker.run();
  expect(ServiceRepository.prototype.markMissingAsRemoved).not.toHaveBeenCalled();
  vi.mocked(api.listServices).mockResolvedValueOnce([]);
  await worker.run();
  expect(ServiceRepository.prototype.markMissingAsRemoved).toHaveBeenCalledWith([]);
  expect(insert).not.toHaveBeenCalled();
});
it('descoberta inválida inteira impede reconciliação parcial', async () => {
  vi.mocked(api.listServices).mockResolvedValueOnce([a, { ...a, id: 'b', location: { ...a.location, latitude: 91 } }]);
  await worker.run(); expect(ServiceRepository.prototype.upsert).not.toHaveBeenCalled();
});
it('respeita prazo distinto, alteração, último intervalo após falha e retorno imediato', async () => {
  vi.mocked(api.listServices).mockResolvedValue([a, { ...a, id: 'b' }]);
  vi.mocked(api.getServiceMetrics).mockImplementation(async id => ({ ...ok,
    metrics: { ...ok.metrics, collectionIntervalSeconds: id === 'a' ? 2 : 5 } }));
  await worker.run(); now = 1000; await worker.run(); expect(insert).toHaveBeenCalledTimes(2);
  now = 2000; vi.mocked(api.getServiceMetrics).mockRejectedValueOnce(new Error('rede'));
  await worker.run(); expect(insert).toHaveBeenCalledTimes(3);
  now = 3000; await worker.run(); expect(insert).toHaveBeenCalledTimes(3);
  now = 4000; vi.mocked(api.getServiceMetrics).mockResolvedValueOnce({ ...ok,
    metrics: { ...ok.metrics, collectionIntervalSeconds: 2147483647 } });
  await worker.run(); now = 5000; await worker.run(); expect(insert).toHaveBeenCalledTimes(5);
  vi.mocked(api.listServices).mockResolvedValueOnce([]); await worker.run();
  vi.mocked(api.listServices).mockResolvedValueOnce([a]); await worker.run(); expect(insert).toHaveBeenCalledTimes(6);
});
it('isola falha de um serviço e registra 404/500 sem métricas falsas', async () => {
  vi.mocked(api.listServices).mockResolvedValue([a, { ...a, id: 'b' }, { ...a, id: 'c' }, { ...a, id: 'd' }]);
  vi.mocked(api.getServiceMetrics).mockRejectedValueOnce(new Error('rede'))
    .mockResolvedValueOnce({ status: 'sem_metricas' }).mockResolvedValueOnce({ status: 'indisponivel' })
    .mockResolvedValueOnce(ok);
  await worker.run();
  expect(insert.mock.calls.map(call => call[0].status)).toEqual(['erro', 'sem_metricas', 'erro', 'ok']);
  expect(insert.mock.calls.slice(0, 3).every(call => call[0].cpu_percent === null)).toBe(true);
  expect(insert.mock.calls[3][0]).toMatchObject({ status: 'ok', cpu_percent: '50.00' });
  expect(ServiceRepository.prototype.updateStatus).toHaveBeenNthCalledWith(1, stored.id, 'indisponivel');
  expect(ServiceRepository.prototype.updateStatus).toHaveBeenNthCalledWith(2, stored.id, 'sem_metricas');
  expect(ServiceRepository.prototype.updateStatus).toHaveBeenNthCalledWith(3, stored.id, 'indisponivel');
  expect(ServiceRepository.prototype.updateStatus).toHaveBeenNthCalledWith(4, stored.id, 'ativo');
});
it('dispatcher não sobrepõe nem compensa ciclos e cancela HTTP na parada', async () => {
  vi.useFakeTimers();
  let ready!: () => void;
  const pending = new Promise<void>(resolve => { ready = resolve; });
  vi.mocked(api.getServiceMetrics).mockImplementation((_id, signal) => new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => reject(signal.reason), { once: true }); ready();
  }));
  worker.start(); await pending;
  const active = worker.run();
  expect(worker.run()).toBe(active);
  await vi.advanceTimersByTimeAsync(100000);
  expect(api.listServices).toHaveBeenCalledOnce();
  await worker.stop(); await active;
  expect(insert).not.toHaveBeenCalled(); expect(report).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(100000); expect(api.listServices).toHaveBeenCalledOnce();
});
it('retoma com um único próximo tick, sem compensação e sem timer do prazo longo', async () => {
  vi.useFakeTimers(); let release!: (value: typeof ok) => void;
  vi.mocked(api.getServiceMetrics).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  worker.start(); await vi.advanceTimersByTimeAsync(100000);
  expect(api.listServices).toHaveBeenCalledOnce();
  release({ ...ok, metrics: { ...ok.metrics, collectionIntervalSeconds: 2147483647 } });
  await worker.run(); expect(vi.getTimerCount()).toBe(1);
  await vi.advanceTimersByTimeAsync(999); expect(api.listServices).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1); expect(api.listServices).toHaveBeenCalledTimes(2);
  expect(api.getServiceMetrics).toHaveBeenCalledOnce();
});
it('rollback de persistência não impede o serviço seguinte', async () => {
  vi.mocked(api.listServices).mockResolvedValue([a, { ...a, id: 'b' }]);
  insert.mockRejectedValueOnce(new Error('banco'));
  await worker.run(); expect(insert).toHaveBeenCalledTimes(2);
  expect(ServiceRepository.prototype.updateStatus).toHaveBeenCalledOnce(); expect(report).toHaveBeenCalledOnce();
});
it('observação inválida vira diagnóstico e usa recuperação configurada até sucesso', async () => {
  vi.mocked(api.getServiceMetrics).mockResolvedValueOnce({ ...ok, metrics: { ...ok.metrics, collectionIntervalSeconds: 2147483648 } });
  await worker.run(); expect(insert.mock.calls[0][0]).toMatchObject({ status: 'erro', cpu_percent: null, collection_interval_seconds: null });
  now = 999; await worker.run(); expect(api.getServiceMetrics).toHaveBeenCalledOnce();
  now = 1000; await worker.run(); expect(insert.mock.calls[1][0].status).toBe('ok');
});
it('grava cálculo disponível sem mudar o estado ativo do serviço', async () => {
  const carbon: CarbonApi = { getIntensity: vi.fn(async () => ({ status: 'ok', source: 'api', fetchedAt: 0,
    expiresAt: 1, factor: { regionCode: 'br-sudeste', intensityGco2ePerKwh: 85, renewableSharePercent: 83 } })) };
  worker = new Collector(database, api, 1000, () => now, report, carbon);
  await worker.run();
  expect(insert.mock.calls[0][0]).toMatchObject({ status: 'ok', calculation_status: 'disponivel',
    power_watts: '50.760000', energy_kwh: '0.000028200000', co2e_grams: '0.002397000000' });
  expect(ServiceRepository.prototype.updateStatus).toHaveBeenCalledWith(stored.id, 'ativo');
});
it('preserva coleta válida quando o fator regional não está disponível', async () => {
  const carbon: CarbonApi = { getIntensity: vi.fn(async () => ({ status: 'region_not_found', regionCode: 'br-sudeste' })) };
  worker = new Collector(database, api, 1000, () => now, report, carbon);
  await worker.run();
  expect(insert.mock.calls[0][0]).toMatchObject({ status: 'ok', calculation_status: 'indisponivel',
    carbon_intensity_gco2e_per_kwh: null, energy_kwh: null, co2e_grams: null });
  expect(ServiceRepository.prototype.updateStatus).toHaveBeenCalledWith(stored.id, 'ativo');
});
it('preserva coleta válida quando a consulta de carbono falha', async () => {
  const carbon: CarbonApi = { getIntensity: vi.fn(async () => { throw new ExternalApiError('API de carbono indisponível.'); }) };
  worker = new Collector(database, api, 1000, () => now, report, carbon);
  await worker.run();
  expect(insert.mock.calls[0][0]).toMatchObject({ status: 'ok', calculation_status: 'indisponivel',
    calculation_error_message: 'API de carbono indisponível.' });
  expect(ServiceRepository.prototype.updateStatus).toHaveBeenCalledWith(stored.id, 'ativo');
});
