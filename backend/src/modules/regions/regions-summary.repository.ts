import type { QueryExecutor } from '../../db/connection';

export interface RegionSummaryRow {
  code: string | null;
  energy_kwh: string | null; co2e_grams: string | null;
  collections: string; failed: string; not_calculated: string;
  active: string; unavailable: string; without_metrics: string;
}

export class RegionsSummaryRepository {
  constructor(private readonly db: QueryExecutor) {}
  async summarize(from: Date, to: Date): Promise<RegionSummaryRow[]> {
    return (await this.db.query<RegionSummaryRow>(`
      SELECT s.region_code AS code,
        SUM(c.energy_kwh) FILTER (WHERE c.calculation_status = 'disponivel') AS energy_kwh,
        SUM(c.co2e_grams) FILTER (WHERE c.calculation_status = 'disponivel') AS co2e_grams,
        COUNT(c.id)::text AS collections,
        COUNT(c.id) FILTER (WHERE c.status <> 'ok')::text AS failed,
        COUNT(c.id) FILTER (WHERE c.calculation_status <> 'disponivel')::text AS not_calculated,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'ativo')::text AS active,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'indisponivel')::text AS unavailable,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'sem_metricas')::text AS without_metrics
      FROM services AS s
      LEFT JOIN collections AS c ON c.service_id = s.id
        AND c.collected_at >= $1 AND c.collected_at < $2
      GROUP BY s.region_code
      ORDER BY s.region_code ASC NULLS LAST`, [from, to])).rows;
  }
}
