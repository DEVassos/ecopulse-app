import { apiRequest, unexpectedFormat } from './api';
import { count, readInstantOrNull, readList, readRecord } from './contract';
import type { MonitoringSettings } from './monitoring.types';
import { isDemoMode } from './services.service';

/** Inteiro > 0 em segundos; 0 pararia o polling num laço. */
function readSeconds(value: unknown, field: string): number {
  const parsed = count(value);
  if (parsed === undefined || parsed === 0) throw unexpectedFormat(field);
  return parsed;
}

/** Confere o corpo de GET/PUT /api/monitoring-settings contra o contrato da #176. */
export function parseMonitoringSettings(body: unknown): MonitoringSettings {
  const settings = readRecord(body, 'resposta');
  const allowed = readList(settings.allowedIntervalsSeconds, 'allowedIntervalsSeconds').map((value, index) =>
    readSeconds(value, `allowedIntervalsSeconds[${index}]`),
  );
  if (allowed.length === 0) throw unexpectedFormat('allowedIntervalsSeconds');
  return {
    refreshIntervalSeconds: readSeconds(settings.refreshIntervalSeconds, 'refreshIntervalSeconds'),
    allowedIntervalsSeconds: allowed,
    updatedAt: readInstantOrNull(settings.updatedAt, 'updatedAt'),
  };
}

/**
 * Rota pública: o dashboard precisa do intervalo sem login. No modo demonstração (sem VITE_API_URL) não há backend
 * e devolve null: o dashboard segue com VITE_REFRESH_INTERVAL_MS.
 */
export async function fetchMonitoringSettings(signal?: AbortSignal): Promise<MonitoringSettings | null> {
  if (isDemoMode) return null;
  return parseMonitoringSettings(await apiRequest<unknown>('/monitoring-settings', { signal }));
}

/** Troca o intervalo (rota protegida por JWT: o api.ts envia o token da sessão). */
export async function updateRefreshInterval(refreshIntervalSeconds: number): Promise<MonitoringSettings> {
  const body = await apiRequest<unknown>('/monitoring-settings', { method: 'PUT', body: { refreshIntervalSeconds } });
  return parseMonitoringSettings(body);
}
