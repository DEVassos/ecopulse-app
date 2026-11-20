import { apiRequest, unexpectedFormat } from './api';
import type { ComparedService, PowerBreakdown, ServicesComparison } from './compare.types';
import { readAmountOrNull, readCount, readId, readInstant, readList, readRecord, readText, readTextOrNull } from './contract';
import { demoComparison } from './emissions.demo';
import { isDemoMode } from './services.service';

/**
 * Decomposição da potência média (#327): as quatro parcelas em W, ou null quando o backend não tem as quatro médias.
 * Um objeto sem parcela é resposta fora do contrato, como qualquer outro campo de medida.
 */
function parsePowerBreakdown(value: unknown, at: string): PowerBreakdown | null {
  if (value === null) return null;
  const item = readRecord(value, at);
  return {
    cpuW: wattsOf(item.cpuW, `${at}.cpuW`),
    memoryW: wattsOf(item.memoryW, `${at}.memoryW`),
    diskW: wattsOf(item.diskW, `${at}.diskW`),
    networkW: wattsOf(item.networkW, `${at}.networkW`),
  };
}

/** Parcela de potência: medida obrigatória; null aqui seria um objeto pela metade, fora do contrato. */
function wattsOf(value: unknown, field: string): number {
  const parsed = readAmountOrNull(value, field);
  if (parsed === null) throw unexpectedFormat(field);
  return parsed;
}

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
    avgPowerBreakdown: parsePowerBreakdown(item.avgPowerBreakdown, `${at}.avgPowerBreakdown`),
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
