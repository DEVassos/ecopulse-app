// Leitura orientada à decisão da comparação (#328): a intensidade de carbono do período e a causa do menor CO₂e.
// As definições e os exemplos numéricos ficam em docs/calculos.md (§ Eficiência energética e de carbono).
import type { ComparedService, PowerBreakdown } from '../services/compare.types';
import { roundedShares } from './share';

/**
 * Intensidade de carbono do período, em g CO₂e/kWh: CO₂e ÷ energia. É a mesma conta de docs/calculos.md para a
 * eficiência de carbono — 161 Wh com 60,7 g dão 377 g/kWh. `null` sem cálculo no período ou com energia zero, que
 * não divide.
 */
export function carbonIntensity(co2eGrams: number | null, energyKwh: number | null): number | null {
  if (co2eGrams === null || energyKwh === null || energyKwh <= 0) return null;
  return co2eGrams / energyKwh;
}

/** Causa da diferença de CO₂e entre o serviço de menor emissão e os demais. */
export type CauseKind = 'clean-grid' | 'lower-consumption';

/** Texto da causa, como aparece na tela: sempre junto do menor CO₂e, nunca no lugar dele. */
export const CAUSE_LABEL: Record<CauseKind, string> = {
  'clean-grid': 'matriz mais limpa',
  'lower-consumption': 'menor consumo',
};

export interface LowestCo2eCause {
  id: string;
  kind: CauseKind;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Por que o serviço de menor CO₂e emite menos, comparado com a média dos outros (#328). CO₂e = energia × intensidade,
 * então comparo as duas razões: se a intensidade do menor está mais abaixo da média do que a energia dele, a matriz
 * elétrica explica a diferença ("matriz mais limpa"); no caso contrário, é o consumo ("menor consumo").
 *
 * Com o exemplo da issue, Inventory Sync contra Fraud Detector: energia 0,084 ÷ 0,161 = 0,52 e intensidade 39 ÷ 377 =
 * 0,10 — a intensidade cai bem mais que a energia, logo "matriz mais limpa". Sem pelo menos dois serviços calculados,
 * com empate no menor CO₂e ou sem energia/intensidade para dividir, devolve `null`: a tela não escolhe uma causa que
 * os dados não sustentam.
 */
export function lowestCo2eCause(services: ComparedService[]): LowestCo2eCause | null {
  const calculated = services.flatMap((service) => {
    const intensity = carbonIntensity(service.co2eGrams, service.energyKwh);
    return intensity === null || service.energyKwh === null ? [] : [{ service, intensity }];
  });
  if (calculated.length < 2) return null;

  const lowest = Math.min(...calculated.map((item) => item.service.co2eGrams ?? 0));
  const candidates = calculated.filter((item) => item.service.co2eGrams === lowest);
  if (candidates.length !== 1) return null;

  const [winner] = candidates;
  const others = calculated.filter((item) => item.service.id !== winner.service.id);
  const averageEnergy = mean(others.map((item) => item.service.energyKwh ?? 0));
  const averageIntensity = mean(others.map((item) => item.intensity));
  if (averageEnergy <= 0 || averageIntensity <= 0) return null;

  const energyRatio = (winner.service.energyKwh ?? 0) / averageEnergy;
  const intensityRatio = winner.intensity / averageIntensity;
  return { id: winner.service.id, kind: intensityRatio < energyRatio ? 'clean-grid' : 'lower-consumption' };
}

/** Os quatro recursos na ordem em que a barra empilhada e a tabela alternativa os mostram. */
export type ResourceKey = keyof PowerBreakdown;

export const RESOURCES: ReadonlyArray<{ key: ResourceKey; label: string }> = [
  { key: 'cpuW', label: 'CPU' },
  { key: 'memoryW', label: 'RAM' },
  { key: 'diskW', label: 'Disco' },
  { key: 'networkW', label: 'Rede' },
];

export interface ResourceShare {
  key: ResourceKey;
  label: string;
  watts: number;
  /** Parte na potência média, de 0 a 1; 0 quando a potência total é zero. */
  share: number;
}

/** Passos de 0,1 ponto percentual em 100%. */
const SHARE_STEPS = 1000;

/**
 * As quatro parcelas com a parte de cada uma na potência média, para o rótulo direto ("CPU 62,67 W · 97,8%") e para a
 * largura do segmento. As partes de exibição já saem arredondadas a 0,1 ponto pelo maior resto, então somam 100,0%
 * mesmo quando o arredondamento de cada uma sozinha daria 99,9 ou 100,1.
 */
export function resourceShares(breakdown: PowerBreakdown | null): ResourceShare[] {
  const watts = RESOURCES.map((resource) => (breakdown === null ? 0 : breakdown[resource.key]));
  const total = watts.reduce((sum, value) => sum + value, 0);
  const shares = total === 0 ? watts.map(() => 0) : roundedShares(watts, total, SHARE_STEPS);
  return RESOURCES.map((resource, index) => ({ ...resource, watts: watts[index], share: shares[index] }));
}

/** Potência média do serviço em W, a soma das parcelas; `null` quando o backend não tem as quatro médias. */
export function averagePower(breakdown: PowerBreakdown | null): number | null {
  if (breakdown === null) return null;
  return RESOURCES.reduce((sum, resource) => sum + breakdown[resource.key], 0);
}
