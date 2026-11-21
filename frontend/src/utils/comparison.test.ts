import { describe, expect, it } from 'vitest';
import type { ComparedService, PowerBreakdown } from '../services/compare.types';
import {
  CAUSE_LABEL,
  RESOURCES,
  averagePower,
  carbonIntensity,
  lowestCo2eCause,
  nearestPoint,
  placeLabels,
  regionRays,
  resourceShares,
  scatterDomain,
  scatterEquation,
  scatterPoints,
  spreadLabels,
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

describe('dispersão "Carga ou região?" (#399)', () => {
  // Dois serviços em Virgínia (378 g/kWh), um em Kanto (465) e um em Quebec (40), como no protótipo da #226
  const four = [
    compared({ id: 'fraud', name: 'Fraud Detector', region: 'Virgínia', energyKwh: 0.7116, co2eGrams: 268.9848 }),
    compared({ id: 'checkout', name: 'Checkout Worker', region: 'Virgínia', energyKwh: 0.512, co2eGrams: 193.536 }),
    compared({ id: 'audit', name: 'Audit Stream', region: 'Kanto', energyKwh: 0.301, co2eGrams: 139.965 }),
    compared({ id: 'reporting', name: 'Reporting Batch', region: 'Quebec', energyKwh: 0.38, co2eGrams: 15.2 }),
  ];
  const { points } = scatterPoints(four);

  it('sem energia ou sem CO₂e o serviço não vira ponto em zero: fica listado como sem cálculo', () => {
    const empty = compared({ id: 'inventory', name: 'Inventory Sync', collections: 0, energyKwh: null, co2eGrams: null });
    const partial = compared({ id: 'x', name: 'Sem fator', energyKwh: 0.2, co2eGrams: null });
    const result = scatterPoints([four[0], empty, four[2], partial]);
    expect(result.points.map((point) => point.id)).toEqual(['audit', 'fraud']);
    expect(result.missing).toEqual(['Inventory Sync', 'Sem fator']);
  });

  it('uma reta por região, da mais inclinada para a menos, e cada ponto sobre a reta da própria região', () => {
    const rays = regionRays(points);
    expect(rays.map((ray) => ray.region)).toEqual(['Kanto', 'Virgínia', 'Quebec']);
    for (const point of points) {
      const slope = rays.find((ray) => ray.region === point.region)?.intensity ?? NaN;
      expect(point.energyKwh * slope).toBeCloseTo(point.co2eGrams, 6);
    }
  });

  it('com fatores diferentes na mesma região, a reta é ΣCO₂e ÷ Σenergia do período', () => {
    const sul = scatterPoints([compared({ id: 'a', energyKwh: 1, co2eGrams: 100 }), compared({ id: 'b', energyKwh: 3, co2eGrams: 500 })]);
    expect(regionRays(sul.points)).toEqual([{ region: 'Sul', intensity: 150 }]);
  });

  it('eixos a partir de zero: X até a maior energia arredondada para cima, Y até X × a maior intensidade', () => {
    const domain = scatterDomain(points, regionRays(points));
    expect(domain.xTicks).toEqual([0, 0.2, 0.4, 0.6, 0.8]);
    expect(domain.yMax).toBeCloseTo(0.8 * 465, 6);
    expect(domain.yTicks).toEqual([0, 100, 200, 300]);
  });

  it('a conta usa os números da matriz, com a energia em kWh', () => {
    expect(scatterEquation(points[3])).toBe('0,7116 kWh × 378,00 g/kWh = 268,98 g');
    const zero = scatterPoints([compared({ id: 'z', energyKwh: 0, co2eGrams: 0 })]).points[0];
    expect(scatterEquation(zero)).toBe('0 kWh e 0,00 g: sem intensidade com energia zero');
  });

  it('rótulo na primeira posição livre, sem cobrir ponto, rótulo nem sair da área; sem lugar, fica sem nome', () => {
    const area = { left: 0, right: 300, top: 0, bottom: 200 };
    const labels = [
      { id: 'a', x: 150, y: 100, text: 'Fraud Detector' },
      { id: 'b', x: 152, y: 104, text: 'Checkout Worker' },
    ];
    const spots = placeLabels(labels, area, 6, 6.8);
    expect(spots.get('a')).toEqual({ x: 140, y: 93, anchor: 'end' });
    expect(spots.get('b')).toEqual({ x: 142, y: 120, anchor: 'end' });
    const tight = placeLabels([{ id: 'c', x: 20, y: 20, text: 'Recommendation AI' }], { left: 0, right: 60, top: 0, bottom: 40 }, 6, 6.8);
    expect(tight.has('c')).toBe(false);
  });

  it('rótulos das retas a gap px um do outro, dentro dos limites e na ordem recebida', () => {
    expect(spreadLabels([50, 40, 100], 26, 10, 200)).toEqual([66, 40, 100]);
    expect(spreadLabels([195, 190], 26, 10, 200)).toEqual([200, 174]);
  });

  it('o ponteiro destaca o ponto mais próximo, sem precisar acertá-lo', () => {
    expect(nearestPoint([{ x: 0, y: 0 }, { x: 100, y: 100 }], 70, 60)).toBe(1);
    expect(nearestPoint([], 1, 1)).toBeNull();
  });
});
