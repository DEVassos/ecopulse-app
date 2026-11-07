import { describe, expect, it } from 'vitest';
import { placeTooltip } from './tooltip-position';

const viewport = { width: 375, height: 812 };
const tip = { width: 160, height: 40 };

describe('placeTooltip', () => {
  it('fica acima do elemento, centrado nele (#274)', () => {
    expect(placeTooltip({ left: 150, top: 300, width: 40, height: 20 }, tip, viewport)).toEqual({ left: 90, top: 252, side: 'top', arrow: 80 });
  });

  it('não sai pela borda da janela e a seta continua apontando o elemento', () => {
    // Botão colado na borda direita (o de atualizar do cabeçalho, no celular)
    const placement = placeTooltip({ left: 335, top: 300, width: 32, height: 32 }, tip, viewport);
    expect(placement.left).toBe(375 - 8 - 160);
    expect(placement.arrow).toBe(351 - 207);
  });

  it('vai para baixo quando não há espaço em cima', () => {
    expect(placeTooltip({ left: 10, top: 12, width: 40, height: 32 }, tip, viewport)).toMatchObject({ top: 52, side: 'bottom', left: 8, arrow: 22 });
  });
});
