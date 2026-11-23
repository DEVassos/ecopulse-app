import { expect, it } from 'vitest';
import { CarbonCalculator, powerBreakdown } from '../src/domain/carbon-calculator';
import { ValidationError } from '../src/shared/errors';

const metrics = { collectionIntervalSeconds: 27, cpuPercent: 62.67,
  memoryGb: 3.17, diskGb: 19.26, networkGb: 0.45 };

it('calcula energia e emissões a partir das parcelas de potência persistidas', () => {
  expect(new CarbonCalculator().calculate(metrics, 85).toPersistence()).toEqual({
    carbonIntensityGco2ePerKwh: '85.000000', powerWatts: '64.060350',
    energyKwh: '0.000480452625', co2eGrams: '0.040838473125',
  });
});

it('recusa resultados fora da faixa de persistência', () => {
  expect(() => new CarbonCalculator().calculate({ ...metrics, memoryGb: 1e20 }, 85))
    .toThrow(ValidationError);
});

it('decompõe a potência em parcelas que somam a potência total do mesmo cálculo (#327)', () => {
  const parts = powerBreakdown(metrics);
  expect(parts).toEqual({ cpuW: 62.67, memoryW: 1.18875, diskW: 0.1926, networkW: 0.009 });
  expect(parts.cpuW + parts.memoryW + parts.diskW + parts.networkW).toBe(64.06035);
  expect(Number(new CarbonCalculator().calculate(metrics, 85).toPersistence().powerWatts)).toBe(64.06035);
});

it('soma as parcelas já arredondadas antes de calcular a energia', () => {
  const fractional = { collectionIntervalSeconds: 1, cpuPercent: 0, memoryGb: 0.0000016, diskGb: 0.00006, networkGb: 0.00003 };
  const parts = powerBreakdown(fractional);
  expect(parts).toEqual({ cpuW: 0, memoryW: 0.000001, diskW: 0.000001, networkW: 0.000001 });
  expect(new CarbonCalculator().calculate(fractional, 85).toPersistence()).toMatchObject({
    powerWatts: '0.000003',
  });
});
