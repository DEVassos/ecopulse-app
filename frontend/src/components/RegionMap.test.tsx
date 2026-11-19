import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ListedRegion, RegionOverview } from '../utils/region-map';
import RegionMap from './RegionMap';
import type { PresentationStatus } from './RegionMap';

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
  const overview: RegionOverview = { monitored: [listed('us-east')], idle: [listed('eu-north', { worstStatus: null, co2eGrams: null })], outside: NONE, unplacedServices: 0, fetchedAt: '2026-11-13T13:00:00.000Z' };

  it('traz a legenda com os três estados, o ponto sem serviço, o tamanho e o anel', () => {
    const html = render(overview);
    for (const label of ['Ativo', 'Indisponível', 'Sem métricas', 'Sem serviço hoje', 'Tamanho: CO₂e', 'Anel: energia']) expect(html).toContain(`</i>${label}</li>`);
  });

  it('tem um título para o leitor de tela e não mostra aviso antes de o mapa abrir', () => {
    const html = render(overview);
    expect(html).toContain('<h2 id="region-map-title" class="sr-only">Mapa das regiões</h2>');
    expect(html).not.toContain('role="status"');
  });

  it('mostra "Destino simulado" na legenda só durante a simulação de migração (#326)', () => {
    expect(render(overview)).not.toContain('Destino simulado');
    const html = renderToStaticMarkup(
      <RegionMap overview={overview} selectedCode="us-east" onSelect={() => {}} destination={{ code: 'eu-north', co2eGrams: 25 }} />,
    );
    expect(html).toContain('region-map__key--destination" aria-hidden="true"></i>Destino simulado</li>');
  });

  describe('modo apresentação (#323)', () => {
    const two: RegionOverview = { ...overview, monitored: [listed('us-east'), listed('eu-west')] };
    const controls = (status: PresentationStatus, regions = two) =>
      renderToStaticMarkup(
        <RegionMap
          overview={regions}
          selectedCode={null}
          onSelect={() => {}}
          presentation={{ status, onStart: () => {}, onToggle: () => {}, onStop: () => {}, onInteract: () => {}, onArrive: () => {} }}
        />,
      );
    const buttons = (html: string) => [...html.matchAll(/region-map__present">(.*?)<\/div>/g)].flatMap((match) => [...match[1].matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map((item) => item[1]));

    it('desligado mostra só "Apresentar": nunca liga sozinho', () => {
      expect(buttons(controls('off'))).toEqual(['Apresentar']);
    });

    it('ligado mostra a pausa sempre visível e "Encerrar"; pausado, "Retomar"', () => {
      expect(buttons(controls('playing'))).toEqual(['Pausar', 'Encerrar']);
      expect(buttons(controls('paused'))).toEqual(['Retomar', 'Encerrar']);
    });

    it('não aparece com uma região só, nem sem a prop', () => {
      expect(controls('off', overview)).not.toContain('region-map__present');
      expect(render(two)).not.toContain('region-map__present');
    });
  });

  it('apaga as bolhas quando a última busca falhou', () => {
    expect(render(overview, true)).toContain('class="region-map region-map--stale"');
  });

  it('não aparece sem nenhuma região com serviço e coordenada; a lista e o aviso "fora do mapa" cobrem esse caso', () => {
    expect(render({ ...overview, monitored: [] })).toBe('');
    expect(render({ ...overview, monitored: [listed('sem-gps', { latitude: null, longitude: null })], unplacedServices: 1 })).toBe('');
  });
});
