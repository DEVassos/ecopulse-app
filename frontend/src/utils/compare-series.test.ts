import { describe, expect, it } from 'vitest';
import type { EmissionPoint } from '../services/emissions.types';
import { alignCompareSeries, compareBucket } from './compare-series';

const MIN = 60_000;

/** Intervalo de GET /api/collections/series; o que o gráfico não usa fica zerado. */
function point(t: number, co2eGrams: number | null): EmissionPoint {
  return { t, collections: 3, failed: 0, notCalculated: 0, energyKwh: 0.01, co2eGrams, co2eMinGrams: null, co2eMaxGrams: null };
}

describe('compareBucket', () => {
  it('usa 15 min até dois dias e 1 hora acima disso', () => {
    expect(compareBucket(0, 2 * 86_400_000)).toBe('15min');
    expect(compareBucket(0, 2 * 86_400_000 + 1)).toBe('1h');
    expect(compareBucket(0, MIN)).toBe('15min');
  });
});

describe('alignCompareSeries', () => {
  it('alinha os intervalos na união dos serviços, em ordem cronológica', () => {
    const series = alignCompareSeries([
      { service: { id: '1', name: 'checkout' }, points: [point(2 * MIN, 5), point(3 * MIN, 7)] },
      { service: { id: '2', name: 'auditoria' }, points: [point(1 * MIN, 4), point(3 * MIN, 9)] },
    ]);

    expect(series.times).toEqual([MIN, 2 * MIN, 3 * MIN]);
    expect(series.rows.map((row) => row.name)).toEqual(['checkout', 'auditoria']);
    expect(series.rows[0].values).toEqual([null, 5, 7]);
    expect(series.rows[1].values).toEqual([4, null, 9]);
  });

  it('soma o período de cada serviço e guarda o maior intervalo para o eixo', () => {
    const series = alignCompareSeries([
      { service: { id: '1', name: 'a' }, points: [point(MIN, 5), point(2 * MIN, null)] },
      { service: { id: '2', name: 'b' }, points: [point(MIN, null), point(2 * MIN, 12)] },
    ]);

    expect(series.rows.map((row) => row.total)).toEqual([5, 12]);
    expect(series.max).toBe(12);
  });

  it('serviço sem nenhum cálculo no período fica sem total, e não com zero', () => {
    const series = alignCompareSeries([{ service: { id: '1', name: 'a' }, points: [point(MIN, null)] }]);

    expect(series.rows[0].total).toBeNull();
    expect(series.rows[0].values).toEqual([null]);
    expect(series.max).toBe(0);
  });

  it('sem serviços, a linha do tempo fica vazia', () => {
    expect(alignCompareSeries([])).toEqual({ times: [], rows: [], max: 0 });
  });
});
