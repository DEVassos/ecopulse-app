import { apiRequest } from './api';
import { readAmountOrNull, readCount, readInstant, readRecord } from './contract';
import { demoSummary } from './emissions.demo';
import { isDemoMode } from './services.service';
import type { ServiceSummaryTotals, ServicesSummaryResponse } from './services.types';

/**
 * Confere o corpo de GET /api/services/summary contra docs/api.md (#237). Campo fora do contrato recusa a resposta
 * inteira: o painel de indicadores mostra o erro com Tentar novamente e não exibe o valor recebido.
 */
export function parseServicesSummaryResponse(body: unknown): ServicesSummaryResponse {
  const response = readRecord(body, 'resposta');
  const previous = readRecord(response.previous, 'previous');
  const byStatus = readRecord(response.servicesByStatus, 'servicesByStatus');
  return {
    from: readInstant(response.from, 'from'),
    to: readInstant(response.to, 'to'),
    totals: readSummaryTotals(response.totals, 'totals'),
    previous: {
      from: readInstant(previous.from, 'previous.from'),
      to: readInstant(previous.to, 'previous.to'),
      totals: readSummaryTotals(previous.totals, 'previous.totals'),
    },
    servicesByStatus: {
      ativo: readCount(byStatus.ativo, 'servicesByStatus.ativo'),
      indisponivel: readCount(byStatus.indisponivel, 'servicesByStatus.indisponivel'),
      sem_metricas: readCount(byStatus.sem_metricas, 'servicesByStatus.sem_metricas'),
      removido: readCount(byStatus.removido, 'servicesByStatus.removido'),
      total: readCount(byStatus.total, 'servicesByStatus.total'),
    },
  };
}

/** Totais de um período: as três contagens são inteiros; energia, CO₂e e intensidade são null ou número. */
function readSummaryTotals(value: unknown, at: string): ServiceSummaryTotals {
  const totals = readRecord(value, at);
  return {
    collections: readCount(totals.collections, `${at}.collections`),
    failed: readCount(totals.failed, `${at}.failed`),
    notCalculated: readCount(totals.notCalculated, `${at}.notCalculated`),
    energyKwh: readAmountOrNull(totals.energyKwh, `${at}.energyKwh`),
    co2eGrams: readAmountOrNull(totals.co2eGrams, `${at}.co2eGrams`),
    carbonIntensityGco2ePerKwh: readAmountOrNull(totals.carbonIntensityGco2ePerKwh, `${at}.carbonIntensityGco2ePerKwh`),
  };
}

export async function fetchServicesSummary(from: string, to: string, signal?: AbortSignal): Promise<ServicesSummaryResponse> {
  if (isDemoMode) return demoSummary(from, to);
  const query = new URLSearchParams({ from, to });
  return parseServicesSummaryResponse(await apiRequest<unknown>(`/services/summary?${query}`, { signal }));
}
