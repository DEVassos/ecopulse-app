import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { EmissionPoint } from '../services/emissions.types';
import { PrintHeader, PrintTable } from './PrintReport';

const POINT: EmissionPoint = {
  t: new Date(2026, 10, 18, 0, 0).getTime(), collections: 30, failed: 0, notCalculated: 0,
  energyKwh: 0.009, co2eGrams: 4.2, co2eMinGrams: null, co2eMaxGrams: null,
};

describe('relatório impresso (#13)', () => {
  it('cabeçalho só para impressão, com o logo, o serviço, o período, a região, o agrupamento e a última atualização', () => {
    const html = renderToStaticMarkup(
      <PrintHeader serviceName="Audit Stream" location="Tokyo · Tokyo" periodLabel="18/11/2026 (horário de Brasília)" bucketLabel="15 min" updatedAt={new Date(2026, 10, 19, 11, 30).toISOString()} />,
    );
    expect(html).toContain('class="print-only print-report__header"');
    expect(html).toContain('class="brand"');
    expect(html).toContain('Relatório de emissões · DEVassos');
    expect(html).toContain('<h1 class="print-report__title">Audit Stream <small>estimativa</small></h1>');
    expect(html).toContain('<dt>Agrupamento</dt><dd>15 min</dd>');
    expect(html).toContain('18/11/2026 (horário de Brasília)');
    expect(html).toContain('<dt>Última atualização</dt><dd>19/11/2026 às 11:30</dd>');
  });

  it('tabela com cabeçalho, total e a nota do método; por coleta, aponta o CSV', () => {
    const table = renderToStaticMarkup(<PrintTable points={[POINT]} bucket="15min" bucketLabel="15 min" multiDay={false} missing={[]} />);
    expect(table).toContain('<caption>Emissão por intervalo de 15 min</caption>');
    expect(table).toContain('<th scope="col">Energia (Wh)</th>');
    expect(table).toContain('<tfoot>');
    expect(table).toContain('docs/calculos.md');
    const each = renderToStaticMarkup(<PrintTable points={[POINT]} bucket="coleta" bucketLabel="Cada coleta" multiDay={false} missing={[]} />);
    expect(each).not.toContain('<table');
    expect(each).toContain('está no CSV');
  });

  it('trecho sem coleta numa linha cinza que ocupa as quatro colunas (#272)', () => {
    const later = { ...POINT, t: new Date(2026, 10, 18, 7, 0).getTime() };
    const missing = [{ start: new Date(2026, 10, 18, 0, 15).getTime(), end: later.t }];
    const html = renderToStaticMarkup(<PrintTable points={[POINT, later]} bucket="15min" bucketLabel="15 min" multiDay={false} missing={missing} />);
    expect(html).toContain('<tr class="print-report__gap"><th scope="row" colSpan="4">00:15–07:00 · sem coleta (6 h 45 min)</th></tr>');
  });
});
