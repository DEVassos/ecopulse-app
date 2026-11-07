import { apiRequest, unexpectedFormat } from './api';
import { count, readAmountOrNull, readId, readInstant, readList, readOneOf, readRecord, readText, readTextOrNull } from './contract';
import { demoServices } from './demo-data';
import { RANKING_METRICS } from './ranking.types';
import type { RankedService, RankingMetric, ServicesRankingResponse } from './ranking.types';
import { SERVICE_STATUSES } from './services.types';
import { isDemoMode } from './services.service';

function readCount(value: unknown, field: string): number {
  const parsed = count(value);
  if (parsed === undefined) throw unexpectedFormat(field);
  return parsed;
}

/** Posição: inteiro ≥ 1, ou null para quem não tem a métrica. */
function readPosition(value: unknown, field: string): number | null {
  if (value === null) return null;
  const parsed = count(value);
  if (parsed === undefined || parsed === 0) throw unexpectedFormat(field);
  return parsed;
}

function parseRankedService(value: unknown, at: string): RankedService {
  const item = readRecord(value, at);
  return {
    position: readPosition(item.position, `${at}.position`),
    id: readId(item.id, `${at}.id`),
    name: readText(item.name, `${at}.name`),
    region: readTextOrNull(item.region, `${at}.region`),
    status: readOneOf(item.status, SERVICE_STATUSES, `${at}.status`),
    energyKwh: readAmountOrNull(item.energyKwh, `${at}.energyKwh`),
    co2eGrams: readAmountOrNull(item.co2eGrams, `${at}.co2eGrams`),
    collections: readCount(item.collections, `${at}.collections`),
    failed: readCount(item.failed, `${at}.failed`),
    notCalculated: readCount(item.notCalculated, `${at}.notCalculated`),
  };
}

/**
 * Posições como o contrato promete (docs/api.md § GET /api/services/ranking): quem tem a métrica vem primeiro, com
 * posições 1, 2, 3… na ordem da lista e valores que não crescem; quem não tem fica no fim com position null. Fora disso
 * o "1º" iria para uma linha cuja barra não é a cheia, e a frase citaria quem não pesa mais.
 */
function checkPositions(metric: RankingMetric, services: RankedService[]): void {
  let previous = Number.POSITIVE_INFINITY;
  let ranked = 0;
  services.forEach((service, index) => {
    const value = metric === 'co2e' ? service.co2eGrams : service.energyKwh;
    const expected = value === null || ranked < index ? null : index + 1;
    if (service.position !== expected || (value !== null && value > previous)) throw unexpectedFormat(`services[${index}].position`);
    if (value !== null) {
      ranked += 1;
      previous = value;
    }
  });
}

/**
 * Confere o corpo de GET /api/services/ranking contra o contrato da #50. Um campo fora do contrato recusa a resposta
 * inteira com ApiError (#161): a tabela não mostra parte nenhuma, em vez de uma parte calculada sobre dado errado.
 * Com `requested`, a métrica da resposta precisa ser a pedida: outra seria resposta de outro pedido, e as partes do CO₂e
 * sairiam erradas.
 */
export function parseRankingResponse(body: unknown, requested?: RankingMetric): ServicesRankingResponse {
  const response = readRecord(body, 'resposta');
  const metric = readOneOf(response.metric, RANKING_METRICS, 'metric');
  if (requested !== undefined && metric !== requested) throw unexpectedFormat('metric');
  const services = readList(response.services, 'services').map((item, index) => parseRankedService(item, `services[${index}]`));
  checkPositions(metric, services);
  return { metric, from: readInstant(response.from, 'from'), to: readInstant(response.to, 'to'), services };
}

/** Modo demonstração: o ranking das 24 h sai da leitura ilustrativa, como se ela se repetisse a cada 30 s. */
function demoRanking(metric: RankingMetric, from: string, to: string): ServicesRankingResponse {
  const readingsPerPeriod = (Date.parse(to) - Date.parse(from)) / 30_000;
  const services = demoServices().services.map((service) => ({
    position: null,
    id: service.id,
    name: service.name,
    region: service.region,
    status: service.status,
    energyKwh: service.energyKwh === null ? null : service.energyKwh * readingsPerPeriod,
    co2eGrams: service.emissionsG === null ? null : service.emissionsG * readingsPerPeriod,
    collections: service.lastReadingAt === null ? 0 : readingsPerPeriod,
    failed: 0,
    notCalculated: 0,
  }));
  const value = (service: RankedService) => (metric === 'co2e' ? service.co2eGrams : service.energyKwh);
  services.sort((a, b) => (value(b) ?? -1) - (value(a) ?? -1) || a.name.localeCompare(b.name, 'pt-BR'));
  let position = 0;
  return {
    metric,
    from,
    to,
    services: services.map((service) => ({ ...service, position: value(service) === null ? null : ++position })),
  };
}

/** Ranking dos serviços no período [from, to) pela métrica pedida (RF14, #50). */
export async function fetchServicesRanking(metric: RankingMetric, from: string, to: string, signal?: AbortSignal): Promise<ServicesRankingResponse> {
  if (isDemoMode) return demoRanking(metric, from, to);
  const query = `metric=${metric}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  return parseRankingResponse(await apiRequest<unknown>(`/services/ranking?${query}`, { signal }), metric);
}
