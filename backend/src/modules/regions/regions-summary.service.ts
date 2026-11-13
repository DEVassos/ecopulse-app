import type { ServiceStatus } from '../../shared/persistence.types';
import type { RegionsSummaryRepository } from './regions-summary.repository';

export interface RegionsSummaryResponse {
  from: string; to: string;
  regions: Array<{
    code: string | null; energyKwh: number | null; co2eGrams: number | null;
    collections: number; failed: number; notCalculated: number;
    services: { ativo: number; indisponivel: number; sem_metricas: number };
    worstStatus: Exclude<ServiceStatus, 'removido'> | null;
  }>;
}

export async function getRegionsSummary(repository: RegionsSummaryRepository,
  period: { from: Date; to: Date }): Promise<RegionsSummaryResponse> {
  const rows = await repository.summarize(period.from, period.to);
  const amount = (value: string | null) => value === null ? null : Number(value);
  return { from: period.from.toISOString(), to: period.to.toISOString(), regions: rows.map(row => {
    const services = { ativo: Number(row.active), indisponivel: Number(row.unavailable), sem_metricas: Number(row.without_metrics) };
    return { code: row.code, energyKwh: amount(row.energy_kwh), co2eGrams: amount(row.co2e_grams),
      collections: Number(row.collections), failed: Number(row.failed), notCalculated: Number(row.not_calculated), services,
      worstStatus: services.indisponivel > 0 ? 'indisponivel' : services.sem_metricas > 0 ? 'sem_metricas' : services.ativo > 0 ? 'ativo' : null };
  }) };
}
