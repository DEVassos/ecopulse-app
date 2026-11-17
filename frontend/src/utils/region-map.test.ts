import { describe, expect, it } from 'vitest';
import type { Region, RegionsResponse, RegionsSummaryResponse, RegionSummary } from '../services/regions.types';
import { MIN_BUBBLE, bubbleDiameter, buildRegionOverview, ringPercent, serviceCount } from './region-map';

function region(code: string, overrides: Partial<Region> = {}): Region {
  return { code, country: 'Estados Unidos', region: 'Virgínia', city: 'Ashburn', latitude: 39.04, longitude: -77.49, carbonIntensityGco2ePerKwh: 377, renewableSharePercent: 22, monitoredServices: 1, ...overrides };
}

function totals(code: string | null, overrides: Partial<RegionSummary> = {}): RegionSummary {
  return { code, energyKwh: 1, co2eGrams: 100, collections: 2880, failed: 0, notCalculated: 0, services: { ativo: 1, indisponivel: 0, sem_metricas: 0 }, worstStatus: 'ativo', ...overrides };
}

const list = (...regions: Region[]): RegionsResponse => ({ regions, source: 'api', fetchedAt: '2026-11-13T13:00:00.000Z' });
const summary = (...regions: RegionSummary[]): RegionsSummaryResponse => ({ from: '2026-11-12T13:00:00.000Z', to: '2026-11-13T13:00:00.000Z', regions });

describe('buildRegionOverview', () => {
  it('nomeia pela cidade e põe região e país na linha de apoio', () => {
    const { monitored } = buildRegionOverview(list(region('us-east')), summary(totals('us-east')));
    expect(monitored[0]).toMatchObject({ code: 'us-east', name: 'Ashburn', place: 'Virgínia, Estados Unidos', worstStatus: 'ativo' });
  });

  it('nomeia pela região quando a cidade não vem, sem repetir o nome no lugar', () => {
    const { monitored } = buildRegionOverview(list(region('br-sudeste', { city: null, region: 'Sudeste', country: 'Brasil' })), summary(totals('br-sudeste')));
    expect(monitored[0]).toMatchObject({ name: 'Sudeste', place: 'Brasil' });
  });

  it('ordena da maior para a menor emissão, com as sem cálculo depois e o nome no empate', () => {
    const { monitored } = buildRegionOverview(
      list(region('a', { city: 'A' }), region('b', { city: 'B' }), region('c', { city: 'C' }), region('d', { city: 'D' })),
      summary(totals('a', { co2eGrams: 10 }), totals('b', { co2eGrams: null, energyKwh: null }), totals('c', { co2eGrams: 50 }), totals('d', { co2eGrams: 10 })),
    );
    expect(monitored.map((item) => item.code)).toEqual(['c', 'a', 'd', 'b']);
  });

  it('separa as regiões sem serviço hoje, por nome, sem números do período', () => {
    const { monitored, idle } = buildRegionOverview(
      list(region('se', { city: 'Estocolmo', monitoredServices: 0 }), region('us-east'), region('ca', { city: 'Montreal', monitoredServices: 0 })),
      summary(totals('us-east')),
    );
    expect(monitored.map((item) => item.code)).toEqual(['us-east']);
    expect(idle.map((item) => item.name)).toEqual(['Estocolmo', 'Montreal']);
    expect(idle[0]).toMatchObject({ worstStatus: null, co2eGrams: null, services: { ativo: 0, indisponivel: 0, sem_metricas: 0 } });
  });

  it('mantém entre as monitoradas a região só com removidos que ainda tem CO₂e, para a soma bater', () => {
    const { monitored } = buildRegionOverview(
      list(region('us-east')),
      summary(totals('us-east', { co2eGrams: 30, services: { ativo: 0, indisponivel: 0, sem_metricas: 0 }, worstStatus: null })),
    );
    expect(monitored.map((item) => [item.code, item.worstStatus, item.co2eGrams])).toEqual([['us-east', null, 30]]);
  });

  it('conta fora do mapa os serviços sem região, os de região desconhecida e os de região sem coordenada', () => {
    const overview = buildRegionOverview(
      list(region('us-east'), region('sem-gps', { latitude: null, longitude: null })),
      summary(
        totals('us-east'),
        totals('sem-gps', { services: { ativo: 2, indisponivel: 0, sem_metricas: 0 } }),
        totals(null, { co2eGrams: null, services: { ativo: 0, indisponivel: 0, sem_metricas: 1 }, worstStatus: 'sem_metricas' }),
        totals('desconhecida', { co2eGrams: 7 }),
      ),
    );
    expect(overview.monitored.map((item) => item.code)).toEqual(['us-east', 'sem-gps']);
    expect(overview.outside).toEqual({ services: 2, co2eGrams: 7 });
    expect(overview.unplacedServices).toBe(4);
  });

  it('deixa o CO₂e de fora null quando nenhum serviço de fora tem cálculo', () => {
    const { outside } = buildRegionOverview(list(), summary(totals(null, { co2eGrams: null })));
    expect(outside).toEqual({ services: 1, co2eGrams: null });
  });
});

describe('serviceCount', () => {
  it('soma os três estados', () => {
    expect(serviceCount({ ativo: 2, indisponivel: 1, sem_metricas: 3 })).toBe(6);
  });
});

describe('cálculos visuais do mapa', () => {
  it('faz a área, e não o diâmetro, crescer com o CO₂e', () => {
    expect(bubbleDiameter(100, 100)).toBe(88);
    expect(bubbleDiameter(25, 100)).toBe(58);
    expect(bubbleDiameter(0, 100)).toBe(28);
    expect(bubbleDiameter(null, 100)).toBe(MIN_BUBBLE);
  });

  it('preenche o anel pela energia diante da região que mais consumiu, com mínimo de 4%', () => {
    expect(ringPercent(1, 2)).toBe(50);
    expect(ringPercent(0.001, 2)).toBe(4);
    expect(ringPercent(null, 2)).toBeNull();
    expect(ringPercent(1, 0)).toBeNull();
  });
});
