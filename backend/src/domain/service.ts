import type { StoredService } from '../shared/persistence.types';

export class MonitoredService {
  readonly #id: string;
  readonly #externalId: string;
  readonly #regionCode: string | null;

  private constructor(id: string, externalId: string, regionCode: string | null) {
    this.#id = id;
    this.#externalId = externalId;
    this.#regionCode = regionCode;
  }

  static fromStored(service: StoredService): MonitoredService {
    return new MonitoredService(service.id, service.external_id, service.region_code);
  }

  id(): string { return this.#id; }

  externalId(): string { return this.#externalId; }

  regionCode(): string | null { return this.#regionCode; }

  canCalculateEmissions(): boolean { return this.#regionCode !== null; }
}
