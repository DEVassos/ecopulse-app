import { describe, expect, it } from 'vitest';
import { OVERVIEW_WIDTH, overviewBars } from './emission-overview';

const MIN = 60_000;

describe('overviewBars (miniatura do período no zoom)', () => {
  // Período de 100 min em 1000 unidades: 10 unidades por minuto; intervalos de 25 min
  const period = { fromMs: 0, toMs: 100 * MIN, stepMs: 25 * MIN, height: 30 };
  const starts = [0, 25 * MIN, 50 * MIN, 75 * MIN];

  it('põe a janela do trecho no lugar dele dentro do período', () => {
    const { window } = overviewBars({ ...period, starts, values: [1, 2, 3, 4], zoom: { fromMs: 25 * MIN, toMs: 75 * MIN } });
    expect(window).toEqual({ x: 250, width: 500 });
  });

  it('marca os intervalos de dentro do trecho e usa a escala do maior', () => {
    const { bars } = overviewBars({ ...period, starts, values: [10, 20, 40, 20], zoom: { fromMs: 25 * MIN, toMs: 75 * MIN } });
    expect(bars.map((bar) => bar.inWindow)).toEqual([false, true, true, false]);
    expect(bars.map((bar) => bar.height)).toEqual([7.5, 15, 30, 15]);
    // Cada barra ocupa 80% do seu intervalo de 250 unidades, centrada
    expect(bars[0].x).toBe(25);
    expect(bars[0].width).toBe(200);
    expect(bars[3].x + bars[3].width).toBeLessThanOrEqual(OVERVIEW_WIDTH);
  });

  it('não desenha intervalo sem cálculo e mantém 1 unidade para valor pequeno', () => {
    const { bars } = overviewBars({ ...period, starts, values: [null, 0.001, 100, 0], zoom: { fromMs: 0, toMs: 50 * MIN } });
    expect(bars).toHaveLength(3);
    expect(bars[0].height).toBe(1);
    expect(bars[2].height).toBe(1);
  });

  it('o intervalo em andamento não passa do fim do período', () => {
    const { bars, window } = overviewBars({
      ...period,
      toMs: 90 * MIN,
      starts,
      values: [1, 1, 1, 1],
      zoom: { fromMs: 75 * MIN, toMs: 90 * MIN },
    });
    const last = bars[bars.length - 1];
    expect(last.x + last.width).toBeLessThanOrEqual(OVERVIEW_WIDTH);
    expect(window.x + window.width).toBeCloseTo(OVERVIEW_WIDTH);
  });
});
