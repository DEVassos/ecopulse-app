// Contrato de GET /api/services (docs/api.md § GET /api/services), conferido em services.service.ts (#161).

/** Estados de monitoramento de um serviço (mesmos nomes do backend). */
export const SERVICE_STATUSES = ['ativo', 'indisponivel', 'sem_metricas', 'removido'] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export interface MonitoredService {
  id: string;
  name: string;
  /** Localização informada pelo agregador. */
  country: string | null;
  region: string | null;
  city: string | null;
  /** Uso de CPU na última leitura, em %; null quando não há métrica. */
  cpuPercent: number | null;
  /** Energia estimada no período, em kWh; null quando não há métrica. */
  energyKwh: number | null;
  /** Emissão estimada no período, em gramas de CO₂e; null quando não há métrica. */
  emissionsG: number | null;
  status: ServiceStatus;
  /**
   * Motivo da falha da coleta mais recente, como o worker gravou (ex.: "Serviço indisponível (HTTP 500).").
   * Só vem em `indisponivel`; null nos demais estados ou quando a coleta não tem mensagem (#176).
   */
  statusReason: string | null;
  /** Horário da última leitura (ISO 8601); null se nunca houve leitura. */
  lastReadingAt: string | null;
  /** Código da região do cadastro (ex.: "us-east"); `region` é o nome. null sem região, e aí não há cálculo (#298). */
  regionCode: string | null;
  /** Intervalo da última coleta, em s; null sem coleta ou com a coleta falhada. Ausente no backend anterior à #297. */
  collectionIntervalSeconds: number | null;
  /** Memória, disco e rede da última coleta, em GB; null como o intervalo. */
  memoryGb: number | null;
  diskGb: number | null;
  networkGb: number | null;
  /** Potência estimada da última coleta, em W; null sem cálculo disponível. */
  powerWatts: number | null;
  /** Intensidade de carbono usada na última coleta, em gCO₂e/kWh; null sem cálculo disponível. */
  carbonIntensityGco2ePerKwh: number | null;
}

export interface ServicesResponse {
  services: MonitoredService[];
  /** Período considerado nos totais de energia e emissão, como a API devolve (ex.: "última 1 hora"). */
  period: string;
}

export interface ServicesSummaryResponse {
  period: { from: string; to: string };
  energyKwh: number | null;
  co2eGrams: number | null;
  services: { active: number; unavailable: number; withoutMetrics: number; removed: number };
}
