import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { parseCollectionsPage, parseSeriesResponse } from './emissions.service';

// Intervalo de GET /api/collections/series no formato da #189 (docs/api.md)
function bucket(start: string, co2eGrams: number | null): Record<string, unknown> {
  return {
    start,
    collections: 30,
    failed: 0,
    notCalculated: co2eGrams === null ? 30 : 0,
    energyKwh: co2eGrams === null ? null : 0.01,
    co2eGrams,
    co2eMinGrams: co2eGrams,
    co2eMaxGrams: co2eGrams,
  };
}

function seriesBody() {
  return {
    buckets: [bucket('2026-10-14T20:15:00.000Z', 0.9), bucket('2026-10-14T20:00:00.000Z', 0.8)],
    totals: { collections: 60, failed: 0, notCalculated: 0, energyKwh: 0.02, co2eGrams: 1.7, co2eMaxGrams: 0.9, carbonIntensityGco2ePerKwh: 85 },
  };
}

// Coleta de GET /api/collections como em docs/api.md
function collection(collectedAt: string, extra: Record<string, unknown> = {}) {
  return {
    id: collectedAt,
    serviceId: '1',
    collectedAt,
    status: 'ok',
    calculationStatus: 'disponivel',
    energyKwh: 0.00048,
    co2eGrams: 0.0408,
    carbonIntensityGco2ePerKwh: 85,
    ...extra,
  };
}

function rejected(parse: () => unknown): boolean {
  try {
    parse();
  } catch (error) {
    if (error instanceof ApiError) return true;
    throw error;
  }
  return false;
}

describe('parseSeriesResponse', () => {
  it('devolve os intervalos em ordem cronológica, com os totais', () => {
    const series = parseSeriesResponse(seriesBody(), '15min');
    expect(series.points.map((point) => point.co2eGrams)).toEqual([0.8, 0.9]);
    expect(series.totals).toMatchObject({ collections: 60, co2eGrams: 1.7, carbonIntensity: 85 });
    expect(series.discarded).toBe(0);
  });

  it('descarta e conta o intervalo fora do formato, sem derrubar o gráfico', () => {
    const body = seriesBody();
    body.buckets.push({ ...bucket('2026-10-14T20:30:00.000Z', 1), co2eGrams: '1' });
    const series = parseSeriesResponse(body, '15min');
    expect(series.points).toHaveLength(2);
    expect(series.discarded).toBe(1);
  });

  it.each([
    ['corpo null', null],
    ['buckets ausente', { totals: seriesBody().totals }],
    ['totals ausente', { buckets: [] }],
    ['totals com contagem em texto', { ...seriesBody(), totals: { ...seriesBody().totals, collections: '60' } }],
  ])('recusa o envelope inválido: %s', (_case, body) => {
    expect(rejected(() => parseSeriesResponse(body, '1h'))).toBe(true);
  });
});

describe('parseCollectionsPage', () => {
  it('confere cada coleta e guarda a intensidade só das calculadas', () => {
    const page = parseCollectionsPage({
      collections: [
        collection('2026-10-14T20:00:30.000Z'),
        collection('2026-10-14T20:00:00.000Z', {
          status: 'erro',
          calculationStatus: 'nao_calculado',
          energyKwh: null,
          co2eGrams: null,
          carbonIntensityGco2ePerKwh: null,
        }),
      ],
    });
    expect(page.received).toBe(2);
    expect(page.discarded).toBe(0);
    expect(page.collections.map((item) => item.intensity)).toEqual([85, null]);
    expect(page.collections[1].point.failed).toBe(1);
  });

  it('descarta e conta a coleta fora do formato; `received` conta todas, porque decide a paginação', () => {
    const page = parseCollectionsPage({
      collections: [
        collection('2026-10-14T20:01:00.000Z'),
        collection('ontem'),
        collection('2026-10-14T20:00:30.000Z', { status: 'pausado' }),
        collection('2026-10-14T20:00:00.000Z', { co2eGrams: -1 }),
      ],
    });
    expect(page.collections).toHaveLength(1);
    expect(page.discarded).toBe(3);
    expect(page.received).toBe(4);
  });

  it.each([
    ['corpo null', null],
    ['collections ausente', { period: {} }],
    ['collections que não é lista', { collections: {} }],
  ])('recusa o envelope inválido: %s', (_case, body) => {
    expect(rejected(() => parseCollectionsPage(body))).toBe(true);
  });
});
