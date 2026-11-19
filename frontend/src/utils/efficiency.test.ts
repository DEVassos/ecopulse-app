import { describe, expect, it } from 'vitest';
import { averagePowerFromEnergy, mostEfficient } from './efficiency';

describe('averagePowerFromEnergy', () => {
  it('divide a energia pelo tempo monitorado: 0,48 kWh em 24 h dão 20 W', () => {
    expect(averagePowerFromEnergy(0.48, 86_400)).toBeCloseTo(20, 6);
  });

  it('usar o tempo monitorado, não o período: 1 000 coletas de 60 s a 50,87 W dão 50,87 W', () => {
    // A potência do exemplo de docs/calculos.md estão 50,87 W; a energia é o que a coleta de 60 s registrou
    const energyKwh = (50.87 / 3_600_000) * 60_000;
    expect(averagePowerFromEnergy(energyKwh, 1000 * 60)).toBeCloseTo(50.87, 6);
  });

  it('sem energia, sem tempo ou com tempo zero não há potência média: null, nunca 0', () => {
    expect(averagePowerFromEnergy(null, 86_400)).toBeNull();
    expect(averagePowerFromEnergy(0.48, null)).toBeNull();
    expect(averagePowerFromEnergy(0.48, 0)).toBeNull();
  });
});

describe('mostEfficient', () => {
  const services = [
    { id: 'fraud-detector', watts: 20 },
    { id: 'checkout-worker', watts: 12.5 },
    { id: 'email-dispatcher', watts: 20 },
  ];

  it('elege o menor valor entre os serviços com valor', () => {
    expect(mostEfficient(services, (service) => service.watts)).toBe('checkout-worker');
  });

  it('sem dois serviços medidos não elege ninguém', () => {
    expect(mostEfficient([{ id: 'a', watts: 10 }, { id: 'b', watts: null }], (service) => service.watts)).toBeNull();
    expect(mostEfficient([{ id: 'a', watts: null }], (service) => service.watts)).toBeNull();
  });

  it('com empate no menor, nenhum dos empatados é "o mais eficiente"', () => {
    const tied = [
      { id: 'a', watts: 12 },
      { id: 'b', watts: 12 },
      { id: 'c', watts: 30 },
    ];
    expect(mostEfficient(tied, (service) => service.watts)).toBeNull();
  });
});
