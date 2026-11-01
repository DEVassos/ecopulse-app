import { describe, expect, it, vi } from 'vitest';
import { createMetricsApi } from '../src/integrations/metrics-api';
import { ExternalApiError } from '../src/shared/errors';

const BASE = 'https://metrics.test';

/** Item real de GET /services (docs/especificacao-api.md). */
const billingApi = {
  id: 'billing-api',
  name: 'Billing API',
  location: {
    region_code: 'br-sudeste',
    country: 'Brazil',
    region: 'Sudeste',
    city: 'Sao Paulo',
    latitude: -23.5505,
    longitude: -46.6333,
  },
  metrics_path: '/metrics/billing-api',
};

const metricsBody = {
  collection_interval_seconds: 27,
  metrics: { cpu_percent: 62.67, memory_gb: 3.17, disk_gb: 19.26, network_gb: 0.45 },
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** fetch falso que responde na ordem dada e guarda as URLs pedidas. */
function fakeFetch(...responses: Array<Response | Error>) {
  const calls: string[] = [];
  const fn = vi.fn(async (input: string | URL | Request) => {
    calls.push(String(input));
    const next = responses.shift();
    if (!next) throw new Error('chamada a mais');
    if (next instanceof Error) throw next;
    return next;
  });
  return { fetchFn: fn as unknown as typeof fetch, calls };
}

describe('listServices', () => {
  it('lista os serviços convertendo a localização', async () => {
    const { fetchFn, calls } = fakeFetch(json(200, [billingApi]));
    const api = createMetricsApi({ baseUrl: `${BASE}/`, fetchFn });
    expect(await api.listServices()).toEqual([
      {
        id: 'billing-api',
        name: 'Billing API',
        location: { regionCode: 'br-sudeste', country: 'Brazil', region: 'Sudeste', city: 'Sao Paulo', latitude: -23.5505, longitude: -46.6333 },
        metricsPath: '/metrics/billing-api',
      },
    ]);
    expect(calls).toEqual([`${BASE}/services`]);
  });

  it('aceita lista vazia', async () => {
    const { fetchFn } = fakeFetch(json(200, []));
    expect(await createMetricsApi({ baseUrl: BASE, fetchFn }).listServices()).toEqual([]);
  });

  it('preserva serviço sem coordenadas', async () => {
    const service = { ...billingApi, location: { ...billingApi.location, latitude: null, longitude: null } };
    const { fetchFn } = fakeFetch(json(200, [service]));
    const [result] = await createMetricsApi({ baseUrl: BASE, fetchFn }).listServices();
    expect(result.location).toMatchObject({ latitude: null, longitude: null });
  });

  it.each([
    ['objeto no lugar da lista', { services: [] }],
    ['item sem localização', [{ ...billingApi, location: undefined }]],
    ['latitude como texto', [{ ...billingApi, location: { ...billingApi.location, latitude: '-23' } }]],
  ])('recusa resposta fora do formato: %s', async (_caso, body) => {
    const { fetchFn } = fakeFetch(json(200, body));
    await expect(createMetricsApi({ baseUrl: BASE, fetchFn }).listServices()).rejects.toBeInstanceOf(ExternalApiError);
  });

  it('recusa corpo que não é JSON', async () => {
    const { fetchFn } = fakeFetch(new Response('<html>erro</html>', { status: 200 }));
    await expect(createMetricsApi({ baseUrl: BASE, fetchFn }).listServices()).rejects.toThrow('não é JSON');
  });

  it('transforma HTTP de erro em ExternalApiError 502', async () => {
    const { fetchFn } = fakeFetch(json(503, {}));
    const error = await createMetricsApi({ baseUrl: BASE, fetchFn }).listServices().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ExternalApiError);
    expect(error).toMatchObject({ code: 'EXTERNAL_API_ERROR', httpStatus: 502 });
  });

  it('repete uma vez quando a rede falha e devolve a resposta da segunda tentativa', async () => {
    const { fetchFn, calls } = fakeFetch(new TypeError('fetch failed'), json(200, [billingApi]));
    expect(await createMetricsApi({ baseUrl: BASE, fetchFn }).listServices()).toHaveLength(1);
    expect(calls).toHaveLength(2);
  });

  it('desiste depois de duas falhas de rede, com a causa preservada', async () => {
    const cause = new TypeError('fetch failed');
    const { fetchFn, calls } = fakeFetch(cause, cause);
    const error = await createMetricsApi({ baseUrl: BASE, fetchFn }).listServices().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ExternalApiError);
    expect((error as ExternalApiError).message).toContain('Não foi possível conectar');
    expect((error as ExternalApiError).cause).toBe(cause);
    expect(calls).toHaveLength(2);
  });

  it('interrompe a chamada que passa do timeout', async () => {
    // fetch que só termina quando o sinal de timeout aborta a requisição
    const fetchFn = vi.fn(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    ) as unknown as typeof fetch;
    const api = createMetricsApi({ baseUrl: BASE, timeoutMs: 20, fetchFn });
    await expect(api.listServices()).rejects.toThrow('não respondeu em 0.02 s');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe('getServiceMetrics', () => {
  it('devolve as métricas convertidas', async () => {
    const { fetchFn, calls } = fakeFetch(json(200, metricsBody));
    expect(await createMetricsApi({ baseUrl: BASE, fetchFn }).getServiceMetrics('billing-api')).toEqual({
      status: 'ok',
      raw: metricsBody,
      metrics: { collectionIntervalSeconds: 27, cpuPercent: 62.67, memoryGb: 3.17, diskGb: 19.26, networkGb: 0.45 },
    });
    expect(calls).toEqual([`${BASE}/metrics/billing-api`]);
  });

  it('marca 404 como sem_metricas e 500 como indisponivel, sem repetir', async () => {
    const { fetchFn, calls } = fakeFetch(json(404, {}), json(500, {}));
    const api = createMetricsApi({ baseUrl: BASE, fetchFn });
    expect(await api.getServiceMetrics('removido')).toEqual({ status: 'sem_metricas' });
    expect(await api.getServiceMetrics('caido')).toEqual({ status: 'indisponivel' });
    expect(calls).toHaveLength(2);
  });

  it('codifica o id na URL', async () => {
    const { fetchFn, calls } = fakeFetch(json(404, {}));
    await createMetricsApi({ baseUrl: BASE, fetchFn }).getServiceMetrics('a/b c');
    expect(calls).toEqual([`${BASE}/metrics/a%2Fb%20c`]);
  });

  it('recusa métricas fora do formato', async () => {
    const { fetchFn } = fakeFetch(json(200, { collection_interval_seconds: 27, metrics: { cpu_percent: null } }));
    await expect(createMetricsApi({ baseUrl: BASE, fetchFn }).getServiceMetrics('billing-api')).rejects.toThrow('fora do formato');
  });

  it.each([
    ['intervalo zero', { ...metricsBody, collection_interval_seconds: 0 }],
    ['cpu acima de 100', { ...metricsBody, metrics: { ...metricsBody.metrics, cpu_percent: 101 } }],
    ['memória negativa', { ...metricsBody, metrics: { ...metricsBody.metrics, memory_gb: -1 } }],
  ])('recusa %s sem retornar leitura válida', async (_case, body) => {
    const { fetchFn } = fakeFetch(json(200, body));
    await expect(createMetricsApi({ baseUrl: BASE, fetchFn }).getServiceMetrics('billing-api'))
      .rejects.toBeInstanceOf(ExternalApiError);
  });

  it('trata outros HTTP de erro como falha da API', async () => {
    const { fetchFn } = fakeFetch(json(502, {}));
    await expect(createMetricsApi({ baseUrl: BASE, fetchFn }).getServiceMetrics('billing-api')).rejects.toBeInstanceOf(ExternalApiError);
  });
});
