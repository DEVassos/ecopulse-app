import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { parseComparisonResponse } from './compare.service';

// Corpo de GET /api/services/compare como em docs/api.md, mais um serviço sem coleta no período
function validBody() {
  return {
    from: '2026-10-20T00:00:00.000Z',
    to: '2026-10-21T00:00:00.000Z',
    services: [
      {
        id: '1',
        name: 'Demo',
        region: 'Sul',
        collections: 12,
        failed: 0,
        notCalculated: 0,
        avgCpuPercent: 42.5,
        avgMemoryGb: 2.1,
        avgDiskGb: 10,
        avgNetworkGb: 0.3,
        energyKwh: 0.01,
        co2eGrams: 0.85,
      },
      {
        id: '2',
        name: 'Sem coletas',
        region: null,
        collections: 0,
        failed: 0,
        notCalculated: 0,
        avgCpuPercent: null,
        avgMemoryGb: null,
        avgDiskGb: null,
        avgNetworkGb: null,
        energyKwh: null,
        co2eGrams: null,
      },
    ],
  };
}

/** Corpo válido com o segundo serviço alterado: `undefined` remove o campo. */
function withSecondService(changes: Record<string, unknown>) {
  const body = validBody();
  const service: Record<string, unknown> = { ...body.services[1], ...changes };
  for (const key of Object.keys(changes)) if (changes[key] === undefined) delete service[key];
  return { ...body, services: [body.services[0], service] };
}

function rejection(body: unknown): ApiError {
  try {
    parseComparisonResponse(body);
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('A resposta deveria ter sido recusada.');
}

describe('parseComparisonResponse', () => {
  it('devolve a resposta dentro do contrato sem alterar nada', () => {
    expect(parseComparisonResponse(validBody())).toEqual(validBody());
  });

  it('recusa a resposta inteira quando um serviço vem sem id (critério de aceite da #237)', () => {
    expect(rejection(withSecondService({ id: undefined })).message).toBe(
      'O servidor respondeu num formato inesperado (services[1].id). Avise a equipe do backend.',
    );
  });

  it.each([
    ['nome ausente', { name: undefined }, 'services[1].name'],
    ['região ausente (null precisa vir na resposta)', { region: undefined }, 'services[1].region'],
    ['contagem negativa', { collections: -1 }, 'services[1].collections'],
    ['falhas em texto', { failed: '0' }, 'services[1].failed'],
    ['média de CPU em texto', { avgCpuPercent: '42.5' }, 'services[1].avgCpuPercent'],
    ['CO₂e infinito', { co2eGrams: Number.POSITIVE_INFINITY }, 'services[1].co2eGrams'],
  ])('recusa %s', (_case, changes, field) => {
    expect(rejection(withSecondService(changes)).message).toContain(`(${field})`);
  });

  it.each([
    ['corpo em lista', [], 'resposta'],
    ['from ausente', { ...validBody(), from: undefined }, 'from'],
    ['to que não é data', { ...validBody(), to: '21/10/2026' }, 'to'],
    ['services ausente', { from: validBody().from, to: validBody().to }, 'services'],
  ])('recusa %s', (_case, body, field) => {
    expect(rejection(body).message).toContain(`(${field})`);
  });
});
