import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** Mesma chave do script do index.html, que aplica o tema antes de o React montar (#265). */
export const THEME_STORAGE_KEY = 'ecopulse-theme';

const LIGHT_QUERY = '(prefers-color-scheme: light)';

/** Escolha guardada, ou null quando não há (primeira visita) ou o armazenamento está bloqueado. */
export function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null; // armazenamento bloqueado: segue o sistema, como numa primeira visita
  }
}

function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // sem armazenamento: o tema escolhido vale só enquanto a página estiver aberta (fica no atributo do <html>)
  }
}

function appliedTheme(): Theme {
  // Fora do navegador (renderização em teste), o padrão é o escuro
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/**
 * Tema da interface (#265). O atributo data-theme do <html> é a fonte: o index.html o define antes da primeira
 * pintura, com a escolha guardada ou a preferência do sistema. Sem escolha guardada, o tema acompanha o sistema se
 * ele mudar com a página aberta; depois de um clique no botão, vale a escolha da pessoa.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(appliedTheme);

  useEffect(() => {
    const media = window.matchMedia(LIGHT_QUERY);
    const followSystem = (event: MediaQueryListEvent) => {
      if (readStoredTheme() !== null) return;
      const next: Theme = event.matches ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    media.addEventListener('change', followSystem);
    return () => media.removeEventListener('change', followSystem);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = appliedTheme() === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    storeTheme(next);
    setTheme(next);
  }, []);

  return { theme, toggle };
}
