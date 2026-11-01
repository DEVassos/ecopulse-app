import { ExternalApiError, ValidationError } from '../shared/errors';
import type { CarbonIntensity, CarbonIntensityResult, RawCarbonIntensity } from './carbon-api.types';

const CACHE_TTL_MS = 3_600_000;
const TIMEOUT_MS = 10_000;

export interface CarbonApiOptions {
  /** URL fornecida por config/env.ts. HTTP e relógio injetáveis nos testes. */
  baseUrl: string;
  fetchFn?: typeof fetch;
  now?: () => number;
}

export interface CarbonApi {
  getIntensity(regionCode: string): Promise<CarbonIntensityResult>;
}

function isResponse(value: unknown, regionCode: string): value is RawCarbonIntensity {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return raw.region_code === regionCode
    && typeof raw.country === 'string' && raw.country.trim() !== ''
    && typeof raw.region === 'string' && raw.region.trim() !== ''
    && (raw.city === undefined || raw.city === null || typeof raw.city === 'string')
    && typeof raw.carbon_intensity_gco2e_per_kwh === 'number'
    && Number.isFinite(raw.carbon_intensity_gco2e_per_kwh) && raw.carbon_intensity_gco2e_per_kwh >= 0
    && typeof raw.renewable_share_percent === 'number'
    && Number.isFinite(raw.renewable_share_percent)
    && raw.renewable_share_percent >= 0 && raw.renewable_share_percent <= 100;
}

/** Cache somente de respostas válidas; falhas nunca fabricam um fator. */
export function createCarbonApi({ baseUrl, fetchFn = fetch, now = Date.now }: CarbonApiOptions): CarbonApi {
  const base = baseUrl.replace(/\/+$/, '');
  const cache = new Map<string, { factor: CarbonIntensity; fetchedAt: number; expiresAt: number }>();

  return {
    async getIntensity(regionCode) {
      if (!regionCode.trim()) throw new ValidationError('Informe um código regional não vazio.');
      const cached = cache.get(regionCode);
      if (cached && now() < cached.expiresAt) {
        return { status: 'ok', ...cached, factor: { ...cached.factor }, source: 'cache' };
      }
      cache.delete(regionCode);
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout>;
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error('Timeout da API de carbono.');
          error.name = 'TimeoutError';
          controller.abort(error);
          reject(error);
        }, TIMEOUT_MS);
      });
      async function request(): Promise<RawCarbonIntensity | null> {
        const response = await fetchFn(`${base}/regions/${encodeURIComponent(regionCode)}/carbon-intensity`, {
          headers: { Accept: 'application/json' }, signal: controller.signal,
        });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`HTTP ${response.status}.`);
        const body: unknown = await response.json();
        if (!isResponse(body, regionCode)) throw new Error('Resposta fora do contrato ou região divergente.');
        return body;
      }
      try {
        // Uma tentativa; o mesmo prazo cobre headers, corpo e validação.
        const raw = await Promise.race([request(), deadline]);
        if (raw === null) return { status: 'region_not_found', regionCode };
        const factor = {
          regionCode, intensityGco2ePerKwh: raw.carbon_intensity_gco2e_per_kwh,
          renewableSharePercent: raw.renewable_share_percent,
        };
        const fetchedAt = now();
        const entry = { factor, fetchedAt, expiresAt: fetchedAt + CACHE_TTL_MS };
        cache.set(regionCode, entry);
        return { status: 'ok', ...entry, factor: { ...factor }, source: 'api' };
      } catch (cause) {
        throw new ExternalApiError('Não foi possível obter uma intensidade de carbono válida para a região.', cause);
      } finally {
        clearTimeout(timer!);
      }
    },
  };
}
