import { describe, expect, it } from 'vitest';
import { PRINT_PAGES, PRINT_REPORT_CLASS } from './usePrintReport';

describe('usePrintReport (#13, #408)', () => {
  const readCss = async () => {
    const { readFile } = await import('node:fs/promises');
    return readFile(new URL('../styles/print.css', import.meta.url), 'utf-8');
  };

  const printMedia = (css: string) => css.slice(css.indexOf('@media print'));

  it('a classe do <html> é a mesma que o print.css usa em todas as regras de impressão', async () => {
    const media = printMedia(await readCss());
    const selectors = [...media.matchAll(/^ {4}([^@\s/*}][^{]*)\{/gm)].flatMap((match) => match[1].split(','));
    expect(selectors.length).toBeGreaterThan(10);
    // Toda regra fica sob a classe do <html>: sem ela, o Ctrl+P nas outras páginas sairia com regra de relatório
    for (const selector of selectors) expect(selector.trim().startsWith(`.${PRINT_REPORT_CLASS}`)).toBe(true);
    expect(media).not.toMatch(/@page\s*\{/);
  });

  it('cada página de relatório pede uma das folhas A4 declaradas no print.css', async () => {
    const media = printMedia(await readCss());
    // Três folhas, uma por página, e nenhuma sobrando: um `page:` sem `@page` imprimiria com a folha padrão
    const declared = [...media.matchAll(/@page\s+([\w-]+)\s*\{/g)].map((match) => match[1]);
    const used = [...media.matchAll(/^\s+page:\s*([\w-]+);/gm)].map((match) => match[1]);
    expect(declared.length).toBe(PRINT_PAGES.length);
    expect(used.sort()).toEqual(declared.sort());
    for (const page of PRINT_PAGES) expect(media).toContain(`.${PRINT_REPORT_CLASS}--${page} .page`);
  });
});
