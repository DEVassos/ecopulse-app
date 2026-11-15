import { ExternalApiError, ValidationError } from '../shared/errors';
import type { CarbonIntensity, CarbonIntensityResult, CarbonRegion, CarbonRegionsResult, RawCarbonIntensity, RawCarbonRegion, RawCarbonRegionsResponse } from './carbon-api.types';

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
  listRegions(): Promise<CarbonRegionsResult>;
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

function isRegion(value: unknown): value is RawCarbonRegion {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return typeof raw.code === 'string' && raw.code.trim() !== ''
    && typeof raw.country === 'string' && raw.country.trim() !== ''
    && typeof raw.region === 'string' && raw.region.trim() !== ''
    && (raw.city === undefined || raw.city === null || typeof raw.city === 'string')
    && typeof raw.latitude === 'number' && Number.isFinite(raw.latitude) && raw.latitude >= -90 && raw.latitude <= 90
    && typeof raw.longitude === 'number' && Number.isFinite(raw.longitude) && raw.longitude >= -180 && raw.longitude <= 180
    && typeof raw.carbon_intensity_gco2e_per_kwh === 'number'
    && Number.isFinite(raw.carbon_intensity_gco2e_per_kwh) && raw.carbon_intensity_gco2e_per_kwh >= 0
    && typeof raw.renewable_share_percent === 'number'
    && Number.isFinite(raw.renewable_share_percent) && raw.renewable_share_percent >= 0 && raw.renewable_share_percent <= 100;
}

function isRegionsResponse(value: unknown): value is RawCarbonRegionsResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return Array.isArray(raw.regions) && raw.regions.every(isRegion)
    && typeof raw.total === 'number' && Number.isInteger(raw.total) && raw.total >= 0 && raw.total === raw.regions.length;
}

function toRegion(raw: RawCarbonRegion): CarbonRegion {
  return {
    code: raw.code, country: raw.country, region: raw.region, city: raw.city ?? null,
    latitude: raw.latitude, longitude: raw.longitude,
    intensityGco2ePerKwh: raw.carbon_intensity_gco2e_per_kwh,
    renewableSharePercent: raw.renewable_share_percent,
  };
}

function copyRegions(regions: readonly CarbonRegion[]): CarbonRegion[] {
  return regions.map(region => ({ ...region }));
}

/** Cache somente de respostas válidas; falhas nunca fabricam um fator. */
export function createCarbonApi({ baseUrl, fetchFn = fetch, now = Date.now }: CarbonApiOptions): CarbonApi {
  const base = baseUrl.replace(/\/+$/, '');
  const cache = new Map<string, { factor: CarbonIntensity; fetchedAt: number; expiresAt: number }>();
  let regionsCache: { regions: CarbonRegion[]; fetchedAt: number; expiresAt: number } | null = null;

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
    async listRegions() {
      const cached = regionsCache;
      if (cached !== null && now() < cached.expiresAt) {
        return { regions: copyRegions(cached.regions), source: 'cache', fetchedAt: cached.fetchedAt };
      }
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
      async function request(): Promise<RawCarbonRegionsResponse> {
        const response = await fetchFn(`${base}/regions`, { headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}.`);
        const body: unknown = await response.json();
        if (!isRegionsResponse(body)) throw new Error('Resposta fora do contrato.');
        return body;
      }
      try {
        const raw = await Promise.race([request(), deadline]);
        const fetchedAt = now();
        const entry = { regions: raw.regions.map(toRegion), fetchedAt, expiresAt: fetchedAt + CACHE_TTL_MS };
        regionsCache = entry;
        return { regions: copyRegions(entry.regions), source: 'api', fetchedAt };
      } catch (cause) {
        if (cached !== null) return { regions: copyRegions(cached.regions), source: 'cache', fetchedAt: cached.fetchedAt };
        throw new ExternalApiError('Não foi possível obter uma lista de regiões válida.', cause);
      } finally {
        clearTimeout(timer!);
      }
    },
  };
}
