import { apiRequest, unexpectedFormat } from './api';
import { CALCULATION_STATUSES, COLLECTION_STATUSES } from './collections.types';
import type { CalculationStatus, CollectionStatus } from './collections.types';
import { amount, count, instant, isRecord } from './contract';
import { demoEmissions } from './emissions.demo';
import type { EmissionPoint, EmissionsQuery, EmissionsSeries, EmissionsTotals } from './emissions.types';
import { isDemoMode } from './services.service';
import { totalsOf } from '../utils/emissions';

/** Máximo aceito por GET /api/collections. */
const PAGE_SIZE = 500;
/** Teto de páginas por busca de coletas (até 15 000), para um período grande não travar a tela. */
const MAX_PAGES = 30;

// ── Conferência da resposta em tempo de execução (utilitários em contract.ts) ──
// Os tipos do TypeScript somem no build e não garantem o que o servidor mandou: item fora do formato fica de fora
// (e é contado), em vez de virar um ponto errado no gráfico.

/**
 * Item de GET /api/collections → ponto de uma coleta só; null quando não serve para o gráfico.
 * `intensity` só vem nas coletas calculadas (`calculationStatus: disponivel`), as que entram na média do período.
 */
function parseCollection(item: unknown): { point: EmissionPoint; intensity: number | null } | null {
  if (!isRecord(item)) return null;
  const t = instant(item.collectedAt);
  const status = item.status as CollectionStatus;
  if (t === undefined || !COLLECTION_STATUSES.includes(status)) return null;
  if (item.calculationStatus !== undefined && !CALCULATION_STATUSES.includes(item.calculationStatus as CalculationStatus)) {
    return null;
  }
  const energyKwh = amount(item.energyKwh);
  const co2eGrams = amount(item.co2eGrams);
  const intensity = amount(item.carbonIntensityGco2ePerKwh);
  if (energyKwh === undefined || co2eGrams === undefined || intensity === undefined) return null;

  const ok = status === 'ok';
  return {
    point: {
      t,
      collections: 1,
      failed: ok ? 0 : 1,
      notCalculated: ok && co2eGrams === null ? 1 : 0,
      energyKwh,
      co2eGrams,
      co2eMinGrams: co2eGrams,
      co2eMaxGrams: co2eGrams,
    },
    intensity: item.calculationStatus === 'disponivel' ? intensity : null,
  };
}

/** Intervalo de GET /api/collections/series; null quando não serve para o gráfico. */
function parseSeriesBucket(item: unknown): EmissionPoint | null {
  if (!isRecord(item)) return null;
  const point = {
    t: instant(item.start),
    collections: count(item.collections),
    failed: count(item.failed),
    notCalculated: count(item.notCalculated),
    energyKwh: amount(item.energyKwh),
    co2eGrams: amount(item.co2eGrams),
    co2eMinGrams: amount(item.co2eMinGrams),
    co2eMaxGrams: amount(item.co2eMaxGrams),
  };
  return Object.values(point).some((value) => value === undefined) ? null : (point as EmissionPoint);
}

function parseSeriesTotals(item: unknown): EmissionsTotals | null {
  if (!isRecord(item)) return null;
  const totals = {
    collections: count(item.collections),
    failed: count(item.failed),
    notCalculated: count(item.notCalculated),
    energyKwh: amount(item.energyKwh),
    co2eGrams: amount(item.co2eGrams),
    co2eMaxGrams: amount(item.co2eMaxGrams),
    carbonIntensity: amount(item.carbonIntensityGco2ePerKwh),
  };
  return Object.values(totals).some((value) => value === undefined) ? null : (totals as EmissionsTotals);
}

// ── Buscas ──────────────────────────────────────────────────────────────────

/**
 * Cada coleta do período (GET /api/collections). A rota devolve da mais recente para a mais antiga, no máximo
 * 500 por vez; quando a página vem cheia, pede a próxima com `to` logo antes da coleta mais antiga recebida.
 */
async function fetchEachCollection(query: EmissionsQuery, signal?: AbortSignal): Promise<EmissionsSeries> {
  const from = Date.parse(query.from);
  // A rota de coletas inclui o `to`; o período da página é aberto no fim, como a #189
  let to = new Date(Date.parse(query.to) - 1).toISOString();
  const points: EmissionPoint[] = [];
  // Intensidade do período: média das coletas calculadas, a mesma regra de `totals` da #189 (AVG … FILTER)
  let intensitySum = 0;
  let intensityCount = 0;
  let discarded = 0;
  let truncated = true;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({ service_id: query.serviceId, from: query.from, to, limit: String(PAGE_SIZE) });
    const body = await apiRequest<unknown>(`/collections?${params}`, { signal });
    if (!isRecord(body) || !Array.isArray(body.collections)) throw unexpectedFormat();

    let oldest: number | null = null;
    for (const raw of body.collections) {
      const parsed = parseCollection(raw);
      if (!parsed) {
        discarded += 1;
        continue;
      }
      points.push(parsed.point);
      if (parsed.intensity !== null) {
        intensitySum += parsed.intensity;
        intensityCount += 1;
      }
      oldest = parsed.point.t;
    }

    // A paginação olha o que o servidor mandou, não só o que passou na conferência
    if (body.collections.length < PAGE_SIZE || oldest === null) {
      truncated = false;
      break;
    }
    if (oldest - 1 < from) {
      truncated = false;
      break;
    }
    to = new Date(oldest - 1).toISOString();
  }

  points.reverse();
  const intensity = intensityCount > 0 ? intensitySum / intensityCount : null;
  return { bucket: 'coleta', points, totals: totalsOf(points, intensity), truncated, discarded };
}

/** Série somada no banco (GET /api/collections/series, #189). */
async function fetchSeries(query: EmissionsQuery, signal?: AbortSignal): Promise<EmissionsSeries> {
  const params = new URLSearchParams({ service_id: query.serviceId, from: query.from, to: query.to, bucket: query.bucket });
  const body = await apiRequest<unknown>(`/collections/series?${params}`, { signal });
  if (!isRecord(body) || !Array.isArray(body.buckets)) throw unexpectedFormat();
  const totals = parseSeriesTotals(body.totals);
  if (!totals) throw unexpectedFormat();

  const points: EmissionPoint[] = [];
  for (const raw of body.buckets) {
    const point = parseSeriesBucket(raw);
    if (point) points.push(point);
  }
  points.sort((a, b) => a.t - b.t);
  return { bucket: query.bucket, points, totals, truncated: false, discarded: body.buckets.length - points.length };
}

/** Emissão de um serviço no período, no agrupamento pedido. */
export async function fetchEmissions(query: EmissionsQuery, signal?: AbortSignal): Promise<EmissionsSeries> {
  if (isDemoMode) return demoEmissions(query);
  return query.bucket === 'coleta' ? fetchEachCollection(query, signal) : fetchSeries(query, signal);
}
