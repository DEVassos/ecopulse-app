import type { QueryExecutor } from '../src/db/connection';

export async function settingsCount(db: QueryExecutor): Promise<number> {
  const result = await db.query<{ total: string }>('SELECT count(*) AS total FROM monitoring_settings');
  return Number(result.rows[0].total);
}

export async function invalidSettings(db: QueryExecutor, id: number, seconds: number): Promise<void> {
  await db.query('INSERT INTO monitoring_settings (id, refresh_interval_seconds) VALUES ($1, $2)', [id, seconds]);
}
