import type { QueryExecutor } from '../../db/connection';
import type { CalculationStatus, DatabaseId, NewCollection, StoredCollection } from '../../shared/persistence.types';

export interface CollectionFilters { serviceId: DatabaseId | null; from: Date | null; to: Date | null; limit: number }
export interface CollectionListRow {
  id: DatabaseId; service_id: DatabaseId; collected_at: Date; status: 'ok' | 'erro' | 'sem_metricas';
  cpu_percent: string | null; memory_gb: string | null; disk_gb: string | null; network_gb: string | null; error_message: string | null;
  calculation_status: CalculationStatus;
  carbon_intensity_gco2e_per_kwh: string | null; energy_kwh: string | null; co2e_grams: string | null;
}

export const SERIES_BUCKETS = ['15min', '1h', '1d'] as const;
export type SeriesBucket = typeof SERIES_BUCKETS[number];
const SERIES_INTERVALS: Record<SeriesBucket, string> = { '15min': '15 minutes', '1h': '1 hour', '1d': '1 day' };
export interface SeriesFilters { serviceId: DatabaseId; from: Date; to: Date; bucket: SeriesBucket }
export interface SeriesRow {
  bucket_start: Date | null;
  collections: string; failed: string; not_calculated: string;
  energy_kwh: string | null; co2e_grams: string | null; co2e_min_grams: string | null; co2e_max_grams: string | null;
  carbon_intensity_gco2e_per_kwh: string | null;
}

export class CollectionRepository {
  constructor(private readonly db: QueryExecutor) {}
  async insert(reading: NewCollection): Promise<StoredCollection> {
    const result = await this.db.query<StoredCollection>(`
      INSERT INTO collections (service_id, collected_at, region_code, status,
        collection_interval_seconds, cpu_percent, memory_gb, disk_gb, network_gb,
        metrics, error_message, calculation_status, carbon_intensity_gco2e_per_kwh,
        power_watts, energy_kwh, co2e_grams, calculation_error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`, [reading.service_id, reading.collected_at, reading.region_code, reading.status,
      reading.collection_interval_seconds, reading.cpu_percent, reading.memory_gb, reading.disk_gb,
      reading.network_gb, JSON.stringify(reading.metrics), reading.error_message, reading.calculation_status,
      reading.carbon_intensity_gco2e_per_kwh, reading.power_watts, reading.energy_kwh,
      reading.co2e_grams, reading.calculation_error_message]);
    return result.rows[0];
  }
  async findAll(filters: CollectionFilters): Promise<CollectionListRow[]> {
    return (await this.db.query<CollectionListRow>(`
      SELECT id, service_id, collected_at, status, cpu_percent, memory_gb, disk_gb, network_gb, error_message,
        calculation_status, carbon_intensity_gco2e_per_kwh, energy_kwh, co2e_grams
      FROM collections
      WHERE ($1::bigint IS NULL OR service_id = $1)
        AND ($2::timestamptz IS NULL OR collected_at >= $2)
        AND ($3::timestamptz IS NULL OR collected_at <= $3)
      ORDER BY collected_at DESC, id DESC
      LIMIT $4`, [filters.serviceId, filters.from, filters.to, filters.limit])).rows;
  }
  async findSeries(filters: SeriesFilters): Promise<SeriesRow[]> {
    // GROUPING SETS devolve os intervalos e o total do período na mesma passada; o total vem sem bucket_start.
    return (await this.db.query<SeriesRow>(`
      WITH ranged AS (
        SELECT date_bin($4::interval, collected_at, 'epoch'::timestamptz) AS bucket_start,
          status, calculation_status, energy_kwh, co2e_grams, carbon_intensity_gco2e_per_kwh
        FROM collections
        WHERE service_id = $1 AND collected_at >= $2 AND collected_at < $3
      )
      SELECT bucket_start,
        COUNT(*) AS collections,
        COUNT(*) FILTER (WHERE status <> 'ok') AS failed,
        COUNT(*) FILTER (WHERE status = 'ok' AND calculation_status <> 'disponivel') AS not_calculated,
        SUM(energy_kwh) FILTER (WHERE calculation_status = 'disponivel') AS energy_kwh,
        SUM(co2e_grams) AS co2e_grams,
        MIN(co2e_grams) AS co2e_min_grams,
        MAX(co2e_grams) AS co2e_max_grams,
        AVG(carbon_intensity_gco2e_per_kwh) FILTER (WHERE calculation_status = 'disponivel') AS carbon_intensity_gco2e_per_kwh
      FROM ranged
      GROUP BY GROUPING SETS ((bucket_start), ())
      ORDER BY bucket_start`, [filters.serviceId, filters.from, filters.to, SERIES_INTERVALS[filters.bucket]])).rows;
  }
}
