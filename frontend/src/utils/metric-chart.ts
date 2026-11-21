// Dados do gráfico de métricas da janela de detalhes (RF09, RF10), sem nada de tela: ordem, trechos e eixo.
import type { CollectionStatus, ServiceCollection } from '../services/collections.types';
import { niceTicks } from './emissions';
import { formatNumber } from './format';

/** Métrica que o gráfico mostra. CPU vem em %, as outras três em GB, como as colunas da tabela de histórico. */
export type ChartMetric = 'cpu' | 'memory' | 'disk' | 'network';

export const CHART_METRICS: readonly ChartMetric[] = ['cpu', 'memory', 'disk', 'network'];

export interface MetricDefinition {
  /** Nome no título do gráfico e no botão que escolhe a métrica. */
  label: string;
  /** O mesmo nome no meio da frase ("coletas sem memória"), em minúscula. */
  name: string;
  unit: '%' | 'GB';
  /** Casas decimais da leitura, as mesmas da coluna correspondente da tabela de histórico. */
  decimals: number;
  /** Teto fixo do eixo; null quando o eixo acompanha o maior valor da série. */
  ceiling: number | null;
  /** Valor da coleta nesta métrica; null interrompe a linha (erro, sem métricas ou campo ausente). */
  value: (collection: ServiceCollection) => number | null;
}

export const METRICS: Record<ChartMetric, MetricDefinition> = {
  cpu: { label: 'CPU', name: 'CPU', unit: '%', decimals: 1, ceiling: 100, value: (collection) => collection.cpuPercent },
  memory: { label: 'Memória', name: 'memória', unit: 'GB', decimals: 2, ceiling: null, value: (collection) => collection.memoryGb },
  disk: { label: 'Disco', name: 'disco', unit: 'GB', decimals: 2, ceiling: null, value: (collection) => collection.diskGb },
  network: { label: 'Rede', name: 'rede', unit: 'GB', decimals: 3, ceiling: null, value: (collection) => collection.networkGb },
};

/** Valor com a unidade, como nas colunas da tabela: 42.5 → "42,5%" · 3.17 → "3,17 GB" (o % gruda no número). */
export function formatMetricValue(metric: ChartMetric, value: number): string {
  const { unit, decimals } = METRICS[metric];
  const number = formatNumber(value, decimals);
  return unit === '%' ? `${number}%` : `${number} ${unit}`;
}

/** Uma coleta posicionada no tempo. */
export interface MetricChartPoint {
  id: string;
  collectedAt: string;
  /** `collectedAt` em milissegundos, para a escala do eixo X. */
  time: number;
  status: CollectionStatus;
  /** Valor da métrica escolhida quando a coleta entra na linha; null quando ela interrompe a linha. */
  value: number | null;
  errorMessage: string | null;
}

/** Eixo Y: teto, marcas e cada marca já formatada como aparece ao lado do gráfico. */
export interface ChartAxis {
  ceiling: number;
  ticks: number[];
  labels: string[];
}

export interface MetricChartData {
  /** Todas as coletas, da mais antiga para a mais recente. */
  points: MetricChartPoint[];
  /** Trechos contínuos da linha: uma coleta sem a métrica (erro ou sem métricas) encerra o trecho e nunca é ligada. */
  segments: MetricChartPoint[][];
  /** Coletas com a métrica, as que aparecem na linha. */
  plotted: MetricChartPoint[];
  /** Quantas coletas interrompem a linha, por status. */
  errors: number;
  noMetrics: number;
  axis: ChartAxis;
}

/** Casas decimais necessárias para todas as marcas aparecerem exatas (passo 0,2 → 1 · 2,5 → 1 · 0,005 → 3). */
function axisDecimals(step: number): number {
  for (let decimals = 0; decimals <= 6; decimals += 1) {
    if (Number(step.toFixed(decimals)) === step) return decimals;
  }
  return 6;
}

/** Marca do eixo sem casas fixas à direita do zero: "0" em vez de "0,00", mas "0,05" quando o passo exige. */
function axisLabel(value: number, decimals: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: decimals });
}

/**
 * Teto do eixo. CPU tem teto natural de 100% e escala estável, então a linha é comparável entre serviços e entre
 * dias; em GB o eixo acompanha o maior valor da série, para que a variação da métrica ocupe a altura do gráfico.
 */
function buildAxis(definition: MetricDefinition, max: number): ChartAxis {
  const ticks = definition.ceiling === null ? niceTicks(max, 4) : [0, definition.ceiling / 2, definition.ceiling];
  const ceiling = ticks[ticks.length - 1];
  const decimals = axisDecimals(ticks[1] - ticks[0]);
  // O % é curto: cabe ao lado do eixo. "GB" fica no título do gráfico, porque "0,45 GB" não caberia nos 40 px
  const suffix = definition.unit === '%' ? '%' : '';
  return { ceiling, ticks, labels: ticks.map((tick) => `${axisLabel(tick, decimals)}${suffix}`) };
}

/** Recebe as coletas como a API devolve (da mais recente para a mais antiga) e monta os dados do gráfico. */
export function buildMetricChart(collections: ServiceCollection[], metric: ChartMetric): MetricChartData {
  const definition = METRICS[metric];
  const points = collections
    .map((collection): MetricChartPoint => ({
      id: collection.id,
      collectedAt: collection.collectedAt,
      time: Date.parse(collection.collectedAt),
      status: collection.status,
      value: collection.status === 'ok' ? definition.value(collection) : null,
      errorMessage: collection.errorMessage,
    }))
    .sort((a, b) => a.time - b.time);

  const segments: MetricChartPoint[][] = [];
  let current: MetricChartPoint[] = [];
  for (const point of points) {
    if (point.value === null) {
      if (current.length > 0) segments.push(current);
      current = [];
    } else {
      current.push(point);
    }
  }
  if (current.length > 0) segments.push(current);

  const plotted = points.filter((point) => point.value !== null);
  const max = plotted.reduce((top, point) => Math.max(top, point.value ?? 0), 0);

  return {
    points,
    segments,
    plotted,
    errors: points.filter((point) => point.status === 'erro').length,
    noMetrics: points.filter((point) => point.status === 'sem_metricas').length,
    axis: buildAxis(definition, max),
  };
}
