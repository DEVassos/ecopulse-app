import { useEffect } from 'react';

/** Classe no `<html>` enquanto a página do relatório está aberta: as regras de `styles/print.css` só valem com ela. */
export const PRINT_REPORT_CLASS = 'has-print-report';

/**
 * Relatório impresso da página Emissões (#13):
 * - Marca o `<html>` com `PRINT_REPORT_CLASS` enquanto a página está montada. O `print.css` entra no CSS do app
 *   inteiro (a página não é carregada sob demanda), então sem essa marca o Ctrl+P no Dashboard também sairia sem o
 *   menu e com o rodapé do relatório.
 * - Imprime sempre no tema claro: troca o `data-theme` antes da impressão e devolve o tema da pessoa depois, sem
 *   gravar a troca (o useTheme guarda só o botão).
 */
export function usePrintReport(): void {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(PRINT_REPORT_CLASS);
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
      root.classList.remove(PRINT_REPORT_CLASS);
      after();
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);
}
