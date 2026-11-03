import type { ServiceMetrics } from '../integrations/metrics-api.types';
import { ValidationError } from '../shared/errors';

function decimal(value: number, precision: number, scale: number): string {
  const fixed = Number.isFinite(value) ? value.toFixed(scale) : '';
  if (!fixed || Math.abs(Number(fixed)) >= 10 ** (precision - scale)) {
    throw new ValidationError('Observação fora da faixa SQL.');
  }
  return fixed;
}

export class Collection {
  readonly #intervalSeconds: number;
  readonly #cpuPercent: number;
  readonly #memoryGb: number;
  readonly #diskGb: number;
  readonly #networkGb: number;
  readonly #raw: Record<string, unknown>;

  private constructor(metrics: ServiceMetrics, raw: Record<string, unknown>) {
    this.#intervalSeconds = metrics.collectionIntervalSeconds;
    this.#cpuPercent = metrics.cpuPercent;
    this.#memoryGb = metrics.memoryGb;
    this.#diskGb = metrics.diskGb;
    this.#networkGb = metrics.networkGb;
    this.#raw = structuredClone(raw);
  }

  static fromMetrics(metrics: ServiceMetrics, raw: unknown): Collection {
    if (!Number.isInteger(metrics.collectionIntervalSeconds) || metrics.collectionIntervalSeconds < 1
      || metrics.collectionIntervalSeconds > 2147483647 || metrics.cpuPercent < 0 || metrics.cpuPercent > 100
      || [metrics.cpuPercent, metrics.memoryGb, metrics.diskGb, metrics.networkGb].some(value => !Number.isFinite(value) || value < 0)
      || typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new ValidationError('Métricas não representáveis ou JSON bruto ausente.');
    }
    return new Collection(metrics, raw as Record<string, unknown>);
  }

  intervalSeconds(): number { return this.#intervalSeconds; }

  metrics(): ServiceMetrics {
    return { collectionIntervalSeconds: this.#intervalSeconds, cpuPercent: this.#cpuPercent,
      memoryGb: this.#memoryGb, diskGb: this.#diskGb, networkGb: this.#networkGb };
  }

  persistenceMetrics() {
    return { collection_interval_seconds: this.#intervalSeconds, cpu_percent: decimal(this.#cpuPercent, 5, 2),
      memory_gb: decimal(this.#memoryGb, 20, 9), disk_gb: decimal(this.#diskGb, 20, 9),
      network_gb: decimal(this.#networkGb, 20, 9), metrics: structuredClone(this.#raw) };
  }
}
