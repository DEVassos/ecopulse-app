import { useEffect } from 'react';

/**
 * Imprime sempre no tema claro (#13): fundo branco e texto escuro no papel e no PDF, mesmo com a tela no escuro. Troca o
 * `data-theme` antes da impressão e devolve o tema da pessoa depois, sem gravar a troca (o useTheme guarda só o botão).
 */
export function usePrintLightTheme(): void {
  useEffect(() => {
    const root = document.documentElement;
    let saved: string | undefined;
    // Alguns navegadores avisam "beforeprint" mais de uma vez por impressão: só a primeira guarda o tema da pessoa
    let printing = false;
    const before = () => {
      if (printing) return;
      printing = true;
      saved = root.dataset.theme;
      root.dataset.theme = 'light';
    };
    const after = () => {
      if (!printing) return;
      printing = false;
      if (saved === undefined) delete root.dataset.theme;
      else root.dataset.theme = saved;
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);
}
