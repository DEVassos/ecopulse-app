// Relatório do período (#402, US13 #54): achados gerados por regras fixas, sem IA, a partir do ranking do período e do
// período anterior de mesma duração. Fórmulas, limiares e o exemplo conferido no teste: docs/calculos.md § Relatório do
// período.
import type { RankedService } from '../services/ranking.types';
import { formatGrams, formatKwh } from './emissions';
import { formatNumber } from './format';

/** Campos do ranking que as regras leem: um campo novo no contrato não quebra quem chama nem as fixtures. */
export type ReportService = Pick<
  RankedService,
  'id' | 'name' | 'region' | 'energyKwh' | 'co2eGrams' | 'collections' | 'failed' | 'notCalculated'
>;

// ── Limiares (o porquê de cada um está em docs/calculos.md) ────────────────

/** Variação do total abaixo de 0,5%: "estável", o mesmo corte do ±0% do SummaryPanel. */
export const STABLE_CHANGE = 0.005;
/** Variação do total a partir de 10%: alta (alerta) ou queda relevante. */
export const RELEVANT_CHANGE = 0.1;
/** Um efeito explica a variação sozinho com pelo menos 60% da soma dos módulos dos dois efeitos. */
export const DOMINANT_EFFECT = 0.6;
/** Períodos comparáveis: menor ÷ maior número de coletas com cálculo dos dois períodos. */
export const COMPARABLE_RATIO = 0.8;
/** Coletas com cálculo mínimas em cada período para falar em tendência (cerca de 10 min de um serviço). */
export const MIN_SAMPLE = 20;
/** Concentração: o primeiro serviço a partir de 50%; senão, quantos somam 80%. Só com 3 ou mais serviços com cálculo. */
export const LEADER_SHARE = 0.5;
export const PARETO_SHARE = 0.8;
export const MIN_CONCENTRATION_SERVICES = 3;
/** Alta ou queda de um serviço: 20% do próprio valor e 5% do total do período anterior. */
export const SERVICE_CHANGE = 0.2;
export const SERVICE_MATERIALITY = 0.05;
/** Cobertura (coletas com cálculo ÷ coletas): ressalva abaixo de 95%, alerta abaixo de 80%. */
export const COVERAGE_CAVEAT = 0.95;
export const COVERAGE_ALERT = 0.8;

// ── Tipos ───────────────────────────────────────────────────────────────────

export type InsightKind = 'alerta' | 'oportunidade' | 'contexto';
/** De que regra o achado saiu; "confianca" ganha a etiqueta "Confiança dos dados" ao lado do tipo. */
export type InsightTopic = 'tendencia' | 'servico' | 'concentracao' | 'confianca';

/** Tela onde agir; a página monta o link com o período escolhido (`targetLink`). */
export interface InsightTarget {
  page: 'emissoes' | 'comparacao' | 'dashboard';
  serviceIds: string[];
}

export interface Insight {
  id: string;
  kind: InsightKind;
  topic: InsightTopic;
  /** O achado em uma frase, com número. */
  title: string;
  evidence: Array<{ label: string; value: string }>;
  cause: string;
  action: string;
  target: InsightTarget | null;
  /** Variação de CO₂e que o achado explica, em g, com sinal; null quando o achado não é uma variação. */
  impactGrams: number | null;
  caveats: string[];
}

export interface ReportTotals {
  energyKwh: number | null;
  co2eGrams: number | null;
  /** CO₂e ÷ energia (g CO₂e/kWh): a média das intensidades dos serviços, ponderada pela energia de cada um. */
  intensity: number | null;
  collections: number;
  /** Coletas com cálculo: `collections − notCalculated` (no ranking, `notCalculated` já inclui as falhas). */
  calculated: number;
  failed: number;
}

/** ΔC = ΔE × I₀ + E₁ × ΔI, identidade exata com I = C ÷ E. */
export interface Decomposition {
  deltaGrams: number;
  energyGrams: number;
  intensityGrams: number;
  /** |efeito energia| ÷ (|efeito energia| + |efeito intensidade|); null quando os dois são zero. */
  energyShare: number | null;
  driver: 'energia' | 'intensidade' | 'ambos' | null;
}

// ── Formatação das frases ───────────────────────────────────────────────────

const percent = (ratio: number) => `${formatNumber(ratio * 100, 1)}%`;
const sign = (value: number) => (value > 0 ? '+' : value < 0 ? '−' : '±');
/** "+17,4%"; abaixo de 0,05% o sinal some ("±0,0%"), para não sair um "−0,0%". */
export const signedPercent = (ratio: number) => `${sign(Math.abs(ratio) < 0.0005 ? 0 : ratio)}${percent(Math.abs(ratio))}`;
export const signedGrams = (grams: number) => `${grams === 0 ? '' : sign(grams)}${formatGrams(Math.abs(grams))}`;
export const formatIntensity = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} g/kWh`;
const count = (value: number) => value.toLocaleString('pt-BR');

// ── Totais e decomposição ───────────────────────────────────────────────────

const calculatedOf = (service: ReportService) => Math.max(0, service.collections - service.notCalculated);

function intensityOf(co2eGrams: number | null, energyKwh: number | null): number | null {
  return co2eGrams === null || energyKwh === null || energyKwh <= 0 ? null : co2eGrams / energyKwh;
}

/** Totais do período; energia e CO₂e somam só os serviços com cálculo e ficam null quando nenhum tem. */
export function reportTotals(services: readonly ReportService[]): ReportTotals {
  let energyKwh: number | null = null;
  let co2eGrams: number | null = null;
  let collections = 0;
  let calculated = 0;
  let failed = 0;
  for (const service of services) {
    if (service.energyKwh !== null) energyKwh = (energyKwh ?? 0) + service.energyKwh;
    if (service.co2eGrams !== null) co2eGrams = (co2eGrams ?? 0) + service.co2eGrams;
    collections += service.collections;
    calculated += calculatedOf(service);
    failed += service.failed;
  }
  return { energyKwh, co2eGrams, intensity: intensityOf(co2eGrams, energyKwh), collections, calculated, failed };
}

/** Parte das coletas com cálculo; null sem coletas. */
export function coverage(totals: ReportTotals): number | null {
  return totals.collections > 0 ? totals.calculated / totals.collections : null;
}

/** Variação relativa; null sem valor nos dois lados ou com base zero (não divide). */
export function relativeChange(current: number | null, previous: number | null): number | null {
  return current === null || previous === null || previous <= 0 ? null : (current - previous) / previous;
}

export function decompose(previous: ReportTotals, current: ReportTotals): Decomposition | null {
  const [e0, i0, c0] = [previous.energyKwh, previous.intensity, previous.co2eGrams];
  const [e1, i1, c1] = [current.energyKwh, current.intensity, current.co2eGrams];
  if (e0 === null || i0 === null || c0 === null || e1 === null || i1 === null || c1 === null) return null;
  const energyGrams = (e1 - e0) * i0;
  const intensityGrams = e1 * (i1 - i0);
  const sum = Math.abs(energyGrams) + Math.abs(intensityGrams);
  const energyShare = sum > 0 ? Math.abs(energyGrams) / sum : null;
  const driver =
    energyShare === null ? null : energyShare >= DOMINANT_EFFECT ? 'energia' : 1 - energyShare >= DOMINANT_EFFECT ? 'intensidade' : 'ambos';
  return { deltaGrams: c1 - c0, energyGrams, intensityGrams, energyShare, driver };
}

/** Uma barra do gráfico divergente de "De onde veio a variação" (#403). */
export interface EffectBar {
  key: 'energia' | 'intensidade' | 'total';
  grams: number;
  /** Comprimento em % de meia faixa (de um lado do zero), na escala do maior dos três valores. */
  widthPercent: number;
  direction: 'alta' | 'queda' | 'nula';
}

/**
 * Barras divergentes a partir do zero (#403): efeito energia, efeito intensidade média e a variação total, na mesma
 * escala. Efeitos de sinais opostos não são partes de um todo, por isso nada de barra segmentada: quem sobe vai para a
 * direita, quem desce para a esquerda, e a variação é o saldo. Valor diferente de zero pequeno demais ganha 1%.
 */
export function decompositionBars(d: Decomposition): EffectBar[] {
  const max = Math.max(Math.abs(d.energyGrams), Math.abs(d.intensityGrams), Math.abs(d.deltaGrams));
  const bar = (key: EffectBar['key'], grams: number): EffectBar => ({
    key,
    grams,
    widthPercent: max === 0 || grams === 0 ? 0 : Math.max(1, Math.round((Math.abs(grams) / max) * 1000) / 10),
    direction: grams > 0 ? 'alta' : grams < 0 ? 'queda' : 'nula',
  });
  return [bar('energia', d.energyGrams), bar('intensidade', d.intensityGrams), bar('total', d.deltaGrams)];
}

/** Janela anterior de mesma duração, imediatamente antes: [from − (to − from), from). */
export function previousWindow(fromMs: number, toMs: number): { fromMs: number; toMs: number } {
  return { fromMs: fromMs - (toMs - fromMs), toMs: fromMs };
}

/** Menor ÷ maior número de coletas com cálculo; null quando os dois são zero. */
function sampleRatio(previous: ReportTotals, current: ReportTotals): number | null {
  const max = Math.max(previous.calculated, current.calculated);
  return max > 0 ? Math.min(previous.calculated, current.calculated) / max : null;
}

// ── Regra 1: tendência do total ─────────────────────────────────────────────

const MIX_NOTE =
  'A intensidade média mistura o fator de cada região com a parte da energia gasta em cada uma: mais energia numa ' +
  'região mais suja sobe a média mesmo sem nenhum fator mudar.';

/** "de 847 Wh para 776 Wh" ou "de 242,3 g/kWh para 299 g/kWh"; vazio sem os dois valores. */
function effectRange(effect: 'energia' | 'intensidade', previous: ReportTotals, current: ReportTotals): string {
  if (effect === 'energia' && previous.energyKwh !== null && current.energyKwh !== null) {
    return `de ${formatKwh(previous.energyKwh)} para ${formatKwh(current.energyKwh)}`;
  }
  if (effect === 'intensidade' && previous.intensity !== null && current.intensity !== null) {
    return `de ${formatIntensity(previous.intensity)} para ${formatIntensity(current.intensity)}`;
  }
  return '';
}

/**
 * Efeitos de sinais opostos: um empurra o CO₂e para cima e o outro para baixo, e a variação é o saldo. Aqui não existe
 * "% da variação" (o efeito que venceu passa de 100% dela); a frase cita o que venceu e o contrário, em gramas.
 */
function opposingText(d: Decomposition, previous: ReportTotals, current: ReportTotals, change: string): string {
  const name = { energia: 'energia consumida', intensidade: 'intensidade média' } as const;
  const effect = (key: 'energia' | 'intensidade', grams: number) => {
    const range = effectRange(key, previous, current);
    return `${name[key]} (${signedGrams(grams)}${range ? `, ${range}` : ''})`;
  };
  const energia = effect('energia', d.energyGrams);
  const intensidade = effect('intensidade', d.intensityGrams);
  if (d.deltaGrams === 0) return `Os dois efeitos se anularam: ${energia} e ${intensidade}. ${MIX_NOTE}`;
  const intensityWins = Math.sign(d.intensityGrams) === Math.sign(d.deltaGrams);
  const [winner, loser] = intensityWins ? [intensidade, energia] : [energia, intensidade];
  return `A ${change} vem da ${winner}, maior que o efeito contrário da ${loser}. ${MIX_NOTE}`;
}

/**
 * Por que o total mudou, pelo efeito dominante. O efeito "intensidade média" mistura fator e mistura de regiões. Com os
 * dois efeitos no mesmo sentido, a soma dos módulos é a própria variação, e a parte de cada um é "% da variação".
 */
function driverText(d: Decomposition, previous: ReportTotals, current: ReportTotals, change: string): string {
  if (d.energyGrams * d.intensityGrams < 0) return opposingText(d, previous, current, change);
  const share = (grams: number) => percent(Math.abs(grams) / (Math.abs(d.energyGrams) + Math.abs(d.intensityGrams)));
  if (d.driver === 'energia' && previous.energyKwh !== null && current.energyKwh !== null) {
    return `A ${change} vem da energia consumida (${share(d.energyGrams)} da variação): de ${formatKwh(previous.energyKwh)} para ${formatKwh(current.energyKwh)}.`;
  }
  if (d.driver === 'intensidade' && previous.intensity !== null && current.intensity !== null) {
    return (
      `A ${change} vem da intensidade média (${share(d.intensityGrams)} da variação): de ${formatIntensity(previous.intensity)} ` +
      `para ${formatIntensity(current.intensity)}. Ela mistura o fator de cada região com a parte da energia gasta em ` +
      'cada uma: mais energia numa região mais suja sobe a média mesmo sem nenhum fator mudar.'
    );
  }
  return `A ${change} vem dos dois efeitos: energia ${signedGrams(d.energyGrams)} (${share(d.energyGrams)}) e intensidade média ${signedGrams(d.intensityGrams)} (${share(d.intensityGrams)}).`;
}

/**
 * Tendência do CO₂e total contra o período anterior. Null sem cálculo no período ou sem o período anterior (a página
 * diz que o relatório saiu sem comparação). Com amostra pequena ou períodos não comparáveis, vira contexto com ressalva.
 */
export function trendInsight(current: readonly ReportService[], previous: readonly ReportService[] | null): Insight | null {
  const now = reportTotals(current);
  if (now.co2eGrams === null || previous === null) return null;
  const before = reportTotals(previous);
  const base: Omit<Insight, 'kind' | 'title' | 'cause' | 'action'> = {
    id: 'tendencia',
    topic: 'tendencia',
    evidence: [],
    target: null,
    impactGrams: null,
    caveats: [],
  };
  if (before.co2eGrams === null || before.co2eGrams <= 0) {
    return {
      ...base,
      kind: 'contexto',
      title: `Sem base para comparar: ${before.co2eGrams === null ? `${count(before.collections)} coletas no período anterior, nenhuma com cálculo` : 'o CO₂e do período anterior foi zero'}`,
      cause: 'Sem emissão calculada no período anterior, não há variação a medir; o relatório mostra só o período escolhido.',
      action: 'Escolher um período que comece depois que o monitoramento já estava ligado.',
    };
  }

  const change = (now.co2eGrams - before.co2eGrams) / before.co2eGrams;
  const d = decompose(before, now);
  const evidence = [
    { label: 'CO₂e no período', value: formatGrams(now.co2eGrams) },
    { label: 'CO₂e no período anterior', value: formatGrams(before.co2eGrams) },
    { label: 'Variação', value: `${signedGrams(now.co2eGrams - before.co2eGrams)} (${signedPercent(change)})` },
    ...(d === null
      ? []
      : [
          { label: 'Efeito energia (ΔE × I₀)', value: signedGrams(d.energyGrams) },
          { label: 'Efeito intensidade média (E₁ × ΔI)', value: signedGrams(d.intensityGrams) },
        ]),
    { label: 'Coletas com cálculo', value: `${count(now.calculated)} · antes ${count(before.calculated)}` },
  ];
  const caveats: string[] = [];
  const [covNow, covBefore] = [coverage(now) ?? 1, coverage(before) ?? 1];
  if (covNow < COVERAGE_CAVEAT || covBefore < COVERAGE_CAVEAT) {
    caveats.push(`${percent(covNow)} das coletas do período e ${percent(covBefore)} das do anterior têm cálculo: os dois totais são um piso.`);
  }
  const moved = `O CO₂e ${change >= 0 ? 'subiu' : 'caiu'} ${percent(Math.abs(change))}`;
  const withEvidence = { ...base, evidence, caveats };

  if (now.calculated < MIN_SAMPLE || before.calculated < MIN_SAMPLE) {
    return {
      ...withEvidence,
      kind: 'contexto',
      title: `${moved}, mas com poucas coletas com cálculo para ser tendência`,
      cause: `São ${count(now.calculated)} coletas com cálculo no período e ${count(before.calculated)} no anterior; a regra pede ${MIN_SAMPLE} em cada um.`,
      action: 'Escolher um período mais longo.',
    };
  }
  const ratio = sampleRatio(before, now) ?? 0;
  if (ratio < COMPARABLE_RATIO) {
    return {
      ...withEvidence,
      kind: 'contexto',
      title: `${moved}, mas os dois períodos não são comparáveis`,
      cause:
        `O período anterior teve ${count(before.calculated)} coletas com cálculo e este, ${count(now.calculated)} ` +
        `(razão ${formatNumber(ratio, 2)}, abaixo de ${formatNumber(COMPARABLE_RATIO, 1)}): a variação mede sobretudo o tempo monitorado, não o consumo.`,
      action: 'Conferir a confiança dos dados e comparar períodos com o monitoramento ligado nos dois.',
    };
  }

  const delta = now.co2eGrams - before.co2eGrams;
  const stable = Math.abs(change) < RELEVANT_CHANGE;
  const explanation = d === null ? '' : ` ${driverText(d, before, now, stable ? 'variação' : change > 0 ? 'alta' : 'queda')}`;
  if (stable) {
    return {
      ...withEvidence,
      impactGrams: delta,
      kind: 'contexto',
      title: `O CO₂e ficou estável: ${formatGrams(now.co2eGrams)} contra ${formatGrams(before.co2eGrams)} no período anterior (${signedPercent(change)})`,
      cause:
        Math.abs(change) < STABLE_CHANGE
          ? 'A variação ficou abaixo de 0,5%.'
          : `Abaixo de 10%, a oscilação da coleta e da atualização do fator de intensidade (cache de 1 h) explica a diferença.${explanation}`,
      action: 'Nada a fazer pela tendência; os achados por serviço, abaixo, dizem onde agir.',
    };
  }
  const servicesToCompare = current
    .filter((service) => service.co2eGrams !== null)
    .sort((a, b) => (b.co2eGrams ?? 0) - (a.co2eGrams ?? 0))
    .slice(0, 10)
    .map((service) => service.id);
  const byRegion = d?.driver === 'intensidade';
  return {
    ...withEvidence,
    impactGrams: delta,
    kind: change > 0 ? 'alerta' : 'contexto',
    title: `As emissões ${change > 0 ? 'subiram' : 'caíram'} ${percent(Math.abs(change))}: ${formatGrams(now.co2eGrams)} de CO₂e contra ${formatGrams(before.co2eGrams)} no período anterior`,
    cause: explanation.trim() || 'Sem energia calculada nos dois períodos para separar o efeito da energia e o da intensidade.',
    action: byRegion
      ? change > 0
        ? 'Ver no Dashboard as regiões com mais CO₂e e a alternativa mais limpa de cada uma.'
        : 'A queda veio da rede elétrica, não do consumo: ela volta se a intensidade subir.'
      : change > 0
        ? 'Ver na Comparação quais serviços consumiram mais energia.'
        : 'Confirmar na Comparação que a queda é consumo menor, e não serviço fora do ar.',
    target: byRegion ? { page: 'dashboard', serviceIds: [] } : { page: 'comparacao', serviceIds: servicesToCompare },
  };
}

// ── Regra 2: altas e quedas por serviço ─────────────────────────────────────

/**
 * Serviços cujo CO₂e mudou ao menos 20% do próprio valor e 5% do total anterior, com a causa (energia ou intensidade da
 * região dele). Só serviços com amostra e cobertura comparáveis nos dois períodos; o maior |ΔC| primeiro.
 */
export function serviceChangeInsights(current: readonly ReportService[], previous: readonly ReportService[] | null): Insight[] {
  const totalBefore = previous === null ? null : reportTotals(previous).co2eGrams;
  if (previous === null || totalBefore === null || totalBefore <= 0) return [];
  const before = new Map(previous.map((service) => [service.id, service]));
  const insights: Insight[] = [];
  for (const service of current) {
    const old = before.get(service.id);
    if (!old || old.co2eGrams === null || old.co2eGrams <= 0 || service.co2eGrams === null) continue;
    const [t0, t1] = [reportTotals([old]), reportTotals([service])];
    const ratio = sampleRatio(t0, t1);
    if (t0.calculated < MIN_SAMPLE || t1.calculated < MIN_SAMPLE || ratio === null || ratio < COMPARABLE_RATIO) continue;
    const delta = service.co2eGrams - old.co2eGrams;
    const change = delta / old.co2eGrams;
    if (Math.abs(change) < SERVICE_CHANGE || Math.abs(delta) < SERVICE_MATERIALITY * totalBefore) continue;
    const d = decompose(t0, t1);
    if (d === null || t0.energyKwh === null || t1.energyKwh === null || t0.intensity === null || t1.intensity === null) continue;

    const energy = `de ${formatKwh(t0.energyKwh)} para ${formatKwh(t1.energyKwh)}`;
    const region = service.region ? ` (${service.region})` : '';
    const sameIntensity = Math.abs(t1.intensity - t0.intensity) / t0.intensity < STABLE_CHANGE;
    const intensity = sameIntensity
      ? `ficou em ${formatIntensity(t1.intensity)}`
      : `foi de ${formatIntensity(t0.intensity)} para ${formatIntensity(t1.intensity)}`;
    const cause =
      d.driver === 'energia'
        ? `A causa é energia, ${energy}; a intensidade da região${region} ${intensity}.`
        : d.driver === 'intensidade'
          ? `A causa é a intensidade da região${region}, que ${intensity}, com energia ${energy}.`
          : `Energia (${energy}) e intensidade da região${region} (que ${intensity}) mudaram juntas.`;
    const up = delta > 0;
    insights.push({
      id: `servico-${service.id}`,
      kind: up ? 'alerta' : 'contexto',
      topic: 'servico',
      title: `${service.name} emitiu ${percent(Math.abs(change))} ${up ? 'a mais' : 'a menos'} de CO₂e que no período anterior`,
      evidence: [
        { label: 'CO₂e', value: `${formatGrams(old.co2eGrams)} → ${formatGrams(service.co2eGrams)} (${signedGrams(delta)})` },
        { label: 'Energia', value: `${formatKwh(t0.energyKwh)} → ${formatKwh(t1.energyKwh)}` },
        { label: 'Intensidade', value: `${formatIntensity(t0.intensity)} → ${formatIntensity(t1.intensity)}` },
      ],
      cause,
      action:
        up && d.driver === 'intensidade'
          ? 'Ver a região no Dashboard e a alternativa mais limpa.'
          : up
            ? 'Ver em Emissões em que horário o consumo subiu.'
            : 'Conferir em Emissões se a queda é consumo menor ou tempo sem coleta.',
      target: up && d.driver === 'intensidade' ? { page: 'dashboard', serviceIds: [] } : { page: 'emissoes', serviceIds: [service.id] },
      impactGrams: delta,
      caveats: [],
    });
  }
  return insights.sort((a, b) => Math.abs(b.impactGrams ?? 0) - Math.abs(a.impactGrams ?? 0));
}

// ── Regra 3: concentração ───────────────────────────────────────────────────

/** Quem pesa no total: o primeiro serviço com 50% ou mais; senão, quantos somam 80% (Pareto). */
export function concentrationInsight(services: readonly ReportService[]): Insight | null {
  const ranked = services
    .filter((service): service is ReportService & { co2eGrams: number } => service.co2eGrams !== null)
    .sort((a, b) => b.co2eGrams - a.co2eGrams);
  const total = ranked.reduce((sum, service) => sum + service.co2eGrams, 0);
  if (ranked.length < MIN_CONCENTRATION_SERVICES || total <= 0) return null;

  let size = 1;
  if (ranked[0].co2eGrams / total < LEADER_SHARE) {
    let sum = 0;
    size = ranked.findIndex((service) => (sum += service.co2eGrams) / total >= PARETO_SHARE - 1e-9) + 1;
  }
  const group = ranked.slice(0, size);
  const groupGrams = group.reduce((sum, service) => sum + service.co2eGrams, 0);
  const rest = ranked.length - size;
  const concentrated = size === 1 || size <= ranked.length / 2;
  const names = group.map((service) => service.name).join(', ');
  const title =
    size === 1
      ? `${group[0].name} concentra ${percent(groupGrams / total)} do CO₂e do período`
      : concentrated
        ? `${size} de ${ranked.length} serviços somam ${percent(groupGrams / total)} do CO₂e do período`
        : `O CO₂e está espalhado: são precisos ${size} de ${ranked.length} serviços para chegar a 80%`;
  return {
    id: 'concentracao',
    kind: 'contexto',
    topic: 'concentracao',
    title,
    evidence: [
      ...group.slice(0, 4).map((service) => ({ label: service.name, value: `${formatGrams(service.co2eGrams)} (${percent(service.co2eGrams / total)})` })),
      ...(size > 4 ? [{ label: `Mais ${size - 4} do grupo`, value: percent(group.slice(4).reduce((s, x) => s + x.co2eGrams, 0) / total) }] : []),
      ...(rest > 0 ? [{ label: `Demais ${rest} serviços`, value: `${formatGrams(total - groupGrams)} (${percent((total - groupGrams) / total)})` }] : []),
    ],
    cause: concentrated
      ? `${size === 1 ? 'Sozinho, ele soma' : 'Juntos, eles somam'} ${formatGrams(groupGrams)} de ${formatGrams(total)}: cada 10% a menos ${size === 1 ? 'nele' : 'neles'} tira ${formatGrams(groupGrams * 0.1)} do total.`
      : 'Nenhum grupo pequeno de serviços domina o total: a redução precisa vir de vários serviços.',
    action: concentrated ? `Priorizar ${names}.` : 'Comparar os maiores para ver o que os separa: energia ou região.',
    target:
      size === 1
        ? { page: 'emissoes', serviceIds: [group[0].id] }
        : { page: 'comparacao', serviceIds: ranked.slice(0, Math.max(size, 2)).slice(0, 10).map((service) => service.id) },
    impactGrams: null,
    caveats: [],
  };
}

// ── Regra 4: confiança dos dados ────────────────────────────────────────────

/** Coletas sem cálculo (com falha ou sem fator) deixam o total menor que o real: ressalva abaixo de 95%, alerta de 80%. */
export function qualityInsight(services: readonly ReportService[]): Insight | null {
  const totals = reportTotals(services);
  const covered = coverage(totals);
  if (covered === null || covered >= COVERAGE_CAVEAT) return null;
  const affected = services
    .filter((service) => service.notCalculated > 0)
    .sort((a, b) => b.notCalculated - a.notCalculated || a.name.localeCompare(b.name, 'pt-BR'));
  const cite = (service: ReportService) =>
    `${service.name}: ${count(service.notCalculated)} de ${count(service.collections)} sem cálculo` +
    (service.failed > 0 ? ` (${count(Math.min(service.failed, service.notCalculated))} com falha)` : '');
  const listed = affected.slice(0, 3).map(cite).join('; ');
  const more = affected.length > 3 ? `; e mais ${affected.length - 3} serviços` : '';
  const missing = totals.collections - totals.calculated;
  const failed = Math.min(totals.failed, missing);
  return {
    id: 'confianca',
    kind: covered < COVERAGE_ALERT ? 'alerta' : 'contexto',
    topic: 'confianca',
    title:
      covered < COVERAGE_ALERT
        ? `Só ${percent(covered)} das coletas do período têm cálculo: o CO₂e mostrado está bem abaixo do real`
        : `${percent(covered)} das coletas do período têm cálculo: o CO₂e real é um pouco maior que o mostrado`,
    evidence: [
      { label: 'Coletas no período', value: count(totals.collections) },
      { label: 'Com cálculo', value: `${count(totals.calculated)} (${percent(covered)})` },
      { label: 'Com falha', value: count(failed) },
      { label: 'Sem cálculo por outro motivo', value: count(missing - failed) },
    ],
    cause: `${listed}${more}. Coleta com falha (serviço fora do ar ou sem métricas) ou sem fator de intensidade da região não entra na soma.`,
    action: `Conferir a disponibilidade de ${affected[0]?.name ?? 'cada serviço'} antes de comparar períodos.`,
    target: affected[0] ? { page: 'emissoes', serviceIds: [affected[0].id] } : null,
    impactGrams: null,
    caveats: [],
  };
}

// ── Ordem, relatório e links ────────────────────────────────────────────────

/** Maior |impactGrams| primeiro; achados sem impacto em gramas no fim, na ordem em que chegaram (ordenação estável). */
export function sortInsights(insights: readonly Insight[]): Insight[] {
  const weight = (insight: Insight) => (insight.impactGrams === null ? -1 : Math.abs(insight.impactGrams));
  return [...insights].sort((a, b) => weight(b) - weight(a));
}

export interface Report {
  totals: ReportTotals;
  previousTotals: ReportTotals | null;
  decomposition: Decomposition | null;
  /** A tendência abre o relatório (frase-resumo e "De onde veio a variação"); não se repete na lista. */
  trend: Insight | null;
  /** Os demais achados, em ordem de impacto; a confiança dos dados antes da concentração entre os sem impacto. */
  insights: Insight[];
}

export function buildReport(current: readonly ReportService[], previous: readonly ReportService[] | null): Report {
  const totals = reportTotals(current);
  const previousTotals = previous === null ? null : reportTotals(previous);
  const found = [...serviceChangeInsights(current, previous), qualityInsight(current), concentrationInsight(current)];
  return {
    totals,
    previousTotals,
    decomposition: previousTotals === null ? null : decompose(previousTotals, totals),
    trend: trendInsight(current, previous),
    insights: sortInsights(found.filter((insight): insight is Insight => insight !== null)),
  };
}

/** Frase-resumo: a tendência quando há; senão, o total do período. */
export function headline(report: Report): string {
  if (report.trend) return `${report.trend.title}.`;
  const { co2eGrams, energyKwh } = report.totals;
  if (co2eGrams === null || energyKwh === null) return 'Há coletas no período, mas nenhuma com CO₂e calculado.';
  return `Os serviços emitiram ${formatGrams(co2eGrams)} de CO₂e com ${formatKwh(energyKwh)} no período.`;
}

/** Link do "O que fazer", com o mesmo período do relatório (`de`/`ate` em AAAA-MM-DD). */
export function targetLink(target: InsightTarget | null, start: string, end: string): { to: string; label: string } | null {
  if (target === null) return null;
  const period = `de=${start}&ate=${end}`;
  const ids = target.serviceIds.map(encodeURIComponent);
  if (target.page === 'comparacao' && ids.length >= 2) {
    return { to: `/comparacao?servicos=${ids.join(',')}&${period}`, label: 'Abrir na Comparação' };
  }
  if (target.page !== 'dashboard' && ids.length > 0) return { to: `/emissoes?servico=${ids[0]}&${period}`, label: 'Abrir em Emissões' };
  return { to: '/', label: 'Abrir o Dashboard' };
}
