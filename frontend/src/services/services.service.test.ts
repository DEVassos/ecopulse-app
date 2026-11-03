import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { parseServicesResponse } from './services.service';

// Corpo de GET /api/services como em docs/api.md: um serviço ativo e um sem métricas (campos null).
function validBody() {
  return {
    services: [
      {
        id: '1',
        name: 'Demo',
        country: 'BR',
        region: 'Sul',
        city: 'Porto Alegre',
        cpuPercent: 62.67,
        energyKwh: 0.000480452625,
        emissionsG: 0.040838473125,
        status: 'ativo',
        lastReadingAt: '2026-10-14T20:00:00.000Z',
      },
      {
        id: '2',
        name: 'Inventory Sync',
        country: null,
        region: null,
        city: null,
        cpuPercent: null,
        energyKwh: null,
        emissionsG: null,
        status: 'sem_metricas',
        lastReadingAt: null,
      },
    ],
    period: 'última leitura (intervalo de coleta)',
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
    parseServicesResponse(body);
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('A resposta deveria ter sido recusada.');
}

describe('parseServicesResponse', () => {
  it('devolve a resposta dentro do contrato sem alterar nada', () => {
    expect(parseServicesResponse(validBody())).toEqual(validBody());
  });

  it('aceita a lista vazia', () => {
    expect(parseServicesResponse({ services: [], period: 'x' })).toEqual({ services: [], period: 'x' });
  });

  it('recusa a resposta inteira quando um item vem sem id', () => {
    const error = rejection(withSecondService({ id: undefined }));
    expect(error.message).toBe('O servidor respondeu num formato inesperado (services[1].id). Avise a equipe do backend.');
  });

  it('recusa cpuPercent em texto', () => {
    expect(rejection(withSecondService({ cpuPercent: '62.67' })).message).toContain('(services[1].cpuPercent)');
  });

  it.each([
    ['id vazio', { id: '' }, 'services[1].id'],
    ['id numérico', { id: 2 }, 'services[1].id'],
    ['nome ausente', { name: undefined }, 'services[1].name'],
    ['país ausente (null precisa vir na resposta)', { country: undefined }, 'services[1].country'],
    ['energia negativa', { energyKwh: -1 }, 'services[1].energyKwh'],
    ['emissão infinita', { emissionsG: Number.POSITIVE_INFINITY }, 'services[1].emissionsG'],
    ['status fora da lista', { status: 'pausado' }, 'services[1].status'],
    ['horário que não é data', { lastReadingAt: 'ontem' }, 'services[1].lastReadingAt'],
  ])('recusa %s', (_case, changes, field) => {
    expect(rejection(withSecondService(changes)).message).toContain(`(${field})`);
  });

  it.each([
    ['corpo null', null, 'resposta'],
    ['corpo em lista', [], 'resposta'],
    ['services ausente', { period: 'x' }, 'services'],
    ['item que não é objeto', { services: ['1'], period: 'x' }, 'services[0]'],
    ['period ausente', { services: [] }, 'period'],
  ])('recusa %s', (_case, body, field) => {
    expect(rejection(body).message).toContain(`(${field})`);
  });
});
