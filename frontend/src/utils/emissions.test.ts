import { describe, expect, it } from 'vitest';
import { describePeriod, peakRatio, readPeriodFilter, seriesStats } from './emissions';
import type { EmissionPoint } from '../services/emissions.types';

const TODAY = '2026-11-02';

function read(query: string) {
  return readPeriodFilter(new URLSearchParams(query), TODAY);
}

describe('readPeriodFilter', () => {
  it('liga o tempo real com tempo=real e o período de hoje', () => {
    expect(read(`de=${TODAY}&ate=${TODAY}&tempo=real`)).toEqual({ start: TODAY, end: TODAY, live: true });
  });

  it('desliga o tempo real quando a URL volta ao período anterior, sem tempo=real (Voltar do navegador)', () => {
    expect(read('de=2026-09-01&ate=2026-09-30')).toEqual({ start: '2026-09-01', end: '2026-09-30', live: false });
  });

  it('não liga o tempo real num link antigo com tempo=real e datas passadas', () => {
    expect(read('de=2026-09-01&ate=2026-09-30&tempo=real')).toEqual({ start: '2026-09-01', end: '2026-09-30', live: false });
  });

  it('não liga o tempo real quando o período termina hoje mas começa antes', () => {
    expect(read(`de=2026-11-01&ate=${TODAY}&tempo=real`).live).toBe(false);
  });

  it('mantém o limite de 31 dias: ate além do limite vale o dia inicial', () => {
    expect(read('de=2026-09-01&ate=2026-10-15&tempo=real')).toEqual({ start: '2026-09-01', end: '2026-09-01', live: false });
  });

  it('cai em hoje com datas ausentes, inválidas ou no futuro', () => {
    expect(read('')).toEqual({ start: TODAY, end: TODAY, live: false });
    expect(read('de=2026-02-30&ate=amanha')).toEqual({ start: TODAY, end: TODAY, live: false });
    expect(read('de=2026-11-10&ate=2026-11-12&tempo=real')).toEqual({ start: TODAY, end: TODAY, live: true });
  });
});

function point(t: number, co2eGrams: number | null): EmissionPoint {
  return {
    t,
    collections: 1,
    failed: 0,
    notCalculated: co2eGrams === null ? 1 : 0,
    energyKwh: co2eGrams === null ? null : co2eGrams / 100,
    co2eGrams,
    co2eMinGrams: co2eGrams,
    co2eMaxGrams: co2eGrams,
  };
}

describe('seriesStats', () => {
  const HOUR = 60 * 60_000;
  const origin = Date.UTC(2026, 10, 2, 12);

  it('tira o intervalo ainda aberto da média e do pico, para os tiles e a Leitura contarem a mesma história', () => {
    // 3 intervalos de 1 h; o último (o maior) ainda não fechou em toMs
    const points = [point(origin, 2), point(origin + HOUR, 4), point(origin + 2 * HOUR, 9)];
    const stats = seriesStats(points, '1h', origin + 2 * HOUR + HOUR / 2);
    expect(stats).toEqual({ openIndex: 2, count: 2, meanGrams: 3, peakIndex: 1 });
    expect(peakRatio(points, stats)).toBeCloseTo(4 / 3);
  });

  it('em cada coleta, nenhum ponto fica aberto e pontos sem cálculo não entram', () => {
    const points = [point(origin, 1), point(origin + 30_000, null), point(origin + 60_000, 5)];
    const stats = seriesStats(points, 'coleta', origin + 60_000);
    expect(stats).toEqual({ openIndex: null, count: 2, meanGrams: 3, peakIndex: 2 });
  });

  it('sem cálculo, não inventa média nem pico', () => {
    const points = [point(origin, null)];
    const stats = seriesStats(points, '15min', origin + HOUR);
    expect(stats).toEqual({ openIndex: null, count: 0, meanGrams: null, peakIndex: null });
    expect(peakRatio(points, stats)).toBeNull();
    expect(describePeriod(points, stats, '15min', 0)).toEqual([]);
  });
});

describe('describePeriod', () => {
  const origin = Date.UTC(2026, 10, 2, 12);

  it('usa o mesmo pico dos tiles e diz se foi numa coleta ou num intervalo', () => {
    const points = [point(origin, 0.2), point(origin + 30_000, 0.2), point(origin + 60_000, 0.8)];
    const stats = seriesStats(points, 'coleta', origin + 60_000);
    const [line] = describePeriod(points, stats, 'coleta', 0);
    expect(line).toMatch(/^Pico de 800 mg CO₂e numa coleta em .+, 2× a média do período\./);
  });

  it('chama de estável um pico perto da média e soma o tempo sem coleta', () => {
    const points = [point(origin, 10), point(origin + 15 * 60_000, 11)];
    const stats = seriesStats(points, '15min', origin + 60 * 60_000);
    expect(describePeriod(points, stats, '15min', 45 * 60_000)).toEqual([
      expect.stringMatching(/^Emissão estável: o pico \(11,0 g em .+\) ficou perto da média\.$/),
      '45 min sem coleta no período: esses trechos não entram no total.',
    ]);
  });
});
