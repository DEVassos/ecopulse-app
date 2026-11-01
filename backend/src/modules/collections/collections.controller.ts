import type { RequestHandler } from 'express';
import { ValidationError } from '../../shared/errors';
import { ServiceRepository } from '../services/services.repository';
import { SERIES_BUCKETS, CollectionRepository, type CollectionFilters, type SeriesBucket, type SeriesFilters } from './collections.repository';
import { getCollections, getSeries } from './collections.service';

const MAX_PERIOD_MS = 31 * 24 * 60 * 60 * 1000;

function date(value: unknown, name: string): Date | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) throw new ValidationError(`${name} deve ser ISO 8601.`);
  return new Date(value);
}
function filters(query: Record<string, unknown>): CollectionFilters {
  const serviceId = query.service_id;
  if (serviceId !== undefined && (typeof serviceId !== 'string' || !/^[1-9]\d*$/.test(serviceId))) throw new ValidationError('service_id deve ser inteiro positivo.');
  const from = date(query.from, 'from'); const to = date(query.to, 'to');
  if (from && to && from > to) throw new ValidationError('from deve ser anterior ou igual a to.');
  const limitValue = query.limit ?? '50';
  if (typeof limitValue !== 'string' || !/^[1-9]\d*$/.test(limitValue) || Number(limitValue) > 500) throw new ValidationError('limit deve ser inteiro entre 1 e 500.');
  return { serviceId: serviceId ?? null, from, to, limit: Number(limitValue) };
}
export function collectionsController(collections: CollectionRepository, services: ServiceRepository): RequestHandler {
  return async (req, res) => { res.status(200).json(await getCollections(collections, services, filters(req.query))); };
}
function requiredDate(value: unknown, name: string): Date {
  const parsed = date(value, name);
  if (parsed === null) throw new ValidationError(`${name} é obrigatório.`);
  return parsed;
}
function isSeriesBucket(value: unknown): value is SeriesBucket {
  return typeof value === 'string' && (SERIES_BUCKETS as readonly string[]).includes(value);
}
function seriesFilters(query: Record<string, unknown>): SeriesFilters {
  const serviceId = query.service_id;
  if (typeof serviceId !== 'string' || !/^[1-9]\d*$/.test(serviceId)) throw new ValidationError('service_id deve ser inteiro positivo.');
  const from = requiredDate(query.from, 'from'); const to = requiredDate(query.to, 'to');
  if (from >= to) throw new ValidationError('from deve ser anterior a to.');
  if (to.getTime() - from.getTime() > MAX_PERIOD_MS) throw new ValidationError('O período máximo é de 31 dias.');
  if (!isSeriesBucket(query.bucket)) throw new ValidationError(`bucket deve ser ${SERIES_BUCKETS.join(', ')}.`);
  return { serviceId, from, to, bucket: query.bucket };
}
export function seriesController(collections: CollectionRepository, services: ServiceRepository): RequestHandler {
  return async (req, res) => { res.status(200).json(await getSeries(collections, services, seriesFilters(req.query))); };
}
