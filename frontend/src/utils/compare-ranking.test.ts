import { describe, expect, it } from 'vitest';
import type { ComparedService } from '../services/compare.types';
import {
  COMPARE_CSV_COLUMNS,
  DEFAULT_SORT,
  collectionIssues,
  comparisonCsv,
  comparisonFileName,
  nextSort,
  sortServices,
} from './compare-ranking';

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

// Os dois serviços do critério de aceite da #328 e um sem cálculo no período
const fraud = compared({ id: 'fraud-detector', name: 'Fraud Detector', energyKwh: 0.161, co2eGrams: 60.7 });
const inventory = compared({ id: 'inventory-sync', name: 'Inventory Sync', energyKwh: 0.084, co2eGrams: 3.3 });
const audit = compared({ id: 'audit-stream', name: 'Audit Stream', energyKwh: null, co2eGrams: null, monitoredSeconds: null });
const names = (services: ComparedService[]) => services.map((service) => service.name);

describe('sortServices', () => {
  it('começa pelo menor CO₂e, com o serviço sem cálculo no fim', () => {
    expect(names(sortServices([audit, fraud, inventory], DEFAULT_SORT))).toEqual(['Inventory Sync', 'Fraud Detector', 'Audit Stream']);
  });

  it('do maior para o menor, o serviço sem cálculo continua no fim', () => {
    expect(names(sortServices([audit, inventory, fraud], { key: 'co2e', direction: 'desc' }))).toEqual(['Fraud Detector', 'Inventory Sync', 'Audit Stream']);
  });

  it('ordena pela intensidade, pela energia, pela potência média e pelo nome', () => {
    // Intensidades: Inventory 39,29 g/kWh, Fraud 377,02 g/kWh
    expect(names(sortServices([fraud, inventory], { key: 'intensity', direction: 'asc' }))).toEqual(['Inventory Sync', 'Fraud Detector']);
    expect(names(sortServices([inventory, fraud], { key: 'energy', direction: 'desc' }))).toEqual(['Fraud Detector', 'Inventory Sync']);
    expect(names(sortServices([fraud, inventory], { key: 'power', direction: 'asc' }))).toEqual(['Inventory Sync', 'Fraud Detector']);
    expect(names(sortServices([inventory, fraud, audit], { key: 'name', direction: 'asc' }))).toEqual(['Audit Stream', 'Fraud Detector', 'Inventory Sync']);
  });

  it('desempata pelo nome e não altera a lista recebida', () => {
    const twin = compared({ id: 'billing', name: 'Billing API', energyKwh: 0.161, co2eGrams: 60.7 });
    const input = [fraud, twin];
    expect(names(sortServices(input, DEFAULT_SORT))).toEqual(['Billing API', 'Fraud Detector']);
    expect(names(input)).toEqual(['Fraud Detector', 'Billing API']);
  });
});

describe('nextSort', () => {
  it('a mesma métrica inverte a direção; outra começa do menor', () => {
    expect(nextSort(DEFAULT_SORT, 'co2e')).toEqual({ key: 'co2e', direction: 'desc' });
    expect(nextSort({ key: 'co2e', direction: 'desc' }, 'co2e')).toEqual({ key: 'co2e', direction: 'asc' });
    expect(nextSort({ key: 'co2e', direction: 'desc' }, 'energy')).toEqual({ key: 'energy', direction: 'asc' });
  });
});

describe('collectionIssues', () => {
  it('lista só os serviços com coleta com falha ou sem cálculo', () => {
    const email = compared({ id: 'email', name: 'Email Dispatcher', failed: 10, notCalculated: 10 });
    const partial = compared({ id: 'batch', name: 'Reporting Batch', notCalculated: 3 });
    expect(collectionIssues([fraud, email, inventory, partial])).toEqual([
      { id: 'email', name: 'Email Dispatcher', failed: 10, notCalculated: 10 },
      { id: 'batch', name: 'Reporting Batch', failed: 0, notCalculated: 3 },
    ]);
    expect(collectionIssues([fraud, inventory])).toEqual([]);
  });
});

describe('comparisonCsv', () => {
  it('uma linha por serviço, na ordem recebida, com as colunas da matriz e vazio no lugar de valor ausente', () => {
    const lines = comparisonCsv(sortServices([audit, fraud, inventory], DEFAULT_SORT)).split('\r\n');
    expect(lines[0]).toBe(`\uFEFF${COMPARE_CSV_COLUMNS.join(',')}`);
    expect(lines).toHaveLength(5); // cabeçalho, 3 serviços e a linha vazia do CRLF final
    const inventoryRow = lines[1].split(',');
    expect(inventoryRow.slice(0, 4)).toEqual(['1', 'Inventory Sync', 'Sul', '0.084']);
    expect(inventoryRow[6]).toBe('3.3');
    // Energia × intensidade = CO₂e, com as casas que a planilha precisa para conferir
    expect(Number(inventoryRow[3]) * Number(inventoryRow[5])).toBeCloseTo(3.3, 2);
    expect(lines[2].split(',').slice(0, 2)).toEqual(['2', 'Fraud Detector']);
    expect(lines[3].split(',').slice(0, 7)).toEqual(['3', 'Audit Stream', 'Sul', '', '', '', '']);
  });

  it('nomeia o arquivo com o período do filtro', () => {
    expect(comparisonFileName('2026-11-20', '2026-11-21')).toBe('ecopulse-comparacao-2026-11-20-a-2026-11-21.csv');
  });
});
