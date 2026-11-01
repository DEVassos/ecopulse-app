import type { ServiceMetrics } from '../integrations/metrics-api.types';
import { ValidationError } from '../shared/errors';
import { EnergyEstimate } from './energy-estimate';

const CPU_MAX_WATTS = 100;
const RAM_WATTS_PER_GB = 0.375;
const DISK_WATTS_PER_GB = 0.01;
const NETWORK_WATTS_PER_GB = 0.02;

function decimal(value: number, precision: number, scale: number, name: string): string {
  if (!Number.isFinite(value) || value < 0 || value >= 10 ** (precision - scale)) {
    throw new ValidationError(`${name} fora da faixa da coluna.`);
  }
  return value.toFixed(scale);
}

/** Converte uma observação de infraestrutura no impacto ambiental estimado do desafio. */
export class CarbonCalculator {
  calculate(metrics: ServiceMetrics, intensityGco2ePerKwh: number): EnergyEstimate {
    const values = [metrics.cpuPercent, metrics.memoryGb, metrics.diskGb, metrics.networkGb, intensityGco2ePerKwh];
    if (!Number.isInteger(metrics.collectionIntervalSeconds) || metrics.collectionIntervalSeconds < 1
      || metrics.collectionIntervalSeconds > 2147483647 || metrics.cpuPercent < 0 || metrics.cpuPercent > 100
      || values.some(value => !Number.isFinite(value) || value < 0)) {
      throw new ValidationError('Métricas ou intensidade de carbono inválidas para cálculo.');
    }
    const powerWatts = (metrics.cpuPercent / 100) * CPU_MAX_WATTS
      + metrics.memoryGb * RAM_WATTS_PER_GB
      + metrics.diskGb * DISK_WATTS_PER_GB
      + metrics.networkGb * NETWORK_WATTS_PER_GB;
    const energyKwh = powerWatts * metrics.collectionIntervalSeconds / 3_600_000;
    const co2eGrams = energyKwh * intensityGco2ePerKwh;
    return new EnergyEstimate({
      carbonIntensityGco2ePerKwh: decimal(intensityGco2ePerKwh, 14, 6, 'Intensidade de carbono'),
      powerWatts: decimal(powerWatts, 14, 6, 'Potência'),
      energyKwh: decimal(energyKwh, 20, 12, 'Energia'),
      co2eGrams: decimal(co2eGrams, 24, 12, 'Emissão'),
    });
  }
}
