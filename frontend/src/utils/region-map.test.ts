import { describe, expect, it } from 'vitest';
import type { Region, RegionsResponse, RegionsSummaryResponse, RegionSummary } from '../services/regions.types';
import { MIN_BUBBLE, bubbleDiameter, formatCoordinates, joinRegions, ringPercent } from './region-map';

function region(code: string, overrides: Partial<Region> = {}): Region {
  return { code, country: 'Estados Unidos', region: 'Virgínia', city: 'Ashburn', latitude: 39.04, longitude: -77.49, carbonIntensityGco2ePerKwh: 377, renewableSharePercent: 22, monitoredServices: 1, ...overrides };
}

function totals(code: string | null, overrides: Partial<RegionSummary> = {}): RegionSummary {
  return { code, energyKwh: 1, co2eGrams: 100, collections: 2880, failed: 0, notCalculated: 0, services: { ativo: 1, indisponivel: 0, sem_metricas: 0 }, worstStatus: 'ativo', ...overrides };
}

function list(...regions: Region[]): RegionsResponse {
  return { regions, source: 'api', fetchedAt: '2026-11-12T13:00:00.000Z' };
}

function summary(...regions: RegionSummary[]): RegionsSummaryResponse {
  return { from: '2026-11-11T13:00:00.000Z', to: '2026-11-12T13:00:00.000Z', regions };
}

describe('joinRegions (provisório até a #321)', () => {
  it('junta posição, rede, totais e pior estado pelo código da região', () => {
    const { regions } = joinRegions(
      list(region('us-east')),
      summary(totals('us-east', { co2eGrams: 44.6, services: { ativo: 1, indisponivel: 1, sem_metricas: 0 }, worstStatus: 'indisponivel' })),
    );
    expect(regions[0]).toMatchObject({ code: 'us-east', name: 'Ashburn', place: 'Virgínia, Estados Unidos', carbonIntensity: 377, co2eGrams: 44.6, state: 'indisponivel' });
  });

  it('marca a região sem serviço com estado null e a deixa no fim, como destino possível', () => {
    const { regions } = joinRegions(list(region('eu-north', { city: 'Estocolmo', monitoredServices: 0 }), region('us-east')), summary(totals('us-east')));
    expect(regions.map((item) => [item.code, item.state])).toEqual([['us-east', 'ativo'], ['eu-north', null]]);
    expect(regions[1].co2eGrams).toBeNull();
  });

  it('ordena da maior para a menor emissão, com as sem cálculo depois das calculadas', () => {
    const { regions } = joinRegions(
      list(region('a', { city: 'A' }), region('b', { city: 'B' }), region('c', { city: 'C' })),
      summary(totals('a', { co2eGrams: 10 }), totals('b', { co2eGrams: null, energyKwh: null }), totals('c', { co2eGrams: 50 })),
    );
    expect(regions.map((item) => item.code)).toEqual(['c', 'a', 'b']);
  });

  it('conta fora do mapa os serviços sem região e os de região sem coordenada', () => {
    const { regions, unplacedServices } = joinRegions(
      list(region('us-east'), region('sem-gps', { latitude: null, longitude: null })),
      summary(totals('us-east'), totals('sem-gps', { services: { ativo: 2, indisponivel: 0, sem_metricas: 0 } }), totals(null, { services: { ativo: 0, indisponivel: 0, sem_metricas: 1 }, worstStatus: 'sem_metricas' })),
    );
    expect(regions.map((item) => item.code)).toEqual(['us-east']);
    expect(unplacedServices).toBe(3);
  });

  it('nomeia pela região quando a cidade não vem', () => {
    const { regions } = joinRegions(list(region('br-sudeste', { city: null, region: 'Sudeste', country: 'Brasil' })), summary(totals('br-sudeste')));
    expect(regions[0]).toMatchObject({ name: 'Sudeste', place: 'Brasil' });
  });
});

describe('cálculos visuais', () => {
  it('faz a área, e não o diâmetro, crescer com o CO₂e', () => {
    expect(bubbleDiameter(100, 100)).toBe(88);
    expect(bubbleDiameter(25, 100)).toBe(58);
    expect(bubbleDiameter(null, 100)).toBe(MIN_BUBBLE);
  });

  it('preenche o anel pela energia diante da região que mais consumiu, com mínimo de 4%', () => {
    expect(ringPercent(1, 2)).toBe(50);
    expect(ringPercent(0.001, 2)).toBe(4);
    expect(ringPercent(null, 2)).toBeNull();
    expect(ringPercent(1, 0)).toBeNull();
  });

  it('escreve os hemisférios em português, com duas casas', () => {
    expect(formatCoordinates(39.04, -77.49)).toBe('39,04° N, 77,49° O');
    expect(formatCoordinates(-23.55, 139.69)).toBe('23,55° S, 139,69° L');
  });
});
