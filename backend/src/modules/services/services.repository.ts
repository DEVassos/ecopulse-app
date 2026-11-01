import type { QueryExecutor } from '../../db/connection';
import type { DatabaseId, DiscoveredService, ServiceStatus, StoredService } from '../../shared/persistence.types';

export interface ServiceWithLastReading {
  id: DatabaseId;
  name: string;
  status: ServiceStatus;
  country: string | null;
  region: string | null;
  city: string | null;
  last_reading_at: Date | null;
  cpu_percent: string | null;
  energy_kwh: string | null;
  co2e_grams: string | null;
}
export interface ServicesSummaryRow { energy_kwh: string | null; co2e_grams: string | null; active: string; unavailable: string; without_metrics: string; removed: string }

export interface ServiceComparisonRow {
  id: DatabaseId; name: string; region: string | null;
  collections: string; failed: string; not_calculated: string;
  avg_cpu_percent: string | null; avg_memory_gb: string | null; avg_disk_gb: string | null; avg_network_gb: string | null;
  energy_kwh: string | null; co2e_grams: string | null;
}

export class ServiceRepository {
  constructor(private readonly db: QueryExecutor) {}
  async findAll(): Promise<StoredService[]> {
    return (await this.db.query<StoredService>('SELECT * FROM services ORDER BY id')).rows;
  }
  async findById(id: DatabaseId): Promise<StoredService | null> {
    return (await this.db.query<StoredService>('SELECT * FROM services WHERE id = $1', [id])).rows[0] ?? null;
  }
  async findAllWithLastReading(): Promise<ServiceWithLastReading[]> {
    return (await this.db.query<ServiceWithLastReading>(`
      SELECT s.id, s.name, s.status, s.country, s.region, s.city,
        latest.collected_at AS last_reading_at, latest.cpu_percent, latest.energy_kwh, latest.co2e_grams
      FROM services AS s
      LEFT JOIN LATERAL (
        SELECT collected_at, cpu_percent, energy_kwh, co2e_grams
        FROM collections
        WHERE service_id = s.id
        ORDER BY collected_at DESC, id DESC
        LIMIT 1
      ) AS latest ON true
      ORDER BY s.name ASC, s.id ASC`)).rows;
  }
  async findSummary(from: Date, to: Date): Promise<ServicesSummaryRow> {
    const result = await this.db.query<ServicesSummaryRow>(`
      SELECT
        (SUM(c.energy_kwh) FILTER (WHERE c.calculation_status = 'disponivel'))::text AS energy_kwh,
        (SUM(c.co2e_grams) FILTER (WHERE c.calculation_status = 'disponivel'))::text AS co2e_grams,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'ativo')::text AS active,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'indisponivel')::text AS unavailable,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'sem_metricas')::text AS without_metrics,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'removido')::text AS removed
      FROM services AS s
      LEFT JOIN collections AS c ON c.service_id = s.id AND c.collected_at >= $1 AND c.collected_at < $2`, [from, to]);
    return result.rows[0] ?? { energy_kwh: null, co2e_grams: null, active: '0', unavailable: '0', without_metrics: '0', removed: '0' };
  }

  async compareByIds(ids: DatabaseId[], from: Date, to: Date): Promise<ServiceComparisonRow[]> {
    return (await this.db.query<ServiceComparisonRow>(`
      SELECT s.id, s.name, s.region,
        COUNT(c.id)::text AS collections,
        COUNT(c.id) FILTER (WHERE c.status <> 'ok')::text AS failed,
        COUNT(c.id) FILTER (WHERE c.calculation_status <> 'disponivel')::text AS not_calculated,
        AVG(c.cpu_percent) FILTER (WHERE c.status = 'ok') AS avg_cpu_percent,
        AVG(c.memory_gb) FILTER (WHERE c.status = 'ok') AS avg_memory_gb,
        AVG(c.disk_gb) FILTER (WHERE c.status = 'ok') AS avg_disk_gb,
        AVG(c.network_gb) FILTER (WHERE c.status = 'ok') AS avg_network_gb,
        SUM(c.energy_kwh) FILTER (WHERE c.calculation_status = 'disponivel') AS energy_kwh,
        SUM(c.co2e_grams) FILTER (WHERE c.calculation_status = 'disponivel') AS co2e_grams
      FROM services AS s
      LEFT JOIN collections AS c ON c.service_id = s.id AND c.collected_at >= $2 AND c.collected_at < $3
      WHERE s.id = ANY($1::bigint[])
      GROUP BY s.id, s.name, s.region
      ORDER BY s.id ASC`, [ids, from, to])).rows;
  }
  async upsert(service: DiscoveredService, observedAt: Date): Promise<StoredService> {
    const result = await this.db.query<StoredService>(`
      INSERT INTO services (external_id, name, region_code, country, region, city,
        latitude, longitude, first_seen_at, last_seen_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name,
        region_code = EXCLUDED.region_code, country = EXCLUDED.country, region = EXCLUDED.region,
        city = EXCLUDED.city, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
        last_seen_at = EXCLUDED.last_seen_at, updated_at = now(),
        status = CASE WHEN services.status = 'removido' THEN 'ativo' ELSE services.status END
      RETURNING *`, [service.external_id, service.name, service.region_code, service.country,
      service.region, service.city, service.latitude, service.longitude, observedAt]);
    return result.rows[0];
  }
  async updateStatus(id: DatabaseId, status: ServiceStatus): Promise<StoredService | null> {
    return (await this.db.query<StoredService>(`
      UPDATE services SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`, [id, status])).rows[0] ?? null;
  }
  /** Só chamar após descoberta completa válida; [] válido remove todos logicamente. */
  async markMissingAsRemoved(externalIds: string[]): Promise<StoredService[]> {
    return (await this.db.query<StoredService>(`
      UPDATE services SET status = 'removido', updated_at = now()
      WHERE NOT (external_id = ANY($1::text[])) AND status <> 'removido' RETURNING *`, [externalIds])).rows;
  }
}
