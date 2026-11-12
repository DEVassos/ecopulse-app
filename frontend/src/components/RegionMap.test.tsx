import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MapRegion, RegionJoin } from '../utils/region-map';
import { formatQuantity } from '../utils/units';
import RegionMap from './RegionMap';

// A renderização estática não roda efeitos: o globo (MapLibre, WebGL) não é montado. Os testes cobrem o que a pessoa lê
// sem o mapa: a lista de regiões, a legenda e os avisos.
function mapRegion(code: string, name: string, overrides: Partial<MapRegion> = {}): MapRegion {
  return {
    code, name, place: null, latitude: 0, longitude: 0, carbonIntensity: 300, renewableSharePercent: 30,
    state: 'ativo', services: { ativo: 1, indisponivel: 0, sem_metricas: 0 }, co2eGrams: 100, energyKwh: 1, ...overrides,
  };
}

const JOIN: RegionJoin = {
  regions: [
    mapRegion('us-east', 'Ashburn', { co2eGrams: 1029.4 }),
    mapRegion('br-sudeste', 'São Paulo', { state: 'indisponivel', co2eGrams: null, energyKwh: null, services: { ativo: 0, indisponivel: 1, sem_metricas: 0 } }),
    mapRegion('eu-north', 'Estocolmo', { state: null, co2eGrams: null, energyKwh: null, services: { ativo: 0, indisponivel: 0, sem_metricas: 0 } }),
  ],
  unplacedServices: 1,
};

function render(join: RegionJoin = JOIN, periodLabel = 'últimas 24 h'): string {
  return renderToStaticMarkup(<RegionMap join={join} periodLabel={periodLabel} />);
}

describe('RegionMap', () => {
  it('lista só as regiões com serviço, na ordem recebida; a sem serviço fica só no mapa', () => {
    const html = render();
    const listed = [...html.matchAll(/class="region-map__region"[\s\S]*?aria-hidden="true"><\/i>([^<]+)<small>/g)].map((match) => match[1]);
    expect(listed).toEqual(['Ashburn', 'São Paulo']);
    expect(html).not.toContain('Estocolmo<small>');
  });

  it('mostra o CO₂e da região, ou o estado em texto quando não há cálculo', () => {
    const html = render();
    expect(html).toContain(`Ashburn<small>us-east</small></span><span class="region-map__value font-data">${formatQuantity('co2e', 1029.4)}</span>`);
    expect(html).toMatch(/São Paulo<small>br-sudeste<\/small>[\s\S]*?Indisponível/);
  });

  it('traz a legenda com os três estados, o ponto sem serviço, o tamanho e o anel', () => {
    const html = render();
    for (const label of ['Ativo', 'Indisponível', 'Sem métricas', 'Sem serviço hoje', 'Tamanho: CO₂e', 'Anel: energia']) expect(html).toContain(`</i>${label}</li>`);
  });

  it('mostra a que período os números se referem', () => {
    expect(render(JOIN, 'últimas 24 h')).toContain('CO₂e e energia: últimas 24 h');
  });

  it('avisa quantos serviços ficaram fora do mapa', () => {
    expect(render()).toContain('1 serviço sem região ou sem coordenada aparece só na tabela.');
    expect(render({ ...JOIN, unplacedServices: 2 })).toContain('2 serviços sem região ou sem coordenada aparecem só na tabela.');
  });

  it('não aparece quando nenhuma região tem serviço', () => {
    expect(render({ regions: [JOIN.regions[2]], unplacedServices: 0 })).toBe('');
  });
});
