import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCarbonApi } from '../src/integrations/carbon-api';
import { ExternalApiError, ValidationError } from '../src/shared/errors';

const body = {
  region_code: 'br-sudeste', country: 'Brazil', region: 'Sudeste', city: null,
  carbon_intensity_gco2e_per_kwh: 85, renewable_share_percent: 83,
};
const json = (value: unknown = body) => new Response(JSON.stringify(value));
const baseUrl = 'https://carbon.example';
const makeFetch = () => vi.fn<typeof fetch>().mockImplementation(async () => json());

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
afterEach(() => { vi.useRealTimers(); });

describe('cliente de carbono', () => {
  it('consulta uma vez, valida o contrato e retorna a unidade original', async () => {
    const fetchFn = makeFetch();
    const api = createCarbonApi({ baseUrl: `${baseUrl}/`, fetchFn });
    expect(await api.getIntensity('br-sudeste')).toEqual({
      status: 'ok', source: 'api', fetchedAt: 0, expiresAt: 3_600_000,
      factor: { regionCode: 'br-sudeste', intensityGco2ePerKwh: 85, renewableSharePercent: 83 },
    });
    expect(fetchFn).toHaveBeenCalledExactlyOnceWith(`${baseUrl}/regions/br-sudeste/carbon-intensity`, {
      headers: { Accept: 'application/json' }, signal: expect.any(AbortSignal),
    });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('codifica o código regional como um único segmento', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 }));
    await createCarbonApi({ baseUrl, fetchFn }).getIntensity('br/sul?x');
    expect(fetchFn.mock.calls[0][0]).toBe(`${baseUrl}/regions/br%2Fsul%3Fx/carbon-intensity`);
  });
  it('aceita zero e não prolonga a validade nas leituras do cache', async () => {
    const fetchFn = makeFetch().mockImplementation(async () => json({ ...body, carbon_intensity_gco2e_per_kwh: 0 }));
    const api = createCarbonApi({ baseUrl, fetchFn });
    await api.getIntensity('br-sudeste');
    vi.setSystemTime(3_599_999);
    const cached = await api.getIntensity('br-sudeste');
    expect(cached).toMatchObject({ status: 'ok', source: 'cache', fetchedAt: 0, expiresAt: 3_600_000,
      factor: { intensityGco2ePerKwh: 0 } });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    vi.setSystemTime(3_600_000);
    expect(await api.getIntensity('br-sudeste')).toMatchObject({ source: 'api', fetchedAt: 3_600_000 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
  it('mantém regiões e instâncias independentes e protege o cache contra mutação externa', async () => {
    const fetchFn = makeFetch().mockResolvedValueOnce(json({ ...body, region_code: 'eu-west' }));
    const api = createCarbonApi({ baseUrl, fetchFn });
    const result = await api.getIntensity('eu-west');
    if (result.status !== 'ok') throw new Error('Fator esperado');
    result.factor.intensityGco2ePerKwh = 999;
    expect(await api.getIntensity('eu-west')).toMatchObject({ factor: { intensityGco2ePerKwh: 85 } });
    await api.getIntensity('br-sudeste');
    await createCarbonApi({ baseUrl, fetchFn }).getIntensity('br-sudeste');
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
  it('retorna ausência de fator para 404, sem cache negativo', async () => {
    const fetchFn = makeFetch().mockResolvedValueOnce(new Response(null, { status: 404 }));
    const api = createCarbonApi({ baseUrl, fetchFn });
    expect(await api.getIntensity('br-sudeste')).toEqual({ status: 'region_not_found', regionCode: 'br-sudeste' });
    expect(await api.getIntensity('br-sudeste')).toMatchObject({ status: 'ok', source: 'api' });
  });
  it.each(['', '   '])('recusa código vazio antes do HTTP', async regionCode => {
    const fetchFn = makeFetch();
    await expect(createCarbonApi({ baseUrl, fetchFn }).getIntensity(regionCode)).rejects.toBeInstanceOf(ValidationError);
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it.each([400, 401, 429, 500, 503])('trata HTTP %s sem retry nem cache de falha', async status => {
    const fetchFn = makeFetch().mockResolvedValueOnce(new Response(null, { status }));
    const api = createCarbonApi({ baseUrl, fetchFn });
    await expect(api.getIntensity('br-sudeste')).rejects.toMatchObject({ code: 'EXTERNAL_API_ERROR', httpStatus: 502 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(await api.getIntensity('br-sudeste')).toMatchObject({ status: 'ok' });
  });
  it('preserva causa da falha de rede e não reutiliza fator vencido', async () => {
    const fetchFn = makeFetch();
    const api = createCarbonApi({ baseUrl, fetchFn });
    await api.getIntensity('br-sudeste');
    vi.setSystemTime(3_600_000);
    const cause = new TypeError('Rede inacessível');
    fetchFn.mockRejectedValueOnce(cause);
    await expect(api.getIntensity('br-sudeste')).rejects.toMatchObject({ cause, code: 'EXTERNAL_API_ERROR' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(await api.getIntensity('br-sudeste')).toMatchObject({ source: 'api' });
  });
  it.each([
    null, [], { ...body, region_code: 'outra' }, { ...body, country: '' }, { ...body, region: 1 },
    { ...body, city: 1 }, { ...body, carbon_intensity_gco2e_per_kwh: undefined },
    { ...body, carbon_intensity_gco2e_per_kwh: null }, { ...body, carbon_intensity_gco2e_per_kwh: '85' },
    { ...body, carbon_intensity_gco2e_per_kwh: -1 }, { ...body, carbon_intensity_gco2e_per_kwh: Infinity },
    { ...body, renewable_share_percent: -1 }, { ...body, renewable_share_percent: 101 },
  ])('rejeita corpo inválido sem armazená-lo: %j', async invalid => {
    const fetchFn = makeFetch().mockResolvedValueOnce(json(invalid));
    const api = createCarbonApi({ baseUrl, fetchFn });
    await expect(api.getIntensity('br-sudeste')).rejects.toBeInstanceOf(ExternalApiError);
    expect(await api.getIntensity('br-sudeste')).toMatchObject({ status: 'ok', source: 'api' });
  });
  it('aceita city ausente e não arredonda o fator', async () => {
    const fetchFn = makeFetch().mockResolvedValueOnce(json({ ...body, city: undefined, carbon_intensity_gco2e_per_kwh: 0.123456789 }));
    expect(await createCarbonApi({ baseUrl, fetchFn }).getIntensity('br-sudeste'))
      .toMatchObject({ factor: { intensityGco2ePerKwh: 0.123456789 } });
  });
  it('rejeita JSON malformado', async () => {
    const fetchFn = makeFetch().mockResolvedValueOnce(new Response('{'));
    await expect(createCarbonApi({ baseUrl, fetchFn }).getIntensity('br-sudeste')).rejects.toBeInstanceOf(ExternalApiError);
  });
  it.each(['headers', 'body'])('limita headers + corpo a 10s, mesmo se %s ignorar abort', async stage => {
    const stalled = new Promise<Response>(() => undefined);
    const fetchFn = makeFetch().mockImplementation(async () => {
      if (stage === 'headers') return stalled;
      await new Promise(resolve => setTimeout(resolve, 6_000));
      const response = json();
      vi.spyOn(response, 'json').mockImplementation(() => new Promise(() => undefined));
      return response;
    });
    const pending = createCarbonApi({ baseUrl, fetchFn }).getIntensity('br-sudeste');
    const assertion = expect(pending).rejects.toMatchObject({ cause: { name: 'TimeoutError' } });
    await vi.advanceTimersByTimeAsync(9_999);
    expect(fetchFn.mock.calls[0][1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
