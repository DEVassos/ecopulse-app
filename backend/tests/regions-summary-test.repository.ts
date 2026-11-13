import type { QueryExecutor } from '../src/db/connection';
export async function transaction(db: QueryExecutor, begin: boolean) { await db.query(begin ? 'BEGIN' : 'ROLLBACK'); }
export async function seedRegions(db: QueryExecutor, prefix: string) {
  return (await db.query<{ id: string }>(`INSERT INTO services (external_id, name, region_code, status)
    SELECT $1::text || n, $1::text || n, code, state FROM unnest(
      ARRAY[$1::text || 'a', $1::text || 'a', $1::text || 'b', NULL, $1::text || 'removed', $1::text || 'empty'],
      ARRAY['ativo','indisponivel','sem_metricas','ativo','removido','ativo']) WITH ORDINALITY AS x(code,state,n)
    RETURNING id`, [prefix])).rows.map(row => row.id);
}
export async function partialEnergy(db: QueryExecutor, id: string, at: Date) {
  await db.query(`INSERT INTO collections (service_id,collected_at,status,collection_interval_seconds,
    cpu_percent,memory_gb,disk_gb,network_gb,calculation_status,power_watts,energy_kwh,calculation_error_message)
    VALUES ($1,$2,'ok',60,10,1,1,1,'indisponivel',10,500,'Fator ausente')`, [id, at]);
}
export async function manualRegions(db: QueryExecutor, from: Date, to: Date) {
  return (await db.query<{ code: string | null; energy: string | null; co2e: string | null }>(`
    SELECT s.region_code AS code, SUM(c.energy_kwh) AS energy, SUM(c.co2e_grams) AS co2e
    FROM collections c INNER JOIN services s ON s.id = c.service_id
    WHERE c.collected_at >= $1 AND c.collected_at < $2 AND c.calculation_status = 'disponivel'
    GROUP BY s.region_code ORDER BY s.region_code NULLS LAST`, [from, to])).rows;
}
export async function regionalPlan(db: QueryExecutor, sql: string, params: unknown[]) {
  // sql-seguro: texto capturado exclusivamente de RegionsSummaryRepository; dados continuam nos parâmetros.
  return (await db.query<{ 'QUERY PLAN': string }>('EXPLAIN (ANALYZE, BUFFERS) ' + sql, params))
    .rows.map(row => row['QUERY PLAN']).join('\n');
}
export async function seedPlanVolume(db: QueryExecutor, ids: string[]) {
  await db.query(`INSERT INTO collections (service_id, collected_at, status)
    SELECT id, TIMESTAMPTZ '2026-01-01T00:00:00Z' + n * INTERVAL '1 minute', 'sem_metricas'
    FROM unnest($1::bigint[]) AS id CROSS JOIN generate_series(0,999) AS n`, [ids]);
  await db.query('ANALYZE collections');
}
