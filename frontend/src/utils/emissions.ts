// Funções puras da página Emissões: soma em intervalos, totais, datas do filtro, resumo e formatação.

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
  const stepMs = Math.max(BUCKET_MS[autoBucket(fromMs, toMs) === '1h' ? '1h' : '15min'], BUCKET_MS[bucket]);
  const slots = [
    ...new Set(points.filter((point) => point.collections > 0).map((point) => Math.floor(point.t / stepMs) * stepMs)),
  ].sort((a, b) => a - b);
  let missing = 0;
  for (let i = 1; i < slots.length; i += 1) missing += slots[i] - slots[i - 1] - stepMs;
  return missing;
}

/** Quantas vezes o pico ficou acima da média; null sem cálculo. */
export function peakRatio(summary: EmissionsSummary): number | null {
  const peak = summary.peak?.co2eMaxGrams;
  if (peak == null || summary.meanGrams === null || summary.meanGrams <= 0) return null;
  return peak / summary.meanGrams;
}

/** Quando foi o pico: o horário da coleta, ou o intervalo em que ela caiu. */
export function formatPeakTime(point: EmissionPoint, bucket: EmissionsBucket): string {
  if (bucket === 'coleta') return formatPointTime(point.t);
  const end = new Date(point.t + BUCKET_MS[bucket]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${formatPointTime(point.t, false)}–${end}`;
}

/**
 * Leitura do período em frases curtas, para quem precisa decidir sem interpretar o gráfico:
 * quando foi o pico e quanto ele se afasta da média, e quanto tempo ficou sem coleta.
 */
export function describePeriod(summary: EmissionsSummary, bucket: EmissionsBucket, missingMs: number): string[] {
  const lines: string[] = [];
  const ratio = peakRatio(summary);
  const peak = summary.peak?.co2eMaxGrams;
  if (summary.peak && peak != null && ratio !== null) {
    const when = formatPeakTime(summary.peak, bucket);
    lines.push(
      ratio >= 1.5
        ? `Pico de ${formatGrams(peak)} CO₂e numa coleta em ${when}, ${formatRatio(ratio)} a média do período. Vale ver o que rodou nesse horário.`
        : `Emissão estável: o pico (${formatGrams(peak)} em ${when}) ficou perto da média.`,
    );
  }
  if (missingMs > 0) {
    lines.push(`${formatDuration(missingMs)} sem coleta no período: esses trechos não entram no total.`);
  }
  return lines;
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

function withUnit(value: number, unit: string): string {
  return `${value.toLocaleString('pt-BR', { maximumSignificantDigits: 3, minimumSignificantDigits: 1 })} ${unit}`;
}

/** Gramas de CO₂e com unidade adequada: mg abaixo de 1 g, kg a partir de 1 000 g, t a partir de 1 000 kg. */
export function formatGrams(grams: number): string {
  if (grams === 0) return '0 g';
  if (grams < 1) return withUnit(grams * 1000, 'mg');
  if (grams < 1000) return withUnit(grams, 'g');
  if (grams < 1_000_000) return withUnit(grams / 1000, 'kg');
  return withUnit(grams / 1_000_000, 't');
}

/** kWh com unidade adequada (Wh abaixo de 1 kWh). */
export function formatKwh(kwh: number): string {
  if (kwh === 0) return '0 kWh';
  return kwh < 1 ? withUnit(kwh * 1000, 'Wh') : withUnit(kwh, 'kWh');
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
export function formatDuration(ms: number): string {
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
