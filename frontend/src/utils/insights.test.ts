import { describe, expect, it } from 'vitest';
import type { Insight, ReportService } from './insights';
import {
  buildReport,
  concentrationInsight,
  decompose,
  headline,
  previousWindow,
  qualityInsight,
  relativeChange,
  reportTotals,
  serviceChangeInsights,
  signedPercent,
  sortInsights,
  targetLink,
  trendInsight,
} from './insights';

function service(name: string, energyKwh: number | null, co2eGrams: number | null, extra: Partial<ReportService> = {}): ReportService {
  return {
    id: name.toLowerCase().replace(/ /g, '-'),
    name,
    region: null,
    energyKwh,
    co2eGrams,
    collections: 2880,
    failed: 0,
    notCalculated: 0,
    ...extra,
  };
}

// Exemplo de docs/calculos.md § Relatório do período: nenhum fator mudou, mas a energia saiu de Montreal (40 g/kWh)
// para Virgínia (378 g/kWh), e a intensidade média subiu
const previous = [
  service('Fraud Detector', 0.5, 189, { region: 'Virgínia' }),
  service('Audit Stream', 0.4, 186, { region: 'Kanto' }),
  service('Reporting Batch', 0.6, 24, { region: 'Quebec' }),
];
const current = [
  service('Fraud Detector', 0.7, 264.6, { region: 'Virgínia' }),
  service('Audit Stream', 0.4, 186, { region: 'Kanto' }),
  service('Reporting Batch', 0.45, 18, { region: 'Quebec' }),
  service('Email Dispatcher', null, null, { region: 'Sudeste', collections: 600, failed: 600, notCalculated: 600 }),
];

/** Um serviço só, com o CO₂e do período anterior e o deste, na mesma intensidade (400 g/kWh). */
function pair(before: number, now: number, nowExtra: Partial<ReportService> = {}): [ReportService[], ReportService[]] {
  return [[service('Checkout', before / 400, before)], [service('Checkout', now / 400, now, nowExtra)]];
}

describe('reportTotals e decompose — exemplo de docs/calculos.md', () => {
  it('soma energia e CO₂e dos serviços com cálculo e conta calculadas como collections − notCalculated', () => {
    const totals = reportTotals(current);
    expect(totals.energyKwh).toBeCloseTo(1.55, 10);
    expect(totals.co2eGrams).toBeCloseTo(468.6, 10);
    expect(totals.intensity).toBeCloseTo(302.322580645, 6);
    expect([totals.collections, totals.calculated, totals.failed]).toEqual([9240, 8640, 600]);
    expect(reportTotals(previous).intensity).toBeCloseTo(266, 10);
  });

  it('divide ΔC em ΔE × I₀ + E₁ × ΔI, e as duas partes somam a variação', () => {
    const d = decompose(reportTotals(previous), reportTotals(current));
    expect(d?.deltaGrams).toBeCloseTo(69.6, 10);
    expect(d?.energyGrams).toBeCloseTo(13.3, 10);
    expect(d?.intensityGrams).toBeCloseTo(56.3, 10);
    expect((d?.energyGrams ?? 0) + (d?.intensityGrams ?? 0)).toBeCloseTo(d?.deltaGrams ?? NaN, 10);
    expect(d?.energyShare).toBeCloseTo(0.1911, 4);
    expect(d?.driver).toBe('intensidade');
  });

  it('sem energia num dos períodos não decompõe', () => {
    expect(decompose(reportTotals([service('A', null, null)]), reportTotals(current))).toBeNull();
  });
});

describe('trendInsight', () => {
  it('alta de 10% ou mais é alerta, com a variação e as duas partes', () => {
    const trend = trendInsight(current, previous);
    expect(trend?.kind).toBe('alerta');
    expect(trend?.title).toBe('As emissões subiram 17,4%: 469 g de CO₂e contra 399 g no período anterior');
    expect(trend?.cause).toContain('intensidade média (80,9% da variação): de 266 g/kWh para 302,3 g/kWh');
    expect(trend?.cause).toContain('sem nenhum fator mudar');
    expect(trend?.evidence).toContainEqual({ label: 'Efeito energia (ΔE × I₀)', value: '+13,3 g' });
    expect(trend?.evidence).toContainEqual({ label: 'Efeito intensidade média (E₁ × ΔI)', value: '+56,3 g' });
    expect(trend?.impactGrams).toBeCloseTo(69.6, 10);
    expect(trend?.caveats[0]).toBe('93,5% das coletas do período e 100,0% das do anterior têm cálculo: os dois totais são um piso.');
    expect(trend?.target).toEqual({ page: 'dashboard', serviceIds: [] });
  });

  it('com a mesma intensidade, a causa é a energia', () => {
    const [before, now] = pair(100, 130);
    const trend = trendInsight(now, before);
    expect(trend?.cause).toBe('A alta vem da energia consumida (100,0% da variação): de 250 Wh para 325 Wh.');
    expect(trend?.target?.page).toBe('comparacao');
  });

  it('com os dois efeitos abaixo de 60%, cita os dois', () => {
    const before = [service('A', 1, 100)];
    const now = [service('A', 1.2, 144)];
    // ΔE × I₀ = 0,2 × 100 = 20 g; E₁ × ΔI = 1,2 × (120 − 100) = 24 g; 20 ÷ 44 = 45,5%
    expect(trendInsight(now, before)?.cause).toBe('A alta vem dos dois efeitos: energia +20,0 g (45,5%) e intensidade média +24,0 g (54,5%).');
  });

  it('queda de 10% ou mais é contexto, não alerta', () => {
    const [before, now] = pair(100, 80);
    const trend = trendInsight(now, before);
    expect(trend?.kind).toBe('contexto');
    expect(trend?.title).toBe('As emissões caíram 20,0%: 80,0 g de CO₂e contra 100 g no período anterior');
  });

  it('abaixo de 10% o período fica estável, com o motivo', () => {
    const [before, now] = pair(100, 105);
    const trend = trendInsight(now, before);
    expect(trend?.kind).toBe('contexto');
    expect(trend?.title).toBe('O CO₂e ficou estável: 105 g contra 100 g no período anterior (+5,0%)');
    expect(trend?.cause).toContain('cache de 1 h');
  });

  it('abaixo de 0,5% diz só que ficou estável', () => {
    const [before, now] = pair(400, 401);
    expect(trendInsight(now, before)?.cause).toBe('A variação ficou abaixo de 0,5%.');
  });

  it('com razão de coletas abaixo de 0,8, a variação vira contexto sem impacto', () => {
    const [before, now] = pair(100, 300, { collections: 2880 });
    before[0].collections = 1000;
    const trend = trendInsight(now, before);
    expect(trend?.title).toBe('O CO₂e subiu 200,0%, mas os dois períodos não são comparáveis');
    expect(trend?.cause).toContain('razão 0,35, abaixo de 0,8');
    expect(trend?.impactGrams).toBeNull();
  });

  it('com menos de 20 coletas com cálculo, não fala em tendência', () => {
    const [before, now] = pair(100, 300, { collections: 19 });
    before[0].collections = 19;
    expect(trendInsight(now, before)?.title).toBe('O CO₂e subiu 200,0%, mas com poucas coletas com cálculo para ser tendência');
  });

  it('sem período anterior não há tendência; sem cálculo nele, diz que não há base', () => {
    expect(trendInsight(current, null)).toBeNull();
    const trend = trendInsight(current, [service('A', null, null, { notCalculated: 2880 })]);
    expect(trend?.title).toBe('Sem base para comparar: 2.880 coletas no período anterior, nenhuma com cálculo');
  });
});

describe('serviceChangeInsights', () => {
  it('destaca a alta de 20% ou mais que passa de 5% do total anterior, com a causa', () => {
    const found = serviceChangeInsights(current, previous);
    // Reporting Batch caiu 25%, mas 6 g não chegam a 5% de 399 g (19,95 g)
    expect(found.map((insight) => insight.id)).toEqual(['servico-fraud-detector']);
    expect(found[0].title).toBe('Fraud Detector emitiu 40,0% a mais de CO₂e que no período anterior');
    expect(found[0].cause).toBe('A causa é energia, de 500 Wh para 700 Wh; a intensidade da região (Virgínia) ficou em 378 g/kWh.');
    expect(found[0].impactGrams).toBeCloseTo(75.6, 10);
    expect(found[0].target).toEqual({ page: 'emissoes', serviceIds: ['fraud-detector'] });
  });

  it('pula serviço com amostra não comparável', () => {
    const [before, now] = pair(100, 200, { collections: 1000 });
    expect(serviceChangeInsights(now, before)).toEqual([]);
  });
});

describe('concentrationInsight', () => {
  it('cita o primeiro serviço quando ele passa de 50%', () => {
    const insight = concentrationInsight(current);
    expect(insight?.title).toBe('Fraud Detector concentra 56,5% do CO₂e do período');
    expect(insight?.cause).toBe('Sozinho, ele soma 265 g de 469 g: cada 10% a menos nele tira 26,5 g do total.');
  });

  it('senão, conta quantos somam 80%', () => {
    const grams = [40, 30, 15, 5, 5, 5];
    const insight = concentrationInsight(grams.map((value, index) => service(`S${index}`, value / 400, value)));
    expect(insight?.title).toBe('3 de 6 serviços somam 85,0% do CO₂e do período');
  });

  it('diz que está espalhado quando são precisos mais da metade dos serviços', () => {
    const grams = [30, 25, 20, 15, 10];
    const insight = concentrationInsight(grams.map((value, index) => service(`S${index}`, value / 400, value)));
    expect(insight?.title).toBe('O CO₂e está espalhado: são precisos 4 de 5 serviços para chegar a 80%');
  });

  it('exige 3 serviços com cálculo', () => {
    expect(concentrationInsight([service('A', 1, 10), service('B', 1, 5), service('C', null, null)])).toBeNull();
  });
});

describe('qualityInsight', () => {
  it('abaixo de 95% de cobertura sai a ressalva citando os serviços', () => {
    const insight = qualityInsight(current);
    expect(insight?.kind).toBe('contexto');
    expect(insight?.title).toBe('93,5% das coletas do período têm cálculo: o CO₂e real é um pouco maior que o mostrado');
    expect(insight?.cause).toContain('Email Dispatcher: 600 de 600 sem cálculo (600 com falha)');
  });

  it('abaixo de 80% é alerta; a partir de 95% não sai achado', () => {
    expect(qualityInsight([service('A', 1, 10, { notCalculated: 700, failed: 100 })])?.kind).toBe('alerta');
    expect(qualityInsight([service('A', 1, 10, { notCalculated: 144 })])).toBeNull();
  });
});

describe('ordem, relatório e links', () => {
  it('ordena por |impacto| e deixa os sem impacto no fim, na ordem de chegada', () => {
    const make = (id: string, impactGrams: number | null) => ({ id, impactGrams }) as Insight;
    const sorted = sortInsights([make('a', null), make('b', -30), make('c', null), make('d', 50)]);
    expect(sorted.map((insight) => insight.id)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('monta o relatório do exemplo: tendência à parte e achados em ordem de impacto', () => {
    const report = buildReport(current, previous);
    expect(report.insights.map((insight) => insight.id)).toEqual(['servico-fraud-detector', 'confianca', 'concentracao']);
    expect(headline(report)).toBe('As emissões subiram 17,4%: 469 g de CO₂e contra 399 g no período anterior.');
    expect(headline(buildReport(current, null))).toBe('Os serviços emitiram 469 g de CO₂e com 1,55 kWh no período.');
  });

  it('janela anterior de mesma duração e variação sem base zero', () => {
    expect(previousWindow(1000, 1600)).toEqual({ fromMs: 400, toMs: 1000 });
    expect(relativeChange(110, 100)).toBeCloseTo(0.1, 10);
    expect(relativeChange(110, 0)).toBeNull();
    expect(signedPercent(0.174436)).toBe('+17,4%');
    expect(signedPercent(-0.0002)).toBe('±0,0%');
  });

  it('leva o período ao link do "O que fazer"', () => {
    expect(targetLink({ page: 'emissoes', serviceIds: ['fraud-detector'] }, '2026-11-14', '2026-11-20')).toEqual({
      to: '/emissoes?servico=fraud-detector&de=2026-11-14&ate=2026-11-20',
      label: 'Abrir em Emissões',
    });
    expect(targetLink({ page: 'comparacao', serviceIds: ['1', '2'] }, '2026-11-21', '2026-11-21')?.to).toBe(
      '/comparacao?servicos=1,2&de=2026-11-21&ate=2026-11-21',
    );
    expect(targetLink({ page: 'dashboard', serviceIds: [] }, '2026-11-21', '2026-11-21')?.to).toBe('/');
    expect(targetLink(null, '2026-11-21', '2026-11-21')).toBeNull();
  });
});
