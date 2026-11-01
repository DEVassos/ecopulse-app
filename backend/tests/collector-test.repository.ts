import type { QueryExecutor } from '../src/db/connection';
export async function prepare(db: QueryExecutor): Promise<void> {
  await db.query("SELECT setval(pg_get_serial_sequence('services', 'id'), 9007199254740993, false)");
}
export async function history(db: QueryExecutor) {
  return (await db.query<{ service_id: string; region_code: string; metrics: Record<string, unknown>; calculation_status: string }>(
    'SELECT service_id, region_code, metrics, calculation_status FROM collections ORDER BY id')).rows;
}
