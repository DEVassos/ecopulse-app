// Zoom do gráfico de Emissões (#396): o trecho ampliado é um recorte dos dados já carregados, sem nova busca.
import type { EmissionPoint, EmissionsBucket } from '../services/emissions.types';
import { BUCKET_MS, formatClock, formatDurationMilliseconds, typicalIntervalMs, type TimeSpan } from './emissions';

/** Trecho do período, em ms (epoch): início incluído, fim excluído. */
export interface ZoomWindow {
  fromMs: number;
  toMs: number;
}

/** Menor trecho: 4 intervalos do agrupamento, e nunca menos de 10 min (em "Cada coleta", cerca de 20 coletas). */
const MIN_STEPS = 4;
const MIN_MS = 10 * 60_000;

/** Passo do agrupamento: o intervalo agrupado, ou o intervalo típico entre as coletas em "Cada coleta". */
export function gridStepMs(points: EmissionPoint[], bucket: EmissionsBucket): number {
  return bucket === 'coleta' ? (typicalIntervalMs(points) ?? BUCKET_MS.coleta) : BUCKET_MS[bucket];
}

/** Menor largura de trecho, em passos inteiros do agrupamento. */
export function minWindowMs(stepMs: number): number {
  return Math.ceil(Math.max(MIN_STEPS * stepMs, MIN_MS) / stepMs) * stepMs;
}

/**
 * Encaixa o trecho nas bordas dos intervalos do agrupamento, contados do início do período (como o `date_bin`), com a
 * largura mínima (crescendo em volta do centro) e dentro do período, sem perder a largura nas pontas; o fim pode ir até
 * o fim do intervalo em andamento. Encaixado, nenhum intervalo fica cortado ao meio e o último só aparece "em
 * andamento" quando ainda está aberto. Null quando cobre o período todo.
 */
export function snapWindow(window: ZoomWindow, period: ZoomWindow, stepMs: number): ZoomWindow | null {
  const origin = period.fromMs;
  const full = Math.ceil((period.toMs - origin) / stepMs) * stepMs;
  const snap = (t: number) => Math.round((t - origin) / stepMs) * stepMs;
  let from = snap(window.fromMs);
  // Trecho que chega ao fim do período leva junto o intervalo em andamento, que termina depois de "agora"
  const to = window.toMs >= period.toMs ? Math.max(snap(window.toMs), full) : snap(window.toMs);
  const width = Math.min(full, Math.max(minWindowMs(stepMs), to - from));
  if (width >= full) return null;
  if (width > to - from) from = snap(origin + (from + to - width) / 2);
  from = Math.min(Math.max(from, 0), full - width);
  return { fromMs: origin + from, toMs: origin + from + width };
}

/** O trecho como aparece na tela: o fim não passa do fim do período ("agora", no período de hoje). */
export function visibleWindow(window: ZoomWindow, period: ZoomWindow): ZoomWindow {
  return { fromMs: window.fromMs, toMs: Math.min(window.toMs, period.toMs) };
}

/** Pontos (coletas ou inícios de intervalo) dentro do trecho. */
export function pointsInWindow(points: readonly EmissionPoint[], window: ZoomWindow): EmissionPoint[] {
  return points.filter((point) => point.t >= window.fromMs && point.t < window.toMs);
}

/** Trechos sem coleta recortados ao trecho, para o gráfico, a impressão e o card Coletas dizerem o mesmo. */
export function spansInWindow(spans: readonly TimeSpan[], window: ZoomWindow): TimeSpan[] {
  return spans
    .filter((span) => span.end > window.fromMs && span.start < window.toMs)
    .map((span) => ({ start: Math.max(span.start, window.fromMs), end: Math.min(span.end, window.toMs) }));
}

/** Aproximar mostra a metade central do que está na tela; afastar, o dobro, com o mesmo centro. */
export function zoomStep(current: ZoomWindow, period: ZoomWindow, stepMs: number, direction: 'in' | 'out'): ZoomWindow | null {
  const center = (current.fromMs + current.toMs) / 2;
  const half = ((current.toMs - current.fromMs) * (direction === 'in' ? 0.5 : 2)) / 2;
  return snapWindow({ fromMs: center - half, toMs: center + half }, period, stepMs);
}

/** ◀ e ▶: anda meio trecho (ao menos um intervalo), sem sair do período e sem mudar a largura. */
export function panWindow(window: ZoomWindow, period: ZoomWindow, stepMs: number, direction: -1 | 1): ZoomWindow | null {
  const shift = Math.max(stepMs, Math.round((window.toMs - window.fromMs) / 2 / stepMs) * stepMs) * direction;
  return snapWindow({ fromMs: window.fromMs + shift, toMs: window.toMs + shift }, period, stepMs);
}

/** Abaixo desta distância, em px, soltar o mouse é um clique (a dica do ponto), não uma seleção (#397). */
export const DRAG_THRESHOLD_PX = 8;

/**
 * Trecho selecionado arrastando o mouse de `x0` a `x1` (px a partir da borda esquerda da área do gráfico, de largura
 * `width`), em qualquer direção, sobre o eixo `domain`: encaixado nos intervalos contados do início do eixo (o fim do
 * eixo, "agora" no período de hoje, também vale como borda), com pelo menos um intervalo e sem sair do eixo. Null
 * abaixo do limiar de arrasto.
 */
export function dragSpan(x0: number, x1: number, width: number, domain: ZoomWindow, stepMs: number): ZoomWindow | null {
  if (width <= 0 || Math.abs(x1 - x0) < DRAG_THRESHOLD_PX) return null;
  const at = (x: number) => domain.fromMs + (Math.min(Math.max(x, 0), width) / width) * (domain.toMs - domain.fromMs);
  const snap = (t: number) => {
    const grid = domain.fromMs + Math.round((t - domain.fromMs) / stepMs) * stepMs;
    return grid > domain.toMs || domain.toMs - t < Math.abs(t - grid) ? domain.toMs : grid;
  };
  const from = Math.max(domain.fromMs, Math.min(snap(at(Math.min(x0, x1))), domain.toMs - stepMs));
  return { fromMs: from, toMs: Math.max(snap(at(Math.max(x0, x1))), Math.min(domain.toMs, from + stepMs)) };
}

/** Hora do fim do trecho: meia-noite do dia seguinte vira "24:00", como no período ("até 24:00 da data final"). */
function endClock(window: ZoomWindow, withDay: boolean): string {
  const end = new Date(window.toMs);
  const nextMidnight = end.getHours() === 0 && end.getMinutes() === 0 && end.toDateString() !== new Date(window.fromMs).toDateString();
  if (nextMidnight && !withDay) return '24:00';
  return formatClock(window.toMs, withDay);
}

/** "05:45–17:30" (num período de um dia) ou "18/11 05:45–19/11 17:30", para o cabeçalho impresso e o subtítulo. */
export function windowClock(window: ZoomWindow, multiDay: boolean): string {
  return `${formatClock(window.fromMs, multiDay)}–${endClock(window, multiDay)}`;
}

/** "21/11 05:45 → 17:30 (11 h 45 min)"; com a data no fim quando o trecho passa de um dia. */
export function describeWindow(window: ZoomWindow): string {
  const sameDay = new Date(window.fromMs).toDateString() === new Date(window.toMs - 1).toDateString();
  return `${formatClock(window.fromMs, true)} → ${endClock(window, !sameDay)} (${formatDurationMilliseconds(window.toMs - window.fromMs)})`;
}

/** Parte do todo, em fração; null sem os dois números ou com o todo zero (sem cálculo não vira 0%). */
export function shareOf(part: number | null, whole: number | null): number | null {
  if (part === null || whole === null || whole <= 0) return null;
  return part / whole;
}

/** 0.5412 → "54,1%". */
export function formatShare(share: number): string {
  return `${(share * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}
