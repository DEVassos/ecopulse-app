import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { MonitoringContext } from '../contexts/MonitoringContext';
import { useAuth } from '../hooks/useAuth';
import { usePolling } from '../hooks/usePolling';
import type { PollingTask } from '../hooks/usePolling';
import { fetchMonitoringSettings } from '../services/monitoring.service';
import type { MonitoringSettings } from '../services/monitoring.types';

const DEFAULT_INTERVAL_MS = 30_000;
/** Abaixo disso o dashboard sobrecarregaria o backend sem ganho visível. */
const MIN_INTERVAL_MS = 5_000;
/** Maior atraso do `setTimeout` (2^31 − 1 ms, ~24,8 dias); acima disso ele dispara na hora e o polling entra em laço. */
const MAX_INTERVAL_MS = 2_147_483_647;

function clampInterval(value: number): number {
  return Math.min(Math.max(value, MIN_INTERVAL_MS), MAX_INTERVAL_MS);
}

/** Lê VITE_REFRESH_INTERVAL_MS; valor ausente ou inválido usa o padrão de 30 s. */
function readEnvInterval(): number {
  const value = Number(import.meta.env.VITE_REFRESH_INTERVAL_MS);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_INTERVAL_MS;
  return clampInterval(value);
}

const ENV_INTERVAL_MS = readEnvInterval();

/** Só monta com sessão: o polling começa no login e para no Sair ou no 401, como o das páginas (#257). */
function SettingsPolling({ load, intervalMs }: { load: PollingTask; intervalMs: number }) {
  usePolling(load, intervalMs);
  return null;
}

/**
 * Intervalo da atualização automática (#176): vem de GET /monitoring-settings, lido ao abrir e de novo a cada ciclo,
 * para uma troca feita em outra aba valer no ciclo seguinte. Se o backend não responder, fica o último valor lido,
 * ou VITE_REFRESH_INTERVAL_MS antes da primeira resposta.
 * Fica acima das rotas, mas só busca com sessão aberta: na tela de login não há chamadas (#257).
 */
export default function MonitoringProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<MonitoringSettings | null>(null);

  const refreshIntervalMs = settings ? clampInterval(settings.refreshIntervalSeconds * 1000) : ENV_INTERVAL_MS;

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      setSettings(await fetchMonitoringSettings(signal));
    } catch {
      // Falha ou resposta fora do contrato: mantém o intervalo atual; o dashboard tem o próprio aviso de falha
    }
  }, []);

  const value = useMemo(
    () => ({ refreshIntervalMs, settings, applySettings: setSettings }),
    [refreshIntervalMs, settings],
  );
  return (
    <MonitoringContext.Provider value={value}>
      {user && <SettingsPolling load={load} intervalMs={refreshIntervalMs} />}
      {children}
    </MonitoringContext.Provider>
  );
}
