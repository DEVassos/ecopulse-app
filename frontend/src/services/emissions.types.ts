// Série de emissão de CO₂e de um serviço (estação de coleta), usada pela página Emissões (#190).
// Fontes: GET /api/collections (#188), para ver cada coleta, e GET /api/collections/series (#189), que soma no banco.

/** Agrupamento da série: `coleta` é cada coleta (30 s); os outros somam as coletas de cada intervalo. */
export type EmissionsBucket = 'coleta' | '15min' | '1h';

/** Um intervalo da série (ou uma coleta, no agrupamento `coleta`), em ordem cronológica. */
export interface EmissionPoint {
  /** Início do intervalo (ou instante da coleta), em milissegundos (epoch). */
  t: number;
  /** Coletas no intervalo. */
  collections: number;
  /** Coletas com falha (`status` diferente de `ok`). */
  failed: number;
  /** Coletas `ok` sem cálculo de energia/CO₂e. */
  notCalculated: number;
  /** Soma da energia estimada, em kWh; null quando nenhuma coleta do intervalo foi calculada. */
  energyKwh: number | null;
  /** Soma da emissão estimada, em g CO₂e; null quando nenhuma coleta do intervalo foi calculada. */
  co2eGrams: number | null;
  /** Menor e maior emissão de uma coleta no intervalo, em g CO₂e (faixa do gráfico). */
  co2eMinGrams: number | null;
  co2eMaxGrams: number | null;
}

/** Totais do período (`totals` da #189). */
export interface EmissionsTotals {
  collections: number;
  failed: number;
  notCalculated: number;
  energyKwh: number | null;
  co2eGrams: number | null;
  /** Maior emissão de uma única coleta no período, em g CO₂e. */
  co2eMaxGrams: number | null;
  /** Intensidade de carbono da região, em g CO₂e/kWh: média das coletas calculadas do período (como na #189). */
  carbonIntensity: number | null;
}

export interface EmissionsQuery {
  serviceId: string;
  /** Início do período (ISO 8601, incluído). */
  from: string;
  /** Fim do período (ISO 8601, excluído). */
  to: string;
  bucket: EmissionsBucket;
}

export interface EmissionsSeries {
  bucket: EmissionsBucket;
  points: EmissionPoint[];
  totals: EmissionsTotals;
  /** A busca por coleta parou no teto de páginas: o início do período pode estar faltando. */
  truncated: boolean;
  /** Itens recebidos fora do formato de docs/api.md, deixados de fora do gráfico e dos totais. */
  discarded: number;
}
