/**
 * Miniatura do período inteiro durante o zoom de Emissões (#410): onde o trecho ampliado fica no período.
 * Funções puras: o componente `EmissionsOverview` só desenha.
 */

/** Largura do desenho da miniatura, em unidades do viewBox: o SVG estica até a largura do gráfico. */
export const OVERVIEW_WIDTH = 1000;

export interface OverviewBar {
  x: number;
  width: number;
  height: number;
  /** O intervalo está dentro do trecho ampliado. */
  inWindow: boolean;
}

export interface Overview {
  bars: OverviewBar[];
  /** Onde o trecho ampliado fica no período inteiro. */
  window: { x: number; width: number };
}

export interface OverviewInput {
  starts: number[];
  stepMs: number;
  values: Array<number | null>;
  /** Período inteiro. */
  fromMs: number;
  toMs: number;
  /** Trecho ampliado. */
  zoom: { fromMs: number; toMs: number };
  height: number;
}

/**
 * Miniatura do período inteiro durante o zoom: uma barra por intervalo, na escala do maior, e a janela do trecho
 * ampliado. Dá a posição, não a leitura de valores: sem eixo, com 1 unidade de altura mínima para o intervalo aparecer.
 */
export function overviewBars(input: OverviewInput): Overview {
  const { starts, stepMs, values, fromMs, toMs, zoom, height } = input;
  const span = Math.max(1, toMs - fromMs);
  const x = (t: number) => ((Math.min(Math.max(t, fromMs), toMs) - fromMs) / span) * OVERVIEW_WIDTH;
  const max = values.reduce<number>((top, value) => (value !== null && value > top ? value : top), 0);
  const bars: OverviewBar[] = [];
  values.forEach((value, index) => {
    if (value === null) return;
    const left = x(starts[index]);
    const right = x(starts[index] + stepMs);
    if (right <= left) return;
    const slot = right - left;
    const width = Math.max(1, slot * 0.8);
    bars.push({
      x: left + (slot - width) / 2,
      width,
      height: max > 0 ? Math.max(1, (value / max) * height) : 1,
      inWindow: starts[index] >= zoom.fromMs && starts[index] < zoom.toMs,
    });
  });
  const windowLeft = x(zoom.fromMs);
  return { bars, window: { x: windowLeft, width: Math.max(2, x(zoom.toMs) - windowLeft) } };
}
