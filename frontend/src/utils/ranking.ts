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

/** Passos de 0,1 ponto percentual em 100%: a parte exibida tem uma casa. */
const SHARE_STEPS = 1000;

/**
 * Arredonda as partes a 0,1 ponto percentual pelo método do maior resto: cada uma recebe o piso e os décimos que faltam
 * vão para os maiores restos. Assim a coluna exibida soma sempre 100,0%; arredondar cada linha sozinha desviaria até
 * 0,05 por serviço (99,9 ou 100,1 com 8 serviços). A ordem entre as partes não se inverte.
 */
function roundedShares(values: number[], total: number): number[] {
  const exact = values.map((value) => (value / total) * SHARE_STEPS);
  const steps = exact.map((value) => Math.floor(value));
  let missing = SHARE_STEPS - steps.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact.map((value, index) => ({ index, remainder: value - steps[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (missing <= 0) break;
    steps[index] += 1;
    missing -= 1;
  }
  return steps.map((value) => value / SHARE_STEPS);
}

/**
 * Parte de cada serviço no CO₂e do período, pelo id, já arredondada a 0,1 ponto percentual: as partes exibidas somam
 * 100,0%. O total é a soma dos serviços com cálculo. Total zero (período sem emissão calculada) não divide: quem tem
 * cálculo fica com 0%, e não sem parte — "sem cálculo" é só para co2eGrams null, senão um período sem emissão pareceria
 * dado faltando.
 */
export function rankingShares(ranking: ServicesRankingResponse): Map<string, RankingShare> {
  const calculated = ranking.services.filter((service) => service.co2eGrams !== null);
  const total = calculated.reduce((sum, service) => sum + (service.co2eGrams ?? 0), 0);
  const rounded = total === 0 ? calculated.map(() => 0) : roundedShares(calculated.map((service) => service.co2eGrams ?? 0), total);
  const shareById = new Map(calculated.map((service, index) => [service.id, rounded[index]]));
  return new Map(
    ranking.services.map((service) => [
      service.id,
      { position: service.position, co2eGrams: service.co2eGrams, share: shareById.get(service.id) ?? null },
    ]),
  );
}

/**
 * A parte do período está desatualizada quando a última busca do ranking falhou ou quando a lista de serviços falhou:
 * o ranking só é buscado de novo depois de uma lista bem-sucedida, então numa queda do backend o erro do ranking fica
 * vazio e a coluna continuaria acesa ao lado dos números já apagados (#261).
 */
export function rankingIsStale(rankingError: string, listError: string): boolean {
  return rankingError !== '' || listError !== '';
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
