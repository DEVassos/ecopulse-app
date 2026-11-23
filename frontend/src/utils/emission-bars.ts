/**
 * Barras do gráfico de Emissões no modo "Por intervalo": cada valor é uma quantidade daquele intervalo (a soma do
 * intervalo agrupado ou o CO₂e de uma coleta), então a barra ocupa o intervalo inteiro no eixo do tempo, sem a
 * continuidade que uma linha sugeriria entre um intervalo e outro. Funções puras: o componente só desenha.
 */

export type IntervalBarKind = 'normal' | 'peak' | 'open';

export interface IntervalBar {
  /** Índice do ponto na série. */
  index: number;
  x: number;
  width: number;
  /** Topo da barra (y do valor) e altura até a linha de base. */
  top: number;
  height: number;
  /** `peak`: o maior intervalo; `open`: o intervalo em andamento (soma parcial). */
  kind: IntervalBarKind;
  /** Traço da menor à maior coleta na escala da soma, só quando a barra é larga o bastante para ele não poluir. */
  range: { top: number; bottom: number } | null;
}

export interface IntervalBarsInput {
  /** Início de cada intervalo (ms). */
  starts: number[];
  /** Duração de um intervalo (ms). */
  stepMs: number;
  values: Array<number | null>;
  openIndex: number | null;
  peakIndex: number | null;
  /** Menor e maior soma possíveis do intervalo (faixa mín./máx.), ou `null` sem faixa. */
  ranges: Array<{ lo: number; hi: number } | null>;
  x: (t: number) => number;
  y: (value: number) => number;
  baseline: number;
  plotLeft: number;
  plotRight: number;
}

/**
 * Largura mínima para o traço mín./máx. aparecer sobre a barra: abaixo disso (7 dias por hora, 150 barras), os traços
 * viram um pente que esconde as barras; a dica do intervalo continua com "Por coleta: menor a maior".
 */
export const RANGE_MIN_WIDTH = 10;

/** Espaço entre barras vizinhas: 2 px quando cabem, menos quando são estreitas, nenhum quando viram uma área. */
export function barGap(slot: number): number {
  if (slot > 6) return 2;
  if (slot > 3) return 1;
  return 0;
}

export function intervalBars(input: IntervalBarsInput): IntervalBar[] {
  const { starts, stepMs, values, openIndex, peakIndex, ranges, x, y, baseline, plotLeft, plotRight } = input;
  const bars: IntervalBar[] = [];
  values.forEach((value, index) => {
    if (value === null) return;
    // O intervalo em andamento termina em "agora", no fim do plot: a barra mais estreita também diz que ele é parcial
    const left = Math.max(plotLeft, x(starts[index]));
    const right = Math.min(plotRight, x(starts[index] + stepMs));
    if (right <= left) return;
    const slot = right - left;
    const gap = barGap(slot);
    const width = Math.max(0.6, slot - gap);
    // Zero calculado é um valor, não ausência: fica um traço de 1 px na base
    const height = value > 0 ? Math.max(1, baseline - y(value)) : 1;
    const range = ranges[index];
    bars.push({
      index,
      x: left + (slot - width) / 2,
      width,
      top: baseline - height,
      height,
      kind: index === openIndex ? 'open' : index === peakIndex ? 'peak' : 'normal',
      range: range && width >= RANGE_MIN_WIDTH ? { top: y(range.hi), bottom: y(range.lo) } : null,
    });
  });
  return bars;
}

/** Caminho SVG da barra com os cantos de cima arredondados e a base reta, presa ao eixo. */
export function barPath(bar: Pick<IntervalBar, 'x' | 'width' | 'top' | 'height'>): string {
  const r = Math.min(2, bar.width / 2, bar.height);
  const bottom = bar.top + bar.height;
  const right = bar.x + bar.width;
  const f = (n: number) => Number(n.toFixed(2));
  return (
    `M${f(bar.x)},${f(bottom)}V${f(bar.top + r)}Q${f(bar.x)},${f(bar.top)} ${f(bar.x + r)},${f(bar.top)}` +
    `H${f(right - r)}Q${f(right)},${f(bar.top)} ${f(right)},${f(bar.top + r)}V${f(bottom)}Z`
  );
}
