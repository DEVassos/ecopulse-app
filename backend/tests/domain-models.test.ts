import { expect, it } from 'vitest';
import { Collection } from '../src/domain/collection';
import { EnergyEstimate } from '../src/domain/energy-estimate';
import { MonitoringStatus } from '../src/domain/monitoring-status';
import { MonitoredService } from '../src/domain/service';
import { ValidationError } from '../src/shared/errors';
import type { StoredService } from '../src/shared/persistence.types';

it('encapsula a leitura e entrega uma cópia segura para persistência', () => {
  const raw = { metrics: { cpu_percent: 50 } };
  const collection = Collection.fromMetrics({ collectionIntervalSeconds: 30, cpuPercent: 50, memoryGb: 2, diskGb: 1, networkGb: 0.5 }, raw);
  raw.metrics.cpu_percent = 10;
  const first = collection.persistenceMetrics();
  (first.metrics.metrics as { cpu_percent: number }).cpu_percent = 1;
  expect(collection.metrics()).toEqual({ collectionIntervalSeconds: 30, cpuPercent: 50, memoryGb: 2, diskGb: 1, networkGb: 0.5 });
  expect(collection.persistenceMetrics()).toMatchObject({ cpu_percent: '50.00', metrics: { metrics: { cpu_percent: 50 } } });
});

it.each([
  { collectionIntervalSeconds: 0, cpuPercent: 50, memoryGb: 2, diskGb: 1, networkGb: 0.5 },
  { collectionIntervalSeconds: 30, cpuPercent: 101, memoryGb: 2, diskGb: 1, networkGb: 0.5 },
])('rejeita leitura inválida %#', metrics => {
  expect(() => Collection.fromMetrics(metrics, {})).toThrow(ValidationError);
});

it('mantém identidade e região do serviço sem expor estado mutável', () => {
  const service = MonitoredService.fromStored({ id: '9', external_id: 'metricas-9', name: 'Métricas', region_code: 'br-sudeste',
    country: 'BR', region: 'Sudeste', city: null, latitude: null, longitude: null, status: 'ativo',
    first_seen_at: new Date(), last_seen_at: null, created_at: new Date(), updated_at: new Date() } as StoredService);
  expect(service.id()).toBe('9');
  expect(service.externalId()).toBe('metricas-9');
  expect(service.regionCode()).toBe('br-sudeste');
  expect(service.canCalculateEmissions()).toBe(true);
});

it('mapeia o estado da leitura para o estado de monitoramento', () => {
  expect(MonitoringStatus.fromCollection('ok').value()).toBe('ativo');
  expect(MonitoringStatus.fromCollection('erro').value()).toBe('indisponivel');
  expect(MonitoringStatus.fromCollection('sem_metricas').value()).toBe('sem_metricas');
  expect(MonitoringStatus.fromValue('ativo').isAvailable()).toBe(true);
});

it('preserva o resultado energético como valor de domínio imutável', () => {
  const estimate = new EnergyEstimate({ carbonIntensityGco2ePerKwh: '85.000000', powerWatts: '50.000000',
    energyKwh: '0.000416666667', co2eGrams: '0.035416666695' });
  const output = estimate.toPersistence();
  output.energyKwh = 'alterado';
  expect(estimate.toPersistence().energyKwh).toBe('0.000416666667');
});
