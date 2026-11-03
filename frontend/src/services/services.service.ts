import { apiRequest } from './api';
import {
  readAmountOrNull,
  readCount,
  readId,
  readInstant,
  readInstantOrNull,
  readList,
  readOneOf,
  readRecord,
  readText,
  readTextOrNull,
} from './contract';
import { demoServices } from './demo-data';
import { SERVICE_STATUSES } from './services.types';
import type { MonitoredService, ServicesResponse, ServicesSummaryResponse } from './services.types';

/** Sem VITE_API_URL o frontend roda em modo demonstração, com os dados do protótipo. */
export const isDemoMode = !import.meta.env.VITE_API_URL;

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
    lastReadingAt: readInstantOrNull(item.lastReadingAt, `${at}.lastReadingAt`),
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

/**
 * Confere o corpo de GET /api/services/summary contra docs/api.md (#237). Campo fora do contrato recusa a resposta
 * inteira: o painel de indicadores mostra o erro com Tentar novamente e não exibe o valor recebido.
 */
export function parseServicesSummaryResponse(body: unknown): ServicesSummaryResponse {
  const response = readRecord(body, 'resposta');
  const period = readRecord(response.period, 'period');
  const services = readRecord(response.services, 'services');
  return {
    period: { from: readInstant(period.from, 'period.from'), to: readInstant(period.to, 'period.to') },
    energyKwh: readAmountOrNull(response.energyKwh, 'energyKwh'),
    co2eGrams: readAmountOrNull(response.co2eGrams, 'co2eGrams'),
    services: {
      active: readCount(services.active, 'services.active'),
      unavailable: readCount(services.unavailable, 'services.unavailable'),
      withoutMetrics: readCount(services.withoutMetrics, 'services.withoutMetrics'),
      removed: readCount(services.removed, 'services.removed'),
    },
  };
}

export async function fetchServicesSummary(from: string, to: string, signal?: AbortSignal): Promise<ServicesSummaryResponse> {
  const query = new URLSearchParams({ from, to });
  return parseServicesSummaryResponse(await apiRequest<unknown>(`/services/summary?${query}`, { signal }));
}
