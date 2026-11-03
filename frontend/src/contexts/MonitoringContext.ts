import { createContext } from 'react';
import type { MonitoringSettings } from '../services/monitoring.types';

export interface MonitoringContextValue {
  /** Intervalo da atualização automática do dashboard, em milissegundos. */
  refreshIntervalMs: number;
  /**
   * Configuração lida de GET /monitoring-settings (#176); null antes da primeira resposta ou enquanto o backend
   * não responde. Nesse caso `refreshIntervalMs` vem de VITE_REFRESH_INTERVAL_MS.
   */
  settings: MonitoringSettings | null;
  /** Aplica na hora a configuração devolvida pelo PUT, sem esperar o próximo ciclo. */
  applySettings: (settings: MonitoringSettings) => void;
}

export const MonitoringContext = createContext<MonitoringContextValue | null>(null);
