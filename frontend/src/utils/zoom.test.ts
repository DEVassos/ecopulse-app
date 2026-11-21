import { describe, expect, it } from 'vitest';
import type { EmissionPoint } from '../services/emissions.types';
import { seriesStats, totalsOf } from './emissions';
import {
  describeWindow,
  dragSpan,
  formatShare,
  gridStepMs,
  minWindowMs,
  panWindow,
  pointsInWindow,
  shareOf,
  snapWindow,
  spansInWindow,
  visibleWindow,
  windowClock,
  zoomStep,
} from './zoom';

const MIN = 60_000;
const at = (hours: number, minutes = 0) => new Date(2026, 10, 18, hours, minutes).getTime();
/** "Ontem": 18/11 inteiro, de 00:00 a 24:00. */
const DAY = { fromMs: at(0), toMs: at(24) };
const STEP = 15 * MIN;

/** Um intervalo de 15 min com 30 coletas e um CO₂e conhecido. */
function bucket(t: number, co2eGrams: number | null): EmissionPoint {
  return {
    t, collections: 30, failed: 0, notCalculated: co2eGrams === null ? 30 : 0,
    energyKwh: co2eGrams === null ? null : co2eGrams / 400, co2eGrams, co2eMinGrams: null, co2eMaxGrams: null,
  };
}

/** Os 96 intervalos do dia, com CO₂e de 1 a 96 g (soma 4.656 g). */
const POINTS = Array.from({ length: 96 }, (_, i) => bucket(DAY.fromMs + i * STEP, i + 1));

describe('snapWindow (#396)', () => {
  it('encaixa início e fim nas bordas dos intervalos de 15 min', () => {
    expect(snapWindow({ fromMs: at(5, 50), toMs: at(18, 10) }, DAY, STEP)).toEqual({ fromMs: at(5, 45), toMs: at(18, 15) });
    expect(snapWindow({ fromMs: at(6, 5), toMs: at(17, 55) }, DAY, STEP)).toEqual({ fromMs: at(6), toMs: at(18) });
  });

  it('não sai do período e mantém a largura nas duas pontas', () => {
    expect(snapWindow({ fromMs: at(-2), toMs: at(2) }, DAY, STEP)).toEqual({ fromMs: at(0), toMs: at(4) });
    expect(snapWindow({ fromMs: at(22), toMs: at(26) }, DAY, STEP)).toEqual({ fromMs: at(20), toMs: at(24) });
  });

  it('respeita a largura mínima, crescendo em volta do centro: 4 intervalos agrupados, 10 min em "Cada coleta"', () => {
    expect(snapWindow({ fromMs: at(12), toMs: at(12, 15) }, DAY, STEP)).toEqual({ fromMs: at(11, 45), toMs: at(12, 45) });
    expect(minWindowMs(60 * MIN)).toBe(4 * 60 * MIN);
    const twoHours = { fromMs: at(10), toMs: at(12) };
    expect(snapWindow({ fromMs: at(11), toMs: at(11, 2) }, twoHours, 30_000)).toEqual({ fromMs: at(10, 56), toMs: at(11, 6) });
    expect(snapWindow({ fromMs: at(0), toMs: at(0, 5) }, DAY, STEP)).toEqual({ fromMs: at(0), toMs: at(1) });
  });

  it('devolve null quando o trecho cobre o período inteiro', () => {
    expect(snapWindow({ fromMs: at(0), toMs: at(24) }, DAY, STEP)).toBeNull();
    expect(snapWindow({ fromMs: at(-6), toMs: at(30) }, DAY, STEP)).toBeNull();
  });

  it('no período de hoje vai até o fim do intervalo em andamento, que continua marcado como aberto', () => {
    const today = { fromMs: at(0), toMs: at(18, 37) };
    const points = POINTS.filter((point) => point.t < today.toMs);
    const end = snapWindow({ fromMs: at(15), toMs: at(18, 37) }, today, STEP);
    expect(end).toEqual({ fromMs: at(15), toMs: at(18, 45) });
    const shown = visibleWindow(end as { fromMs: number; toMs: number }, today);
    expect(shown).toEqual({ fromMs: at(15), toMs: at(18, 37) });
    const inside = pointsInWindow(points, shown);
    expect(seriesStats(inside, '15min', shown.toMs).openIndex).toBe(inside.length - 1);
    // Trecho que termina numa borda já fechada: nenhum intervalo em andamento
    const before = { fromMs: at(12), toMs: at(18) };
    expect(seriesStats(pointsInWindow(points, before), '15min', before.toMs).openIndex).toBeNull();
  });
});

describe('zoomStep e panWindow (#396)', () => {
  it('aproximar mostra a metade central; ▶ anda meio trecho; afastar dobra com o mesmo centro', () => {
    const first = zoomStep(DAY, DAY, STEP, 'in');
    expect(first).toEqual({ fromMs: at(6), toMs: at(18) });
    const second = zoomStep(first as { fromMs: number; toMs: number }, DAY, STEP, 'in');
    expect(second).toEqual({ fromMs: at(9), toMs: at(15) });
    const moved = panWindow(second as { fromMs: number; toMs: number }, DAY, STEP, 1);
    expect(moved).toEqual({ fromMs: at(12), toMs: at(18) });
    expect(zoomStep(moved as { fromMs: number; toMs: number }, DAY, STEP, 'out')).toEqual({ fromMs: at(9), toMs: at(21) });
    expect(zoomStep({ fromMs: at(6), toMs: at(18) }, DAY, STEP, 'out')).toBeNull();
  });

  it('◀ e ▶ param na borda do período', () => {
    expect(panWindow({ fromMs: at(0), toMs: at(6) }, DAY, STEP, -1)).toEqual({ fromMs: at(0), toMs: at(6) });
    expect(panWindow({ fromMs: at(20), toMs: at(24) }, DAY, STEP, 1)).toEqual({ fromMs: at(20), toMs: at(24) });
  });

  it('o passo de "Cada coleta" é o intervalo típico entre as coletas', () => {
    const collections = [0, 30, 60, 90].map((s) => bucket(at(10) + s * 1000, 1));
    expect(gridStepMs(collections, 'coleta')).toBe(30_000);
    expect(gridStepMs(collections, '1h')).toBe(60 * MIN);
  });
});

describe('recorte do trecho (#396)', () => {
  it('a soma dos intervalos do trecho é o total do trecho, e dois trechos vizinhos somam o período', () => {
    const morning = pointsInWindow(POINTS, { fromMs: at(0), toMs: at(12) });
    const afternoon = pointsInWindow(POINTS, { fromMs: at(12), toMs: at(24) });
    expect(morning).toHaveLength(48);
    expect(totalsOf(morning, 400).co2eGrams).toBe(1176); // 1 + 2 + … + 48
    expect(totalsOf(afternoon, 400).co2eGrams).toBe(3480); // 49 + … + 96
    expect((totalsOf(morning, 400).co2eGrams as number) + (totalsOf(afternoon, 400).co2eGrams as number)).toBe(
      totalsOf(POINTS, 400).co2eGrams,
    );
  });

  it('trecho sem pontos fica vazio e sem cálculo, nunca zero', () => {
    const empty = pointsInWindow([bucket(at(1), 5)], { fromMs: at(12), toMs: at(13) });
    expect(empty).toEqual([]);
    expect(totalsOf(empty, 400).co2eGrams).toBeNull();
  });

  it('recorta os trechos sem coleta ao trecho ampliado', () => {
    const spans = [{ start: at(3), end: at(10) }, { start: at(20), end: at(21) }];
    expect(spansInWindow(spans, { fromMs: at(6), toMs: at(18) })).toEqual([{ start: at(6), end: at(10) }]);
  });
});

describe('dragSpan (#397)', () => {
  // 960 px para 24 h: 1 px = 1,5 min
  const W = 960;

  it('converte o arrasto em horas encaixadas nos intervalos, em qualquer direção', () => {
    expect(dragSpan(480, 640, W, DAY, STEP)).toEqual({ fromMs: at(12), toMs: at(16) });
    expect(dragSpan(640, 480, W, DAY, STEP)).toEqual({ fromMs: at(12), toMs: at(16) });
    expect(dragSpan(482, 638, W, DAY, STEP)).toEqual({ fromMs: at(12), toMs: at(16) });
  });

  it('abaixo de 8 px é clique; a partir de 8 px, ao menos um intervalo', () => {
    expect(dragSpan(480, 487, W, DAY, STEP)).toBeNull();
    expect(dragSpan(480, 488, W, DAY, STEP)).toEqual({ fromMs: at(12), toMs: at(12, 15) });
    expect(dragSpan(952, 1000, W, DAY, STEP)).toEqual({ fromMs: at(23, 45), toMs: at(24) });
  });

  it('não sai do eixo e, no período de hoje, o fim do eixo ("agora") também é borda', () => {
    expect(dragSpan(-50, 2000, W, DAY, STEP)).toEqual(DAY);
    const today = { fromMs: at(0), toMs: at(18, 37) };
    // 1117 px para 18 h 37 min: 1 px = 1 min
    expect(dragSpan(1080, 1117, 1117, today, STEP)).toEqual({ fromMs: at(18), toMs: at(18, 37) });
    expect(snapWindow({ fromMs: at(18), toMs: at(18, 37) }, today, STEP)).toEqual({ fromMs: at(17, 45), toMs: at(18, 45) });
  });
});

describe('textos do trecho (#396)', () => {
  it('descreve o trecho com data, hora e duração; meia-noite do fim vira 24:00', () => {
    expect(describeWindow({ fromMs: at(6), toMs: at(18) })).toBe('18/11 06:00 → 18:00 (12 h)');
    expect(describeWindow({ fromMs: at(18), toMs: at(24) })).toBe('18/11 18:00 → 24:00 (6 h)');
    expect(describeWindow({ fromMs: at(18), toMs: at(30) })).toBe('18/11 18:00 → 19/11 06:00 (12 h)');
  });

  it('cabeçalho impresso: só a hora num período de um dia, com a data em períodos maiores', () => {
    expect(windowClock({ fromMs: at(5, 45), toMs: at(17, 30) }, false)).toBe('05:45–17:30');
    expect(windowClock({ fromMs: at(18), toMs: at(24) }, false)).toBe('18:00–24:00');
    expect(windowClock({ fromMs: at(18), toMs: at(30) }, true)).toBe('18/11 18:00–19/11 06:00');
  });

  it('parte do período em %, sem 0% inventado quando falta o total', () => {
    expect(formatShare(shareOf(1176, 4656) as number)).toBe('25,3%');
    expect(shareOf(10, 0)).toBeNull();
    expect(shareOf(null, 10)).toBeNull();
  });
});
