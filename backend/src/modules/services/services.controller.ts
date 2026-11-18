import type { RequestHandler } from 'express';
import { getServiceComparison, getServiceRanking, getServices, getServicesSummary } from './services.service';
import { ServiceRepository } from './services.repository';
import { ValidationError } from '../../shared/errors';
import { summaryPeriod } from '../../shared/summary-period';

export function servicesController(repository: ServiceRepository): RequestHandler {
  return async (_req, res) => { res.status(200).json(await getServices(repository)); };
}

export function rankingController(repository: ServiceRepository): RequestHandler {
  return async (req, res) => {
    const metric = req.query.metric;
    if (metric !== 'energy' && metric !== 'co2e') throw new ValidationError('metric deve ser energy ou co2e.');
    res.status(200).json(await getServiceRanking(repository, metric, summaryPeriod(req.query)));
  };
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
