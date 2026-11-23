// Contratos de GET /api/regions (#319) e GET /api/regions/summary (#320), conferidos em regions.service.ts (#161).

/** Estados que entram no mapa: `removido` fica de fora das contagens por região (#320). */
export const REGION_STATUSES = ['ativo', 'indisponivel', 'sem_metricas'] as const;
export type RegionStatus = (typeof REGION_STATUSES)[number];

/** Uma região da Carbon API, com ou sem serviço monitorado. */
export interface Region {
  code: string;
  country: string;
  region: string;
  city: string | null;
  /** Graus decimais; null quando a Carbon API não manda a coordenada (a região fica só na lista). */
  latitude: number | null;
  longitude: number | null;
  /** Intensidade de carbono da rede, em gCO₂e/kWh; null quando a Carbon API não tem o valor. */
  carbonIntensityGco2ePerKwh: number | null;
  /** Parte renovável da rede, de 0 a 100; null quando a Carbon API não tem o valor. */
  renewableSharePercent: number | null;
  /** Serviços não removidos com este código de região (0 = "sem serviço hoje"). */
  monitoredServices: number;
}

export interface RegionsResponse {
  regions: Region[];
  /** `cache` quando a Carbon API falhou e o backend respondeu a última lista guardada. */
  source: 'api' | 'cache';
  fetchedAt: string;
}

/** Totais de uma região no período [from, to), com a mesma regra do ranking (#50). */
export interface RegionSummary {
  /** null junta os serviços sem região, para eles não sumirem do total. */
  code: string | null;
  /** Soma das coletas com cálculo, em kWh; null quando nenhuma tem cálculo ("não calculado", nunca 0). */
  energyKwh: number | null;
  /** Soma das coletas com cálculo, em gramas de CO₂e; null como em `energyKwh`. */
  co2eGrams: number | null;
  collections: number;
  failed: number;
  notCalculated: number;
  /** Serviços por estado atual, sem os removidos. */
  services: Record<RegionStatus, number>;
  /** O pior estado entre os serviços (indisponivel > sem_metricas > ativo); null sem nenhum serviço contado. */
  worstStatus: RegionStatus | null;
}

export interface RegionsSummaryResponse {
  from: string;
  to: string;
  regions: RegionSummary[];
}
