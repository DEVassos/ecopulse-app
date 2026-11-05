// Contrato de /api/monitoring-settings (#176; combinado na issue antes do 1º commit), conferido em monitoring.service.ts.

export interface MonitoringSettings {
  /** Intervalo atual da atualização automática do dashboard, em segundos. */
  refreshIntervalSeconds: number;
  /** Valores aceitos pelo backend; o seletor da Configuração é montado a partir desta lista. */
  allowedIntervalsSeconds: number[];
  /** Quando o intervalo foi trocado pela última vez (ISO 8601); null enquanto ninguém configurou. */
  updatedAt: string | null;
}
