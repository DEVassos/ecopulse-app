// Funções puras da página Emissões: soma em intervalos, totais, datas do filtro, resumo e formatação.

import { formatQuantity } from './units';
import type { EmissionPoint, EmissionsBucket, EmissionsTotals } from '../services/emissions.types';

/** Soma de números que podem faltar: null só quando todos faltam (sem cálculo não vira zero). */
function addNullable(sum: number | null, value: number | null): number | null {
  if (value === null) return sum;
  return (sum ?? 0) + value;
}

/** Totais do período a partir dos pontos (mesmas regras de `totals` da #189). */
export function totalsOf(points: EmissionPoint[], carbonIntensity: number | null): EmissionsTotals {
  const totals: EmissionsTotals = {
    collections: 0,
    failed: 0,
    notCalculated: 0,
    energyKwh: null,
    co2eGrams: null,
    co2eMaxGrams: null,
    carbonIntensity,
  };
  for (const point of points) {
    totals.collections += point.collections;
    totals.failed += point.failed;
    totals.notCalculated += point.notCalculated;
    totals.energyKwh = addNullable(totals.energyKwh, point.energyKwh);
    totals.co2eGrams = addNullable(totals.co2eGrams, point.co2eGrams);
    if (point.co2eMaxGrams !== null && (totals.co2eMaxGrams === null || point.co2eMaxGrams > totals.co2eMaxGrams)) {
      totals.co2eMaxGrams = point.co2eMaxGrams;
    }
  }
  return totals;
}

/**
 * Junta coletas (pontos de uma coleta só) em intervalos de `bucketMs` alinhados a `originMs`, como o `date_bin` da
 * #189. Intervalos sem nenhuma coleta não aparecem: o gráfico mostra o buraco.
 */
export function groupPoints(points: EmissionPoint[], bucketMs: number, originMs: number): EmissionPoint[] {
  const groups = new Map<number, EmissionPoint>();
  for (const point of points) {
    const start = originMs + Math.floor((point.t - originMs) / bucketMs) * bucketMs;
    const group = groups.get(start);
    if (!group) {
      groups.set(start, { ...point, t: start });
      continue;
    }
    group.collections += point.collections;
    group.failed += point.failed;
    group.notCalculated += point.notCalculated;
    group.energyKwh = addNullable(group.energyKwh, point.energyKwh);
    group.co2eGrams = addNullable(group.co2eGrams, point.co2eGrams);
    if (point.co2eMinGrams !== null && (group.co2eMinGrams === null || point.co2eMinGrams < group.co2eMinGrams)) {
      group.co2eMinGrams = point.co2eMinGrams;
    }
    if (point.co2eMaxGrams !== null && (group.co2eMaxGrams === null || point.co2eMaxGrams > group.co2eMaxGrams)) {
      group.co2eMaxGrams = point.co2eMaxGrams;
    }
  }
  return [...groups.values()].sort((a, b) => a.t - b.t);
}

// ── Datas do filtro (yyyy-mm-dd, horário local) ────────────────────────────

const DAY_MS = 86_400_000;

/** Data local de hoje como "yyyy-mm-dd" (valor do <input type="date">). */
export function todayInput(): string {
  return toInputDate(new Date());
}

export function toInputDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "yyyy-mm-dd" válida? (o filtro vem da URL e pode chegar digitado à mão) */
export function isInputDate(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && toInputDate(parseInputDate(value)) === value;
}

/** "yyyy-mm-dd" → meia-noite local daquele dia. */
export function parseInputDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Soma dias a uma data "yyyy-mm-dd" (pode ser negativo). */
export function shiftInputDate(value: string, days: number): string {
  const date = parseInputDate(value);
  date.setDate(date.getDate() + days);
  return toInputDate(date);
}

/** Dias do período, contando os dois extremos (15/10 a 15/10 = 1). */
export function spanDays(start: string, end: string): number {
  return Math.round((parseInputDate(end).getTime() - parseInputDate(start).getTime()) / DAY_MS) + 1;
}

/** Maior período aceito de uma vez (o mesmo limite da série da #189). */
export const MAX_SPAN_DAYS = 31;

/**
 * Filtro de período da URL (`?de=&ate=&tempo=real`); valor inválido ou ausente cai no padrão: hoje.
 * `ate` fora do que o formulário aceita (antes de `de`, no futuro ou a mais de 31 dias) vale como inválida.
 * O tempo real só vale com o período de hoje: um link antigo com `tempo=real` abre as próprias datas, sem polling (#212).
 */
export function readPeriodFilter(params: URLSearchParams, today: string): { start: string; end: string; live: boolean } {
  const urlStart = params.get('de');
  const urlEnd = params.get('ate');
  const start = isInputDate(urlStart) && urlStart <= today ? urlStart : today;
  const end =
    isInputDate(urlEnd) && urlEnd >= start && urlEnd <= today && spanDays(start, urlEnd) <= MAX_SPAN_DAYS ? urlEnd : start;
  const live = params.get('tempo') === 'real' && start === today && end === today;
  return { start, end, live };
}

/** Período do filtro em milissegundos: do início do dia inicial até o fim do dia final, ou agora, se for antes. */
export function periodMs(start: string, end: string): { fromMs: number; toMs: number } {
  const fromMs = parseInputDate(start).getTime();
  const toMs = Math.min(parseInputDate(shiftInputDate(end, 1)).getTime(), Date.now());
  return { fromMs, toMs: Math.max(toMs, fromMs + 1) };
}

/** "2026-10-15" → "15/10/2026". */
export function formatInputDate(value: string): string {
  return parseInputDate(value).toLocaleDateString('pt-BR');
}

/**
 * Fuso em que as datas do filtro são lidas (o do navegador): "horário de Brasília" em America/Sao_Paulo; nos outros,
 * o deslocamento do UTC no dia `value` ("UTC−4", "UTC+5:30"), para não afirmar um fuso que não é o da pessoa.
 */
export function timeZoneLabel(value: string): string {
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/Sao_Paulo') return 'horário de Brasília';
  const offsetMin = -parseInputDate(value).getTimezoneOffset();
  if (offsetMin === 0) return 'UTC';
  const abs = Math.abs(offsetMin);
  const minutes = abs % 60 === 0 ? '' : `:${String(abs % 60).padStart(2, '0')}`;
  return `UTC${offsetMin < 0 ? '−' : '+'}${Math.floor(abs / 60)}${minutes}`;
}

// ── Agrupamento ─────────────────────────────────────────────────────────────

export const BUCKET_MS: Record<EmissionsBucket, number> = { coleta: 30_000, '15min': 15 * 60_000, '1h': 60 * 60_000 };

export const BUCKET_LABEL: Record<EmissionsBucket, string> = { coleta: 'Cada coleta', '15min': '15 min', '1h': '1 hora' };

/** Agrupamento automático pelo tamanho do período: até 2 h, cada coleta; até 1 dia, 15 min; mais que isso, 1 h. */
export function autoBucket(fromMs: number, toMs: number): EmissionsBucket {
  const span = toMs - fromMs;
  if (span <= 2 * 60 * 60_000) return 'coleta';
  return span <= DAY_MS ? '15min' : '1h';
}

// ── Resumo do período ───────────────────────────────────────────────────────

export interface EmissionsSummary {
  /** Coletas com emissão calculada. */
  calculated: number;
  /** Emissão média de uma coleta calculada, em g CO₂e. */
  meanGrams: number | null;
  /** Ponto (coleta ou intervalo) onde aconteceu a maior emissão de uma coleta. */
  peak: EmissionPoint | null;
}

export function summarize(points: EmissionPoint[], totals: EmissionsTotals): EmissionsSummary {
  const calculated = Math.max(0, totals.collections - totals.failed - totals.notCalculated);
  let peak: EmissionPoint | null = null;
  for (const point of points) {
    if (point.co2eMaxGrams !== null && (peak === null || point.co2eMaxGrams > (peak.co2eMaxGrams ?? 0))) peak = point;
  }
  return {
    calculated,
    meanGrams: totals.co2eGrams !== null && calculated > 0 ? totals.co2eGrams / calculated : null,
    peak,
  };
}

/**
 * Tempo sem coleta no período, com a mesma regra em qualquer agrupamento: soma dos trechos sem nenhuma coleta
 * registrada (com falha ou não) entre a primeira e a última coleta do período. O tempo antes da primeira e depois da
 * última não conta: pode ser só o sistema desligado ou o período ainda em curso. Os trechos têm o tamanho do
 * agrupamento automático do período (15 min até 1 dia; 1 hora acima disso), ou o do agrupamento escolhido, se for
 * maior, e são alinhados como o `date_bin` da #189; por isso "Cada coleta" e "15 min" dão o mesmo número.
 * É ausência de registro, não indisponibilidade.
 */
export function missingTimeMs(points: EmissionPoint[], bucket: EmissionsBucket, fromMs: number, toMs: number): number {
  return missingSpans(points, bucket, fromMs, toMs).reduce((sum, span) => sum + span.end - span.start, 0);
}

/** Trecho do período sem nenhuma coleta registrada, em ms (epoch): início fechado, fim aberto. */
export interface TimeSpan {
  start: number;
  end: number;
}

/**
 * Os trechos que somam o `missingTimeMs`, para o gráfico desenhar onde a coleta parou com o mesmo número do card
 * (#272). Mesma regra: só entre a primeira e a última coleta, em trechos alinhados ao agrupamento.
 */
export function missingSpans(points: EmissionPoint[], bucket: EmissionsBucket, fromMs: number, toMs: number): TimeSpan[] {
  const stepMs = Math.max(BUCKET_MS[autoBucket(fromMs, toMs) === '1h' ? '1h' : '15min'], BUCKET_MS[bucket]);
  const slots = [
    ...new Set(points.filter((point) => point.collections > 0).map((point) => Math.floor(point.t / stepMs) * stepMs)),
  ].sort((a, b) => a - b);
  const spans: TimeSpan[] = [];
  for (let i = 1; i < slots.length; i += 1) {
    if (slots[i] - slots[i - 1] > stepMs) spans.push({ start: slots[i - 1] + stepMs, end: slots[i] });
  }
  return spans;
}

/**
 * Média e maior ponto da série (coletas, ou somas por intervalo), sem o último intervalo ainda aberto: o período
 * termina em "agora" e a soma dele é parcial. Fonte única para o gráfico, os tiles e a Leitura do período (#271), para
 * os três dizerem o mesmo número.
 */
export interface SeriesStats {
  openIndex: number | null;
  /** Pontos com cálculo considerados (sem o intervalo aberto). */
  count: number;
  meanGrams: number | null;
  peakIndex: number | null;
}

export function seriesStats(points: EmissionPoint[], bucket: EmissionsBucket, toMs: number): SeriesStats {
  const grouped = bucket !== 'coleta';
  const stepMs = grouped ? BUCKET_MS[bucket] : (typicalIntervalMs(points) ?? BUCKET_MS.coleta);
  const openIndex = grouped && points.length > 0 && points[points.length - 1].t + stepMs > toMs ? points.length - 1 : null;
  let sum = 0;
  let count = 0;
  let peakIndex: number | null = null;
  points.forEach((point, index) => {
    if (point.co2eGrams === null || index === openIndex) return;
    sum += point.co2eGrams;
    count += 1;
    if (peakIndex === null || point.co2eGrams > (points[peakIndex].co2eGrams as number)) peakIndex = index;
  });
  return { openIndex, count, meanGrams: count > 0 ? sum / count : null, peakIndex };
}

/** Quantas vezes o maior ponto ficou acima da média; null sem cálculo. */
export function peakRatio(points: EmissionPoint[], stats: SeriesStats): number | null {
  const peak = stats.peakIndex !== null ? points[stats.peakIndex].co2eGrams : null;
  if (peak === null || stats.meanGrams === null || stats.meanGrams <= 0) return null;
  return peak / stats.meanGrams;
}

/** Quando foi o pico: o horário da coleta, ou o intervalo em que ela caiu. */
export function formatPeakTime(point: EmissionPoint, bucket: EmissionsBucket): string {
  if (bucket === 'coleta') return formatPointTime(point.t);
  const end = new Date(point.t + BUCKET_MS[bucket]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${formatPointTime(point.t, false)}–${end}`;
}

/**
 * O maior ponto em uma frase, com os mesmos números do gráfico e dos tiles (#271): quando foi e quanto se afasta da
 * média. Vai no tooltip do chip do pico e no resumo do gráfico para leitor de tela (#272). Null sem cálculo.
 */
export function describePeak(points: EmissionPoint[], stats: SeriesStats, bucket: EmissionsBucket): string | null {
  const ratio = peakRatio(points, stats);
  const peak = stats.peakIndex !== null ? points[stats.peakIndex] : null;
  if (!peak || peak.co2eGrams === null || ratio === null) return null;
  const when = formatPeakTime(peak, bucket);
  const where = bucket === 'coleta' ? 'numa coleta' : 'num intervalo';
  return ratio >= 1.5
    ? `Pico de ${formatGrams(peak.co2eGrams)} CO₂e ${where} em ${when}, ${formatRatio(ratio)} a média do período. Vale ver o que rodou nesse horário.`
    : `Emissão estável: o pico (${formatGrams(peak.co2eGrams)} em ${when}) ficou perto da média.`;
}

/** O tempo sem coleta em uma frase; null quando não faltou nada. */
export function describeMissing(missingMs: number): string | null {
  return missingMs > 0 ? `${formatDurationMilliseconds(missingMs)} sem coleta no período: esses trechos não entram no total.` : null;
}

/** Leitura do período em frases curtas: o pico e o tempo sem coleta. Na tela, ela vira fatos sobre o gráfico (#272). */
export function describePeriod(points: EmissionPoint[], stats: SeriesStats, bucket: EmissionsBucket, missingMs: number): string[] {
  return [describePeak(points, stats, bucket), describeMissing(missingMs)].filter((line): line is string => line !== null);
}

// ── Gráfico ─────────────────────────────────────────────────────────────────

/** Soma acumulada ao longo do período; trechos sem cálculo não somam nada e ficam null. */
export function cumulative(values: Array<number | null>): Array<number | null> {
  let sum = 0;
  return values.map((value) => {
    if (value === null) return null;
    sum += value;
    return sum;
  });
}

/** Intervalo típico entre pontos (mediana), em ms; null com menos de 2 pontos. */
export function typicalIntervalMs(points: EmissionPoint[]): number | null {
  const deltas = points.slice(1).map((point, i) => point.t - points[i].t);
  if (deltas.length === 0) return null;
  return [...deltas].sort((a, b) => a - b)[Math.floor(deltas.length / 2)];
}

/** Marcas "redondas" do eixo Y, de 0 até cobrir `max`. */
export function niceTicks(max: number, count = 5): number[] {
  if (!(max > 0)) return [0, 1];
  const rough = max / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step * 0.999; value += step) ticks.push(Number(value.toPrecision(12)));
  return ticks;
}

const TIME_STEPS_MIN = [5, 10, 15, 30, 60, 120, 180, 360, 720, 1440, 2880, 10080];

/** Marcas do eixo do tempo alinhadas à meia-noite local (00:00, 03:00, 06:00…). */
export function timeTicks(fromMs: number, toMs: number, maxTicks: number): { ticks: number[]; stepMs: number } {
  const span = toMs - fromMs;
  const stepMin = TIME_STEPS_MIN.find((m) => span / (m * 60_000) <= maxTicks) ?? TIME_STEPS_MIN[TIME_STEPS_MIN.length - 1];
  const stepMs = stepMin * 60_000;
  const midnight = new Date(fromMs);
  midnight.setHours(0, 0, 0, 0);
  const ticks: number[] = [];
  // Avança dia a dia quando o passo é de um dia ou mais, para não escorregar no horário de verão
  for (let t = midnight.getTime(); t <= toMs; ) {
    if (t >= fromMs) ticks.push(t);
    if (stepMs >= DAY_MS) {
      const next = new Date(t);
      next.setDate(next.getDate() + stepMs / DAY_MS);
      t = next.getTime();
    } else {
      t += stepMs;
    }
  }
  return { ticks, stepMs };
}

/** Rótulo do eixo do tempo conforme o passo: "dd/mm" para dias, "HH:mm" para horas (com o dia na virada). */
export function formatTimeTick(t: number, stepMs: number): string {
  const date = new Date(t);
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  if (stepMs >= DAY_MS) return day;
  if (date.getHours() === 0 && date.getMinutes() === 0) return day;
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── Formatação ──────────────────────────────────────────────────────────────


/** Gramas de CO₂e com a unidade da escala única (#271): mg abaixo de 1 g, kg a partir de 1 000 g, t a partir de 1 000 kg. */
export function formatGrams(grams: number): string {
  return formatQuantity('co2e', grams);
}

/** kWh com a unidade da escala única (#271): mWh abaixo de 1 Wh, Wh abaixo de 1 kWh, MWh a partir de 1 000 kWh. */
export function formatKwh(kwh: number): string {
  return formatQuantity('energy', kwh);
}

/** Número curto, sem unidade (eixo do gráfico, intensidade). */
export function formatShort(value: number): string {
  return value.toLocaleString('pt-BR', { maximumSignificantDigits: 3 });
}

/** 2.14 → "2,1×". */
export function formatRatio(ratio: number): string {
  return `${ratio.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}×`;
}

/** Duração curta: "45 min", "1 h 30 min", "2 d 4 h". */
export function formatDurationMilliseconds(ms: number): string {
  const totalMin = Math.max(1, Math.round(ms / 60_000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  if (days > 0) return hours > 0 ? `${days} d ${hours} h` : `${days} d`;
  if (hours > 0) return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  return `${minutes} min`;
}

/** "15/10 14:32:05" (ou "15/10 14:32", sem os segundos). */
export function formatPointTime(t: number, seconds = true): string {
  const date = new Date(t);
  const time = date.toLocaleTimeString('pt-BR', seconds ? undefined : { hour: '2-digit', minute: '2-digit' });
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`;
}
