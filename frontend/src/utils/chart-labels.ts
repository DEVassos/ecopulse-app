// Posição dos rótulos de um gráfico em SVG, sem nada de tela: só a geometria aproximada de cada texto.

export type LabelAnchor = 'start' | 'middle' | 'end';

/** Caixa de um rótulo em px, no sistema de coordenadas do SVG. */
export interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Largura média de um caractere, em px, para estimar o tamanho do rótulo sem medir no DOM (o SVG é desenhado
 * antes da medição, e a estimativa só decide de que lado da linha o rótulo fica). Valores das fontes do
 * EmissionsChart.css: IBM Plex Mono 12px (0,6 em) e IBM Plex Sans 11px semibold (cerca de 0,56 em).
 */
export const CHAR_WIDTH = { mono12: 7.2, sans11: 6.2 } as const;

/** Caixa de um texto ancorado em (x, linha de base), como o `<text>` do SVG com `text-anchor`. */
export function labelBox(text: string, x: number, baseline: number, anchor: LabelAnchor, charWidth: number, fontSize: number): LabelBox {
  const width = text.length * charWidth;
  const left = anchor === 'end' ? x - width : anchor === 'middle' ? x - width / 2 : x;
  return { left, right: left + width, top: baseline - fontSize, bottom: baseline + fontSize * 0.25 };
}

/** Duas caixas se tocam, contando uma folga mínima entre elas. */
export function labelsOverlap(a: LabelBox, b: LabelBox, gap = 4): boolean {
  return a.left < b.right + gap && b.left < a.right + gap && a.top < b.bottom + gap && b.top < a.bottom + gap;
}
