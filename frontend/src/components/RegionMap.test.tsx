import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ListedRegion, RegionOverview } from '../utils/region-map';
import RegionMap from './RegionMap';

// A renderização estática não roda efeitos: o globo (MapLibre, WebGL) não é montado. Os testes cobrem o que aparece sem
// o mapa: a legenda, o título para o leitor de tela e quando o mapa não aparece.
function listed(code: string, overrides: Partial<ListedRegion> = {}): ListedRegion {
  return {
    code, name: code, place: null, country: 'País', region: 'Região', city: code, latitude: 10, longitude: 20,
    carbonIntensityGco2ePerKwh: 300, renewableSharePercent: 30, monitoredServices: 1,
    energyKwh: 1, co2eGrams: 100, services: { ativo: 1, indisponivel: 0, sem_metricas: 0 }, worstStatus: 'ativo', ...overrides,
  };
}

const NONE = { services: 0, co2eGrams: null };

function render(overview: RegionOverview, stale = false): string {
  return renderToStaticMarkup(<RegionMap overview={overview} selectedCode={null} onSelect={() => {}} stale={stale} />);
}

describe('RegionMap', () => {
  const overview: RegionOverview = { monitored: [listed('us-east')], idle: [listed('eu-north', { worstStatus: null, co2eGrams: null })], outside: NONE, unplacedServices: 0 };

  it('traz a legenda com os três estados, o ponto sem serviço, o tamanho e o anel', () => {
    const html = render(overview);
    for (const label of ['Ativo', 'Indisponível', 'Sem métricas', 'Sem serviço hoje', 'Tamanho: CO₂e', 'Anel: energia']) expect(html).toContain(`</i>${label}</li>`);
  });

  it('tem um título para o leitor de tela e não mostra aviso antes de o mapa abrir', () => {
    const html = render(overview);
    expect(html).toContain('<h2 id="region-map-title" class="sr-only">Mapa das regiões</h2>');
    expect(html).not.toContain('role="status"');
  });

  it('apaga as bolhas quando a última busca falhou', () => {
    expect(render(overview, true)).toContain('class="region-map region-map--stale"');
  });

  it('não aparece sem nenhuma região com serviço e coordenada; a lista e o aviso "fora do mapa" cobrem esse caso', () => {
    expect(render({ ...overview, monitored: [] })).toBe('');
    expect(render({ ...overview, monitored: [listed('sem-gps', { latitude: null, longitude: null })], unplacedServices: 1 })).toBe('');
  });
});
