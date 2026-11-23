import { describe, expect, it } from 'vitest';
import type { Region, RegionSummary } from '../services/regions.types';
import {
  bubbleRadius,
  cleanestRegion,
  CLEAN_GRID_MAX_GCO2E_PER_KWH,
  estimateMigration,
  gridByCode,
  isCleanGrid,
  isCleanestOrigin,
  joinRegions,
  migrationChange,
  migrationRows,
  sortByCleanest,
  worstStatus,
} from './regions';

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

describe('migrationRows (#326)', () => {
  it('critério 1: us-east com 0,118 kWh e 44,6 g; Montreal a 40 g/kWh dá 4,72 g e 89,42% menos', () => {
    const rows = migrationRows(REGIONS, 'us-east', 0.118, 44.6);
    const [first] = rows;
    expect(first.region.code).toBe('ca-central');
    expect(first.cleanest).toBe(true);
    expect(first.estimate?.grams).toBeCloseTo(4.72, 10);
    expect(first.estimate?.savedGrams).toBeCloseTo(39.88, 10);
    expect(first.estimate?.savedPercent?.toFixed(2)).toBe('89.42');
  });

  it('lista todas as regiões menos a origem, da mais limpa para a mais suja, com só uma em destaque', () => {
    const rows = migrationRows(REGIONS, 'us-east', 0.118, 44.6);
    expect(rows.map((row) => row.region.code)).toEqual(['ca-central', 'br-sudeste', 'eu-west', 'jp-east']);
    expect(rows.filter((row) => row.cleanest)).toHaveLength(1);
  });

  it('critério 3: cada linha refaz a conta com a intensidade dela; destino mais sujo sai com redução negativa', () => {
    const jp = migrationRows(REGIONS, 'us-east', 0.118, 44.6).find((row) => row.region.code === 'jp-east');
    expect(jp?.estimate?.grams).toBeCloseTo(0.118 * 465, 10);
    expect(jp?.estimate?.savedGrams).toBeLessThan(0);
  });

  it('região sem intensidade vai para o fim, indisponível, sem conta e nunca em destaque', () => {
    const rows = migrationRows([...REGIONS, region('sa-east', null, null, 0)], 'us-east', 0.118, 44.6);
    const last = rows[rows.length - 1];
    expect(last).toMatchObject({ available: false, cleanest: false, estimate: null });
    expect(last.region.code).toBe('sa-east');
  });

  it('sem energia ou CO₂e no período, as linhas continuam (para escolher), mas sem número', () => {
    const rows = migrationRows(REGIONS, 'us-east', null, null);
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.estimate === null)).toBe(true);
    expect(rows[0].available).toBe(true);
  });
});

describe('isCleanestOrigin (#326)', () => {
  it('critério 2: a região de menor intensidade já é a mais limpa', () => {
    expect(isCleanestOrigin(REGIONS, 'ca-central')).toBe(true);
    expect(isCleanestOrigin(REGIONS, 'us-east')).toBe(false);
  });

  it('empate de intensidade conta como "já é a mais limpa", embora cleanestRegion aponte a empatada', () => {
    const tied = [...REGIONS, region('ca-east', 40, 90, 0)];
    expect(cleanestRegion(tied, 'ca-central')?.code).toBe('ca-east');
    expect(isCleanestOrigin(tied, 'ca-central')).toBe(true);
    expect(isCleanestOrigin(tied, 'ca-east')).toBe(true);
  });

  it('ignora destinos sem intensidade; origem sem intensidade nunca é "a mais limpa"', () => {
    expect(isCleanestOrigin([...REGIONS, region('sa-east', null, null, 0)], 'ca-central')).toBe(true);
    expect(isCleanestOrigin([...REGIONS, region('sa-east', null, null, 1)], 'sa-east')).toBe(false);
  });
});

describe('migrationChange (#326)', () => {
  it('redução, aumento e igual com números sem sinal (docs/calculos.md: nunca "redução negativa")', () => {
    expect(migrationChange({ grams: 2, savedGrams: 16.9, savedPercent: 89.42 })).toEqual({ kind: 'reducao', grams: 16.9, percent: 89.42 });
    expect(migrationChange({ grams: 23.25, savedGrams: -4.35, savedPercent: -23.02 })).toEqual({ kind: 'aumento', grams: 4.35, percent: 23.02 });
    expect(migrationChange({ grams: 5, savedGrams: 0, savedPercent: 0 })).toEqual({ kind: 'igual', grams: 0, percent: 0 });
  });

  it('CO₂e de origem 0: gramas sem percentual', () => {
    expect(migrationChange({ grams: 1, savedGrams: -1, savedPercent: null })).toEqual({ kind: 'aumento', grams: 1, percent: null });
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

describe('isCleanGrid (docs/calculos.md § Limite de "rede limpa", caso região)', () => {
  it('usa o limite de 100 g CO₂e/kWh do documento, inclusive o valor exato', () => {
    expect(CLEAN_GRID_MAX_GCO2E_PER_KWH).toBe(100);
    expect(isCleanGrid(100)).toBe(true);
    expect(isCleanGrid(100.1)).toBe(false);
  });

  it('separa as duas regiões limpas das três sujas do retrato da Carbon API', () => {
    expect(REGIONS.filter((item) => isCleanGrid(item.carbonIntensityGco2ePerKwh)).map((item) => item.code)).toEqual(['br-sudeste', 'ca-central']);
  });

  it('sem intensidade não há selo: falta de dado nunca vira rede limpa', () => {
    expect(isCleanGrid(null)).toBe(false);
    expect(isCleanGrid(Number.NaN)).toBe(false);
  });
});

describe('gridByCode', () => {
  it('indexa a rede de cada região pelo código, com o % renovável junto', () => {
    const grids = gridByCode(REGIONS);
    expect(grids.size).toBe(5);
    expect(grids.get('br-sudeste')).toEqual({ carbonIntensityGco2ePerKwh: 85, renewableSharePercent: 83 });
    expect(grids.get('sa-east')).toBeUndefined();
  });
});
