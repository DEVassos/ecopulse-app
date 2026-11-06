import { describe, expect, it } from 'vitest';
import { hasMoreToTheRight } from './useHorizontalOverflow';

describe('hasMoreToTheRight', () => {
  it('acusa colunas escondidas à direita no início da rolagem', () => {
    expect(hasMoreToTheRight(0, 358, 760)).toBe(true);
  });

  it('não acusa nada quando a rolagem chegou ao fim, mesmo com meio pixel de arredondamento', () => {
    expect(hasMoreToTheRight(401.5, 358, 760)).toBe(false);
  });

  it('não acusa nada quando a tabela cabe inteira', () => {
    expect(hasMoreToTheRight(0, 1316, 1316)).toBe(false);
  });
});
