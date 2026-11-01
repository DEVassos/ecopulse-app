import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { parseCollectionsResponse } from './collections.service';

// Corpo de GET /api/collections como em docs/api.md: uma coleta calculada e uma com falha, sem cálculo.
function validBody() {
  return {
    collections: [
      {
        id: '2',
        serviceId: '1',
        collectedAt: '2026-10-14T20:00:00.000Z',
        status: 'ok',
        cpuPercent: 42.5,
        memoryGb: 1.2,
        diskGb: 10,
        networkGb: 0.3,
        errorMessage: null,
        calculationStatus: 'disponivel',
        energyKwh: 0.000480452625,
        co2eGrams: 0.040838473125,
        carbonIntensityGco2ePerKwh: 85,
      },
      {
        id: '1',
        serviceId: '1',
        collectedAt: '2026-10-14T19:45:00.000Z',
        status: 'erro',
        cpuPercent: null,
        memoryGb: null,
        diskGb: null,
        networkGb: null,
        errorMessage: 'Serviço indisponível (HTTP 500).',
        calculationStatus: 'nao_calculado',
        energyKwh: null,
        co2eGrams: null,
        carbonIntensityGco2ePerKwh: null,
      },
    ],
    period: { from: '2026-10-14T00:00:00.000Z', to: null },
  };
}

/** Corpo válido com a primeira coleta alterada: `undefined` remove o campo. */
function withFirstCollection(changes: Record<string, unknown>) {
  const body = validBody();
  const collection: Record<string, unknown> = { ...body.collections[0], ...changes };
  for (const key of Object.keys(changes)) if (changes[key] === undefined) delete collection[key];
  return { ...body, collections: [collection, body.collections[1]] };
}

function rejection(body: unknown): ApiError {
  try {
    parseCollectionsResponse(body);
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('A resposta deveria ter sido recusada.');
}

describe('parseCollectionsResponse', () => {
  it('devolve a resposta dentro do contrato sem alterar nada', () => {
    expect(parseCollectionsResponse(validBody())).toEqual(validBody());
  });

  it('aceita coleta sem os campos de cálculo (#188), que são opcionais no contrato do frontend', () => {
    const body = withFirstCollection({ calculationStatus: undefined, energyKwh: undefined, co2eGrams: undefined, carbonIntensityGco2ePerKwh: undefined });
    expect(parseCollectionsResponse(body).collections[0].energyKwh).toBeUndefined();
  });

  it('aceita zero como cálculo válido', () => {
    expect(parseCollectionsResponse(withFirstCollection({ co2eGrams: 0 })).collections[0].co2eGrams).toBe(0);
  });

  it.each([
    ['coleta sem id', { id: undefined }, 'collections[0].id'],
    ['CPU em texto', { cpuPercent: '42.5' }, 'collections[0].cpuPercent'],
    ['memória ausente (null precisa vir na resposta)', { memoryGb: undefined }, 'collections[0].memoryGb'],
    ['horário da coleta ausente', { collectedAt: undefined }, 'collections[0].collectedAt'],
    ['status fora da lista', { status: 'falhou' }, 'collections[0].status'],
    ['estado de cálculo fora da lista', { calculationStatus: 'pronto' }, 'collections[0].calculationStatus'],
    ['CO₂e negativo', { co2eGrams: -0.5 }, 'collections[0].co2eGrams'],
    ['mensagem de erro numérica', { errorMessage: 500 }, 'collections[0].errorMessage'],
  ])('recusa %s', (_case, changes, field) => {
    expect(rejection(withFirstCollection(changes)).message).toContain(`(${field})`);
  });

  it.each([
    ['collections ausente', { period: { from: null, to: null } }, 'collections'],
    ['period ausente', { collections: [] }, 'period'],
    ['period.to que não é data', { collections: [], period: { from: null, to: 'hoje' } }, 'period.to'],
  ])('recusa %s', (_case, body, field) => {
    expect(rejection(body).message).toContain(`(${field})`);
  });
});
