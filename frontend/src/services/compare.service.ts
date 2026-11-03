import { apiRequest } from './api';
import type { ComparedService, ServicesComparison } from './compare.types';
import { readAmountOrNull, readCount, readId, readInstant, readList, readRecord, readText, readTextOrNull } from './contract';
import { demoComparison } from './emissions.demo';
import { isDemoMode } from './services.service';

function parseComparedService(value: unknown, at: string): ComparedService {
  const item = readRecord(value, at);
  return {
    id: readId(item.id, `${at}.id`),
    name: readText(item.name, `${at}.name`),
    region: readTextOrNull(item.region, `${at}.region`),
    collections: readCount(item.collections, `${at}.collections`),
    failed: readCount(item.failed, `${at}.failed`),
    notCalculated: readCount(item.notCalculated, `${at}.notCalculated`),
    avgCpuPercent: readAmountOrNull(item.avgCpuPercent, `${at}.avgCpuPercent`),
    avgMemoryGb: readAmountOrNull(item.avgMemoryGb, `${at}.avgMemoryGb`),
    avgDiskGb: readAmountOrNull(item.avgDiskGb, `${at}.avgDiskGb`),
    avgNetworkGb: readAmountOrNull(item.avgNetworkGb, `${at}.avgNetworkGb`),
    energyKwh: readAmountOrNull(item.energyKwh, `${at}.energyKwh`),
    co2eGrams: readAmountOrNull(item.co2eGrams, `${at}.co2eGrams`),
  };
}

/**
 * Confere o corpo de GET /api/services/compare contra docs/api.md (#237). Um serviço fora do contrato recusa a
 * resposta inteira: a página mostra o erro e não monta a tabela nem os gráficos.
 */
export function parseComparisonResponse(body: unknown): ServicesComparison {
  const response = readRecord(body, 'resposta');
  return {
    from: readInstant(response.from, 'from'),
    to: readInstant(response.to, 'to'),
    services: readList(response.services, 'services').map((item, index) => parseComparedService(item, `services[${index}]`)),
  };
}

/** Compara de 2 a 10 serviços no período [from, to) (ISO 8601, até 31 dias). */
export async function fetchComparison(ids: string[], from: string, to: string, signal?: AbortSignal): Promise<ServicesComparison> {
  if (isDemoMode) return demoComparison(ids, from, to);
  const query = new URLSearchParams({ ids: ids.join(','), from, to });
  return parseComparisonResponse(await apiRequest<unknown>(`/services/compare?${query}`, { signal }));
}
