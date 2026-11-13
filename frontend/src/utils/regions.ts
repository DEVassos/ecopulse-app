// Regiões no frontend (#321, RF13 e RF15): junção das duas rotas de região, pior estado, região mais limpa, simulação de
// migração e escala da bolha. Cálculo puro, sem React e sem HTTP; o mapa (#322) e a simulação (#53) consomem daqui.
import type { Region, RegionStatus, RegionSummary } from '../services/regions.types';
import type { ServiceStatus } from '../services/services.types';

/** Uma região da Carbon API com os totais e os estados do período: o que o mapa e a lista lateral mostram. */
export interface RegionWithTotals extends Region {
  /** Energia do período, em kWh; null quando nenhuma coleta tem cálculo (nunca 0 inventado). */
  energyKwh: number | null;
  /** CO₂e do período, em gramas; null como em `energyKwh`. */
  co2eGrams: number | null;
  /** Serviços por estado atual, sem os removidos; tudo zero quando a região não tem serviço. */
  services: Record<RegionStatus, number>;
  /** Pior estado entre os serviços; null quando a região não tem serviço contado. */
  worstStatus: RegionStatus | null;
}

export interface JoinedRegions {
  /** Todas as regiões de GET /api/regions, na ordem da API, inclusive as sem serviço e as sem coordenada. */
  regions: RegionWithTotals[];
  /**
   * Totais de GET /api/regions/summary que não casam com nenhuma região da lista: serviços sem região (`code: null`) e
   * regiões que a Carbon API não informa. Ficam fora do mapa e da simulação, mas não somem do total.
   */
  unlisted: RegionSummary[];
}

/** Resultado da simulação de migração (docs/calculos.md § Simulação de migração regional). */
export interface MigrationEstimate {
  /** CO₂e simulado no destino, em gramas: a energia do período vezes a intensidade do destino. */
  grams: number;
  /** Redução em gramas, com sinal: negativa quando o destino é mais sujo que a origem (é um aumento). */
  savedGrams: number;
  /** Redução em % do CO₂e de origem, com sinal; null quando o CO₂e de origem é 0 (percentual não calculável). */
  savedPercent: number | null;
}

/** Do pior para o melhor: a primeira contagem positiva nesta ordem é o estado da região. */
const WORST_FIRST: readonly RegionStatus[] = ['indisponivel', 'sem_metricas', 'ativo'];

/** Pior estado entre as contagens: indisponivel > sem_metricas > ativo. `removido` não entra; sem serviço contado, null. */
export function worstStatus(counts: Readonly<Partial<Record<ServiceStatus, number>>>): RegionStatus | null {
  return WORST_FIRST.find((status) => (counts[status] ?? 0) > 0) ?? null;
}

/**
 * Junta GET /api/regions com GET /api/regions/summary pelo `code`. Toda região da lista aparece, com ou sem serviço; a
 * que não tem totais no período fica com energia e CO₂e null e contagens zeradas. O pior estado sai das próprias
 * contagens, para a cor da bolha nunca discordar dos números da lista lateral.
 */
export function joinRegions(regions: readonly Region[], summary: readonly RegionSummary[]): JoinedRegions {
  const totals = new Map<string, RegionSummary>();
  for (const item of summary) {
    if (item.code !== null) totals.set(item.code, item);
  }
  const listed = new Set(regions.map((region) => region.code));
  return {
    regions: regions.map((region) => {
      const item = totals.get(region.code);
      const services = { ativo: 0, indisponivel: 0, sem_metricas: 0, ...item?.services };
      return {
        ...region,
        energyKwh: item?.energyKwh ?? null,
        co2eGrams: item?.co2eGrams ?? null,
        services,
        worstStatus: worstStatus(services),
      };
    }),
    unlisted: summary.filter((item) => item.code === null || !listed.has(item.code)),
  };
}

/** O que a ordem por intensidade precisa de uma região; aceita `Region` e `RegionWithTotals`. */
type GridRegion = Pick<Region, 'code' | 'carbonIntensityGco2ePerKwh'>;

function byCode(a: GridRegion, b: GridRegion): number {
  if (a.code === b.code) return 0;
  return a.code < b.code ? -1 : 1;
}

/**
 * Ordem "mais limpa primeiro" de docs/calculos.md § Intensidade de carbono por região: menor intensidade e, no empate,
 * `code` em ordem alfabética. Região sem intensidade vai para o fim: continua na lista, mas não é destino possível.
 */
export function sortByCleanest<T extends GridRegion>(regions: readonly T[]): T[] {
  return [...regions].sort((a, b) => {
    const left = a.carbonIntensityGco2ePerKwh;
    const right = b.carbonIntensityGco2ePerKwh;
    if (left === null || right === null) {
      if (left === right) return byCode(a, b);
      return left === null ? 1 : -1;
    }
    return left - right || byCode(a, b);
  });
}

/**
 * Região de menor intensidade entre **todas** as da Carbon API, inclusive as sem serviço (`monitoredServices: 0`): é o
 * destino padrão da simulação (#53). `excludeCode` tira a região de origem. null quando nenhuma outra tem intensidade.
 */
export function cleanestRegion<T extends GridRegion>(regions: readonly T[], excludeCode?: string): T | null {
  return (
    sortByCleanest(regions).find((region) => region.code !== excludeCode && region.carbonIntensityGco2ePerKwh !== null) ??
    null
  );
}

/**
 * Simulação de migração (docs/calculos.md § Simulação de migração regional): só o fator regional muda; a energia do
 * período continua a mesma.
 *
 *   grams        = energyKwh × targetIntensity
 *   savedGrams   = originCo2eGrams − grams           (com sinal)
 *   savedPercent = 100 × savedGrams ÷ originCo2eGrams, quando originCo2eGrams > 0
 *
 * `originCo2eGrams` é a soma gravada no período, não energia × intensidade de agora. Sem energia, sem CO₂e de origem ou
 * sem intensidade no destino não há número: null, nunca 0 inventado.
 */
export function estimateMigration(
  energyKwh: number | null,
  originCo2eGrams: number | null,
  targetIntensity: number | null,
): MigrationEstimate | null {
  if (energyKwh === null || originCo2eGrams === null || targetIntensity === null) return null;
  const grams = energyKwh * targetIntensity;
  const savedGrams = originCo2eGrams - grams;
  return { grams, savedGrams, savedPercent: originCo2eGrams > 0 ? (100 * savedGrams) / originCo2eGrams : null };
}

/**
 * Raio relativo da bolha, de 0 a 1 (1 = a região de maior valor). A ÁREA é proporcional ao valor, por isso a raiz
 * quadrada: com o raio proporcional, o dobro da emissão pareceria quatro vezes maior. É a escala do protótipo do mapa,
 * `28 + 60 × √(valor ÷ máximo)` px de diâmetro; a conversão para px fica no componente (#322). null quando o valor não
 * é conhecido, para o mapa decidir como marcar o lugar; máximo 0 (nenhuma emissão no período) dá 0.
 */
export function bubbleRadius(value: number | null, max: number): number | null {
  if (value === null) return null;
  if (max <= 0 || value <= 0) return 0;
  return Math.sqrt(Math.min(1, value / max));
}
