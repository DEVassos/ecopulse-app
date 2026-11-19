import { describe, expect, it } from 'vitest';
import { PRINT_REPORT_CLASS } from './usePrintReport';

describe('usePrintReport (#13)', () => {
  it('a classe do <html> é a mesma que o print.css usa em todas as regras de impressão', async () => {
    const { readFile } = await import('node:fs/promises');
    const css = await readFile(new URL('../styles/print.css', import.meta.url), 'utf-8');
    const media = css.slice(css.indexOf('@media print'));
    const selectors = [...media.matchAll(/^ {4}([^@\s/*}][^{]*)\{/gm)].flatMap((match) => match[1].split(','));
    expect(selectors.length).toBeGreaterThan(10);
    for (const selector of selectors) expect(selector.trim().startsWith(`.${PRINT_REPORT_CLASS} `)).toBe(true);
    expect(media).toContain('@page relatorio');
    expect(media).not.toMatch(/@page\s*\{/);
  });
});
