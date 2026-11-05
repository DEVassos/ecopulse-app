import { ValidationError } from '../../shared/errors';
import { MonitoringSettingsRepository, type MonitoringSettingsRow } from './monitoring-settings.repository';

const ALLOWED_INTERVALS = [15, 30, 60] as const;

export interface MonitoringSettings {
  refreshIntervalSeconds: number;
  allowedIntervalsSeconds: readonly number[];
  updatedAt: string | null;
}

function response(row: MonitoringSettingsRow | null): MonitoringSettings {
  return { refreshIntervalSeconds: row?.refresh_interval_seconds ?? 30,
    allowedIntervalsSeconds: ALLOWED_INTERVALS, updatedAt: row?.updated_at.toISOString() ?? null };
}

export async function getMonitoringSettings(repository: MonitoringSettingsRepository): Promise<MonitoringSettings> {
  return response(await repository.find());
}

export async function updateMonitoringSettings(repository: MonitoringSettingsRepository, seconds: unknown): Promise<MonitoringSettings> {
  if (typeof seconds !== 'number' || !Number.isInteger(seconds) || !ALLOWED_INTERVALS.some(value => value === seconds)) {
    throw new ValidationError('refreshIntervalSeconds deve ser 15, 30 ou 60.');
  }
  return response(await repository.save(seconds));
}
