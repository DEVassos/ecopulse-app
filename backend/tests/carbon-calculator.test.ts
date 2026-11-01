import { expect, it } from 'vitest';
import { CarbonCalculator } from '../src/domain/carbon-calculator';
import { ValidationError } from '../src/shared/errors';

const metrics = { collectionIntervalSeconds: 27, cpuPercent: 62.67,
  memoryGb: 3.17, diskGb: 19.26, networkGb: 0.45 };

it('calcula potência, energia e emissões sem arredondar intermediários', () => {
  expect(new CarbonCalculator().calculate(metrics, 85).toPersistence()).toEqual({
    carbonIntensityGco2ePerKwh: '85.000000', powerWatts: '64.060350',
    energyKwh: '0.000480452625', co2eGrams: '0.040838473125',
  });
});

it('recusa resultados fora da faixa de persistência', () => {
  expect(() => new CarbonCalculator().calculate({ ...metrics, memoryGb: 1e20 }, 85))
    .toThrow(ValidationError);
});
