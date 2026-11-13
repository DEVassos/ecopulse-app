import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SummaryPanel from './SummaryPanel';
import { EQUIVALENTS_DISCLAIMER } from '../utils/equivalents';
import type { ServicesSummaryResponse } from '../services/services.types';

function summary(co2eGrams: number | null, energyKwh: number | null = 0.0087): ServicesSummaryResponse {
  return {
    period: { from: '2026-11-12T22:00:00.000Z', to: '2026-11-13T22:00:00.000Z' },
    energyKwh,
    co2eGrams,
    services: { active: 3, unavailable: 0, withoutMetrics: 0, removed: 0 },
  };
}

describe('SummaryPanel — equivalências do CO₂e (#333)', () => {
  it('mostra as duas unidades com o aviso de ordem de grandeza', () => {
    const html = renderToStaticMarkup(
      <SummaryPanel summary={summary(2128.68)} previousSummary={null} comparisonLoading={false} stale={false} />,
    );
    expect(html).toContain('≈ 8,7 km de carro a gasolina · ≈ 170 cargas de celular');
    expect(html).toContain('(ordem de grandeza)');
  });

  it('leva o fator e as fontes ao texto lido, não só ao tooltip de hover', () => {
    const html = renderToStaticMarkup(
      <SummaryPanel summary={summary(2128.68)} previousSummary={null} comparisonLoading={false} stale={false} />,
    );
    // O tooltip não recebe foco: sem o sr-only a fonte não chegaria a leitor de tela nem a toque
    expect(html).toContain(`class="sr-only">: ${EQUIVALENTS_DISCLAIMER} EPA, Greenhouse Gas Equivalencies Calculator`);
    expect(html).toContain('consultado em 13/11/2026');
  });

  it('sem CO₂e calculado não mostra equivalência nem fonte', () => {
    const html = renderToStaticMarkup(
      <SummaryPanel summary={summary(null)} previousSummary={null} comparisonLoading={false} stale={false} />,
    );
    expect(html).not.toContain('ordem de grandeza');
    expect(html).not.toContain('km de carro a gasolina');
  });
});
