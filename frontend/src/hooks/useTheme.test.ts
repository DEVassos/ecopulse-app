import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, readStoredTheme } from './useTheme';

function stubStorage(getItem: (key: string) => string | null) {
  vi.stubGlobal('window', { localStorage: { getItem } });
}

describe('readStoredTheme', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('devolve a escolha guardada pelo botão do cabeçalho', () => {
    stubStorage((key) => (key === THEME_STORAGE_KEY ? 'light' : null));
    expect(readStoredTheme()).toBe('light');
  });

  it('ignora um valor que não é tema (conteúdo alterado à mão)', () => {
    stubStorage(() => 'azul');
    expect(readStoredTheme()).toBeNull();
  });

  it('devolve null quando o armazenamento está bloqueado, para seguir o sistema', () => {
    stubStorage(() => {
      throw new Error('SecurityError');
    });
    expect(readStoredTheme()).toBeNull();
  });
});
