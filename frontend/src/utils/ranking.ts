// Participação de cada serviço no CO₂e do período (#260), a partir de GET /api/services/ranking.
import type { ServicesRankingResponse } from '../services/ranking.types';
import { formatNumber } from './format';

export interface RankingShare {
  /** Posição no ranking (1 = maior); null para quem não tem CO₂e calculado no período. */
  position: number | null;
  /** CO₂e do serviço no período, em gramas; null quando não calculado. */
  co2eGrams: number | null;
  /** Fração do total do período (0 a 1); null quando o serviço ou o total não têm cálculo. */
  share: number | null;
}

/**
 * Parte de cada serviço no CO₂e do período, pelo id. O total é a soma dos serviços com cálculo, então as partes
 * somam 100%. Total zero (período sem emissão calculada) não divide: quem tem cálculo fica com 0%, e não sem parte —
 * "sem cálculo" é só para co2eGrams null, senão um período sem emissão pareceria dado faltando.
 */
export function rankingShares(ranking: ServicesRankingResponse): Map<string, RankingShare> {
  const total = ranking.services.reduce((sum, service) => sum + (service.co2eGrams ?? 0), 0);
  return new Map(
    ranking.services.map((service) => [
      service.id,
      {
        position: service.position,
        co2eGrams: service.co2eGrams,
        share: service.co2eGrams === null ? null : total === 0 ? 0 : service.co2eGrams / total,
      },
    ]),
  );
}

/** 0.2734 → "27,3%". */
export function formatShare(share: number): string {
  return `${formatNumber(share * 100, 1)}%`;
}

/**
 * Frase de leitura acima da tabela, com o período explícito:
 * "Checkout Worker respondeu por 27,3% do CO₂e das últimas 24 h." Sem 1º lugar calculado, devolve null — e também com
 * parte zero: "respondeu por 0,0%" não informa quem pesa mais, mesmo quando zero é um total calculado.
 */
export function rankingSentence(ranking: ServicesRankingResponse, periodLabel: string): string | null {
  const shares = rankingShares(ranking);
  const leader = ranking.services.find((service) => service.position === 1);
  const share = leader ? shares.get(leader.id)?.share : null;
  if (!leader || share === null || share === undefined || share === 0) return null;
  return `${leader.name} respondeu por ${formatShare(share)} do CO₂e ${periodLabel}.`;
}
