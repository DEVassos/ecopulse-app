// Contrato de GET /api/services/compare (docs/api.md, #193).

/** Parcelas da potência média, em W, cada uma arredondada a seis casas pelo backend (docs/calculos.md). */
export interface PowerBreakdown {
  cpuW: number;
  memoryW: number;
  diskW: number;
  networkW: number;
}

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
  /** Composição da potência média do período, em W, uma parcela por recurso; null quando falta alguma das médias (#327). */
  avgPowerBreakdown: PowerBreakdown | null;
  /** Soma das coletas calculadas, em kWh; null quando nenhuma foi calculada. */
  energyKwh: number | null;
  /** Soma das coletas calculadas, em gramas de CO₂e; null quando nenhuma foi calculada. */
  co2eGrams: number | null;
  /**
   * Segundos monitorados das mesmas coletas de `energyKwh` (soma dos intervalos), base da potência média do período
   * (#329); null quando nenhuma coleta entrou no cálculo.
   */
  monitoredSeconds: number | null;
}

export interface ServicesComparison {
  /** Período considerado, ecoado pela API (ISO 8601, intervalo [from, to)). */
  from: string;
  to: string;
  /** Na mesma ordem dos ids pedidos. */
  services: ComparedService[];
}
