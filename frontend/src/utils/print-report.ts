// Relatório do período para impressão / PDF (#13, US13 #54): a tabela por intervalo do gráfico, em cálculo puro.
import type { EmissionPoint, EmissionsBucket } from '../services/emissions.types';
import { formatDurationMilliseconds, type TimeSpan } from './emissions';
import { formatInScale, scaleFor } from './units';

export interface PrintRow {
  kind: 'intervalo';
  /** Início do intervalo: "00:15", ou "18/11 00:15" num período de mais de um dia. */
  label: string;
  collections: number;
  /** Energia e CO₂e na escala da coluna (unidade no cabeçalho, #271); "—" sem cálculo, nunca 0. */
  energy: string;
  co2e: string;
}

/** Trecho sem nenhuma coleta (#272), na ordem da tabela: quem lê só o papel vê onde a coleta parou. */
export interface PrintGapRow {
  kind: 'sem-coleta';
  /** "03:30–10:15", ou "18/11 23:00–19/11 02:00" quando o trecho vira o dia num período de mais de um dia. */
  label: string;
  /** "6 h 45 min", como no gráfico e no card Coletas. */
  duration: string;
}

export interface PrintTable {
  energyUnit: string;
  co2eUnit: string;
  rows: (PrintRow | PrintGapRow)[];
  total: Omit<PrintRow, 'kind' | 'label'>;
}

function clock(t: number, multiDay: boolean): string {
  const date = new Date(t);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return multiDay ? `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}` : time;
}

function gapLabel(span: TimeSpan, multiDay: boolean): string {
  const sameDay = new Date(span.start).toDateString() === new Date(span.end).toDateString();
  return `${clock(span.start, multiDay)}–${clock(span.end, multiDay && !sameDay)}`;
}

function sum(values: (number | null)[]): number | null {
  const known = values.filter((value): value is number => value !== null);
  return known.length === 0 ? null : known.reduce((total, value) => total + value, 0);
}

/**
 * Tabela do relatório: uma linha por intervalo do gráfico, com a energia e o CO₂e na escala única de cada coluna (a da
 * maior linha), e o total no fim, na mesma unidade. Os trechos sem coleta (`missingSpans`, os mesmos do gráfico e do
 * card Coletas) entram como linhas próprias, na ordem do tempo. No agrupamento "Cada coleta" seriam milhares de linhas:
 * devolve null, e o relatório aponta o CSV.
 */
export function printTable(
  points: readonly EmissionPoint[],
  bucket: EmissionsBucket,
  multiDay: boolean,
  missing: readonly TimeSpan[] = [],
): PrintTable | null {
  if (bucket === 'coleta') return null;
  const energyTotal = sum(points.map((point) => point.energyKwh));
  const co2eTotal = sum(points.map((point) => point.co2eGrams));
  // A escala vem da maior linha, e não do total: com a do total (ex.: 870 Wh) as linhas perderiam as casas ("10", "5").
  // O total fica na mesma unidade da coluna, com as mesmas casas
  const energy = scaleFor('energy', points.map((point) => point.energyKwh));
  const co2e = scaleFor('co2e', points.map((point) => point.co2eGrams));
  const cell = (value: number | null, scale: typeof energy) => (value === null ? '—' : formatInScale(value, scale));
  return {
    energyUnit: energy.unit,
    co2eUnit: co2e.unit,
    rows: [
      ...points.map((point) => ({
        at: point.t,
        row: {
          kind: 'intervalo' as const,
          label: clock(point.t, multiDay),
          collections: point.collections,
          energy: cell(point.energyKwh, energy),
          co2e: cell(point.co2eGrams, co2e),
        },
      })),
      ...missing.map((span) => ({
        at: span.start,
        row: { kind: 'sem-coleta' as const, label: gapLabel(span, multiDay), duration: formatDurationMilliseconds(span.end - span.start) },
      })),
    ]
      .sort((a, b) => a.at - b.at)
      .map((item) => item.row),
    total: {
      collections: points.reduce((total, point) => total + point.collections, 0),
      energy: cell(energyTotal, energy),
      co2e: cell(co2eTotal, co2e),
    },
  };
}
