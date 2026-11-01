import type { CalculationStatus } from '../../shared/persistence.types';
import { NotFoundError } from '../../shared/errors';
import { ServiceRepository } from '../services/services.repository';
import { CollectionRepository, type CollectionFilters, type CollectionListRow, type SeriesBucket, type SeriesFilters, type SeriesRow } from './collections.repository';

export interface CollectionItem {
  id: string; serviceId: string; collectedAt: string; status: 'ok' | 'erro' | 'sem_metricas';
  cpuPercent: number | null; memoryGb: number | null; diskGb: number | null; networkGb: number | null; errorMessage: string | null;
  calculationStatus: CalculationStatus;
  energyKwh: number | null; co2eGrams: number | null; carbonIntensityGco2ePerKwh: number | null;
}
export interface CollectionsResponse {
  collections: CollectionItem[];
  period: { from: string | null; to: string | null };
}

export interface SeriesPoint {
  start: string; collections: number; failed: number; notCalculated: number;
  energyKwh: number | null; co2eGrams: number | null; co2eMinGrams: number | null; co2eMaxGrams: number | null;
}
export interface SeriesTotals {
  collections: number; failed: number; notCalculated: number;
  energyKwh: number | null; co2eGrams: number | null; co2eMaxGrams: number | null; carbonIntensityGco2ePerKwh: number | null;
}
export interface SeriesResponse { serviceId: string; from: string; to: string; bucket: SeriesBucket; buckets: SeriesPoint[]; totals: SeriesTotals }
function metric(value: string | null): number | null {
  return value === null ? null : Number(value);
}

const numberOrNull = (value: string | null): number | null => (value === null ? null : Number(value));
function map(row: CollectionListRow): CollectionItem {

  return {
    id: row.id, serviceId: row.service_id, collectedAt: row.collected_at.toISOString(), status: row.status,
    cpuPercent: numberOrNull(row.cpu_percent), memoryGb: numberOrNull(row.memory_gb),
    diskGb: numberOrNull(row.disk_gb), networkGb: numberOrNull(row.network_gb), errorMessage: row.error_message,
    calculationStatus: row.calculation_status, energyKwh: numberOrNull(row.energy_kwh), co2eGrams: numberOrNull(row.co2e_grams),
    carbonIntensityGco2ePerKwh: numberOrNull(row.carbon_intensity_gco2e_per_kwh)
  };
}
export async function getCollections(collections: CollectionRepository, services: ServiceRepository, filters: CollectionFilters): Promise<CollectionsResponse> {
  if (filters.serviceId !== null && await services.findById(filters.serviceId) === null) throw new NotFoundError('Serviço não encontrado.');
  return { collections: (await collections.findAll(filters)).map(map), period: { from: filters.from?.toISOString() ?? null, to: filters.to?.toISOString() ?? null } };
}
function toPoint(row: SeriesRow & { bucket_start: Date }): SeriesPoint {
  return {
    start: row.bucket_start.toISOString(), collections: Number(row.collections), failed: Number(row.failed),
    notCalculated: Number(row.not_calculated), energyKwh: metric(row.energy_kwh), co2eGrams: metric(row.co2e_grams),
    co2eMinGrams: metric(row.co2e_min_grams), co2eMaxGrams: metric(row.co2e_max_grams)
  };
}
export async function getSeries(collections: CollectionRepository, services: ServiceRepository, filters: SeriesFilters): Promise<SeriesResponse> {
  if (await services.findById(filters.serviceId) === null) throw new NotFoundError('Serviço não encontrado.');
  const rows = await collections.findSeries(filters);
  const total = rows.find(row => row.bucket_start === null);
  return {
    serviceId: filters.serviceId, from: filters.from.toISOString(), to: filters.to.toISOString(), bucket: filters.bucket,
    buckets: rows.filter((row): row is SeriesRow & { bucket_start: Date } => row.bucket_start !== null).map(toPoint),
    totals: {
      collections: Number(total?.collections ?? 0), failed: Number(total?.failed ?? 0),
      notCalculated: Number(total?.not_calculated ?? 0), energyKwh: metric(total?.energy_kwh ?? null),
      co2eGrams: metric(total?.co2e_grams ?? null), co2eMaxGrams: metric(total?.co2e_max_grams ?? null),
      carbonIntensityGco2ePerKwh: metric(total?.carbon_intensity_gco2e_per_kwh ?? null)
    },
  };
}
