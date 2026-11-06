import { describe, expect, it } from 'vitest';
import { addMonths, formatRange, isSelectable, keyTarget, monthWeeks, ordered, periodLabel, presets } from './calendar';

const TODAY = '2026-11-04';

describe('presets', () => {
  it('termina os atalhos em hoje, com 1, 7 e 30 dias contando os dois extremos', () => {
    expect(presets(TODAY).map(({ id, start, end }) => [id, start, end])).toEqual([
      ['hoje', '2026-11-04', '2026-11-04'],
      ['ontem', '2026-11-03', '2026-11-03'],
      ['7d', '2026-10-29', '2026-11-04'],
      ['30d', '2026-10-06', '2026-11-04'],
    ]);
  });
});

describe('periodLabel', () => {
  it('usa o nome do atalho quando o período é um deles e as datas nos outros casos', () => {
    expect(periodLabel(TODAY, TODAY, TODAY)).toBe('Hoje');
    expect(periodLabel('2026-10-29', TODAY, TODAY)).toBe('Últimos 7 dias');
    expect(periodLabel('2026-11-01', TODAY, TODAY)).toBe('01/11 – 04/11/2026');
    expect(formatRange('2026-10-15', '2026-10-15')).toBe('15/10/2026');
    expect(formatRange('2025-12-28', '2026-01-03')).toBe('28/12/2025 – 03/01/2026');
  });
});

describe('monthWeeks', () => {
  it('começa a semana na segunda-feira e completa com null os dias de outro mês', () => {
    // 01/11/2026 é domingo: a primeira semana tem 6 vazios e o dia 1 no fim
    const weeks = monthWeeks('2026-11-17');
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks[1][0]).toBe('2026-11-02');
    expect(weeks[weeks.length - 1]).toEqual(['2026-11-30', null, null, null, null, null, null]);
    expect(weeks).toHaveLength(6);
  });

  it('cabe em 4 semanas quando o mês de 28 dias começa na segunda', () => {
    // 01/02/2027 é segunda-feira
    expect(monthWeeks('2027-02-01')).toHaveLength(4);
  });
});

describe('isSelectable', () => {
  it('nunca deixa escolher um dia no futuro', () => {
    expect(isSelectable('2026-11-05', TODAY, null, 31)).toBe(false);
    expect(isSelectable(TODAY, TODAY, null, 31)).toBe(true);
  });

  it('com o início marcado, limita o fim a 31 dias para os dois lados', () => {
    expect(isSelectable('2026-10-05', TODAY, TODAY, 31)).toBe(true);
    expect(isSelectable('2026-10-04', TODAY, TODAY, 31)).toBe(false);
    expect(isSelectable('2026-11-01', TODAY, '2026-10-01', 31)).toBe(false);
    expect(isSelectable('2026-10-31', TODAY, '2026-10-01', 31)).toBe(true);
  });
});

describe('ordered e addMonths', () => {
  it('põe os dois cliques em ordem e não passa do último dia do mês', () => {
    expect(ordered('2026-11-04', '2026-11-01')).toEqual(['2026-11-01', '2026-11-04']);
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
  });
});

describe('keyTarget', () => {
  it('move pelas setas, pela semana e pelo mês', () => {
    expect(keyTarget('2026-11-04', 'ArrowRight')).toBe('2026-11-05');
    expect(keyTarget('2026-11-04', 'ArrowUp')).toBe('2026-10-28');
    // 04/11/2026 é quarta: a semana vai de 02/11 (segunda) a 08/11 (domingo)
    expect(keyTarget('2026-11-04', 'Home')).toBe('2026-11-02');
    expect(keyTarget('2026-11-04', 'End')).toBe('2026-11-08');
    expect(keyTarget('2026-11-04', 'PageUp')).toBe('2026-10-04');
    expect(keyTarget('2026-11-04', 'Enter')).toBeNull();
  });
});
