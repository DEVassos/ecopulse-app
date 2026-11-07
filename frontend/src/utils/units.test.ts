import { describe, expect, it } from 'vitest';
import { formatInScale, formatPrecise, formatQuantity, scaleFor } from './units';

describe('scaleFor', () => {
  it('escolhe a maior unidade em que o maior valor do conjunto fica em pelo menos 1', () => {
    // Última leitura da tabela do dashboard: 0,00091 a 0,00126 kWh → Wh
    expect(scaleFor('energy', [0.00091, 0.00126, null])).toEqual({ unit: 'Wh', factor: 1000, decimals: 2 });
    // Comparação: 0,0613 a 0,1187 kWh → Wh, sem casas
    expect(scaleFor('energy', [0.0613, 0.1187])).toEqual({ unit: 'Wh', factor: 1000, decimals: 0 });
    expect(scaleFor('co2e', [0.016, 0.345])).toEqual({ unit: 'mg', factor: 1000, decimals: 0 });
    expect(scaleFor('co2e', [5.21, 44.87])).toEqual({ unit: 'g', factor: 1, decimals: 1 });
    expect(scaleFor('co2e', [1200])).toMatchObject({ unit: 'kg', decimals: 2 });
  });

  it('cai na unidade base sem valor ou com tudo zero', () => {
    expect(scaleFor('energy', [null, null])).toMatchObject({ unit: 'kWh' });
    expect(scaleFor('co2e', [0])).toMatchObject({ unit: 'g' });
  });
});

describe('formatInScale', () => {
  it('formata todos os valores do conjunto na mesma unidade e com as mesmas casas', () => {
    const scale = scaleFor('energy', [0.00091, 0.00126]);
    expect(formatInScale(0.00091, scale)).toBe('0,91');
    expect(formatInScale(0.00126, scale)).toBe('1,26');
  });

  it('nunca mostra um valor positivo como zero', () => {
    expect(formatInScale(0.000001, scaleFor('energy', [0.00126]))).toBe('< 0,01');
  });
});

describe('formatQuantity', () => {
  it('escolhe a unidade pelo próprio valor', () => {
    expect(formatQuantity('energy', 0.8413)).toBe('841 Wh');
    expect(formatQuantity('energy', 0.0009)).toBe('900 mWh');
    expect(formatQuantity('co2e', 0.601)).toBe('601 mg');
    expect(formatQuantity('co2e', 44.6)).toBe('44,6 g');
    expect(formatQuantity('co2e', 0)).toBe('0 g');
  });
});

describe('formatPrecise', () => {
  it('dá o valor exato do tooltip com 4 algarismos significativos, na unidade do próprio valor (#274)', () => {
    expect(formatPrecise('energy', 0.0014381)).toBe('1,438 Wh');
    expect(formatPrecise('co2e', 301.46)).toBe('301,5 g');
    // Abaixo de 1 mg, a menor unidade continua sendo mg
    expect(formatPrecise('co2e', 0.000016)).toBe('0,016 mg');
    expect(formatPrecise('energy', 0)).toBe('0 kWh');
  });
});
