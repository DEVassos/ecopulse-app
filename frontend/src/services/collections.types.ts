// Contrato de GET /api/collections (docs/api.md § GET /api/collections), conferido em collections.service.ts (#161).

/** Resultado de uma coleta: métricas lidas, falha na chamada ou serviço sem métricas. */
export const COLLECTION_STATUSES = ['ok', 'erro', 'sem_metricas'] as const;
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

/** Estado do cálculo de energia/CO₂e da coleta (`collections.calculation_status`). */
export const CALCULATION_STATUSES = ['nao_calculado', 'disponivel', 'indisponivel'] as const;
export type CalculationStatus = (typeof CALCULATION_STATUSES)[number];

export interface ServiceCollection {
  id: string;
  serviceId: string;
  /** Horário da coleta (ISO 8601). */
  collectedAt: string;
  status: CollectionStatus;
  /** Uso de CPU, em %; null quando a coleta não trouxe a métrica. */
  cpuPercent: number | null;
  memoryGb: number | null;
  diskGb: number | null;
  networkGb: number | null;
  /** Motivo da falha quando `status` é `erro`. */
  errorMessage: string | null;
  // Campos de cálculo (#188): opcionais até a rota passar a devolvê-los
  calculationStatus?: CalculationStatus;
  /** Energia estimada da coleta, em kWh; null sem cálculo. */
  energyKwh?: number | null;
  /** Emissão estimada da coleta, em g CO₂e; null sem cálculo. */
  co2eGrams?: number | null;
  /** Intensidade de carbono usada no cálculo, em g CO₂e/kWh. */
  carbonIntensityGco2ePerKwh?: number | null;
}

export interface CollectionsResponse {
  /** Da coleta mais recente para a mais antiga. */
  collections: ServiceCollection[];
  /** Período pedido na consulta; null quando não houve filtro de data. */
  period: { from: string | null; to: string | null };
}
