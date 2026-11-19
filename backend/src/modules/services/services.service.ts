import type { ServiceStatus } from '../../shared/persistence.types';
import { powerBreakdown, type PowerBreakdown } from '../../domain/carbon-calculator';
import { MonitoringStatus } from '../../domain/monitoring-status';
import { NotFoundError } from '../../shared/errors';
import { ServiceRepository, type ServiceComparisonRow, type ServiceRankingMetric, type ServiceRankingRow, type ServiceSummaryTotalsRow, type ServiceWithLastReading } from './services.repository';

export interface MonitoredService {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  city: string | null;
  cpuPercent: number | null;
  energyKwh: number | null;
  emissionsG: number | null;
  status: ServiceStatus;
  statusReason: string | null;
  lastReadingAt: string | null;
  /** Código da região do cadastro (ex.: "us-east"); `region` continua sendo o nome (#297). */
  regionCode: string | null;
  /** Da mesma última coleta: intervalo em s, recursos em GB, potência em W e o fator usado em gCO₂e/kWh; null sem coleta ou sem cálculo. */
  collectionIntervalSeconds: number | null;
  memoryGb: number | null;
  diskGb: number | null;
  networkGb: number | null;
  powerWatts: number | null;
  carbonIntensityGco2ePerKwh: number | null;
  /** Parcelas da potência da mesma última coleta, em W (#327); `null` quando `powerWatts` é `null`. */
  powerBreakdown: PowerBreakdown | null;
}

export interface ServicesResponse {
  services: MonitoredService[];
  period: string;
}

const PERIOD = 'última leitura (intervalo de coleta)';
const numberOrNull = (value: string | null): number | null => value === null ? null : Number(value);

/**
 * Parcelas da potência a partir dos quatro recursos, ou `null` quando falta algum deles.
 */
function breakdownOf(cpu: string | null, memory: string | null, disk: string | null, network: string | null): PowerBreakdown | null {
  if (cpu === null || memory === null || disk === null || network === null) return null;
  return powerBreakdown({ cpuPercent: Number(cpu), memoryGb: Number(memory), diskGb: Number(disk), networkGb: Number(network) });
}

/** Expõe somente diagnósticos conhecidos; detalhes arbitrários continuam restritos ao banco/log. */
function statusReason(service: ServiceWithLastReading): string | null {
  const message = service.error_message;
  if (service.status !== 'indisponivel' || !message?.trim()) return null;
  if (message === 'Serviço indisponível (HTTP 500).' || message === 'Timeout'
    || message === 'Falha externa ao coletar métricas.') return message;
  if (message.startsWith('Descoberta indisponível;')) return 'Descoberta indisponível; não foi possível consultar as métricas dos serviços.';
  if (message.startsWith('A API de métricas não respondeu em ')) return 'A API de métricas não respondeu no prazo esperado.';
  if (message.startsWith('Não foi possível conectar à API de métricas')) return 'Não foi possível conectar à API de métricas.';
  const http = /^A API de métricas respondeu HTTP ([1-5]\d{2}) em /.exec(message);
  return http ? `A API de métricas respondeu HTTP ${http[1]}.` : 'Não foi possível obter as métricas deste serviço.';
}

function toMonitoredService(service: ServiceWithLastReading): MonitoredService {
  return {
    id: String(service.id),
    name: service.name,
    country: service.country,
    region: service.region,
    city: service.city,
    cpuPercent: numberOrNull(service.cpu_percent),
    energyKwh: numberOrNull(service.energy_kwh),
    emissionsG: numberOrNull(service.co2e_grams),
    status: MonitoringStatus.fromValue(service.status).value(),
    statusReason: statusReason(service),
    lastReadingAt: service.last_reading_at?.toISOString() ?? null,
    regionCode: service.region_code,
    collectionIntervalSeconds: service.collection_interval_seconds,
    memoryGb: numberOrNull(service.memory_gb),
    diskGb: numberOrNull(service.disk_gb),
    networkGb: numberOrNull(service.network_gb),
    powerWatts: numberOrNull(service.power_watts),
    carbonIntensityGco2ePerKwh: numberOrNull(service.carbon_intensity_gco2e_per_kwh),
    powerBreakdown: service.power_watts === null
      ? null
      : breakdownOf(service.cpu_percent, service.memory_gb, service.disk_gb, service.network_gb),
  };
}

export async function getServices(repository: ServiceRepository): Promise<ServicesResponse> {
  return { services: (await repository.findAllWithLastReading()).map(toMonitoredService), period: PERIOD };
}

export interface ServiceSummaryTotals {
  collections: number;
  failed: number;
  notCalculated: number;
  energyKwh: number | null;
  co2eGrams: number | null;
  carbonIntensityGco2ePerKwh: number | null;
}
export interface ServicesSummaryResponse {
  from: string;
  to: string;
  totals: ServiceSummaryTotals;
  previous: { from: string; to: string; totals: ServiceSummaryTotals };
  servicesByStatus: { ativo: number; indisponivel: number; sem_metricas: number; removido: number; total: number };
}

function summaryTotals(row: ServiceSummaryTotalsRow): ServiceSummaryTotals {
  const energyKwh = numberOrNull(row.energy_kwh);
  const co2eGrams = numberOrNull(row.co2e_grams);
  return {
    collections: Number(row.collections),
    failed: Number(row.failed),
    notCalculated: Number(row.not_calculated),
    energyKwh,
    co2eGrams,
    carbonIntensityGco2ePerKwh: energyKwh === null || energyKwh === 0 || co2eGrams === null
      ? null
      : co2eGrams / energyKwh,
  };
}

export async function getServicesSummary(repository: ServiceRepository, period: { from: Date; to: Date }): Promise<ServicesSummaryResponse> {
  const duration = period.to.getTime() - period.from.getTime();
  const previous = { from: new Date(period.from.getTime() - duration), to: period.from };
  const [currentTotals, previousTotals, statusRows] = await Promise.all([
    repository.findSummaryTotals(period.from, period.to),
    repository.findSummaryTotals(previous.from, previous.to),
    repository.countServicesByStatus(),
  ]);
  const counts = new Map(statusRows.map(row => [row.status, Number(row.count)]));
  const ativo = counts.get('ativo') ?? 0;
  const indisponivel = counts.get('indisponivel') ?? 0;
  const sem_metricas = counts.get('sem_metricas') ?? 0;
  const removido = counts.get('removido') ?? 0;
  return {
    from: period.from.toISOString(),
    to: period.to.toISOString(),
    totals: summaryTotals(currentTotals),
    previous: {
      from: previous.from.toISOString(),
      to: previous.to.toISOString(),
      totals: summaryTotals(previousTotals),
    },
    servicesByStatus: { ativo, indisponivel, sem_metricas, removido, total: ativo + indisponivel + sem_metricas },
  };
}

export interface ServiceComparisonInput { ids: string[]; from: Date; to: Date }
export interface ServiceComparisonResponse {
  from: string; to: string;
  services: Array<{ id: string; name: string; region: string | null; collections: number; failed: number; notCalculated: number;
    avgCpuPercent: number | null; avgMemoryGb: number | null; avgDiskGb: number | null; avgNetworkGb: number | null;
    /** Composição da potência média do período, em W (#327); `null` quando falta alguma das quatro médias. */
    avgPowerBreakdown: PowerBreakdown | null;
    energyKwh: number | null; co2eGrams: number | null }>;
}
function comparison(row: ServiceComparisonRow): ServiceComparisonResponse['services'][number] {
  return { id: row.id, name: row.name, region: row.region, collections: Number(row.collections), failed: Number(row.failed), notCalculated: Number(row.not_calculated),
    avgCpuPercent: numberOrNull(row.avg_cpu_percent), avgMemoryGb: numberOrNull(row.avg_memory_gb), avgDiskGb: numberOrNull(row.avg_disk_gb),
    avgNetworkGb: numberOrNull(row.avg_network_gb),
    avgPowerBreakdown: breakdownOf(row.avg_cpu_percent, row.avg_memory_gb, row.avg_disk_gb, row.avg_network_gb),
    energyKwh: numberOrNull(row.energy_kwh), co2eGrams: numberOrNull(row.co2e_grams) };
}
export async function getServiceComparison(repository: ServiceRepository, input: ServiceComparisonInput): Promise<ServiceComparisonResponse> {
  const rows = await repository.compareByIds(input.ids, input.from, input.to);
  if (rows.length !== input.ids.length) throw new NotFoundError('Um ou mais serviços não foram encontrados.');
  const byId = new Map(rows.map(row => [row.id, comparison(row)]));
  return { from: input.from.toISOString(), to: input.to.toISOString(), services: input.ids.map(id => byId.get(id)!).filter(Boolean) };
}

export interface ServiceRankingResponse {
  metric: ServiceRankingMetric;
  from: string;
  to: string;
  services: Array<{
    position: number | null; id: string; name: string; region: string | null; status: ServiceStatus;
    energyKwh: number | null; co2eGrams: number | null;
    collections: number; failed: number; notCalculated: number;
  }>;
}

function rankedService(row: ServiceRankingRow, metric: ServiceRankingMetric, position: number): ServiceRankingResponse['services'][number] {
  const selectedValue = metric === 'energy' ? row.energy_kwh : row.co2e_grams;
  return {
    position: selectedValue === null ? null : position,
    id: String(row.id),
    name: row.name,
    region: row.region,
    status: row.status,
    energyKwh: numberOrNull(row.energy_kwh),
    co2eGrams: numberOrNull(row.co2e_grams),
    collections: Number(row.collections),
    failed: Number(row.failed),
    notCalculated: Number(row.not_calculated),
  };
}

export async function getServiceRanking(
  repository: ServiceRepository,
  metric: ServiceRankingMetric,
  period: { from: Date; to: Date },
): Promise<ServiceRankingResponse> {
  const rows = await repository.rankByPeriod(metric, period.from, period.to);
  let position = 0;
  const services = rows.map(row => {
    const ranked = rankedService(row, metric, position + 1);
    if (ranked.position !== null) position++;
    return ranked;
  });
  return { metric, from: period.from.toISOString(), to: period.to.toISOString(), services };
}
