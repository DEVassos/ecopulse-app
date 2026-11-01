// Greener Metrics Aggregator API (https://metrics.unilaunch.org) — docs/especificacao-api.md, seção 1.
// Os tipos Raw* espelham o JSON da API (snake_case); o cliente valida o que chega e devolve os tipos do sistema.

export interface RawServiceLocation {
  region_code: string;
  country: string;
  region: string;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Item de GET /services. */
export interface RawServiceSummary {
  id: string;
  name: string;
  location: RawServiceLocation;
  metrics_path: string;
}

/** Resposta 200 de GET /metrics/{service_id}. */
export interface RawMetricsResponse {
  collection_interval_seconds: number;
  metrics: {
    cpu_percent: number;
    memory_gb: number;
    disk_gb: number;
    network_gb: number;
  };
}

export interface ServiceLocation {
  regionCode: string;
  country: string;
  region: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Serviço descoberto no agregador. */
export interface ServiceSummary {
  id: string;
  name: string;
  location: ServiceLocation;
  metricsPath: string;
}

/** Métricas instantâneas de um serviço. */
export interface ServiceMetrics {
  collectionIntervalSeconds: number;
  cpuPercent: number;
  memoryGb: number;
  diskGb: number;
  networkGb: number;
}

/**
 * Resultado da coleta de um serviço. 404 e 500 são estados previstos do ambiente monitorado
 * (docs/especificacao-api.md), não falhas do cliente: o serviço fica `sem_metricas` ou `indisponivel`.
 */
export type ServiceMetricsResult =
  | { status: 'ok'; metrics: ServiceMetrics; raw: RawMetricsResponse & Record<string, unknown> }
  | { status: 'sem_metricas' }
  | { status: 'indisponivel' };
