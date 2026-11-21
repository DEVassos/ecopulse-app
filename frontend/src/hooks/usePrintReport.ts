import { useEffect } from 'react';

/** Classe no `<html>` enquanto uma página com relatório está aberta: as regras de `styles/print.css` só valem com ela. */
export const PRINT_REPORT_CLASS = 'has-print-report';

/** Páginas que viram relatório impresso; cada uma tem a sua classe, a sua folha A4 e o seu rodapé no `print.css`. */
export const PRINT_PAGES = ['emissions', 'dashboard', 'compare', 'report'] as const;

export type PrintPage = (typeof PRINT_PAGES)[number];

/** `has-print-report--dashboard`: diz ao `print.css` qual dos relatórios está aberto. */
export function printPageClass(page: PrintPage): string {
  return `${PRINT_REPORT_CLASS}--${page}`;
}

/**
 * Relatório impresso (#13, #408):
 * - Marca o `<html>` com `PRINT_REPORT_CLASS` e com a classe da página enquanto ela está montada. O `print.css` entra no
 *   CSS do app inteiro, então sem essa marca o Ctrl+P no Login sairia com o rodapé do relatório.
 * - Imprime sempre no tema claro: troca o `data-theme` antes da impressão e devolve o tema da pessoa depois, sem
 *   gravar a troca (o useTheme guarda só o botão).
 */
export function usePrintReport(page: PrintPage): void {
  useEffect(() => {
    const root = document.documentElement;
    const pageClass = printPageClass(page);
    root.classList.add(PRINT_REPORT_CLASS, pageClass);
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
      root.classList.remove(PRINT_REPORT_CLASS, pageClass);
      after();
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, [page]);
}
