import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ExportButtons from './ExportButtons';

describe('ExportButtons (#24)', () => {
  it('mostra "Baixar CSV" e "Imprimir / PDF" num grupo com nome, antes de qualquer busca', () => {
    const html = renderToStaticMarkup(
      <ExportButtons serviceId="1" serviceName="Fraud Detector" start="2026-11-18" end="2026-11-19" fromMs={0} toMs={1} />,
    );
    expect(html).toContain('role="group" aria-label="Exportar o período"');
    const labels = [...html.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map((match) => match[1]);
    expect(labels).toEqual(['Baixar CSV', 'Imprimir / PDF']);
    expect(html).toContain('title="Abre a impressão do navegador: escolha Salvar como PDF"');
    expect(html).not.toContain('role="alert"');
  });
});
