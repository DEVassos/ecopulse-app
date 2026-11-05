import type { QueryExecutor } from '../../db/connection';
import { DatabaseError } from '../../shared/errors';

export interface MonitoringSettingsRow {
  refresh_interval_seconds: number;
  updated_at: Date;
}

export class MonitoringSettingsRepository {
  constructor(private readonly db: QueryExecutor) {}

  async find(): Promise<MonitoringSettingsRow | null> {
    return (await this.db.query<MonitoringSettingsRow>(`
      SELECT refresh_interval_seconds, updated_at FROM monitoring_settings WHERE id = $1`, [1])).rows[0] ?? null;
  }

  async save(seconds: number): Promise<MonitoringSettingsRow> {
    const result = await this.db.query<MonitoringSettingsRow>(`
      INSERT INTO monitoring_settings (id, refresh_interval_seconds) VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE
        SET refresh_interval_seconds = EXCLUDED.refresh_interval_seconds, updated_at = now()
      RETURNING refresh_interval_seconds, updated_at`, [1, seconds]);
    const row = result.rows[0];
    if (row === undefined) throw new DatabaseError();
    return row;
  }
}
