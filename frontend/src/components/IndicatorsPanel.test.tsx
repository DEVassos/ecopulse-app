import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IndicatorsPanel from './IndicatorsPanel';
import { EQUIVALENTS_DISCLAIMER } from '../utils/equivalents';
import type { ServiceSummaryTotals, ServicesSummaryResponse } from '../services/services.types';

const TOTALS: ServiceSummaryTotals = { collections: 4, failed: 0, notCalculated: 0, energyKwh: 0.0087, co2eGrams: 2128.68, carbonIntensityGco2ePerKwh: 244.7 };
const EMPTY: ServiceSummaryTotals = { collections: 0, failed: 0, notCalculated: 0, energyKwh: null, co2eGrams: null, carbonIntensityGco2ePerKwh: null };

function summary(totals: ServiceSummaryTotals, previous: ServiceSummaryTotals = EMPTY): ServicesSummaryResponse {
  return {
    from: '2026-11-12T22:00:00.000Z',
    to: '2026-11-13T22:00:00.000Z',
    totals,
    previous: { from: '2026-11-11T22:00:00.000Z', to: '2026-11-12T22:00:00.000Z', totals: previous },
    servicesByStatus: { ativo: 3, indisponivel: 0, sem_metricas: 0, removido: 0, total: 3 },
  };
}

describe('IndicatorsPanel — equivalências do CO₂e (#333)', () => {
  it('mostra as duas unidades com o aviso de ordem de grandeza', () => {
    const html = renderToStaticMarkup(<IndicatorsPanel summary={summary(TOTALS)} staleSince={null} />);
    expect(html).toContain('≈ 8,7 km de carro a gasolina · ≈ 170 cargas de celular');
    expect(html).toContain('(ordem de grandeza)');
  });

  it('leva o fator e as fontes ao texto lido, não só ao tooltip de hover', () => {
    const html = renderToStaticMarkup(<IndicatorsPanel summary={summary(TOTALS)} staleSince={null} />);
    // O tooltip não recebe foco: sem o sr-only a fonte não chegaria a leitor de tela nem a toque
    expect(html).toContain(`class="sr-only">: ${EQUIVALENTS_DISCLAIMER} EPA, Greenhouse Gas Equivalencies Calculator`);
    expect(html).toContain('consultado em 13/11/2026');
  });

  it('sem CO₂e calculado não mostra equivalência nem fonte', () => {
    const html = renderToStaticMarkup(<IndicatorsPanel summary={summary({ ...TOTALS, co2eGrams: null })} staleSince={null} />);
    expect(html).not.toContain('ordem de grandeza');
    expect(html).not.toContain('km de carro a gasolina');
  });
});

describe('IndicatorsPanel — coletas com falha no período', () => {
  it('mostra quantas coletas do período falharam, de quantas', () => {
    const html = renderToStaticMarkup(<IndicatorsPanel summary={summary({ ...TOTALS, collections: 12, failed: 2 })} staleSince={null} />);
    expect(html).toContain('Coletas com falha no período: 2 de 12');
  });
});

describe('IndicatorsPanel — variação contra o período anterior (mesma resposta)', () => {
  it('mostra a variação e o rótulo "vs. 24 h anteriores" quando há base', () => {
    const previous = { ...TOTALS, energyKwh: 0.0100, co2eGrams: 2000 };
    const html = renderToStaticMarkup(<IndicatorsPanel summary={summary(TOTALS, previous)} staleSince={null} />);
    expect(html).toContain('vs. 24 h anteriores');
    expect(html).toContain('▲');
  });

  it('sem cálculo no período anterior mostra o aviso visível, não um zero nem 100%', () => {
    const html = renderToStaticMarkup(<IndicatorsPanel summary={summary(TOTALS, EMPTY)} staleSince={null} />);
    expect(html).toContain('Sem cálculo no período anterior');
    expect(html).not.toContain('100%');
  });

  it('antes da primeira resposta mostra o estado de cálculo, sem valores', () => {
    const html = renderToStaticMarkup(<IndicatorsPanel summary={null} staleSince={null} />);
    expect(html).toContain('calculando');
    expect(html).toContain('aria-busy="true"');
  });
});

describe('IndicatorsPanel — números parados depois de uma falha (#234)', () => {
  const STALE_SINCE = '2026-11-13T22:00:00.000Z';

  it('diz desde quando os valores estão desatualizados, no formato do selo da página', () => {
    const html = renderToStaticMarkup(<IndicatorsPanel summary={summary(TOTALS)} staleSince={STALE_SINCE} />);
    // Formato de formatDayTime ("13/11 19:00:00", no fuso do navegador): o teste confere o texto e a hora existirem
    expect(html).toContain('Desatualizado desde ');
    expect(html).toContain(' · valores da última busca bem-sucedida.');
    expect(html).toMatch(/Desatualizado desde \d{2}\/\d{2} \d{2}:\d{2}:\d{2}/);
  });

  it('apaga os cards dos números parados, para não parecerem atuais', () => {
    const html = renderToStaticMarkup(<IndicatorsPanel summary={summary(TOTALS)} staleSince={STALE_SINCE} />);
    expect(html).toContain('metric--stale');
  });

  it('em dia, mantém os números em cor normal e sem a linha de desatualizado', () => {
    const html = renderToStaticMarkup(<IndicatorsPanel summary={summary(TOTALS)} staleSince={null} />);
    expect(html).not.toContain('Desatualizado desde');
    expect(html).not.toContain('metric--stale');
  });

  it('antes da primeira resposta, o valor é o traço do MissingValue, não a linha de desatualizado', () => {
    const html = renderToStaticMarkup(<IndicatorsPanel summary={summary({ ...TOTALS, energyKwh: null })} staleSince={null} />);
    expect(html).toContain('sem cálculo');
    expect(html).not.toContain('Desatualizado desde');
  });
});
