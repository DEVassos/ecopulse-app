import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ComparedService } from '../services/compare.types';
import PowerBreakdownChart from './PowerBreakdownChart';

/** Serviço de GET /api/services/compare; só o breakdown importa para a barra. */
function compared(id: string, name: string, breakdown: ComparedService['avgPowerBreakdown']): ComparedService {
  return {
    id,
    name,
    region: 'Sul',
    collections: breakdown === null ? 0 : 2880,
    failed: 0,
    notCalculated: 0,
    avgCpuPercent: breakdown === null ? null : breakdown.cpuW,
    avgMemoryGb: null,
    avgDiskGb: null,
    avgNetworkGb: null,
    avgPowerBreakdown: breakdown,
    energyKwh: null,
    monitoredSeconds: null,
    co2eGrams: null,
  };
}

const markup = (services: ComparedService[]) => renderToStaticMarkup(<PowerBreakdownChart services={services} />);

describe('PowerBreakdownChart', () => {
  it('mostra os quatro recursos com W e % em rótulo direto, não só na cor (critério de aceite da #328)', () => {
    const html = markup([compared('1', 'Fraud Detector', { cpuW: 42.5, memoryW: 0.7875, diskW: 0.1, networkW: 0.006 })]);
    // 42,5 / 0,7875 / 0,1 / 0,006 W de 43,3935 W: 98,0 + 1,8 + 0,2 + 0,0 = 100,0% pelo maior resto
    expect(html).toContain('Fraud Detector');
    expect(html).toContain('42,50 W');
    expect(html).toContain('98,0%');
    expect(html).toContain('0,79 W');
    expect(html).toContain('0,10 W');
    expect(html).toContain('0,01 W');
    for (const label of ['CPU', 'RAM', 'Disco', 'Rede']) expect(html).toContain(`>${label}<`);
  });

  it('deixa a tabela alternativa acessível com legenda e cabeçalhos de coluna', () => {
    const html = markup([compared('1', 'Fraud Detector', { cpuW: 42.5, memoryW: 0.7875, diskW: 0.1, networkW: 0.006 })]);
    expect(html).toContain('<details>');
    expect(html).toContain('<caption class="sr-only">');
    expect(html).toContain('<th scope="col"');
    expect(html).toContain('<th scope="row"');
  });

  it('serviço sem coleta no período não ganha barra e mostra "sem dado no período"', () => {
    const html = markup([
      compared('1', 'Fraud Detector', { cpuW: 42.5, memoryW: 0.7875, diskW: 0.1, networkW: 0.006 }),
      compared('2', 'Sem coletas', null),
    ]);
    expect(html).toContain('sem dado no período');
    expect(html.match(/power-breakdown__stack/g)).toHaveLength(1);
  });

  it('sem nenhuma decomposição no período, explica a ausência em vez de desenhar uma barra vazia', () => {
    const html = markup([compared('2', 'Sem coletas', null)]);
    expect(html).toContain('não há como decompor a potência destes serviços');
    expect(html).not.toContain('power-breakdown__track');
  });
});
