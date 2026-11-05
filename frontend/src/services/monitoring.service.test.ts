import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { parseMonitoringSettings } from './monitoring.service';

// Corpo de GET /api/monitoring-settings como no contrato da #176
function validBody() {
  return { refreshIntervalSeconds: 30, allowedIntervalsSeconds: [15, 30, 60], updatedAt: '2026-10-29T22:00:00.000Z' };
}

function rejection(body: unknown): ApiError {
  try {
    parseMonitoringSettings(body);
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('A resposta deveria ter sido recusada.');
}

describe('parseMonitoringSettings', () => {
  it('devolve a configuração dentro do contrato sem alterar nada', () => {
    expect(parseMonitoringSettings(validBody())).toEqual(validBody());
  });

  it('aceita updatedAt null (ninguém configurou ainda)', () => {
    expect(parseMonitoringSettings({ ...validBody(), updatedAt: null }).updatedAt).toBeNull();
  });

  it.each([
    ['corpo null', null, 'resposta'],
    ['intervalo zero (o polling entraria em laço)', { ...validBody(), refreshIntervalSeconds: 0 }, 'refreshIntervalSeconds'],
    ['intervalo em texto', { ...validBody(), refreshIntervalSeconds: '30' }, 'refreshIntervalSeconds'],
    ['intervalo fracionado', { ...validBody(), refreshIntervalSeconds: 7.5 }, 'refreshIntervalSeconds'],
    ['lista de valores ausente', { ...validBody(), allowedIntervalsSeconds: undefined }, 'allowedIntervalsSeconds'],
    ['lista de valores vazia', { ...validBody(), allowedIntervalsSeconds: [] }, 'allowedIntervalsSeconds'],
    ['valor negativo na lista', { ...validBody(), allowedIntervalsSeconds: [15, -30] }, 'allowedIntervalsSeconds[1]'],
    ['updatedAt ausente (null precisa vir na resposta)', { ...validBody(), updatedAt: undefined }, 'updatedAt'],
    ['updatedAt que não é data', { ...validBody(), updatedAt: 'ontem' }, 'updatedAt'],
  ])('recusa %s', (_case, body, field) => {
    expect(rejection(body).message).toContain(`(${field})`);
  });
});
