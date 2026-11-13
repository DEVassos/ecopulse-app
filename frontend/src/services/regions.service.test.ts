import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { parseRegionsResponse, parseRegionsSummaryResponse, worstOf } from './regions.service';

// Corpos como nos contratos da #319 e da #320.
function regionsBody() {
  return {
    regions: [
      { code: 'us-east', country: 'United States', region: 'Virginia', city: 'Ashburn', latitude: 39.04, longitude: -77.49, carbonIntensityGco2ePerKwh: 378, renewableSharePercent: 22, monitoredServices: 2 },
      { code: 'eu-north', country: 'Sweden', region: 'Stockholm', city: null, latitude: null, longitude: null, carbonIntensityGco2ePerKwh: null, renewableSharePercent: null, monitoredServices: 0 },
    ],
    source: 'api',
    fetchedAt: '2026-11-12T13:00:00.000Z',
  };
}

function summaryBody() {
  return {
    from: '2026-11-11T13:00:00.000Z',
    to: '2026-11-12T13:00:00.000Z',
    regions: [
      { code: 'us-east', energyKwh: 0.118, co2eGrams: 44.6, collections: 2880, failed: 0, notCalculated: 0, services: { ativo: 2, indisponivel: 0, sem_metricas: 0 }, worstStatus: 'ativo' },
      { code: null, energyKwh: null, co2eGrams: null, collections: 0, failed: 0, notCalculated: 0, services: { ativo: 0, indisponivel: 0, sem_metricas: 1 }, worstStatus: 'sem_metricas' },
    ],
  };
}

function withFirstRegion(changes: Record<string, unknown>) {
  const body = regionsBody();
  return { ...body, regions: [{ ...body.regions[0], ...changes }, body.regions[1]] };
}

function withFirstSummary(changes: Record<string, unknown>) {
  const body = summaryBody();
  return { ...body, regions: [{ ...body.regions[0], ...changes }, body.regions[1]] };
}

function rejection(parse: () => unknown): string {
  try {
    parse();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return (error as ApiError).message;
  }
  throw new Error('a resposta deveria ser recusada');
}

describe('parseRegionsResponse', () => {
  it('aceita o contrato, inclusive região sem coordenada e sem intensidade', () => {
    const response = parseRegionsResponse(regionsBody());
    expect(response.source).toBe('api');
    expect(response.regions[0]).toMatchObject({ code: 'us-east', latitude: 39.04, longitude: -77.49, monitoredServices: 2 });
    expect(response.regions[1]).toMatchObject({ latitude: null, carbonIntensityGco2ePerKwh: null, monitoredServices: 0 });
  });

  it('aceita a lista guardada em cache quando a Carbon API falhou', () => {
    expect(parseRegionsResponse({ ...regionsBody(), source: 'cache' }).source).toBe('cache');
  });

  it.each([
    ['latitude fora de [-90, 90]', { latitude: 91 }, 'regions[0].latitude'],
    ['longitude em texto', { longitude: '-77.49' }, 'regions[0].longitude'],
    ['só uma das coordenadas', { longitude: null }, 'regions[0].longitude'],
    ['% renovável acima de 100', { renewableSharePercent: 120 }, 'regions[0].renewableSharePercent'],
    ['intensidade negativa', { carbonIntensityGco2ePerKwh: -1 }, 'regions[0].carbonIntensityGco2ePerKwh'],
    ['código vazio', { code: '' }, 'regions[0].code'],
    ['contagem decimal', { monitoredServices: 1.5 }, 'regions[0].monitoredServices'],
  ])('recusa a lista inteira com %s', (_, changes, field) => {
    expect(rejection(() => parseRegionsResponse(withFirstRegion(changes)))).toContain(field);
  });

  it('recusa source fora de api|cache', () => {
    expect(rejection(() => parseRegionsResponse({ ...regionsBody(), source: 'banco' }))).toContain('source');
  });
});

describe('parseRegionsSummaryResponse', () => {
  it('aceita o contrato, com os serviços sem região em code null', () => {
    const response = parseRegionsSummaryResponse(summaryBody());
    expect(response.regions[0]).toMatchObject({ code: 'us-east', co2eGrams: 44.6, worstStatus: 'ativo' });
    expect(response.regions[1]).toMatchObject({ code: null, co2eGrams: null, worstStatus: 'sem_metricas' });
  });

  it('recusa um pior estado que não bate com as contagens', () => {
    const body = withFirstSummary({ services: { ativo: 1, indisponivel: 1, sem_metricas: 0 }, worstStatus: 'ativo' });
    expect(rejection(() => parseRegionsSummaryResponse(body))).toContain('regions[0].worstStatus');
  });

  it.each([
    ['CO₂e em texto', { co2eGrams: '44.6' }, 'regions[0].co2eGrams'],
    ['contagem de estado ausente', { services: { ativo: 2, indisponivel: 0 } }, 'regions[0].services.sem_metricas'],
    ['estado fora da lista', { worstStatus: 'removido' }, 'regions[0].worstStatus'],
  ])('recusa a resposta inteira com %s', (_, changes, field) => {
    expect(rejection(() => parseRegionsSummaryResponse(withFirstSummary(changes)))).toContain(field);
  });
});

describe('worstOf', () => {
  it('segue a ordem indisponivel > sem_metricas > ativo, e null sem serviço', () => {
    expect(worstOf({ ativo: 3, indisponivel: 1, sem_metricas: 1 })).toBe('indisponivel');
    expect(worstOf({ ativo: 3, indisponivel: 0, sem_metricas: 1 })).toBe('sem_metricas');
    expect(worstOf({ ativo: 3, indisponivel: 0, sem_metricas: 0 })).toBe('ativo');
    expect(worstOf({ ativo: 0, indisponivel: 0, sem_metricas: 0 })).toBeNull();
  });
});
