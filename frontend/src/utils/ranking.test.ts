import { describe, expect, it } from 'vitest';
import type { ServicesRankingResponse } from '../services/ranking.types';
import { formatShare, rankingIsStale, rankingSentence, rankingShares } from './ranking';

function ranking(values: Array<[string, number | null]>): ServicesRankingResponse {
  let position = 0;
  return {
    metric: 'co2e',
    from: '2026-11-04T22:00:00.000Z',
    to: '2026-11-05T22:00:00.000Z',
    services: values.map(([name, co2eGrams]) => ({
      position: co2eGrams === null ? null : ++position,
      id: name.toLowerCase().replace(/ /g, '-'),
      name,
      region: null,
      status: co2eGrams === null ? 'sem_metricas' : 'ativo',
      energyKwh: co2eGrams === null ? null : co2eGrams / 400,
      co2eGrams,
      collections: 2880,
      failed: 0,
      notCalculated: 0,
    })),
  };
}

describe('rankingShares', () => {
  it('dá a parte de cada serviço no total do período, e as partes somam 100%', () => {
    const shares = rankingShares(ranking([['Checkout Worker', 270], ['Audit Stream', 430], ['Fraud Detector', 300]]));
    expect(shares.get('checkout-worker')?.share).toBeCloseTo(0.27);
    const total = [...shares.values()].reduce((sum, item) => sum + (item.share ?? 0), 0);
    expect(total).toBeCloseTo(1);
  });

  it('deixa sem parte quem não tem cálculo, sem tirar dos outros', () => {
    const shares = rankingShares(ranking([['Audit Stream', 100], ['Inventory Sync', null]]));
    expect(shares.get('audit-stream')?.share).toBe(1);
    expect(shares.get('inventory-sync')?.share).toBeNull();
  });

  it('com total zero, quem tem cálculo fica com 0% e ninguém cai em "sem cálculo"', () => {
    const shares = rankingShares(ranking([['Audit Stream', 0], ['Fraud Detector', 0], ['Inventory Sync', null]]));
    expect([...shares.values()].map((item) => item.share)).toEqual([0, 0, null]);
  });

  it('arredonda pelo maior resto: três partes iguais exibem 33,4 + 33,3 + 33,3 = 100,0%', () => {
    const shares = rankingShares(ranking([['Audit Stream', 1], ['Checkout Worker', 1], ['Fraud Detector', 1]]));
    expect([...shares.values()].map((item) => formatShare(item.share ?? 0))).toEqual(['33,4%', '33,3%', '33,3%']);
  });

  it('seis partes iguais exibem 100,0%, onde arredondar linha a linha daria 16,7% × 6 = 100,2%', () => {
    const shares = rankingShares(ranking(['A', 'B', 'C', 'D', 'E', 'F'].map((name) => [name, 2])));
    const shown = [...shares.values()].map((item) => formatShare(item.share ?? 0));
    expect(formatShare(1 / 6)).toBe('16,7%');
    expect(shown).toEqual(['16,7%', '16,7%', '16,7%', '16,7%', '16,6%', '16,6%']);
    const total = [...shares.values()].reduce((sum, item) => sum + (item.share ?? 0), 0);
    expect(Math.round(total * 1000)).toBe(1000);
  });
});

describe('rankingIsStale', () => {
  it('apaga a parte quando o ranking falhou ou quando a lista de serviços falhou', () => {
    expect(rankingIsStale('', '')).toBe(false);
    expect(rankingIsStale('Ranking de CO₂e do período: falha', '')).toBe(true);
    expect(rankingIsStale('', 'Não foi possível conectar ao servidor.')).toBe(true);
  });
});

describe('rankingSentence', () => {
  it('cita o 1º lugar, a parte e o período', () => {
    const sentence = rankingSentence(ranking([['Audit Stream', 430], ['Checkout Worker', 270], ['Fraud Detector', 300]]), 'das últimas 24 h');
    expect(sentence).toBe('Audit Stream respondeu por 43,0% do CO₂e das últimas 24 h.');
  });

  it('sem nada calculado, não tem frase', () => {
    expect(rankingSentence(ranking([['Inventory Sync', null]]), 'das últimas 24 h')).toBeNull();
    expect(rankingSentence(ranking([['Audit Stream', 0]]), 'das últimas 24 h')).toBeNull();
  });
});

describe('formatShare', () => {
  it('mostra uma casa, com vírgula', () => {
    expect(formatShare(0.27345)).toBe('27,3%');
  });
});
