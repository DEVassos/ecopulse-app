// Lógica do seletor de período (#273), sem nada de tela: atalhos, rótulo da pílula, semanas do mês e os limites do
// calendário. As datas ficam em AAAA-MM-DD (o valor da URL e da API); a tela mostra DD/MM/AAAA.
import { parseInputDate, shiftInputDate, spanDays, toInputDate } from './emissions';

export type PresetId = 'hoje' | 'ontem' | '7d' | '30d';

export interface Preset {
  id: PresetId;
  label: string;
  start: string;
  end: string;
}

/** Atalhos do menu, sempre terminando em hoje (ou ontem): Hoje, Ontem, Últimos 7 dias e Últimos 30 dias. */
export function presets(today: string): Preset[] {
  const yesterday = shiftInputDate(today, -1);
  return [
    { id: 'hoje', label: 'Hoje', start: today, end: today },
    { id: 'ontem', label: 'Ontem', start: yesterday, end: yesterday },
    { id: '7d', label: 'Últimos 7 dias', start: shiftInputDate(today, -6), end: today },
    { id: '30d', label: 'Últimos 30 dias', start: shiftInputDate(today, -29), end: today },
  ];
}

/** O atalho que corresponde ao período, se houver. */
export function presetOf(start: string, end: string, today: string): Preset | null {
  return presets(today).find((preset) => preset.start === start && preset.end === end) ?? null;
}

const dayMonth = (iso: string) => parseInputDate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const full = (iso: string) => parseInputDate(iso).toLocaleDateString('pt-BR');

/** "04/11/2026"; "01/11 – 04/11/2026" no mesmo ano; "28/12/2025 – 03/01/2026" entre anos. */
export function formatRange(start: string, end: string): string {
  if (start === end) return full(start);
  if (start.slice(0, 4) === end.slice(0, 4)) return `${dayMonth(start)} – ${full(end)}`;
  return `${full(start)} – ${full(end)}`;
}

/** Texto da pílula: o nome do atalho quando o período é um deles, senão as datas. */
export function periodLabel(start: string, end: string, today: string): string {
  return presetOf(start, end, today)?.label ?? formatRange(start, end);
}

/** "1 dia", "4 dias". */
export function formatDayCount(days: number): string {
  return days === 1 ? '1 dia' : `${days} dias`;
}

/** Primeiro dia do mês da data, em AAAA-MM-DD. */
export function monthOf(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Mesmo dia do mês anterior ou seguinte, sem passar do último dia dele (31/03 − 1 mês = 28 ou 29/02). */
export function addMonths(iso: string, months: number): string {
  const date = parseInputDate(iso);
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return toInputDate(target);
}

/**
 * Semanas do mês, começando na segunda-feira, com null nos dias que são de outro mês. Cada semana tem 7 posições;
 * o mês tem de 4 a 6 semanas.
 */
export function monthWeeks(month: string): Array<Array<string | null>> {
  const first = parseInputDate(monthOf(month));
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(toInputDate(new Date(first.getFullYear(), first.getMonth(), day)));
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** "novembro de 2026". */
export function monthLabel(month: string): string {
  return parseInputDate(monthOf(month)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/** "quarta-feira, 4 de novembro de 2026", para o leitor de tela. */
export function dayLabel(iso: string): string {
  return parseInputDate(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** O dia pode ser escolhido? Nunca no futuro; com o início marcado, só até `maxDays` contando os dois extremos. */
export function isSelectable(iso: string, today: string, anchor: string | null, maxDays: number): boolean {
  if (iso > today) return false;
  if (anchor === null) return true;
  const [from, to] = iso < anchor ? [iso, anchor] : [anchor, iso];
  return spanDays(from, to) <= maxDays;
}

/** Os dois dias em ordem: o segundo clique pode vir antes do primeiro no calendário. */
export function ordered(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

/** Deslocamento do teclado no calendário: setas (±1 dia, ±1 semana), Home/End (início e fim da semana) e PageUp/PageDown (±1 mês). */
export function keyTarget(iso: string, key: string): string | null {
  const weekday = (parseInputDate(iso).getDay() + 6) % 7;
  switch (key) {
    case 'ArrowLeft':
      return shiftInputDate(iso, -1);
    case 'ArrowRight':
      return shiftInputDate(iso, 1);
    case 'ArrowUp':
      return shiftInputDate(iso, -7);
    case 'ArrowDown':
      return shiftInputDate(iso, 7);
    case 'Home':
      return shiftInputDate(iso, -weekday);
    case 'End':
      return shiftInputDate(iso, 6 - weekday);
    case 'PageUp':
      return addMonths(iso, -1);
    case 'PageDown':
      return addMonths(iso, 1);
    default:
      return null;
  }
}
