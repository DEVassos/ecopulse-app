import { describe, expect, it } from 'vitest';
import { CHAR_WIDTH, labelBox, labelsOverlap } from './chart-labels';

describe('labelBox', () => {
  it('posiciona a caixa conforme a âncora do texto', () => {
    expect(labelBox('abcd', 100, 50, 'start', 10, 12)).toEqual({ left: 100, right: 140, top: 38, bottom: 53 });
    expect(labelBox('abcd', 100, 50, 'middle', 10, 12)).toMatchObject({ left: 80, right: 120 });
    expect(labelBox('abcd', 100, 50, 'end', 10, 12)).toMatchObject({ left: 60, right: 100 });
  });
});

describe('labelsOverlap', () => {
  // Celular (390 px): o rótulo do maior intervalo centrado no pico e o da média na ponta direita, quase na mesma altura
  const peak = labelBox('maior intervalo 6,71 g · 09:30', 200, 118, 'middle', CHAR_WIDTH.mono12, 12);
  const meanAbove = labelBox('média por intervalo 6,45 g', 334, 124, 'end', CHAR_WIDTH.sans11, 11);

  it('acusa o choque entre os rótulos do pico e da média', () => {
    expect(labelsOverlap(peak, meanAbove)).toBe(true);
  });

  it('não acusa choque quando a média desce para baixo da linha', () => {
    const meanBelow = labelBox('média por intervalo 6,45 g', 334, 145, 'end', CHAR_WIDTH.sans11, 11);
    expect(labelsOverlap(peak, meanBelow)).toBe(false);
  });

  it('não acusa choque entre rótulos distantes na horizontal', () => {
    const left = labelBox('pico 1,2 g · 02:00', 80, 60, 'start', CHAR_WIDTH.mono12, 12);
    const right = labelBox('média 0,9 g', 1300, 62, 'end', CHAR_WIDTH.sans11, 11);
    expect(labelsOverlap(left, right)).toBe(false);
  });
});
