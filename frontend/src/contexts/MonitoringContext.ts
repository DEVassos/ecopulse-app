import { createContext } from 'react';

export interface MonitoringContextValue {
  /** Intervalo da atualização automática do dashboard, em milissegundos. */
  refreshIntervalMs: number;
}

export const MonitoringContext = createContext<MonitoringContextValue | null>(null);
