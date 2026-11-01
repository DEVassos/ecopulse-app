import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { MonitoringContext } from '../contexts/MonitoringContext';

const DEFAULT_INTERVAL_MS = 30_000;
/** Abaixo disso o dashboard sobrecarregaria o backend sem ganho visível. */
const MIN_INTERVAL_MS = 5_000;
/** Maior atraso do `setTimeout` (2^31 − 1 ms, ~24,8 dias); acima disso ele dispara na hora e o polling entra em laço. */
const MAX_INTERVAL_MS = 2_147_483_647;

/** Lê VITE_REFRESH_INTERVAL_MS; valor ausente ou inválido usa o padrão de 30 s. */
function readInterval(): number {
  const value = Number(import.meta.env.VITE_REFRESH_INTERVAL_MS);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_INTERVAL_MS;
  return Math.min(Math.max(value, MIN_INTERVAL_MS), MAX_INTERVAL_MS);
}

export default function MonitoringProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({ refreshIntervalMs: readInterval() }), []);
  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>;
}
