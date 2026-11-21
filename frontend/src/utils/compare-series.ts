// Alinhamento das séries de CO₂e de vários serviços (#406): uma linha por serviço no mesmo eixo do tempo, a partir
// das séries que a API já devolve por serviço (GET /api/collections/series, #189). Nada de rota nova no backend.

import type { EmissionPoint, EmissionsBucket } from '../services/emissions.types';

/** Agrupamento da comparação: o período de até 31 dias em 15 min daria milhares de pontos por serviço. */
export type CompareBucket = Extract<EmissionsBucket, '15min' | '1h'>;

const DAY_MS = 86_400_000;

/**
 * Agrupamento pelo tamanho do período: até 2 dias, 15 min; acima disso, 1 hora. É o corte de `autoBucket` (#189) sem
 * o agrupamento por coleta, que traria até 15 000 pontos por serviço.
 */
export function compareBucket(fromMs: number, toMs: number): CompareBucket {
  return toMs - fromMs <= 2 * DAY_MS ? '15min' : '1h';
}

export interface CompareServiceRef {
  id: string;
  name: string;
}

/** A série de um serviço como a API devolveu: só os intervalos com coleta (a #189 omite os vazios). */
export interface CompareSeriesInput {
  service: CompareServiceRef;
  points: EmissionPoint[];
}

export interface CompareSeriesRow {
  id: string;
  name: string;
  /** Um valor por instante de `times`, em g CO₂e; null quando o serviço não teve cálculo naquele intervalo. */
  values: Array<number | null>;
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
    return { id: service.id, name: service.name, values, total };
  });

  return { times, rows, max };
}
