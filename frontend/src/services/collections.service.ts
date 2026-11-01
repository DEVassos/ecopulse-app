import { apiRequest } from './api';
import { CALCULATION_STATUSES, COLLECTION_STATUSES } from './collections.types';
import type { CollectionsResponse, ServiceCollection } from './collections.types';
import { readAmountOrNull, readId, readInstant, readInstantOrNull, readList, readOneOf, readRecord, readTextOrNull } from './contract';
import { demoCollections } from './demo-data';
import { isDemoMode } from './services.service';

/** Quantas coletas a janela de detalhes mostra (padrão da API; máximo 500). */
export const HISTORY_LIMIT = 50;

/** Campos de cálculo (#188) podem faltar; quando vêm, seguem o contrato. */
function optionalAmount(value: unknown, field: string): number | null | undefined {
  return value === undefined ? undefined : readAmountOrNull(value, field);
}

function parseCollection(value: unknown, at: string): ServiceCollection {
  const item = readRecord(value, at);
  return {
    id: readId(item.id, `${at}.id`),
    serviceId: readId(item.serviceId, `${at}.serviceId`),
    collectedAt: readInstant(item.collectedAt, `${at}.collectedAt`),
    status: readOneOf(item.status, COLLECTION_STATUSES, `${at}.status`),
    cpuPercent: readAmountOrNull(item.cpuPercent, `${at}.cpuPercent`),
    memoryGb: readAmountOrNull(item.memoryGb, `${at}.memoryGb`),
    diskGb: readAmountOrNull(item.diskGb, `${at}.diskGb`),
    networkGb: readAmountOrNull(item.networkGb, `${at}.networkGb`),
    errorMessage: readTextOrNull(item.errorMessage, `${at}.errorMessage`),
    calculationStatus:
      item.calculationStatus === undefined
        ? undefined
        : readOneOf(item.calculationStatus, CALCULATION_STATUSES, `${at}.calculationStatus`),
    energyKwh: optionalAmount(item.energyKwh, `${at}.energyKwh`),
    co2eGrams: optionalAmount(item.co2eGrams, `${at}.co2eGrams`),
    carbonIntensityGco2ePerKwh: optionalAmount(item.carbonIntensityGco2ePerKwh, `${at}.carbonIntensityGco2ePerKwh`),
  };
}

/**
 * Confere o corpo de GET /api/collections contra docs/api.md (#161). Uma coleta fora do contrato recusa a resposta
 * inteira com ApiError: a janela de detalhes mantém o histórico anterior, marcado como desatualizado.
 */
export function parseCollectionsResponse(body: unknown): CollectionsResponse {
  const response = readRecord(body, 'resposta');
  const period = readRecord(response.period, 'period');
  return {
    collections: readList(response.collections, 'collections').map((item, index) => parseCollection(item, `collections[${index}]`)),
    period: {
      from: readInstantOrNull(period.from, 'period.from'),
      to: readInstantOrNull(period.to, 'period.to'),
    },
  };
}

/** Histórico de coletas de um serviço, da mais recente para a mais antiga. */
export async function fetchServiceCollections(serviceId: string, signal?: AbortSignal): Promise<CollectionsResponse> {
  if (isDemoMode) return demoCollections(serviceId, HISTORY_LIMIT);
  const query = new URLSearchParams({ service_id: serviceId, limit: String(HISTORY_LIMIT) });
  return parseCollectionsResponse(await apiRequest<unknown>(`/collections?${query}`, { signal }));
}
