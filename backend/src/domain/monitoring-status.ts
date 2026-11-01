import type { ServiceStatus } from '../shared/persistence.types';

type CollectionStatus = 'ok' | 'erro' | 'sem_metricas';

export class MonitoringStatus {
  readonly #value: ServiceStatus;

  private constructor(value: ServiceStatus) { this.#value = value; }

  static fromValue(value: ServiceStatus): MonitoringStatus { return new MonitoringStatus(value); }

  static fromCollection(status: CollectionStatus): MonitoringStatus {
    if (status === 'ok') return new MonitoringStatus('ativo');
    if (status === 'sem_metricas') return new MonitoringStatus('sem_metricas');
    return new MonitoringStatus('indisponivel');
  }

  value(): ServiceStatus { return this.#value; }

  isAvailable(): boolean { return this.#value === 'ativo'; }
}
