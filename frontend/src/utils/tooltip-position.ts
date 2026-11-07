// Posição do tooltip único (#274), sem nada de tela: acima do elemento e centrado nele, sempre dentro da janela;
// sem espaço em cima, ele vai para baixo.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TooltipPlacement {
  left: number;
  top: number;
  side: 'top' | 'bottom';
  /** Onde fica a seta, a partir da borda esquerda do tooltip, para ela apontar o centro do elemento. */
  arrow: number;
}

/** Distância entre o tooltip e o elemento, e a folga mínima até a borda da janela, em px. */
const GAP = 8;
const MARGIN = 8;
/** A seta não encosta nos cantos arredondados do cartão. */
const ARROW_INSET = 10;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export function placeTooltip(target: Box, tip: { width: number; height: number }, viewport: { width: number; height: number }): TooltipPlacement {
  const center = target.left + target.width / 2;
  const left = clamp(center - tip.width / 2, MARGIN, viewport.width - MARGIN - tip.width);
  const above = target.top - GAP - tip.height;
  const side = above >= MARGIN ? 'top' : 'bottom';
  const top = side === 'top' ? above : Math.min(target.top + target.height + GAP, viewport.height - MARGIN - tip.height);
  return { left, top, side, arrow: clamp(center - left, ARROW_INSET, tip.width - ARROW_INSET) };
}
