import type { Database } from '../db/connection';
import { withTransaction } from '../db/transaction.repository';
import type { ServiceMetricsResult, ServiceSummary } from '../integrations/metrics-api.types';
import { ServiceRepository } from '../modules/services/services.repository';
import { CollectionRepository } from '../modules/collections/collections.repository';
import type { DiscoveredService, NewCollection, StoredService } from '../shared/persistence.types';
import { AppError, ValidationError } from '../shared/errors';
import { CarbonCalculator } from '../domain/carbon-calculator';
import { Collection } from '../domain/collection';
import { MonitoringStatus } from '../domain/monitoring-status';
import { MonitoredService } from '../domain/service';
import type { CarbonApi } from '../integrations/carbon-api';

/** A extensão #97 fornece raw e cancelamento; métodos antigos continuam tipáveis. */
export interface CollectorApi {
  listServices(signal?: AbortSignal): Promise<ServiceSummary[]>;
  getServiceMetrics(id: string, signal?: AbortSignal): Promise<ServiceMetricsResult & { raw?: Record<string, unknown> }>;
}
export interface CollectorLifecycle { start(): void; stop(): Promise<void> }

function notCalculated() {
  return { calculation_status: 'nao_calculado' as const, carbon_intensity_gco2e_per_kwh: null,
    power_watts: null, energy_kwh: null, co2e_grams: null, calculation_error_message: null };
}
function unavailableCalculation(message: string) {
  return { calculation_status: 'indisponivel' as const, carbon_intensity_gco2e_per_kwh: null,
    power_watts: null, energy_kwh: null, co2e_grams: null, calculation_error_message: message };
}
function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido.';
}

/** Arredonda à escala da coluna: a API manda resíduo de float (51.248000000000005); o JSON bruto guarda o original. */
function coordinate(value: number, precision: number): string {
  if (!Number.isFinite(value) || Math.abs(value) >= 10 ** (precision - 6)) {
    throw new ValidationError('Descoberta incompleta, duplicada ou inválida.');
  }
  return value.toFixed(6);
}

function discovery(items: ServiceSummary[]): DiscoveredService[] {
  const ids = new Set<string>();
  return items.map(item => {
    const location = item.location;
    if (!item.id.trim() || !item.name.trim() || !location.regionCode.trim() || ids.has(item.id)
      || (location.latitude !== null && Math.abs(location.latitude) > 90)
      || (location.longitude !== null && Math.abs(location.longitude) > 180)) {
      throw new ValidationError('Descoberta incompleta, duplicada ou inválida.');
    }
    ids.add(item.id);
    return { external_id: item.id, name: item.name, region_code: location.regionCode,
      country: location.country, region: location.region, city: location.city,
      latitude: location.latitude === null ? null : coordinate(location.latitude, 8),
      longitude: location.longitude === null ? null : coordinate(location.longitude, 9) };
  });
}
export function observation(service: StoredService, result: Awaited<ReturnType<CollectorApi['getServiceMetrics']>>,
  at: Date): NewCollection {
  const base = { service_id: service.id, collected_at: at, region_code: service.region_code };
  if (result.status !== 'ok') return { ...base, status: result.status === 'sem_metricas' ? 'sem_metricas' : 'erro',
    collection_interval_seconds: null, cpu_percent: null, memory_gb: null, disk_gb: null, network_gb: null,
    metrics: {}, error_message: result.status === 'indisponivel' ? 'Serviço indisponível (HTTP 500).' : null,
    ...notCalculated() };
  const collection = Collection.fromMetrics(result.metrics, result.raw);
  return { ...base, status: 'ok', ...collection.persistenceMetrics(), error_message: null, ...notCalculated() };
}

/** HTTP fora das transações; memória guarda somente prazos desta execução. */
export class Collector implements CollectorLifecycle {
  private readonly abort = new AbortController();
  private readonly deadlines = new Map<string, { interval: number; due: number }>();
  private active?: Promise<void>;
  private timer?: ReturnType<typeof setTimeout>;
  private started = false;
  private stopping = false;
  constructor(private readonly db: Database, private readonly api: CollectorApi,
    private readonly pollingMs: number, private readonly now: () => number = Date.now,
    private readonly report: (message: string) => void = console.error,
    private readonly carbonApi?: CarbonApi, private readonly calculator = new CarbonCalculator()) {
    if (!Number.isInteger(pollingMs) || pollingMs < 1 || pollingMs > 2147483647)
      throw new ValidationError('Intervalo do dispatcher inválido.');
  }
  start(): void {
    if (this.started || this.stopping) return;
    this.started = true;
    const dispatch = () => {
      void this.run().finally(() => {
        if (!this.stopping) this.timer = setTimeout(dispatch, this.pollingMs);
      });
    };
    dispatch();
  }
  run(): Promise<void> {
    if (this.stopping) return Promise.resolve();
    return this.active ??= this.collect().catch((error: unknown) => {
      if (!this.stopping) this.report(`Falha no ciclo de descoberta/reconciliação; cadastro preservado. ${failureMessage(error)}`);
    }).finally(() => { this.active = undefined; });
  }
  async stop(): Promise<void> {
    this.stopping = true;
    clearTimeout(this.timer);
    this.abort.abort();
    await this.active;
  }
  private async calculate(stored: StoredService, reading: NewCollection): Promise<NewCollection> {
    if (reading.status !== 'ok' || !this.carbonApi) return reading;
    const service = MonitoredService.fromStored(stored);
    if (!service.canCalculateEmissions()) return { ...reading,
      ...unavailableCalculation('Não foi possível calcular: região não informada.') };
    try {
      const intensity = await this.carbonApi.getIntensity(service.regionCode()!);
      if (intensity.status === 'region_not_found') return { ...reading,
        ...unavailableCalculation('Não há fator de carbono para esta região.') };
      const calculation = this.calculator.calculate({ collectionIntervalSeconds: reading.collection_interval_seconds,
        cpuPercent: Number(reading.cpu_percent), memoryGb: Number(reading.memory_gb),
        diskGb: Number(reading.disk_gb), networkGb: Number(reading.network_gb) }, intensity.factor.intensityGco2ePerKwh).toPersistence();
      return { ...reading, calculation_status: 'disponivel',
        carbon_intensity_gco2e_per_kwh: calculation.carbonIntensityGco2ePerKwh,
        power_watts: calculation.powerWatts, energy_kwh: calculation.energyKwh,
        co2e_grams: calculation.co2eGrams, calculation_error_message: null };
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Não foi possível calcular as emissões.';
      return { ...reading, ...unavailableCalculation(message) };
    }
  }
  private async collect(): Promise<void> {
    let listed: ServiceSummary[];
    try {
      listed = await this.api.listServices(this.abort.signal);
    } catch (error) {
      if (this.stopping) return;
      const message = `Descoberta indisponível; não foi possível consultar as métricas dos serviços. ${failureMessage(error)}`;
      this.report(message);
      const known = await new ServiceRepository(this.db).findAll();
      for (const service of known) {
        if (this.stopping) return;
        if (service.status === 'removido') continue;
        const previous = this.deadlines.get(service.external_id);
        if (service.status === 'indisponivel' && previous && previous.due > this.now()) continue;
        await this.persist(service, { service_id: service.id, collected_at: new Date(this.now()),
          region_code: service.region_code, status: 'erro', collection_interval_seconds: null,
          cpu_percent: null, memory_gb: null, disk_gb: null, network_gb: null, metrics: {},
          error_message: message, ...notCalculated() });
        const interval = previous?.interval ?? this.pollingMs;
        this.deadlines.set(service.external_id, { interval, due: this.now() + interval });
      }
      return;
    }
    const found = discovery(listed);
    if (this.stopping) return;
    const services = await withTransaction(this.db, async tx => {
      const repo = new ServiceRepository(tx);
      const rows: StoredService[] = [];
      for (const item of found) rows.push(await repo.upsert(item, new Date(this.now())));
      await repo.markMissingAsRemoved(found.map(item => item.external_id));
      return rows;
    });
    const present = new Set(found.map(item => item.external_id));
    for (const id of this.deadlines.keys()) if (!present.has(id)) this.deadlines.delete(id);
    for (const service of services) {
      if (this.stopping) return;
      const previous = this.deadlines.get(service.external_id);
      if (previous && previous.due > this.now()) continue;
      let reading: NewCollection;
      let interval = previous?.interval ?? this.pollingMs;
      try {
        const result = await this.api.getServiceMetrics(service.external_id, this.abort.signal);
        if (this.stopping) return;
        reading = await this.calculate(service, observation(service, result, new Date(this.now())));
        if (reading.status === 'ok') interval = reading.collection_interval_seconds * 1000;
      } catch (error) {
        if (this.stopping) return;
        reading = { service_id: service.id, collected_at: new Date(this.now()), region_code: service.region_code,
          status: 'erro', collection_interval_seconds: null, cpu_percent: null, memory_gb: null,
          disk_gb: null, network_gb: null, metrics: {},
          error_message: error instanceof AppError ? error.message : 'Falha externa ao coletar métricas.',
          ...notCalculated() };
      }
      await this.persist(service, reading);
      this.deadlines.set(service.external_id, { interval, due: this.now() + interval });
    }
  }
  private async persist(service: StoredService, reading: NewCollection): Promise<void> {
    try {
      await withTransaction(this.db, async tx => {
        await new CollectionRepository(tx).insert(reading);
        const status = MonitoringStatus.fromCollection(reading.status).value();
        if (!await new ServiceRepository(tx).updateStatus(service.id, status))
          throw new ValidationError('Serviço da coleta não encontrado.');
      });
    } catch (error) {
      this.report(`Falha na persistência da coleta; transação desfeita, próximos serviços continuam. ${failureMessage(error)}`);
    }
  }
}
