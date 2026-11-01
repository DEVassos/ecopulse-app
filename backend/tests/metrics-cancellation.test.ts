import { describe, expect, it, vi } from 'vitest';
import { createMetricsApi } from '../src/integrations/metrics-api';

const raw = { collection_interval_seconds: 27,
  metrics: { cpu_percent: 50, memory_gb: 2, disk_gb: 1, network_gb: 0, extra: 'preservado' },
  extra: { future: true } };

describe('contrato bruto e cancelamento da #97', () => {
  it('preserva campos adicionais do mesmo JSON sem segunda chamada', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(raw)));
    const result = await createMetricsApi({ baseUrl: 'https://test', fetchFn }).getServiceMetrics('a');
    expect(result).toMatchObject({ status: 'ok', raw, metrics: { cpuPercent: 50 } });
    expect(fetchFn).toHaveBeenCalledOnce();
  });
  it('não acopla intervalo HTTP ao limite SQL', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ...raw, collection_interval_seconds: 2147483648 })));
    expect(await createMetricsApi({ baseUrl: 'https://test', fetchFn }).getServiceMetrics('a'))
      .toMatchObject({ status: 'ok', metrics: { collectionIntervalSeconds: 2147483648 } });
  });
  it('não inicia HTTP com sinal já cancelado', async () => {
    const fetchFn = vi.fn();
    const controller = new AbortController(); controller.abort();
    await expect(createMetricsApi({ baseUrl: 'https://test', fetchFn }).listServices(controller.signal))
      .rejects.toBe(controller.signal.reason);
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it.each(['headers', 'body'] as const)('cancela durante %s sem retries nem erro artificial', async phase => {
    const controller = new AbortController();
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const fetchFn = vi.fn(async () => {
      if (phase === 'headers') { started(); return new Promise<Response>(() => undefined); }
      const response = new Response();
      vi.spyOn(response, 'json').mockImplementation(() => { started(); return new Promise(() => undefined); });
      return response;
    });
    const request = createMetricsApi({ baseUrl: 'https://test', fetchFn }).getServiceMetrics('a', controller.signal);
    await ready; controller.abort();
    await expect(request).rejects.toBe(controller.signal.reason);
    expect(fetchFn).toHaveBeenCalledOnce();
  });
  it('cancelamento entre tentativas impede nova chamada', async () => {
    const controller = new AbortController();
    const fetchFn = vi.fn(async () => { controller.abort(); throw new TypeError('rede'); });
    await expect(createMetricsApi({ baseUrl: 'https://test', fetchFn }).listServices(controller.signal))
      .rejects.toBe(controller.signal.reason);
    expect(fetchFn).toHaveBeenCalledOnce();
  });
  it('timeout cobre corpo pendente e respeita duas tentativas', async () => {
    const fetchFn = vi.fn(async () => {
      const response = new Response();
      vi.spyOn(response, 'json').mockImplementation(() => new Promise(() => undefined));
      return response;
    });
    await expect(createMetricsApi({ baseUrl: 'https://test', timeoutMs: 10, fetchFn }).listServices())
      .rejects.toThrow('não respondeu');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
