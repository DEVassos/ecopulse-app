import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { parseServicesSummaryResponse } from './summary.service';

// Corpo de GET /api/services/summary como em docs/api.md
function validBody() {
  return {
    from: '2026-10-20T00:00:00.000Z',
    to: '2026-10-21T00:00:00.000Z',
    totals: { collections: 4, failed: 1, notCalculated: 2, energyKwh: 0.0124, co2eGrams: 1.05, carbonIntensityGco2ePerKwh: 84.7 },
    previous: {
      from: '2026-10-19T00:00:00.000Z',
      to: '2026-10-20T00:00:00.000Z',
      totals: { collections: 2, failed: 0, notCalculated: 0, energyKwh: 0.02, co2eGrams: 2.0, carbonIntensityGco2ePerKwh: 100 },
    },
    servicesByStatus: { ativo: 3, indisponivel: 0, sem_metricas: 0, removido: 1, total: 3 },
  };
}

const EMPTY_TOTALS = { collections: 0, failed: 0, notCalculated: 0, energyKwh: null, co2eGrams: null, carbonIntensityGco2ePerKwh: null };

function rejection(body: unknown): ApiError {
  try {
    parseServicesSummaryResponse(body);
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('A resposta deveria ter sido recusada.');
}

describe('parseServicesSummaryResponse', () => {
  it('devolve a resposta dentro do contrato sem alterar nada', () => {
    expect(parseServicesSummaryResponse(validBody())).toEqual(validBody());
  });

  it('aceita totais null sem coleta calculada, no período atual e no anterior', () => {
    const body = { ...validBody(), totals: EMPTY_TOTALS, previous: { ...validBody().previous, totals: EMPTY_TOTALS } };
    expect(parseServicesSummaryResponse(body)).toEqual(body);
  });

  it('recusa energyKwh em texto (critério de aceite da #237)', () => {
    const body = { ...validBody(), totals: { ...validBody().totals, energyKwh: '0.0124' } };
    expect(rejection(body).message).toBe(
      'O servidor respondeu num formato inesperado (totals.energyKwh). Avise a equipe do backend.',
    );
  });

  it.each([
    ['corpo null', null, 'resposta'],
    ['from que não é data', { ...validBody(), from: 'ontem' }, 'from'],
    ['previous ausente', { ...validBody(), previous: undefined }, 'previous'],
    ['previous.totals ausente', { ...validBody(), previous: { ...validBody().previous, totals: undefined } }, 'previous.totals'],
    ['CO₂e negativo', { ...validBody(), totals: { ...validBody().totals, co2eGrams: -1 } }, 'totals.co2eGrams'],
    ['energyKwh ausente (null precisa vir na resposta)', { ...validBody(), totals: { ...validBody().totals, energyKwh: undefined } }, 'totals.energyKwh'],
    ['coleta fracionada', { ...validBody(), totals: { ...validBody().totals, collections: 2.5 } }, 'totals.collections'],
    ['servicesByStatus sem removido', { ...validBody(), servicesByStatus: { ativo: 3, indisponivel: 0, sem_metricas: 0, total: 3 } }, 'servicesByStatus.removido'],
    ['servicesByStatus ausente', { ...validBody(), servicesByStatus: undefined }, 'servicesByStatus'],
  ])('recusa %s', (_case, body, field) => {
    expect(rejection(body).message).toContain(`(${field})`);
  });
});
