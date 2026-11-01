import type { RequestHandler } from 'express';
import { getServiceComparison, getServices, getServicesSummary } from './services.service';
import { ServiceRepository } from './services.repository';
import { ValidationError } from '../../shared/errors';

export function servicesController(repository: ServiceRepository): RequestHandler {
  return async (_req, res) => { res.status(200).json(await getServices(repository)); };
}

function summaryPeriod(query: Record<string, unknown>) {
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

export function summaryController(repository: ServiceRepository): RequestHandler {
  return async (req, res) => { res.status(200).json(await getServicesSummary(repository, summaryPeriod(req.query))); };
}

function comparisonInput(query: Record<string, unknown>) {
  const ids = query.ids;
  if (typeof ids !== 'string') throw new ValidationError('ids deve informar de 2 a 10 serviços.');
  const values = ids.split(',');
  if (values.length < 2 || values.length > 10 || values.some(id => !/^[1-9]\d*$/.test(id)) || new Set(values).size !== values.length) {
    throw new ValidationError('ids deve informar de 2 a 10 inteiros positivos distintos.');
  }
  const from = query.from; const to = query.to;
  if (typeof from !== 'string' || typeof to !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(from) || !/^\d{4}-\d{2}-\d{2}T/.test(to) || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    throw new ValidationError('from e to devem ser ISO 8601.');
  }
  const start = new Date(from); const end = new Date(to);
  if (start >= end) throw new ValidationError('from deve ser anterior a to.');
  if (end.getTime() - start.getTime() > 31 * 24 * 60 * 60 * 1000) throw new ValidationError('O período máximo é de 31 dias.');
  return { ids: values, from: start, to: end };
}

export function compareServicesController(repository: ServiceRepository): RequestHandler {
  return async (req, res) => { res.status(200).json(await getServiceComparison(repository, comparisonInput(req.query))); };
}
