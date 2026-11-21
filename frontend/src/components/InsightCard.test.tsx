import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import InsightCard from './InsightCard';
import type { Insight } from '../utils/insights';

const insight: Insight = {
  id: 'confianca',
  kind: 'alerta',
  topic: 'confianca',
  title: 'Só 75,7% das coletas do período têm cálculo: o CO₂e mostrado está bem abaixo do real',
  evidence: [{ label: 'Com cálculo', value: '2.180 (75,7%)' }],
  cause: 'Email Dispatcher: 700 de 2.880 sem cálculo (100 com falha).',
  action: 'Conferir a disponibilidade de Email Dispatcher antes de comparar períodos.',
  target: { page: 'emissoes', serviceIds: ['email-dispatcher'] },
  impactGrams: null,
  caveats: ['Os dois totais são um piso.'],
};

function render(props: Partial<Parameters<typeof InsightCard>[0]> = {}): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <InsightCard insight={insight} link={{ to: '/emissoes?servico=email-dispatcher', label: 'Abrir em Emissões' }} {...props} />
    </MemoryRouter>,
  );
}

describe('InsightCard (#403)', () => {
  it('diz o tipo em texto, não só na cor, e marca a confiança dos dados', () => {
    const html = render();
    expect(html).toContain('Alerta');
    expect(html).toContain('Confiança dos dados');
    expect(html).toContain('<h3 id="achado-confianca"');
  });

  it('mostra evidência, causa, ressalva e o link do "O que fazer"', () => {
    const html = render();
    expect(html).toContain('<dt class="text-xs text-muted">Com cálculo</dt>');
    expect(html).toContain('Ressalva: Os dois totais são um piso.');
    expect(html).toContain('href="/emissoes?servico=email-dispatcher"');
  });

  it('com impacto em gramas, mostra o valor com sinal; sem link, só o texto da ação', () => {
    const html = render({ insight: { ...insight, kind: 'contexto', topic: 'servico', impactGrams: -75.6 }, link: null });
    expect(html).toContain('Contexto');
    expect(html).toContain('−75,6 g');
    expect(html).not.toContain('Confiança dos dados');
    expect(html).not.toContain('<a ');
  });
});
