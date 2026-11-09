import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { parseServicesSummaryResponse } from './services.service';

// Corpo de GET /api/services/summary como em docs/api.md
function validBody() {
  return {
    period: { from: '2026-10-20T00:00:00.000Z', to: '2026-10-21T00:00:00.000Z' },
    energyKwh: 0.0124,
    co2eGrams: 1.05,
    services: { active: 3, unavailable: 0, withoutMetrics: 0, removed: 1 },
  };
}

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

  it('aceita energia e CO₂e null (nenhuma coleta calculada no período)', () => {
    const body = { ...validBody(), energyKwh: null, co2eGrams: null };
    expect(parseServicesSummaryResponse(body)).toEqual(body);
  });

  it('recusa energyKwh em texto (critério de aceite da #237)', () => {
    expect(rejection({ ...validBody(), energyKwh: '0.0124' }).message).toBe(
      'O servidor respondeu num formato inesperado (energyKwh). Avise a equipe do backend.',
    );
  });

  it.each([
    ['corpo null', null, 'resposta'],
    ['period ausente', { ...validBody(), period: undefined }, 'period'],
    ['period.from que não é data', { ...validBody(), period: { from: 'ontem', to: '2026-10-21T00:00:00.000Z' } }, 'period.from'],
    ['CO₂e negativo', { ...validBody(), co2eGrams: -1 }, 'co2eGrams'],
    ['energyKwh ausente (null precisa vir na resposta)', { ...validBody(), energyKwh: undefined }, 'energyKwh'],
    ['services ausente', { ...validBody(), services: undefined }, 'services'],
    ['contagem fracionada', { ...validBody(), services: { ...validBody().services, active: 2.5 } }, 'services.active'],
    ['contagem ausente', { ...validBody(), services: { active: 3, unavailable: 0, withoutMetrics: 0 } }, 'services.removed'],
  ])('recusa %s', (_case, body, field) => {
    expect(rejection(body).message).toContain(`(${field})`);
  });
});
