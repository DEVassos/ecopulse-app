// Dados do gráfico de CPU da janela de detalhes (RF10), sem nada de tela: só ordem, trechos e resumo.
import type { CollectionStatus, ServiceCollection } from '../services/collections.types';

/** Uma coleta posicionada no tempo. */
export interface CpuChartPoint {
  id: string;
  collectedAt: string;
  /** `collectedAt` em milissegundos, para a escala do eixo X. */
  time: number;
  status: CollectionStatus;
  /** CPU (%) quando a coleta entra na linha; null quando ela interrompe a linha. */
  cpuPercent: number | null;
  errorMessage: string | null;
}

export interface CpuChartData {
  /** Todas as coletas, da mais antiga para a mais recente. */
  points: CpuChartPoint[];
  /** Trechos contínuos da linha: uma coleta sem CPU (erro ou sem métricas) encerra o trecho e nunca é ligada. */
  segments: CpuChartPoint[][];
  /** Coletas com CPU, as que aparecem na linha. */
  plotted: CpuChartPoint[];
  /** Quantas coletas interrompem a linha, por status. */
  errors: number;
  noMetrics: number;
}

/** Recebe as coletas como a API devolve (da mais recente para a mais antiga) e monta os dados do gráfico. */
export function buildCpuChart(collections: ServiceCollection[]): CpuChartData {
  const points = collections
    .map((collection): CpuChartPoint => ({
      id: collection.id,
      collectedAt: collection.collectedAt,
      time: Date.parse(collection.collectedAt),
      status: collection.status,
      cpuPercent: collection.status === 'ok' ? collection.cpuPercent : null,
      errorMessage: collection.errorMessage,
    }))
    .sort((a, b) => a.time - b.time);

  const segments: CpuChartPoint[][] = [];
  let current: CpuChartPoint[] = [];
  for (const point of points) {
    if (point.cpuPercent === null) {
      if (current.length > 0) segments.push(current);
      current = [];
    } else {
      current.push(point);
    }
  }
  if (current.length > 0) segments.push(current);

  return {
    points,
    segments,
    plotted: points.filter((point) => point.cpuPercent !== null),
    errors: points.filter((point) => point.status === 'erro').length,
    noMetrics: points.filter((point) => point.status === 'sem_metricas').length,
  };
}
