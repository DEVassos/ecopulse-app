// Lista de regiões do Dashboard (#342, RF13): o que cada linha mostra, em cálculo puro, sem React. A junção das duas
// respostas e o pior estado vêm da #321 (`utils/regions.ts`); aqui ficam só o nome, o lugar e a ordem da tela.
import type { RegionStatus, RegionsResponse, RegionsSummaryResponse } from '../services/regions.types';
import { bubbleRadius, estimateMigration, joinRegions } from './regions';
import type { RegionWithTotals } from './regions';
import { formatQuantity } from './units';

/** Uma região pronta para a lista (e, na #322, para o mapa). */
export interface ListedRegion extends RegionWithTotals {
  /** Cidade, ou o nome da região quando a cidade não vem. */
  name: string;
  /** Região e país, para a linha de apoio; null quando não há mais nada a dizer. */
  place: string | null;
}

export interface RegionOverview {
  /** Regiões com serviço (ou com CO₂e no período), do maior para o menor CO₂e; as sem cálculo vêm depois. */
  monitored: ListedRegion[];
  /** Regiões da Carbon API sem serviço hoje, por nome: destinos possíveis, sem números do período. */
  idle: ListedRegion[];
  /** Serviços sem região ou com região que a Carbon API não informa: ficam fora da lista, mas não somem do total. */
  outside: { services: number; co2eGrams: number | null };
  /** Fora do mapa: os serviços de `outside` mais os de regiões listadas sem coordenada. */
  unplacedServices: number;
  /** Quando o backend buscou as intensidades na Carbon API (ISO 8601): a simulação mostra "intensidade de HH:MM" (#326). */
  fetchedAt: string;
}

/** Serviços contados numa região, sem os removidos. */
export function serviceCount(services: Record<RegionStatus, number>): number {
  return services.ativo + services.indisponivel + services.sem_metricas;
}

/** Soma que continua null quando nenhuma parte tem valor ("não calculado", nunca 0 inventado). */
function sumOrNull(values: (number | null)[]): number | null {
  const known = values.filter((value): value is number => value !== null);
  return known.length === 0 ? null : known.reduce((total, value) => total + value, 0);
}

/** Junta GET /api/regions e GET /api/regions/summary e separa o que a lista mostra em cada parte. */
export function buildRegionOverview(list: RegionsResponse, summary: RegionsSummaryResponse): RegionOverview {
  const { regions, unlisted } = joinRegions(list.regions, summary.regions);
  const named: ListedRegion[] = regions.map((region) => {
    const name = region.city ?? region.region;
    const place = [region.region, region.country].filter((part) => part !== name).join(', ');
    return { ...region, name, place: place === '' ? null : place };
  });
  // Região só com serviços removidos ainda pode ter CO₂e no período: ela fica entre as monitoradas para a soma da lista
  // bater com o card "Emissões no período"
  const counted = (region: ListedRegion) => region.worstStatus !== null || region.co2eGrams !== null;
  const rank = (region: ListedRegion) => region.co2eGrams ?? -1;
  const monitored = named
    .filter(counted)
    .sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, 'pt-BR'));
  const idle = named.filter((region) => !counted(region)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const outsideServices = unlisted.reduce((total, item) => total + serviceCount(item.services), 0);
  const withoutCoordinate = monitored
    .filter((region) => region.latitude === null)
    .reduce((total, region) => total + serviceCount(region.services), 0);
  return {
    monitored,
    idle,
    outside: { services: outsideServices, co2eGrams: sumOrNull(unlisted.map((item) => item.co2eGrams)) },
    unplacedServices: outsideServices + withoutCoordinate,
    fetchedAt: list.fetchedAt,
  };
}

/** Diâmetro mínimo, em px: bolha sem valor (indisponível ou sem métricas) só marca o lugar. */
export const MIN_BUBBLE = 22;
/** Ponto neutro de uma região sem serviço. */
export const IDLE_DOT = 10;

/**
 * Diâmetro da bolha no mapa (#322), em px: `28 + 60 × raio relativo`, a escala do protótipo, vezes `scale` (mapScale).
 * O raio relativo é o `bubbleRadius` da #321, com a área proporcional ao CO₂e. Sem CO₂e calculado, a bolha só marca o
 * lugar. Nunca fica menor que MIN_BUBBLE, para continuar dando para tocar.
 */
export function bubbleDiameter(co2eGrams: number | null, maxCo2eGrams: number, scale = 1): number {
  const radius = bubbleRadius(co2eGrams, maxCo2eGrams);
  return radius === null ? MIN_BUBBLE : Math.max(MIN_BUBBLE, Math.round((28 + 60 * radius) * scale));
}

/** Lado menor do mapa em que o zoom da visão geral e o tamanho das bolhas foram ajustados (altura máxima no CSS). */
export const REFERENCE_SIDE = 460;
/** As bolhas encolhem com o mapa até esta fração, e não menos: abaixo disso as menores ficariam difíceis de tocar. */
export const MIN_SCALE = 0.6;

/**
 * Zoom que faz o globo caber no mapa (RNF01). O globo dobra de tamanho a cada nível de zoom e o mapa encolhe no
 * celular (300 px de altura): o zoom diminui na proporção do lado menor. Num mapa maior que o de referência, fica o base.
 */
export function fitZoom(baseZoom: number, width: number, height: number): number {
  const side = Math.min(width, height);
  if (!(side > 0)) return baseZoom;
  return baseZoom + Math.min(0, Math.log2(side / REFERENCE_SIDE));
}

/** Fração do tamanho das bolhas no mapa atual: a mesma proporção do globo (fitZoom), de MIN_SCALE a 1. */
export function mapScale(width: number, height: number): number {
  const side = Math.min(width, height);
  if (!(side > 0)) return 1;
  return Math.min(1, Math.max(MIN_SCALE, side / REFERENCE_SIDE));
}

/** Parte preenchida do anel de energia, de 4 a 100: a energia da região diante da que mais consumiu. null: sem anel. */
export function ringPercent(energyKwh: number | null, maxEnergyKwh: number): number | null {
  if (energyKwh === null || maxEnergyKwh <= 0) return null;
  return Math.max(4, Math.round(Math.min(1, energyKwh / maxEnergyKwh) * 100));
}

/** O cache da Carbon API no backend dura 1 h: intensidade mais velha que isso indica que a API não respondeu. */
export const INTENSITY_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Hora das intensidades usadas na simulação (#326): "14:05" e se passou de 1 h. `source: 'cache'` é o estado normal
 * durante a hora de cache, por isso a tela sempre mostra a hora, e o aviso só aparece quando o dado passou da hora.
 */
export function intensityTime(fetchedAt: string, now: Date = new Date()): { time: string; stale: boolean } {
  const at = new Date(fetchedAt);
  return {
    time: at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    stale: now.getTime() - at.getTime() > INTENSITY_MAX_AGE_MS,
  };
}

/** Percentual da simulação com 2 casas, como no exemplo de docs/calculos.md: 89.4170… → "89,42%". */
export function formatMigrationPercent(percent: number): string {
  return `${percent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/**
 * Linha da conta para quem verifica (#326): energia em kWh e intensidade em g/kWh, as unidades de docs/calculos.md,
 * com 4 algarismos significativos como o `formatPrecise`. "0,118 kWh × 40 g/kWh = 4,72 g".
 */
export function migrationMath(energyKwh: number, intensity: number, grams: number): string {
  const precise = (value: number) => value.toLocaleString('pt-BR', { maximumSignificantDigits: 4 });
  return `${precise(energyKwh)} kWh × ${precise(intensity)} g/kWh = ${precise(grams)} g`;
}

/** Destino da simulação no mapa (#326): a região escolhida e o CO₂e que a energia da origem emitiria nela. */
export interface MapDestination {
  code: string;
  /** CO₂e simulado em gramas, que dá o tamanho do marcador na mesma escala das bolhas; null sem conta possível. */
  co2eGrams: number | null;
}

/**
 * Destino escolhido no painel, pronto para o mapa: só quando a origem é uma região com serviço e o destino está na lista
 * da Carbon API. O CO₂e é a conta de `estimateMigration`, a mesma do painel.
 */
export function mapDestination(overview: RegionOverview, originCode: string | null, destinationCode: string | null): MapDestination | null {
  if (originCode === null || destinationCode === null || originCode === destinationCode) return null;
  const origin = overview.monitored.find((region) => region.code === originCode);
  const destination = [...overview.monitored, ...overview.idle].find((region) => region.code === destinationCode);
  if (!origin || !destination) return null;
  const estimate = estimateMigration(origin.energyKwh, origin.co2eGrams, destination.carbonIntensityGco2ePerKwh);
  return { code: destination.code, co2eGrams: estimate?.grams ?? null };
}

/**
 * Para onde a câmera vai (#326): o destino simulado quando há um com coordenada; senão, a região selecionada. A câmera só
 * se move quando este código muda, então a atualização periódica não a mexe.
 */
export function cameraTarget(selectedCode: string | null, destination: MapDestination | null, placedCodes: ReadonlySet<string>): string | null {
  return destination !== null && placedCodes.has(destination.code) ? destination.code : selectedCode;
}

/**
 * Maior CO₂e da escala das bolhas: o das regiões com serviço e, com a simulação aberta, o do destino (#326). Sem o
 * destino, um destino mais sujo que a maior região sairia do tamanho dela, porque o raio para em 1.
 */
export function co2eScaleMax(monitored: readonly ListedRegion[], destination: MapDestination | null): number {
  return Math.max(0, ...monitored.map((region) => region.co2eGrams ?? 0), destination?.co2eGrams ?? 0);
}

/**
 * Etiqueta visível sob a bolha selecionada e sob o destino simulado (#326): o mapa diz onde a câmera está, mesmo com o
 * painel fora da tela. "Ashburn · 253 g CO₂e", "Destino simulado: Toronto · 26,8 g CO₂e". As outras bolhas: null.
 */
export function bubbleCaption(region: ListedRegion, selectedCode: string | null, destination: MapDestination | null): string | null {
  if (region.code === destination?.code) {
    return `Destino simulado: ${region.name}${destination.co2eGrams === null ? '' : ` · ${formatQuantity('co2e', destination.co2eGrams)} CO₂e`}`;
  }
  if (region.code !== selectedCode) return null;
  if (region.worstStatus === null && region.co2eGrams === null) return `${region.name} · sem serviço hoje`;
  return region.co2eGrams === null ? region.name : `${region.name} · ${formatQuantity('co2e', region.co2eGrams)} CO₂e`;
}
