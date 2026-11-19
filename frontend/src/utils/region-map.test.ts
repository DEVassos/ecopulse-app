import { describe, expect, it } from 'vitest';
import type { Region, RegionsResponse, RegionsSummaryResponse, RegionSummary } from '../services/regions.types';
import {
  MIN_BUBBLE,
  MIN_SCALE,
  bubbleDiameter,
  buildRegionOverview,
  cameraTarget,
  co2eScaleMax,
  fitZoom,
  formatMigrationPercent,
  intensityTime,
  mapDestination,
  mapScale,
  migrationMath,
  ringPercent,
  serviceCount,
} from './region-map';

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

describe('fitZoom e mapScale (mapa no celular, RNF01)', () => {
  it('mantém o zoom base e o tamanho das bolhas num mapa de 460 px ou maior', () => {
    expect(fitZoom(1.7, 825, 460)).toBe(1.7);
    expect(fitZoom(1.7, 1200, 900)).toBe(1.7);
    expect(mapScale(825, 460)).toBe(1);
  });

  it('afasta um nível quando o lado menor cai pela metade, e as bolhas encolhem na mesma proporção', () => {
    expect(fitZoom(1.7, 358, 230)).toBeCloseTo(0.7);
    expect(mapScale(400, 345)).toBeCloseTo(0.75);
  });

  it('não deixa as bolhas menores que MIN_SCALE, e ignora um mapa ainda sem tamanho', () => {
    expect(mapScale(200, 150)).toBe(MIN_SCALE);
    expect(fitZoom(1.7, 0, 0)).toBe(1.7);
    expect(mapScale(0, 300)).toBe(1);
  });

  it('bubbleDiameter aplica a escala sem passar de MIN_BUBBLE para baixo', () => {
    expect(bubbleDiameter(10, 10, 0.5)).toBe(44);
    expect(bubbleDiameter(0, 10, 0.6)).toBe(MIN_BUBBLE);
    expect(bubbleDiameter(null, 10, 0.6)).toBe(MIN_BUBBLE);
  });
});

describe('simulação de migração na tela (#326)', () => {
  it('buildRegionOverview guarda a hora das intensidades', () => {
    expect(buildRegionOverview(list(region('us-east')), summary(totals('us-east'))).fetchedAt).toBe('2026-11-13T13:00:00.000Z');
  });

  it('intensityTime: hora curta sempre; aviso só com mais de 1 h (cache é o estado normal)', () => {
    const fetchedAt = new Date(2026, 10, 19, 14, 5).toISOString();
    expect(intensityTime(fetchedAt, new Date(2026, 10, 19, 14, 50))).toEqual({ time: '14:05', stale: false });
    expect(intensityTime(fetchedAt, new Date(2026, 10, 19, 15, 5))).toEqual({ time: '14:05', stale: false });
    expect(intensityTime(fetchedAt, new Date(2026, 10, 19, 15, 6))).toEqual({ time: '14:05', stale: true });
  });

  it('percentual com 2 casas, como no docs/calculos.md', () => {
    expect(formatMigrationPercent((100 * 39.88) / 44.6)).toBe('89,42%');
    expect(formatMigrationPercent(23.015873)).toBe('23,02%');
  });

  it('linha da conta em kWh e g/kWh (critério 1: 0,118 kWh × 40 g/kWh = 4,72 g)', () => {
    expect(migrationMath(0.118, 40, 0.118 * 40)).toBe('0,118 kWh × 40 g/kWh = 4,72 g');
    expect(migrationMath(0.00123456, 465, 0.00123456 * 465)).toBe('0,001235 kWh × 465 g/kWh = 0,5741 g');
  });
});

describe('destino simulado no mapa (#326)', () => {
  const overview = buildRegionOverview(
    list(region('us-east'), region('ca-central', { city: 'Montreal', carbonIntensityGco2ePerKwh: 40, monitoredServices: 0 }), region('sa-east', { carbonIntensityGco2ePerKwh: null, monitoredServices: 0 })),
    summary(totals('us-east', { energyKwh: 0.118, co2eGrams: 44.6 })),
  );

  it('mapDestination: o CO₂e simulado é a conta do painel (0,118 kWh × 40 g/kWh = 4,72 g)', () => {
    const destination = mapDestination(overview, 'us-east', 'ca-central');
    expect(destination?.code).toBe('ca-central');
    expect(destination?.co2eGrams).toBeCloseTo(4.72, 10);
  });

  it('mapDestination: sem origem com serviço, sem destino ou destino igual à origem, nada; sem intensidade, sem tamanho', () => {
    expect(mapDestination(overview, null, 'ca-central')).toBeNull();
    expect(mapDestination(overview, 'us-east', null)).toBeNull();
    expect(mapDestination(overview, 'us-east', 'us-east')).toBeNull();
    expect(mapDestination(overview, 'ca-central', 'us-east')).toBeNull();
    expect(mapDestination(overview, 'us-east', 'xx-none')).toBeNull();
    expect(mapDestination(overview, 'us-east', 'sa-east')).toEqual({ code: 'sa-east', co2eGrams: null });
  });

  it('co2eScaleMax: destino mais sujo que a maior região amplia a escala, e o marcador fica maior que a origem', () => {
    expect(co2eScaleMax(overview.monitored, null)).toBe(44.6);
    expect(co2eScaleMax(overview.monitored, { code: 'ca-central', co2eGrams: 4.72 })).toBe(44.6);
    expect(co2eScaleMax(overview.monitored, { code: 'sa-east', co2eGrams: null })).toBe(44.6);
    // Antes, 311 g simulados e 253 g da origem saíam os dois com o diâmetro máximo (o raio para em 1)
    const max = co2eScaleMax(overview.monitored, { code: 'jp-east', co2eGrams: 57.2 });
    expect(max).toBe(57.2);
    expect(bubbleDiameter(57.2, max)).toBeGreaterThan(bubbleDiameter(44.6, max));
  });

  it('cameraTarget: o destino com coordenada manda na câmera; sem ele, a seleção', () => {
    const placed = new Set(['us-east', 'ca-central']);
    expect(cameraTarget('us-east', { code: 'ca-central', co2eGrams: 4.72 }, placed)).toBe('ca-central');
    expect(cameraTarget('us-east', null, placed)).toBe('us-east');
    expect(cameraTarget('us-east', { code: 'sem-gps', co2eGrams: 1 }, placed)).toBe('us-east');
    expect(cameraTarget(null, null, placed)).toBeNull();
  });
});
