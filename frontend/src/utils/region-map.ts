// Mapa de bolhas (#322, RF13): o que cada bolha mostra, em cálculo puro, sem mapa nem DOM.
import type { Region, RegionStatus, RegionsResponse, RegionsSummaryResponse } from '../services/regions.types';

/** Uma região pronta para o mapa: posição e rede vêm de GET /api/regions; totais e estados, de /api/regions/summary. */
export interface MapRegion {
  code: string;
  /** Cidade, ou região, ou país: o primeiro que a API informar. */
  name: string;
  /** Região e país, para a linha de apoio; null quando não há mais nada a dizer. */
  place: string | null;
  latitude: number;
  longitude: number;
  carbonIntensity: number | null;
  renewableSharePercent: number | null;
  /** Pior estado entre os serviços da região; null = sem serviço hoje (ponto neutro, só destino possível). */
  state: RegionStatus | null;
  services: Record<RegionStatus, number>;
  /** Totais do período, em gramas e kWh; null quando nenhuma coleta tem cálculo (nunca 0 inventado). */
  co2eGrams: number | null;
  energyKwh: number | null;
}

export interface RegionJoin {
  /** Regiões com coordenada: as com serviço primeiro, do maior para o menor CO₂e. */
  regions: MapRegion[];
  /** Regiões com serviço que a Carbon API não posicionou, mais os serviços sem região: ficam fora do mapa. */
  unplacedServices: number;
}

function placeOf(region: Region, name: string): string | null {
  const place = [region.region, region.country].filter((part) => part !== name).join(', ');
  return place === '' ? null : place;
}

/**
 * Junta as duas respostas pelo código da região. PROVISÓRIO: a junção, o pior estado e a região mais limpa são da #321
 * (@travensolli, `utils/regions.ts`); quando ela chegar, este trecho passa a chamar as funções de lá.
 */
export function joinRegions(list: RegionsResponse, summary: RegionsSummaryResponse): RegionJoin {
  const totals = new Map(summary.regions.map((item) => [item.code, item]));
  const counted = (code: string | null) => {
    const item = totals.get(code);
    return item ? item.services.ativo + item.services.indisponivel + item.services.sem_metricas : 0;
  };
  let unplacedServices = counted(null);
  const regions: MapRegion[] = [];
  for (const region of list.regions) {
    const item = totals.get(region.code);
    if (region.latitude === null || region.longitude === null) {
      unplacedServices += counted(region.code);
      continue;
    }
    const name = region.city ?? region.region;
    regions.push({
      code: region.code,
      name,
      place: placeOf(region, name),
      latitude: region.latitude,
      longitude: region.longitude,
      carbonIntensity: region.carbonIntensityGco2ePerKwh,
      renewableSharePercent: region.renewableSharePercent,
      state: item?.worstStatus ?? null,
      services: item?.services ?? { ativo: 0, indisponivel: 0, sem_metricas: 0 },
      co2eGrams: item?.co2eGrams ?? null,
      energyKwh: item?.energyKwh ?? null,
    });
  }
  const rank = (region: MapRegion) => (region.state === null ? -2 : (region.co2eGrams ?? -1));
  regions.sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, 'pt-BR'));
  return { regions, unplacedServices };
}

/** Diâmetro mínimo, em px: bolha sem valor (indisponível ou sem métricas) só marca o lugar. */
export const MIN_BUBBLE = 22;
/** Ponto neutro de uma região sem serviço. */
export const IDLE_DOT = 10;

/**
 * Diâmetro da bolha, em px. A ÁREA é proporcional ao CO₂e (por isso a raiz quadrada): com o diâmetro proporcional, uma
 * região com o dobro da emissão pareceria quatro vezes maior.
 */
export function bubbleDiameter(co2eGrams: number | null, maxCo2eGrams: number): number {
  if (co2eGrams === null) return MIN_BUBBLE;
  if (maxCo2eGrams <= 0) return 28;
  return Math.round(28 + 60 * Math.sqrt(Math.min(1, co2eGrams / maxCo2eGrams)));
}

/** Parte preenchida do anel de energia, de 4 a 100: a energia da região diante da que mais consumiu. null: sem anel. */
export function ringPercent(energyKwh: number | null, maxEnergyKwh: number): number | null {
  if (energyKwh === null || maxEnergyKwh <= 0) return null;
  return Math.max(4, Math.round(Math.min(1, energyKwh / maxEnergyKwh) * 100));
}

/** "39,04° N, 77,49° O": posição aproximada, com duas casas, sem sugerir o endereço do datacenter. */
export function formatCoordinates(latitude: number, longitude: number): string {
  const degrees = (value: number) => Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${degrees(latitude)}° ${latitude < 0 ? 'S' : 'N'}, ${degrees(longitude)}° ${longitude < 0 ? 'O' : 'L'}`;
}
