import { describe, expect, it } from 'vitest';
import {
  describeLateStart,
  describePeriod,
  fittedAxisStart,
  lateStartMs,
  missingSpans,
  missingTimeMs,
  peakRatio,
  readPeriodFilter,
  seriesStats,
} from './emissions';
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

  it('usa o mesmo pico dos tiles e o nome do chip: pico de uma coleta ou maior intervalo', () => {
    const points = [point(origin, 0.2), point(origin + 30_000, 0.2), point(origin + 60_000, 0.8)];
    const stats = seriesStats(points, 'coleta', origin + 60_000);
    const [line] = describePeriod(points, stats, 'coleta', 0);
    expect(line).toMatch(/^Pico de 800 mg CO₂e numa coleta em .+, 2× a média do período\./);
  });

  it('no agrupado, chama o maior ponto de maior intervalo, como o chip e o tile (#272)', () => {
    const points = [point(origin, 1), point(origin + 15 * 60_000, 1), point(origin + 30 * 60_000, 4)];
    const stats = seriesStats(points, '15min', origin + 60 * 60_000);
    expect(describePeriod(points, stats, '15min', 0)[0]).toMatch(/^Maior intervalo: 4,00 g CO₂e em .+, 2× a média do período\./);
  });

  it('chama de estável um pico perto da média e soma o tempo sem coleta', () => {
    const points = [point(origin, 10), point(origin + 15 * 60_000, 11)];
    const stats = seriesStats(points, '15min', origin + 60 * 60_000);
    expect(describePeriod(points, stats, '15min', 45 * 60_000)).toEqual([
      expect.stringMatching(/^Emissão estável: o maior intervalo \(11,0 g em .+\) ficou perto da média\.$/),
      '45 min sem coleta no período: esses trechos não entram no total.',
    ]);
  });
});

describe('missingSpans', () => {
  const origin = Date.UTC(2026, 10, 4, 3);
  const MIN = 60_000;

  it('devolve os trechos sem coleta que somam o tempo do card, alinhados em 15 min (#272)', () => {
    // Coletas em 00:00, 00:15 e 01:30 (do período de 1 dia): falta 00:30–01:30
    const points = [point(origin, 1), point(origin + 15 * MIN, 1), point(origin + 90 * MIN, 1)];
    const spans = missingSpans(points, 'coleta', origin, origin + 24 * 60 * MIN);
    expect(spans).toEqual([{ start: origin + 30 * MIN, end: origin + 90 * MIN }]);
    expect(missingTimeMs(points, 'coleta', origin, origin + 24 * 60 * MIN)).toBe(60 * MIN);
  });

  it('não conta antes da primeira nem depois da última coleta', () => {
    const points = [point(origin + 60 * MIN, 1)];
    expect(missingSpans(points, '15min', origin, origin + 24 * 60 * MIN)).toEqual([]);
  });
});

describe('lateStartMs (#332)', () => {
  const MIN = 60_000;
  const from = Date.UTC(2026, 10, 5, 3);
  const to = from + 24 * 60 * MIN;

  it('marca o início quando mais de 20% do período passou sem coleta (o "Ontem" com dados só depois das 18:40)', () => {
    const start = from + (18 * 60 + 40) * MIN;
    expect(lateStartMs([point(start, 1), point(start + 30_000, 1)], from, to)).toBe(start);
  });

  it('não marca quando o primeiro dado chega até 20% do período (inclusive)', () => {
    const atLimit = from + 0.2 * 24 * 60 * MIN;
    expect(lateStartMs([point(atLimit, 1)], from, to)).toBeNull();
    expect(lateStartMs([point(atLimit + MIN, 1)], from, to)).toBe(atLimit + MIN);
  });

  it('não marca sem coleta no período nem ignora o ponto sem cálculo: coleta sem cálculo também é monitoramento', () => {
    expect(lateStartMs([], from, to)).toBeNull();
    const start = from + 12 * 60 * MIN;
    expect(lateStartMs([point(start, null), point(start + MIN, 1)], from, to)).toBe(start);
  });

  it('no período "Hoje", que termina agora, mede pelo que já passou do dia', () => {
    // Monitoramento ligado às 13:50 e agora são 14:00: quase todo o trecho até agora ficou vazio
    const now = from + 14 * 60 * MIN;
    expect(lateStartMs([point(now - 10 * MIN, 1)], from, now)).toBe(now - 10 * MIN);
  });
});

describe('fittedAxisStart (#332)', () => {
  const MIN = 60_000;
  const from = Date.UTC(2026, 10, 5, 3);

  it('começa o eixo no primeiro dado', () => {
    expect(fittedAxisStart(from + 600 * MIN, from, from + 1440 * MIN, '15min')).toBe(from + 600 * MIN);
  });

  it('deixa pelo menos um intervalo do agrupamento até o fim, sem passar do início do período', () => {
    const to = from + 600 * MIN;
    expect(fittedAxisStart(to - 5 * MIN, from, to, '15min')).toBe(to - 15 * MIN);
    expect(fittedAxisStart(from + 5 * MIN, from, from + 10 * MIN, '1h')).toBe(from);
  });
});

describe('describeLateStart (#332)', () => {
  const start = new Date(2026, 10, 5, 18, 40).getTime();

  it('dá o horário da coleta, com o dia quando o período tem mais de um', () => {
    expect(describeLateStart(start, 'coleta', false)).toBe('monitoramento começou às 18:40');
    expect(describeLateStart(start, 'coleta', true)).toBe('monitoramento começou em 05/11 18:40');
  });

  it('no agrupado, diz o intervalo em que a primeira coleta caiu', () => {
    const bucketStart = new Date(2026, 10, 5, 18, 30).getTime();
    expect(describeLateStart(bucketStart, '15min', false)).toBe('monitoramento começou entre 18:30 e 18:45');
  });
});
