import { describe, expect, it } from 'vitest';
import type { EmissionPoint } from '../services/emissions.types';
import { alignCompareSeries, compareBucket, compareSeriesLabel } from './compare-series';

const MIN = 60_000;

/** Intervalo de GET /api/collections/series; o que o gráfico não usa fica zerado. */
function point(t: number, co2eGrams: number | null): EmissionPoint {
  return { t, collections: 3, failed: 0, notCalculated: 0, energyKwh: 0.01, co2eGrams, co2eMinGrams: null, co2eMaxGrams: null };
}

const DAY = 86_400_000;

describe('compareBucket', () => {
  it('usa 15 min até dois dias, 1 hora até dez dias e 1 dia acima disso', () => {
    expect(compareBucket(0, MIN)).toBe('15min');
    expect(compareBucket(0, 2 * DAY)).toBe('15min');
    expect(compareBucket(0, 2 * DAY + 1)).toBe('1h');
    expect(compareBucket(0, 10 * DAY)).toBe('1h');
    expect(compareBucket(0, 10 * DAY + 1)).toBe('1d');
    expect(compareBucket(0, 31 * DAY)).toBe('1d');
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
    expect(series.rows.map((row) => row.missing)).toEqual([1, 1]);
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
    expect(series.rows[0].missing).toBe(1);
    expect(series.max).toBe(0);
  });

  it('leva a região do serviço para a legenda, e null quando o agregador não informa', () => {
    const series = alignCompareSeries([
      { service: { id: '1', name: 'a', region: 'us-east-1' }, points: [point(MIN, 5)] },
      { service: { id: '2', name: 'b', region: null }, points: [point(MIN, 6)] },
    ]);

    expect(series.rows.map((row) => row.region)).toEqual(['us-east-1', null]);
  });

  it('sem serviços, a linha do tempo fica vazia', () => {
    expect(alignCompareSeries([])).toEqual({ times: [], rows: [], max: 0 });
  });
});

describe('compareSeriesLabel', () => {
  it('usa o espaço à esquerda quando o último ponto toca a borda direita', () => {
    expect(compareSeriesLabel('Billing API', 359, 64, 359, 6)).toEqual({
      text: 'Billing API',
      anchor: 'end',
      anchorX: 353,
    });
  });

  it('mantém o rótulo à direita quando há espaço desse lado', () => {
    expect(compareSeriesLabel('Billing API', 80, 64, 359, 6)).toEqual({
      text: 'Billing API',
      anchor: 'start',
      anchorX: 86,
    });
  });
});
