import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { parseRankingResponse } from './ranking.service';

// Corpo de GET /api/services/ranking como no contrato da #50: dois serviços com cálculo e um sem.
function validBody() {
  return {
    metric: 'co2e',
    from: '2026-11-02T03:00:00.000Z',
    to: '2026-11-03T03:00:00.000Z',
    services: [
      { position: 1, id: '3', name: 'Fraud Detector', region: 'us-east', status: 'ativo', energyKwh: 1.712, co2eGrams: 645.4, collections: 2880, failed: 0, notCalculated: 0 },
      { position: 2, id: '1', name: 'Audit Stream', region: 'jp-east', status: 'ativo', energyKwh: 1.279, co2eGrams: 594.7, collections: 2880, failed: 12, notCalculated: 12 },
      { position: null, id: '7', name: 'Inventory Sync', region: null, status: 'sem_metricas', energyKwh: null, co2eGrams: null, collections: 2880, failed: 0, notCalculated: 2880 },
    ],
  };
}

/** Corpo válido com o primeiro serviço alterado. */
function withFirst(changes: Record<string, unknown>) {
  const body = validBody();
  return { ...body, services: [{ ...body.services[0], ...changes }, ...body.services.slice(1)] };
}

function rejection(body: unknown): string {
  try {
    parseRankingResponse(body);
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return (error as ApiError).message;
  }
  throw new Error('a resposta deveria ser recusada');
}

describe('parseRankingResponse', () => {
  it('aceita a resposta do contrato, com a métrica null no fim', () => {
    const ranking = parseRankingResponse(validBody());
    expect(ranking.metric).toBe('co2e');
    expect(ranking.services.map((service) => service.position)).toEqual([1, 2, null]);
    expect(ranking.services[2].co2eGrams).toBeNull();
  });

  it('recusa o CO₂e em texto, dizendo o campo', () => {
    expect(rejection(withFirst({ co2eGrams: '645.4' }))).toContain('services[0].co2eGrams');
  });

  it('recusa posição zero ou fracionada', () => {
    expect(rejection(withFirst({ position: 0 }))).toContain('services[0].position');
    expect(rejection(withFirst({ position: 1.5 }))).toContain('services[0].position');
  });

  it('recusa serviço sem id, estado desconhecido e contagem negativa', () => {
    expect(rejection(withFirst({ id: undefined }))).toContain('services[0].id');
    expect(rejection(withFirst({ status: 'pausado' }))).toContain('services[0].status');
    expect(rejection(withFirst({ failed: -1 }))).toContain('services[0].failed');
  });

  it('recusa métrica fora de energy/co2e e período sem data', () => {
    expect(rejection({ ...validBody(), metric: 'cpu' })).toContain('metric');
    expect(rejection({ ...validBody(), from: 'ontem' })).toContain('from');
  });
});
