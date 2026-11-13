import { apiRequest, unexpectedFormat } from './api';
import { readAmountOrNull, readCount, readId, readInstant, readList, readOneOf, readRecord, readText, readTextOrNull } from './contract';
import { demoServices } from './demo-data';
import { REGION_STATUSES } from './regions.types';
import type { Region, RegionsResponse, RegionStatus, RegionsSummaryResponse, RegionSummary } from './regions.types';
import { isDemoMode } from './services.service';

/** Número finito dentro de [min, max], ou null; a chave precisa vir na resposta. */
function readNumberInOrNull(value: unknown, min: number, max: number, field: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw unexpectedFormat(field);
  return value;
}

function parseRegion(value: unknown, at: string): Region {
  const item = readRecord(value, at);
  const latitude = readNumberInOrNull(item.latitude, -90, 90, `${at}.latitude`);
  const longitude = readNumberInOrNull(item.longitude, -180, 180, `${at}.longitude`);
  // Meia coordenada não marca lugar nenhum: as duas vêm juntas ou nenhuma
  if ((latitude === null) !== (longitude === null)) throw unexpectedFormat(`${at}.longitude`);
  return {
    code: readId(item.code, `${at}.code`),
    country: readText(item.country, `${at}.country`),
    region: readText(item.region, `${at}.region`),
    city: readTextOrNull(item.city, `${at}.city`),
    latitude,
    longitude,
    carbonIntensityGco2ePerKwh: readAmountOrNull(item.carbonIntensityGco2ePerKwh, `${at}.carbonIntensityGco2ePerKwh`),
    renewableSharePercent: readNumberInOrNull(item.renewableSharePercent, 0, 100, `${at}.renewableSharePercent`),
    monitoredServices: readCount(item.monitoredServices, `${at}.monitoredServices`),
  };
}

/** Confere o corpo de GET /api/regions (#319). Um campo fora do contrato recusa a lista inteira (#161). */
export function parseRegionsResponse(body: unknown): RegionsResponse {
  const response = readRecord(body, 'resposta');
  return {
    regions: readList(response.regions, 'regions').map((item, index) => parseRegion(item, `regions[${index}]`)),
    source: readOneOf(response.source, ['api', 'cache'] as const, 'source'),
    fetchedAt: readInstant(response.fetchedAt, 'fetchedAt'),
  };
}

/** Pior estado pelas contagens, na ordem da #320: indisponivel > sem_metricas > ativo. */
export function worstOf(services: Record<RegionStatus, number>): RegionStatus | null {
  if (services.indisponivel > 0) return 'indisponivel';
  if (services.sem_metricas > 0) return 'sem_metricas';
  return services.ativo > 0 ? 'ativo' : null;
}

function parseRegionSummary(value: unknown, at: string): RegionSummary {
  const item = readRecord(value, at);
  const counts = readRecord(item.services, `${at}.services`);
  const services = { ativo: 0, indisponivel: 0, sem_metricas: 0 };
  for (const status of REGION_STATUSES) services[status] = readCount(counts[status], `${at}.services.${status}`);
  const worstStatus = item.worstStatus === null ? null : readOneOf(item.worstStatus, REGION_STATUSES, `${at}.worstStatus`);
  // A cor da bolha sai do pior estado: um valor que não bate com as contagens pintaria a região errada
  if (worstStatus !== worstOf(services)) throw unexpectedFormat(`${at}.worstStatus`);
  return {
    code: item.code === null ? null : readId(item.code, `${at}.code`),
    energyKwh: readAmountOrNull(item.energyKwh, `${at}.energyKwh`),
    co2eGrams: readAmountOrNull(item.co2eGrams, `${at}.co2eGrams`),
    collections: readCount(item.collections, `${at}.collections`),
    failed: readCount(item.failed, `${at}.failed`),
    notCalculated: readCount(item.notCalculated, `${at}.notCalculated`),
    services,
    worstStatus,
  };
}

/** Confere o corpo de GET /api/regions/summary (#320). Um campo fora do contrato recusa a resposta inteira (#161). */
export function parseRegionsSummaryResponse(body: unknown): RegionsSummaryResponse {
  const response = readRecord(body, 'resposta');
  return {
    from: readInstant(response.from, 'from'),
    to: readInstant(response.to, 'to'),
    regions: readList(response.regions, 'regions').map((item, index) => parseRegionSummary(item, `regions[${index}]`)),
  };
}

// Modo demonstração: regiões ilustrativas, com coordenadas aproximadas da cidade. A eu-north não tem serviço e serve
// de destino possível (rede mais limpa), como as regiões da Carbon API sem serviço hoje.
const DEMO_REGIONS: Omit<Region, 'monitoredServices'>[] = [
  { code: 'us-east', country: 'Estados Unidos', region: 'Virgínia', city: 'Ashburn', latitude: 39.04, longitude: -77.49, carbonIntensityGco2ePerKwh: 377, renewableSharePercent: 22 },
  { code: 'eu-west', country: 'Irlanda', region: 'Leinster', city: 'Dublin', latitude: 53.35, longitude: -6.26, carbonIntensityGco2ePerKwh: 295, renewableSharePercent: 41 },
  { code: 'jp-east', country: 'Japão', region: 'Kanto', city: 'Tóquio', latitude: 35.69, longitude: 139.69, carbonIntensityGco2ePerKwh: 465, renewableSharePercent: 20 },
  { code: 'ca-central', country: 'Canadá', region: 'Quebec', city: 'Montreal', latitude: 45.5, longitude: -73.57, carbonIntensityGco2ePerKwh: 40, renewableSharePercent: 94 },
  { code: 'br-sudeste', country: 'Brasil', region: 'Sudeste', city: 'São Paulo', latitude: -23.55, longitude: -46.63, carbonIntensityGco2ePerKwh: 94, renewableSharePercent: 83 },
  { code: 'eu-north', country: 'Suécia', region: 'Estocolmo', city: 'Estocolmo', latitude: 59.33, longitude: 18.07, carbonIntensityGco2ePerKwh: 25, renewableSharePercent: 98 },
];

function demoListed() {
  return demoServices().services.filter((service) => service.status !== 'removido');
}

function demoRegions(): RegionsResponse {
  const services = demoListed();
  const regions = DEMO_REGIONS.map((region) => ({ ...region, monitoredServices: services.filter((service) => service.regionCode === region.code).length }));
  return { regions, source: 'api', fetchedAt: new Date().toISOString() };
}

/** Totais das 24 h a partir da leitura ilustrativa, como se ela se repetisse a cada 30 s (o mesmo cálculo do ranking). */
function demoRegionsSummary(from: string, to: string): RegionsSummaryResponse {
  const readingsPerPeriod = (Date.parse(to) - Date.parse(from)) / 30_000;
  const groups = new Map<string | null, ReturnType<typeof demoListed>>();
  for (const service of demoListed()) groups.set(service.regionCode, [...(groups.get(service.regionCode) ?? []), service]);
  const regions = [...groups].map(([code, services]): RegionSummary => {
    const sum = (pick: (s: (typeof services)[number]) => number | null) => {
      const values = services.map(pick).filter((v): v is number => v !== null);
      return values.length === 0 ? null : values.reduce((total, v) => total + v, 0) * readingsPerPeriod;
    };
    const counts = { ativo: 0, indisponivel: 0, sem_metricas: 0 };
    for (const service of services) if (service.status !== 'removido') counts[service.status] += 1;
    const read = services.filter((service) => service.lastReadingAt !== null).length * readingsPerPeriod;
    const calculated = services.filter((service) => service.emissionsG !== null).length * readingsPerPeriod;
    return {
      code,
      energyKwh: sum((s) => s.energyKwh),
      co2eGrams: sum((s) => s.emissionsG),
      collections: read,
      failed: 0,
      notCalculated: read - calculated,
      services: counts,
      worstStatus: worstOf(counts),
    };
  });
  return { from, to, regions };
}

/** Regiões da Carbon API com coordenadas, intensidade e % renovável (RF13, #319). */
export async function fetchRegions(signal?: AbortSignal): Promise<RegionsResponse> {
  if (isDemoMode) return demoRegions();
  return parseRegionsResponse(await apiRequest<unknown>('/regions', { signal }));
}

/** Energia, CO₂e e estado dos serviços por região no período [from, to) (RF13, #320). */
export async function fetchRegionsSummary(from: string, to: string, signal?: AbortSignal): Promise<RegionsSummaryResponse> {
  if (isDemoMode) return demoRegionsSummary(from, to);
  const query = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  return parseRegionsSummaryResponse(await apiRequest<unknown>(`/regions/summary?${query}`, { signal }));
}
