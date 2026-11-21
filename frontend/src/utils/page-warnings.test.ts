import { describe, expect, it } from 'vitest';
import { pageWarnings } from './page-warnings';

const CLEAN = {
  services: '',
  hasServices: true,
  servicesAt: '2026-11-13T22:00:00.000Z',
  summary: '',
  summaryAt: '2026-11-13T22:00:00.000Z',
  ranking: '',
};

describe('pageWarnings — um aviso por página (#271)', () => {
  it('sem falha nenhuma não mostra faixa nem aviso grande', () => {
    expect(pageWarnings(CLEAN)).toEqual({ banner: '', bannerAt: null, page: '' });
  });

  it('lista sem dados na tela usa o aviso grande, não a faixa', () => {
    const warnings = pageWarnings({ ...CLEAN, services: 'Não foi possível conectar', hasServices: false });
    expect(warnings.page).toBe('Não foi possível conectar');
    expect(warnings.banner).toBe('');
  });

  it('lista com dados na tela usa a faixa e cita o horário da última lista', () => {
    const warnings = pageWarnings({ ...CLEAN, services: 'Não foi possível conectar' });
    expect(warnings).toEqual({ banner: 'Não foi possível conectar', bannerAt: CLEAN.servicesAt, page: '' });
  });

  it('a faixa da lista vence o resumo: nunca duas faixas na mesma página', () => {
    const warnings = pageWarnings({ ...CLEAN, services: 'Falha na lista', summary: 'Falha no resumo' });
    expect(warnings.banner).toBe('Falha na lista');
  });
});

describe('pageWarnings — resumo com números na tela (#234)', () => {
  it('falha do resumo com números na tela vira faixa, citando o período que está na tela', () => {
    const warnings = pageWarnings({ ...CLEAN, summary: 'O servidor respondeu num formato inesperado (totals).' });
    expect(warnings).toEqual({
      banner: 'O servidor respondeu num formato inesperado (totals).',
      bannerAt: CLEAN.summaryAt,
      page: '',
    });
  });

  it('falha do resumo antes da primeira resposta usa o aviso grande', () => {
    const warnings = pageWarnings({ ...CLEAN, summary: 'Não foi possível carregar os indicadores.', summaryAt: null });
    expect(warnings).toEqual({ banner: '', bannerAt: null, page: 'Não foi possível carregar os indicadores.' });
  });

  it('com lista em dia e resumo na tela, a falha do resumo vence o ranking', () => {
    const warnings = pageWarnings({ ...CLEAN, summary: 'Falha no resumo', ranking: 'Falha no ranking' });
    expect(warnings.banner).toBe('Falha no resumo');
    expect(warnings.page).toBe('');
  });
});

describe('pageWarnings — sem falha de lista nem de resumo', () => {
  it('mostra a falha do ranking no aviso grande', () => {
    expect(pageWarnings({ ...CLEAN, ranking: 'Falha no ranking' }).page).toBe('Falha no ranking');
  });
});
