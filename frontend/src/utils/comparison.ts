// Leitura orientada à decisão da comparação (#328): a intensidade de carbono do período e a causa do menor CO₂e.
// As definições e os exemplos numéricos ficam em docs/calculos.md (§ Eficiência energética e de carbono).
import type { ComparedService, PowerBreakdown } from '../services/compare.types';
import { labelBox, labelsOverlap } from './chart-labels';
import type { LabelBox } from './chart-labels';
import { niceTicks } from './emissions';
import { formatFixed, formatNumber } from './format';
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

// Dispersão "Carga ou região?" (#399): CO₂e = energia × intensidade, sem termo fixo, então cada região é uma reta pela
// origem com a intensidade de inclinação (docs/calculos.md, § Intensidade efetiva de uma região no período).

/** Serviço com energia e CO₂e calculados no período; `intensity` é a da matriz (null com energia zero). */
export interface ScatterPoint {
  id: string;
  name: string;
  region: string;
  energyKwh: number;
  co2eGrams: number;
  intensity: number | null;
}

export type RegionRay = { region: string; intensity: number };

/** Pontos da menor para a maior energia (a ordem das setas) e os nomes sem energia ou CO₂e: listados, nunca em zero. */
export function scatterPoints(services: ComparedService[]): { points: ScatterPoint[]; missing: string[] } {
  const points = services.flatMap(({ id, name, region, energyKwh, co2eGrams }) =>
    energyKwh === null || co2eGrams === null
      ? []
      : [{ id, name, region: region ?? 'sem região', energyKwh, co2eGrams, intensity: carbonIntensity(co2eGrams, energyKwh) }],
  );
  points.sort((a, b) => a.energyKwh - b.energyKwh || a.name.localeCompare(b.name, 'pt-BR'));
  return { points, missing: services.filter((service) => service.co2eGrams === null || service.energyKwh === null).map((service) => service.name) };
}

/**
 * Uma reta por região, com a intensidade efetiva do período: ΣCO₂e ÷ Σenergia dos serviços dela. Com o mesmo fator
 * em todos, é a intensidade de cada um, e o ponto cai sobre a reta. Da mais inclinada para a menos.
 */
export function regionRays(points: ScatterPoint[]): RegionRay[] {
  const sums = new Map<string, [number, number]>();
  for (const point of points) {
    const [energy, co2e] = sums.get(point.region) ?? [0, 0];
    sums.set(point.region, [energy + point.energyKwh, co2e + point.co2eGrams]);
  }
  return [...sums]
    .flatMap(([region, [energy, co2e]]) => {
      const intensity = carbonIntensity(co2e, energy);
      return intensity === null ? [] : [{ region, intensity }];
    })
    .sort((a, b) => b.intensity - a.intensity || a.region.localeCompare(b.region, 'pt-BR'));
}

/**
 * Eixos a partir de zero, senão as retas não passariam pela origem. Teto de X: a maior energia arredondada para cima;
 * teto de Y: teto de X × a maior intensidade, então toda reta sai inteira pela borda direita e nenhum ponto fica fora.
 */
export function scatterDomain(points: ScatterPoint[], rays: RegionRay[], xCount = 5, yCount = 5) {
  const xTicks = niceTicks(Math.max(0, ...points.map((point) => point.energyKwh)), xCount);
  const xMax = xTicks[xTicks.length - 1];
  const steepest = Math.max(0, ...rays.map((ray) => ray.intensity), ...points.map((point) => point.intensity ?? 0));
  const yMax = steepest > 0 ? xMax * steepest : 1;
  return { xMax, yMax, xTicks, yTicks: niceTicks(yMax, yCount).filter((tick) => tick <= yMax * (1 + 1e-9)) };
}

/** A conta do ponto com os números da matriz, "0,7116 kWh × 378,00 g/kWh = 268,98 g": energia em kWh, como a intensidade. */
export function scatterEquation(point: ScatterPoint): string {
  const energy = `${point.energyKwh.toLocaleString('pt-BR', { maximumSignificantDigits: 6 })} kWh`;
  const co2e = `${formatFixed(point.co2eGrams, 2)} g`;
  if (point.intensity === null) return `${energy} e ${co2e}: sem intensidade com energia zero`;
  return `${energy} × ${formatNumber(point.intensity, 2)} g/kWh = ${co2e}`;
}

/** Linha de base do rótulo a partir do ponto: acima e abaixo à esquerda, abaixo e acima à direita. */
const LABEL_SPOTS = [[-10, -7, 'end'], [-10, 16, 'end'], [10, 16, 'start'], [10, -7, 'start']] as const;

type LabelSpot = { x: number; y: number; anchor: 'start' | 'end' };

/**
 * Rótulo de cada ponto, na ordem recebida (destaques primeiro), na primeira das quatro posições que não cobre outro
 * ponto nem outro rótulo e não sai da área. Sem posição livre, o ponto fica fora do mapa: a tela diz quem ficou sem
 * nome, em vez de empilhar textos.
 */
export function placeLabels(
  targets: Array<{ id: string; x: number; y: number; text: string }>,
  area: LabelBox,
  radius: number,
  charWidth: number,
): Map<string, LabelSpot> {
  const taken: LabelBox[] = targets.map(({ x, y }) => ({ left: x - radius, right: x + radius, top: y - radius, bottom: y + radius }));
  const spots = new Map<string, LabelSpot>();
  for (const target of targets) {
    for (const [dx, dy, anchor] of LABEL_SPOTS) {
      const box = labelBox(target.text, target.x + dx, target.y + dy, anchor, charWidth, 12);
      const inside = box.left >= area.left && box.right <= area.right && box.top >= area.top && box.bottom <= area.bottom;
      if (!inside || taken.some((other) => labelsOverlap(box, other, 2))) continue;
      taken.push(box);
      spots.set(target.id, { x: target.x + dx, y: target.y + dy, anchor });
      break;
    }
  }
  return spots;
}

/** Altura dos rótulos das retas na borda direita: na ponta de cada reta, a `gap` px do vizinho, em [top, bottom]. */
export function spreadLabels(ys: number[], gap: number, top: number, bottom: number): number[] {
  const order = ys.map((y, index) => ({ y: Math.max(top, y), index })).sort((a, b) => a.y - b.y);
  // Desce quem encosta no de cima; depois sobe de baixo para cima quem passou do limite
  for (let k = 1; k < order.length; k += 1) order[k].y = Math.max(order[k].y, order[k - 1].y + gap);
  for (let k = order.length - 1; k >= 0; k -= 1) order[k].y = Math.min(order[k].y, k === order.length - 1 ? bottom : order[k + 1].y - gap);
  return order.sort((a, b) => a.index - b.index).map((item) => item.y);
}

/** Índice do ponto mais perto de (x, y), em px: o ponteiro não precisa acertar o ponto. Null sem pontos. */
export function nearestPoint(points: ReadonlyArray<{ x: number; y: number }>, x: number, y: number): number | null {
  const distances = points.map((point) => Math.hypot(point.x - x, point.y - y));
  return points.length === 0 ? null : distances.indexOf(Math.min(...distances));
}
