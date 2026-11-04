import type { ServiceStatus } from '../../shared/persistence.types';
import { MonitoringStatus } from '../../domain/monitoring-status';
import { NotFoundError } from '../../shared/errors';
import { ServiceRepository, type ServiceComparisonRow, type ServiceWithLastReading } from './services.repository';

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
}

export interface ServicesResponse {
  services: MonitoredService[];
  period: string;
}

const PERIOD = 'última leitura (intervalo de coleta)';

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
    cpuPercent: service.cpu_percent === null ? null : Number(service.cpu_percent),
    energyKwh: service.energy_kwh === null ? null : Number(service.energy_kwh),
    emissionsG: service.co2e_grams === null ? null : Number(service.co2e_grams),
    status: MonitoringStatus.fromValue(service.status).value(),
    statusReason: statusReason(service),
    lastReadingAt: service.last_reading_at?.toISOString() ?? null,
  };
}

export async function getServices(repository: ServiceRepository): Promise<ServicesResponse> {
  return { services: (await repository.findAllWithLastReading()).map(toMonitoredService), period: PERIOD };
}

export interface ServicesSummaryResponse { period: { from: string; to: string }; energyKwh: number | null; co2eGrams: number | null; services: { active: number; unavailable: number; withoutMetrics: number; removed: number } }
const numberOrNull = (value: string | null): number | null => value === null ? null : Number(value);

export async function getServicesSummary(repository: ServiceRepository, period: { from: Date; to: Date }): Promise<ServicesSummaryResponse> {
  const row = await repository.findSummary(period.from, period.to);
  return { period: { from: period.from.toISOString(), to: period.to.toISOString() }, energyKwh: numberOrNull(row.energy_kwh), co2eGrams: numberOrNull(row.co2e_grams), services: { active: Number(row.active), unavailable: Number(row.unavailable), withoutMetrics: Number(row.without_metrics), removed: Number(row.removed) } };
}

export interface ServiceComparisonInput { ids: string[]; from: Date; to: Date }
export interface ServiceComparisonResponse {
  from: string; to: string;
  services: Array<{ id: string; name: string; region: string | null; collections: number; failed: number; notCalculated: number;
    avgCpuPercent: number | null; avgMemoryGb: number | null; avgDiskGb: number | null; avgNetworkGb: number | null; energyKwh: number | null; co2eGrams: number | null }>;
}
function comparison(row: ServiceComparisonRow): ServiceComparisonResponse['services'][number] {
  return { id: row.id, name: row.name, region: row.region, collections: Number(row.collections), failed: Number(row.failed), notCalculated: Number(row.not_calculated),
    avgCpuPercent: numberOrNull(row.avg_cpu_percent), avgMemoryGb: numberOrNull(row.avg_memory_gb), avgDiskGb: numberOrNull(row.avg_disk_gb), avgNetworkGb: numberOrNull(row.avg_network_gb), energyKwh: numberOrNull(row.energy_kwh), co2eGrams: numberOrNull(row.co2e_grams) };
}
export async function getServiceComparison(repository: ServiceRepository, input: ServiceComparisonInput): Promise<ServiceComparisonResponse> {
  const rows = await repository.compareByIds(input.ids, input.from, input.to);
  if (rows.length !== input.ids.length) throw new NotFoundError('Um ou mais serviços não foram encontrados.');
  const byId = new Map(rows.map(row => [row.id, comparison(row)]));
  return { from: input.from.toISOString(), to: input.to.toISOString(), services: input.ids.map(id => byId.get(id)!).filter(Boolean) };
}
