// Ranking, ordem e CSV da Comparação (#431). Cálculo puro, sem React: a página guarda a ordem escolhida e entrega os
// serviços já ordenados à matriz, aos gráficos e ao arquivo, então todos seguem a mesma ordem.
import type { ComparedService } from '../services/compare.types';
import { carbonIntensity } from './comparison';
import { CSV_FORMAT, csvNumber, csvText } from './csv';
import { averagePowerFromEnergy } from './efficiency';

/** Métricas que ordenam a comparação; o CO₂e é o padrão do ranking. */
export type SortKey = 'co2e' | 'energy' | 'intensity' | 'power' | 'name';
export type SortDirection = 'asc' | 'desc';
export interface CompareSort {
  key: SortKey;
  direction: SortDirection;
}

export const DEFAULT_SORT: CompareSort = { key: 'co2e', direction: 'asc' };

/** Rótulo de cada ordem, no controle do ranking e no anúncio para o leitor de tela. */
export const SORT_LABEL: Record<SortKey, string> = {
  co2e: 'CO₂e',
  energy: 'Energia',
  intensity: 'Intensidade',
  power: 'Potência média',
  name: 'Nome',
};

const SORT_VALUE: Record<Exclude<SortKey, 'name'>, (service: ComparedService) => number | null> = {
  co2e: (service) => service.co2eGrams,
  energy: (service) => service.energyKwh,
  intensity: (service) => carbonIntensity(service.co2eGrams, service.energyKwh),
  power: (service) => averagePowerFromEnergy(service.energyKwh, service.monitoredSeconds),
};

const byName = (a: ComparedService, b: ComparedService) => a.name.localeCompare(b.name, 'pt-BR');

/**
 * Serviços na ordem escolhida. Sem valor no período fica sempre no fim, nas duas direções (não é zero, então não é o
 * menor); empate e nome seguem a ordem alfabética, para a ordem não mudar entre uma busca e outra.
 */
export function sortServices(services: readonly ComparedService[], sort: CompareSort): ComparedService[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  if (sort.key === 'name') return [...services].sort((a, b) => sign * byName(a, b));
  const valueOf = SORT_VALUE[sort.key];
  return [...services].sort((a, b) => {
    const [first, second] = [valueOf(a), valueOf(b)];
    if (first === null || second === null) return Number(first === null) - Number(second === null) || byName(a, b);
    return sign * (first - second) || byName(a, b);
  });
}

/** Clique no cabeçalho de uma métrica: a mesma inverte a direção; outra começa do menor (ou de A, no nome). */
export function nextSort(current: CompareSort, key: SortKey): CompareSort {
  if (current.key !== key) return { key, direction: 'asc' };
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

/** Serviço com coletas com falha ou sem cálculo no período, para o alerta acima da matriz. */
export interface CollectionIssue {
  id: string;
  name: string;
  failed: number;
  notCalculated: number;
}

/** Serviços com falha ou sem cálculo, na ordem recebida; lista vazia quando o período não teve nenhuma. */
export function collectionIssues(services: readonly ComparedService[]): CollectionIssue[] {
  return services
    .filter((service) => service.failed > 0 || service.notCalculated > 0)
    .map(({ id, name, failed, notCalculated }) => ({ id, name, failed, notCalculated }));
}

/** Colunas do CSV: as linhas da matriz, em unidades fixas (kWh, g, W), para a planilha somar sem converter. */
export const COMPARE_CSV_COLUMNS = [
  'posicao',
  'servico',
  'regiao',
  'energia_kwh',
  'potencia_media_w',
  'intensidade_gco2e_kwh',
  'co2e_g',
  'tempo_monitorado_s',
  'coletas',
  'coletas_com_falha',
  'coletas_sem_calculo',
  'cpu_media_percent',
  'memoria_media_gb',
  'disco_medio_gb',
  'rede_media_gb',
] as const;

function compareRow(service: ComparedService, index: number): string[] {
  return [
    String(index + 1),
    csvText(service.name),
    csvText(service.region),
    csvNumber(service.energyKwh),
    csvNumber(averagePowerFromEnergy(service.energyKwh, service.monitoredSeconds)),
    csvNumber(carbonIntensity(service.co2eGrams, service.energyKwh)),
    csvNumber(service.co2eGrams),
    csvNumber(service.monitoredSeconds),
    csvNumber(service.collections),
    csvNumber(service.failed),
    csvNumber(service.notCalculated),
    csvNumber(service.avgCpuPercent),
    csvNumber(service.avgMemoryGb),
    csvNumber(service.avgDiskGb),
    csvNumber(service.avgNetworkGb),
  ];
}

/**
 * O arquivo da comparação, no mesmo formato do CSV de coletas (#24): BOM, cabeçalho e uma linha por serviço, na ordem
 * recebida (a da tela), com CRLF. Sem valor no período fica vazio, nunca 0.
 */
export function comparisonCsv(services: readonly ComparedService[]): string {
  const lines = [COMPARE_CSV_COLUMNS.join(CSV_FORMAT.separator), ...services.map((service, index) => compareRow(service, index).join(CSV_FORMAT.separator))];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** "ecopulse-comparacao-2026-11-21-a-2026-11-21.csv"; as datas são as do filtro (AAAA-MM-DD). */
export function comparisonFileName(start: string, end: string): string {
  return `ecopulse-comparacao-${start}-a-${end}.csv`;
}
