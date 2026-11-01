// Contrato de GET /api/services/compare (docs/api.md, #193).

/** Um serviço comparado no período: contagens de coletas, médias das métricas e somas de energia e CO₂e. */
export interface ComparedService {
  id: string;
  name: string;
  region: string | null;
  /** Coletas no período; 0 quando o serviço não teve nenhuma (as médias e somas vêm null). */
  collections: number;
  failed: number;
  notCalculated: number;
  avgCpuPercent: number | null;
  avgMemoryGb: number | null;
  avgDiskGb: number | null;
  avgNetworkGb: number | null;
  /** Soma das coletas calculadas, em kWh; null quando nenhuma foi calculada. */
  energyKwh: number | null;
  /** Soma das coletas calculadas, em gramas de CO₂e; null quando nenhuma foi calculada. */
  co2eGrams: number | null;
}

export interface ServicesComparison {
  /** Período considerado, ecoado pela API (ISO 8601, intervalo [from, to)). */
  from: string;
  to: string;
  /** Na mesma ordem dos ids pedidos. */
  services: ComparedService[];
}
