// Contrato de GET /api/services/ranking (#50, contrato aprovado na issue), conferido em ranking.service.ts (#161).
import type { ServiceStatus } from './services.types';

export const RANKING_METRICS = ['energy', 'co2e'] as const;
export type RankingMetric = (typeof RANKING_METRICS)[number];

export interface RankedService {
  /** Posição pela métrica pedida (1 = maior); null quando a métrica do serviço é null (vai para o fim). */
  position: number | null;
  id: string;
  name: string;
  region: string | null;
  /** Estado atual do serviço, igual ao de GET /api/services. */
  status: ServiceStatus;
  /** Soma das coletas com cálculo no período, em kWh; null quando nenhuma tem cálculo ("não calculado", nunca 0). */
  energyKwh: number | null;
  /** Soma das coletas com cálculo no período, em gramas de CO₂e; null como em `energyKwh`. */
  co2eGrams: number | null;
  collections: number;
  failed: number;
  notCalculated: number;
}

export interface ServicesRankingResponse {
  metric: RankingMetric;
  /** Período [from, to) normalizado em UTC (ISO 8601). */
  from: string;
  to: string;
  /** Do maior para o menor pela métrica; empate por nome e id; os sem valor no fim. */
  services: RankedService[];
}
