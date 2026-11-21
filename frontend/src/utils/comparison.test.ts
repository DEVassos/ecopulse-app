import { describe, expect, it } from 'vitest';
import type { ComparedService, PowerBreakdown } from '../services/compare.types';
import {
  CAUSE_LABEL,
  RESOURCES,
  averagePower,
  carbonIntensity,
  lowestCo2eCause,
  resourceShares,
} from './comparison';

/** Serviço de GET /api/services/compare; o que não importa para o caso fica no valor do exemplo de docs/api.md. */
function compared(changes: Partial<ComparedService> & { id: string }): ComparedService {
  return {
    name: changes.id,
    region: 'Sul',
    collections: 2880,
    failed: 0,
    notCalculated: 0,
    avgCpuPercent: 42.5,
    avgMemoryGb: 2.1,
    avgDiskGb: 10,
    avgNetworkGb: 0.3,
    avgPowerBreakdown: { cpuW: 42.5, memoryW: 0.7875, diskW: 0.1, networkW: 0.006 },
    energyKwh: 0.161,
    co2eGrams: 60.7,
    monitoredSeconds: 86_400,
    ...changes,
  };
}

/** Os dois serviços do critério de aceite da #328: mesmas conclusões de docs/calculos.md. */
const fraud = compared({ id: 'fraud-detector', name: 'Fraud Detector', energyKwh: 0.161, co2eGrams: 60.7 });
const inventory = compared({ id: 'inventory-sync', name: 'Inventory Sync', energyKwh: 0.084, co2eGrams: 3.3 });

describe('carbonIntensity', () => {
  it('divide o CO₂e pela energia do período, em g CO₂e/kWh', () => {
    expect(carbonIntensity(60.7, 0.161)).toBeCloseTo(377.02, 2);
    expect(carbonIntensity(3.3, 0.084)).toBeCloseTo(39.29, 2);
  });

  it('sem CO₂e, sem energia ou com energia zero não há intensidade: null, nunca 0 inventado', () => {
    expect(carbonIntensity(null, 0.161)).toBeNull();
    expect(carbonIntensity(60.7, null)).toBeNull();
    expect(carbonIntensity(60.7, 0)).toBeNull();
  });
});

describe('lowestCo2eCause', () => {
  it('matriz mais limpa quando a intensidade cai mais que o consumo (Inventory Sync contra Fraud Detector)', () => {
    expect(lowestCo2eCause([fraud, inventory])).toEqual({ id: 'inventory-sync', kind: 'clean-grid' });
    expect(CAUSE_LABEL['clean-grid']).toBe('matriz mais limpa');
  });

  it('menor consumo quando é a energia que cai mais, com a mesma intensidade nos dois', () => {
    const heavy = compared({ id: 'heavy', energyKwh: 1, co2eGrams: 377 });
    const light = compared({ id: 'light', energyKwh: 0.25, co2eGrams: 94.25 });
    expect(lowestCo2eCause([heavy, light])).toEqual({ id: 'light', kind: 'lower-consumption' });
    expect(CAUSE_LABEL['lower-consumption']).toBe('menor consumo');
  });

  it('sem dois serviços calculados, com empate no menor CO₂e ou sem energia não escolhe causa', () => {
    expect(lowestCo2eCause([fraud])).toBeNull();
    expect(lowestCo2eCause([fraud, compared({ id: 'x', co2eGrams: 60.7 })])).toBeNull();
    expect(lowestCo2eCause([fraud, compared({ id: 'y', energyKwh: null, co2eGrams: null })])).toBeNull();
  });

  it('ignora o serviço sem cálculo no período ao comparar', () => {
    const empty = compared({ id: 'empty', energyKwh: null, co2eGrams: null, collections: 0 });
    expect(lowestCo2eCause([fraud, inventory, empty])?.id).toBe('inventory-sync');
  });
});

describe('resourceShares', () => {
  it('devolve as quatro parcelas em W, na ordem da barra', () => {
    const shares = resourceShares(fraud.avgPowerBreakdown);
    expect(shares.map((part) => part.key)).toEqual(RESOURCES.map((resource) => resource.key));
    expect(shares.map((part) => part.watts)).toEqual([42.5, 0.7875, 0.1, 0.006]);
  });

  it('as partes exibidas somam 100,0%, mesmo quando o arredondamento de cada uma sozinha não fecharia', () => {
    const shares = resourceShares({ cpuW: 1, memoryW: 1, diskW: 1, networkW: 0 });
    expect(shares.map((part) => Math.round(part.share * 1000))).toEqual([334, 333, 333, 0]);
    expect(shares.reduce((sum, part) => sum + part.share, 0)).toBeCloseTo(1, 10);
  });

  it('sem as quatro médias as parcelas são zero e não há potência a decompor', () => {
    const shares = resourceShares(null);
    expect(shares.every((part) => part.watts === 0 && part.share === 0)).toBe(true);
    expect(averagePower(null)).toBeNull();
  });

  it('a potência média é a soma das parcelas', () => {
    const breakdown: PowerBreakdown = { cpuW: 62.67, memoryW: 2.325, diskW: 0.4, networkW: 0.0084 };
    expect(averagePower(breakdown)).toBeCloseTo(65.4034, 4);
  });
});
