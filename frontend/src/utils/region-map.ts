// Lista de regiões do Dashboard (#342, RF13): o que cada linha mostra, em cálculo puro, sem React. A junção das duas
// respostas e o pior estado vêm da #321 (`utils/regions.ts`); aqui ficam só o nome, o lugar e a ordem da tela.
import type { RegionStatus, RegionsResponse, RegionsSummaryResponse } from '../services/regions.types';
import { joinRegions } from './regions';
import type { RegionWithTotals } from './regions';

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
  };
}
