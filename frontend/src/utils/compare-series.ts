// Alinhamento das séries de CO₂e de vários serviços (#406): uma linha por serviço no mesmo eixo do tempo, a partir
// das séries que a API já devolve por serviço (GET /api/collections/series, #189). Nada de rota nova no backend.

import { CHAR_WIDTH } from './chart-labels';
import type { EmissionPoint, EmissionsBucket } from '../services/emissions.types';

/** Agrupamento da comparação: o período de até 31 dias em 15 min daria milhares de pontos por serviço. */
export type CompareBucket = Extract<EmissionsBucket, '15min' | '1h' | '1d'>;

const DAY_MS = 86_400_000;

/**
 * Agrupamento pelo tamanho do período: até 2 dias, 15 min; até 10 dias, 1 hora; acima disso, 1 dia. É o corte de
 * `autoBucket` (#189) sem o agrupamento por coleta, que traria até 15 000 pontos por serviço.
 */
export function compareBucket(fromMs: number, toMs: number): CompareBucket {
  const span = toMs - fromMs;
  if (span <= 2 * DAY_MS) return '15min';
  return span <= 10 * DAY_MS ? '1h' : '1d';
}

export interface CompareServiceRef {
  id: string;
  name: string;
  /** Região do serviço, como na matriz; null quando o agregador não informa. */
  region?: string | null;
}

/** A série de um serviço como a API devolveu: só os intervalos com coleta (a #189 omite os vazios). */
export interface CompareSeriesInput {
  service: CompareServiceRef;
  points: EmissionPoint[];
}

export interface CompareSeriesRow {
  id: string;
  name: string;
  region: string | null;
  /** Um valor por instante de `times`, em g CO₂e; null quando o serviço não teve cálculo naquele intervalo. */
  values: Array<number | null>;
  /** Intervalos de `times` em que o serviço não teve cálculo: a linha é interrompida ali, e a legenda diz quantos são. */
  missing: number;
  /** Soma do período, em g CO₂e; null quando nenhum intervalo do serviço foi calculado. */
  total: number | null;
}

export interface CompareSeries {
  /** Início de cada intervalo (ms), em ordem cronológica: a união dos intervalos de todos os serviços. */
  times: number[];
  /** Na ordem dos serviços pedidos, como as colunas da matriz. */
  rows: CompareSeriesRow[];
  /** Maior valor de um intervalo entre todos os serviços, em g CO₂e: a base do eixo Y. */
  max: number;
}

/**
 * Linha do tempo única com uma linha por serviço: cada serviço fica com null onde não teve cálculo no intervalo, e o
 * desenho interrompe a linha ali — nenhum intervalo vazio vira zero.
 */
export function alignCompareSeries(inputs: CompareSeriesInput[]): CompareSeries {
  const starts = new Set<number>();
  for (const input of inputs) for (const point of input.points) starts.add(point.t);
  const times = [...starts].sort((a, b) => a - b);
  const positionOf = new Map(times.map((t, position) => [t, position]));

  let max = 0;
  const rows = inputs.map(({ service, points }) => {
    const values: Array<number | null> = times.map(() => null);
    let total: number | null = null;
    for (const point of points) {
      const position = positionOf.get(point.t);
      if (position === undefined) continue;
      values[position] = point.co2eGrams;
      if (point.co2eGrams === null) continue;
      total = (total ?? 0) + point.co2eGrams;
      if (point.co2eGrams > max) max = point.co2eGrams;
    }
    const missing = values.filter((value) => value === null).length;
    return { id: service.id, name: service.name, region: service.region ?? null, values, missing, total };
  });

  return { times, rows, max };
}

/** Posiciona o rótulo no lado disponível da ponta da série. */
export function compareSeriesLabel(name: string, x: number, left: number, right: number, gap: number) {
  const roomRight = right - x - gap;
  const roomLeft = x - gap - left;
  const placeRight = roomRight >= 60 || roomRight >= roomLeft;
  const room = placeRight ? roomRight : roomLeft;
  const maxChars = Math.max(1, Math.floor(Math.min(room, 120) / CHAR_WIDTH.sans11));
  const text = name.length <= maxChars ? name : `${name.slice(0, maxChars - 1)}…`;
  const anchor: 'start' | 'end' = placeRight ? 'start' : 'end';

  return { text, anchor, anchorX: placeRight ? x + gap : x - gap };
}
