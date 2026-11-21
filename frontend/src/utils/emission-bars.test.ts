import { describe, expect, it } from 'vitest';
import { barGap, barPath, intervalBars, RANGE_MIN_WIDTH } from './emission-bars';

const MIN = 60_000;
// Plot de 0 a 100 px para 0 a 100 min: 1 px por minuto; eixo y invertido com base em 200 e 1 g = 1 px
const base = {
  stepMs: 15 * MIN,
  openIndex: null,
  peakIndex: null,
  x: (t: number) => t / MIN,
  y: (v: number) => 200 - v,
  baseline: 200,
  plotLeft: 0,
  plotRight: 100,
};

describe('intervalBars (barras do modo Por intervalo)', () => {
  it('ocupa o intervalo inteiro, com 2 px entre barras quando cabem', () => {
    const [bar] = intervalBars({ ...base, starts: [0], values: [40], ranges: [null] });
    expect(bar.x).toBe(1);
    expect(bar.width).toBe(13);
    expect(bar.top).toBe(160);
    expect(bar.height).toBe(40);
    expect(bar.kind).toBe('normal');
  });

  it('não desenha barra onde não há cálculo (null não vira zero)', () => {
    const bars = intervalBars({ ...base, starts: [0, 15 * MIN, 30 * MIN], values: [10, null, 20], ranges: [null, null, null] });
    expect(bars.map((b) => b.index)).toEqual([0, 2]);
  });

  it('zero calculado vira um traço de 1 px na base', () => {
    const [bar] = intervalBars({ ...base, starts: [0], values: [0], ranges: [null] });
    expect(bar.height).toBe(1);
    expect(bar.top).toBe(199);
  });

  it('marca o maior intervalo e o intervalo em andamento, que termina no fim do plot', () => {
    const bars = intervalBars({
      ...base,
      starts: [60 * MIN, 75 * MIN, 90 * MIN],
      values: [10, 30, 5],
      peakIndex: 1,
      openIndex: 2,
      ranges: [null, null, null],
    });
    expect(bars.map((b) => b.kind)).toEqual(['normal', 'peak', 'open']);
    // Aberto de 90 a 100 min (o plot acaba em "agora"): 10 px de espaço, 8 de barra
    expect(bars[2].x).toBe(91);
    expect(bars[2].width).toBe(8);
  });

  it('o traço mín./máx. só aparece em barra larga o bastante', () => {
    const range = { lo: 30, hi: 50 };
    const [wide] = intervalBars({ ...base, starts: [0], values: [40], ranges: [range] });
    expect(wide.range).toEqual({ top: 150, bottom: 170 });
    const [narrow] = intervalBars({ ...base, stepMs: 4 * MIN, starts: [0], values: [40], ranges: [range] });
    expect(narrow.width).toBeLessThan(RANGE_MIN_WIDTH);
    expect(narrow.range).toBeNull();
  });

  it('barras muito estreitas encostam umas nas outras', () => {
    expect(barGap(10)).toBe(2);
    expect(barGap(5)).toBe(1);
    expect(barGap(2)).toBe(0);
  });
});

describe('barPath', () => {
  it('arredonda só os cantos de cima e fecha reto na base', () => {
    expect(barPath({ x: 0, width: 10, top: 50, height: 50 })).toBe('M0,100V52Q0,50 2,50H8Q10,50 10,52V100Z');
  });
});
