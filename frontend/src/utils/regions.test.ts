import { describe, expect, it } from 'vitest';
import type { Region, RegionSummary } from '../services/regions.types';
import { bubbleRadius, cleanestRegion, estimateMigration, joinRegions, sortByCleanest, worstStatus } from './regions';

/** Retrato da Carbon API de docs/calculos.md § Intensidade de carbono por região (11/11/2026). */
function region(code: string, intensity: number | null, renewable: number | null, monitoredServices: number): Region {
  return {
    code,
    country: 'País',
    region: 'Região',
    city: 'Cidade',
    latitude: 10,
    longitude: 20,
    carbonIntensityGco2ePerKwh: intensity,
    renewableSharePercent: renewable,
    monitoredServices,
  };
}

const REGIONS: Region[] = [
  region('us-east', 378, 26, 2),
  region('eu-west', 295, 38, 1),
  region('jp-east', 465, 22, 1),
  region('br-sudeste', 85, 83, 1),
  region('ca-central', 40, 89, 0),
];

function summary(code: string | null, co2eGrams: number | null, services: RegionSummary['services']): RegionSummary {
  return {
    code,
    energyKwh: co2eGrams === null ? null : co2eGrams / 378,
    co2eGrams,
    collections: 2880,
    failed: services.indisponivel > 0 ? 1 : 0,
    notCalculated: 0,
    services,
    worstStatus: null,
  };
}

describe('estimateMigration', () => {
  it('1 kWh emitido a 378 g/kWh com destino a 40 g/kWh: grams = 40, savedGrams = 338 e savedPercent ≈ 89,4', () => {
    const estimate = estimateMigration(1, 378, 40);
    expect(estimate?.grams).toBe(40);
    expect(estimate?.savedGrams).toBe(338);
    expect(estimate?.savedPercent).toBeCloseTo(89.418, 3);
  });

  it('energia null: o resultado é null', () => {
    expect(estimateMigration(null, 378, 40)).toBeNull();
  });

  it('CO₂e de origem ou intensidade do destino desconhecidos: null, nunca 0 inventado', () => {
    expect(estimateMigration(1, null, 40)).toBeNull();
    expect(estimateMigration(1, 378, null)).toBeNull();
  });

  it('reproduz o exemplo de docs/calculos.md: us-east com 0,050 kWh e 18,90 g', () => {
    const cases: Array<[number, number, number, number]> = [
      // destino, CO₂e simulado, redução em g, redução em %
      [40, 2, 16.9, 89.42],
      [85, 4.25, 14.65, 77.51],
      [465, 23.25, -4.35, -23.02],
    ];
    for (const [target, grams, savedGrams, savedPercent] of cases) {
      const estimate = estimateMigration(0.05, 18.9, target);
      expect(estimate?.grams).toBeCloseTo(grams, 9);
      expect(estimate?.savedGrams).toBeCloseTo(savedGrams, 9);
      expect(estimate?.savedPercent).toBeCloseTo(savedPercent, 2);
    }
  });

  it('destino mais sujo: savedGrams e savedPercent negativos (é um aumento)', () => {
    const estimate = estimateMigration(1, 85, 378);
    expect(estimate?.savedGrams).toBe(-293);
    expect(estimate?.savedPercent).toBeLessThan(0);
  });

  it('CO₂e de origem 0: redução em gramas e percentual null (não calculável)', () => {
    expect(estimateMigration(0, 0, 40)).toEqual({ grams: 0, savedGrams: 0, savedPercent: null });
  });
});

describe('worstStatus', () => {
  it('região com serviços ativo e indisponivel: indisponivel', () => {
    expect(worstStatus({ ativo: 2, indisponivel: 1, sem_metricas: 0 })).toBe('indisponivel');
  });

  it('sem_metricas ganha de ativo', () => {
    expect(worstStatus({ ativo: 3, indisponivel: 0, sem_metricas: 1 })).toBe('sem_metricas');
  });

  it('removido não entra: região só com removidos não tem estado', () => {
    expect(worstStatus({ ativo: 0, indisponivel: 0, sem_metricas: 0, removido: 2 })).toBeNull();
    expect(worstStatus({ ativo: 1, removido: 4 })).toBe('ativo');
  });
});

describe('cleanestRegion', () => {
  it('a região mais limpa sem serviço monitorado é escolhida mesmo assim', () => {
    const cleanest = cleanestRegion(REGIONS, 'us-east');
    expect(cleanest?.code).toBe('ca-central');
    expect(cleanest?.monitoredServices).toBe(0);
  });

  it('excludeCode tira a região de origem: quem já está na mais limpa recebe a segunda', () => {
    expect(cleanestRegion(REGIONS, 'ca-central')?.code).toBe('br-sudeste');
  });

  it('empate de intensidade: desempata por code em ordem alfabética', () => {
    const tied = [region('zz-norte', 40, 99, 0), ...REGIONS];
    expect(cleanestRegion(tied)?.code).toBe('ca-central');
  });

  it('região sem intensidade não é destino; sem nenhuma com intensidade, null', () => {
    const unknown = [region('aa-sem-fator', null, null, 0), region('us-east', 378, 26, 2)];
    expect(cleanestRegion(unknown)?.code).toBe('us-east');
    expect(cleanestRegion(unknown, 'us-east')).toBeNull();
  });
});

describe('sortByCleanest', () => {
  it('segue a ordem da tabela de docs/calculos.md e deixa quem não tem intensidade no fim', () => {
    const sorted = sortByCleanest([region('aa-sem-fator', null, null, 0), ...REGIONS]);
    expect(sorted.map((item) => item.code)).toEqual(['ca-central', 'br-sudeste', 'eu-west', 'us-east', 'jp-east', 'aa-sem-fator']);
  });

  it('não altera a lista recebida', () => {
    const copy = [...REGIONS];
    sortByCleanest(REGIONS);
    expect(REGIONS).toEqual(copy);
  });
});

describe('joinRegions', () => {
  const totals: RegionSummary[] = [
    summary('us-east', 44.6, { ativo: 1, indisponivel: 1, sem_metricas: 0 }),
    summary('br-sudeste', null, { ativo: 0, indisponivel: 0, sem_metricas: 1 }),
    summary('sa-leste', 3.2, { ativo: 1, indisponivel: 0, sem_metricas: 0 }),
    summary(null, 1.5, { ativo: 1, indisponivel: 0, sem_metricas: 0 }),
  ];
  const { regions, unlisted } = joinRegions(REGIONS, totals);

  it('junta as duas rotas por code, com coordenadas, rede, totais, estados e pior estado', () => {
    const usEast = regions.find((item) => item.code === 'us-east');
    expect(usEast).toMatchObject({
      latitude: 10,
      longitude: 20,
      carbonIntensityGco2ePerKwh: 378,
      renewableSharePercent: 26,
      co2eGrams: 44.6,
      services: { ativo: 1, indisponivel: 1, sem_metricas: 0 },
      worstStatus: 'indisponivel',
    });
    expect(usEast?.energyKwh).toBeCloseTo(44.6 / 378, 9);
  });

  it('devolve todas as regiões da Carbon API, na ordem da API, inclusive as sem serviço', () => {
    expect(regions.map((item) => item.code)).toEqual(['us-east', 'eu-west', 'jp-east', 'br-sudeste', 'ca-central']);
    expect(regions.find((item) => item.code === 'ca-central')).toMatchObject({
      energyKwh: null,
      co2eGrams: null,
      services: { ativo: 0, indisponivel: 0, sem_metricas: 0 },
      worstStatus: null,
    });
  });

  it('região sem cálculo no período mantém null nos totais e o estado das contagens', () => {
    expect(regions.find((item) => item.code === 'br-sudeste')).toMatchObject({ co2eGrams: null, worstStatus: 'sem_metricas' });
  });

  it('serviços sem região e regiões fora da Carbon API vão para unlisted, sem sumir do total', () => {
    expect(unlisted.map((item) => item.code)).toEqual(['sa-leste', null]);
  });
});

describe('bubbleRadius', () => {
  it('área proporcional ao valor: um quarto do máximo dá metade do raio', () => {
    expect(bubbleRadius(25, 100)).toBe(0.5);
    expect(bubbleRadius(100, 100)).toBe(1);
  });

  it('valor acima do máximo fica em 1; valor 0 ou máximo 0 dão 0', () => {
    expect(bubbleRadius(150, 100)).toBe(1);
    expect(bubbleRadius(0, 100)).toBe(0);
    expect(bubbleRadius(10, 0)).toBe(0);
  });

  it('valor desconhecido dá null, nunca uma bolha de tamanho inventado', () => {
    expect(bubbleRadius(null, 100)).toBeNull();
  });
});
