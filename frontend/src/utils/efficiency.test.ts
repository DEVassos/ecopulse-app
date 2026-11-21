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

  it('decide o empate pelo número exibido: valores que a linha mostra iguais não elegem ninguém', () => {
    // 378,0000000041535 e 378,00000000149345 aparecem como "378,00" na matriz: o selo não pode ir para um dos dois
    const intensity = [
      { id: 'checkout-worker', gPerKwh: 378.0000000041535 },
      { id: 'fraud-detector', gPerKwh: 378.00000000149345 },
      { id: 'inventory-sync', gPerKwh: 512 },
    ];
    expect(mostEfficient(intensity, (service) => service.gPerKwh)).toBeNull();
    // O mesmo par de 40,00 visto na comparação de 20/11, com um terceiro serviço acima
    const power = [
      { id: 'inventory-sync', watts: 40.00000000094438 },
      { id: 'reporting-batch', watts: 39.99999999895865 },
      { id: 'billing-api', watts: 60.51 },
    ];
    expect(mostEfficient(power, (service) => service.watts)).toBeNull();
    // A diferença que a tela mostra continua decidindo: 39,99 contra 40,00
    const shownApart = [
      { id: 'reporting-batch', watts: 39.994 },
      { id: 'inventory-sync', watts: 40.00000000094438 },
    ];
    expect(mostEfficient(shownApart, (service) => service.watts)).toBe('reporting-batch');
  });
});
