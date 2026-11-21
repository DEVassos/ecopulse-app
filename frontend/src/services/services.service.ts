import { apiRequest } from './api';
import {
  readAmountOrNull,
  readId,
  readInstantOrNull,
  readIntervalOrNull,
  readList,
  readOneOf,
  readRecord,
  readText,
  readTextOrNull,
} from './contract';
import { demoServices } from './demo-data';
import { SERVICE_STATUSES } from './services.types';
import type { MonitoredService, ServicesResponse } from './services.types';

/** Sem VITE_API_URL o frontend roda em modo demonstração, com os dados do protótipo. */
export const isDemoMode = !import.meta.env.VITE_API_URL;

/** Campos da #297 podem faltar num backend anterior: ausente vale null; presente, segue o contrato (#161). */
function absentOrAmount(value: unknown, field: string): number | null {
  return value === undefined ? null : readAmountOrNull(value, field);
}

function parseService(value: unknown, at: string): MonitoredService {
  const item = readRecord(value, at);
  return {
    id: readId(item.id, `${at}.id`),
    name: readText(item.name, `${at}.name`),
    country: readTextOrNull(item.country, `${at}.country`),
    region: readTextOrNull(item.region, `${at}.region`),
    city: readTextOrNull(item.city, `${at}.city`),
    cpuPercent: readAmountOrNull(item.cpuPercent, `${at}.cpuPercent`),
    energyKwh: readAmountOrNull(item.energyKwh, `${at}.energyKwh`),
    emissionsG: readAmountOrNull(item.emissionsG, `${at}.emissionsG`),
    status: readOneOf(item.status, SERVICE_STATUSES, `${at}.status`),
    // Campo novo da #176: ausente vale null, para o frontend funcionar antes e depois do backend subir
    statusReason: item.statusReason === undefined ? null : readTextOrNull(item.statusReason, `${at}.statusReason`),
    lastReadingAt: readInstantOrNull(item.lastReadingAt, `${at}.lastReadingAt`),
    // Campos da #297 (fator, potência, recursos, intervalo e código da região): ausentes valem null, como statusReason
    regionCode: item.regionCode === undefined ? null : readTextOrNull(item.regionCode, `${at}.regionCode`),
    collectionIntervalSeconds: item.collectionIntervalSeconds === undefined ? null : readIntervalOrNull(item.collectionIntervalSeconds, `${at}.collectionIntervalSeconds`),
    memoryGb: absentOrAmount(item.memoryGb, `${at}.memoryGb`),
    diskGb: absentOrAmount(item.diskGb, `${at}.diskGb`),
    networkGb: absentOrAmount(item.networkGb, `${at}.networkGb`),
    powerWatts: absentOrAmount(item.powerWatts, `${at}.powerWatts`),
    carbonIntensityGco2ePerKwh: absentOrAmount(item.carbonIntensityGco2ePerKwh, `${at}.carbonIntensityGco2ePerKwh`),
  };
}

/**
 * Confere o corpo de GET /api/services contra docs/api.md (#161). Um item fora do contrato recusa a resposta inteira
 * com ApiError: a tela trata como falha da busca e não mostra o item inválido.
 */
export function parseServicesResponse(body: unknown): ServicesResponse {
  const response = readRecord(body, 'resposta');
  return {
    services: readList(response.services, 'services').map((item, index) => parseService(item, `services[${index}]`)),
    period: readText(response.period, 'period'),
  };
}

export async function fetchServices(signal?: AbortSignal): Promise<ServicesResponse> {
  if (isDemoMode) return demoServices();
  return parseServicesResponse(await apiRequest<unknown>('/services', { signal }));
}
