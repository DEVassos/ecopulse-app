import { ValidationError } from './errors';

/** Mesma janela para os resumos geral/regional e o ranking: [from, to), até 31 dias. */
export function summaryPeriod(query: Record<string, unknown>) {
  const from = query.from; const to = query.to;
  if (from === undefined && to === undefined) {
    const end = new Date();
    return { from: new Date(end.getTime() - 24 * 60 * 60 * 1000), to: end };
  }
  const start = parseIsoTimestamp(from); const end = parseIsoTimestamp(to);
  if (!start || !end) throw new ValidationError('from e to devem ser datas e horários ISO 8601 válidos.');
  if (start >= end) throw new ValidationError('from deve ser anterior a to.');
  if (end.getTime() - start.getTime() > 31 * 24 * 60 * 60 * 1000) throw new ValidationError('O período máximo é de 31 dias.');
  return { from: start, to: end };
}

function parseIsoTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T/.exec(value);
  const timestamp = new Date(value);
  if (!parts || Number.isNaN(timestamp.getTime())) return null;
  const year = Number(parts[1]); const month = Number(parts[2]); const day = Number(parts[3]);
  const calendarYear = year < 100 ? year + 400 : year;
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(calendarYear, month, 0)).getUTCDate()) return null;
  return timestamp;
}
