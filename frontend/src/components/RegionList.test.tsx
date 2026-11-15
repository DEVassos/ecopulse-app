import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ListedRegion, RegionOverview } from '../utils/region-map';
import { formatQuantity } from '../utils/units';
import RegionList from './RegionList';

function listed(code: string, name: string, overrides: Partial<ListedRegion> = {}): ListedRegion {
  return {
    code, name, place: null, country: 'País', region: 'Região', city: name, latitude: 0, longitude: 0,
    carbonIntensityGco2ePerKwh: 377, renewableSharePercent: 22, monitoredServices: 1,
    energyKwh: 1, co2eGrams: 100, services: { ativo: 1, indisponivel: 0, sem_metricas: 0 }, worstStatus: 'ativo', ...overrides,
  };
}

const OVERVIEW: RegionOverview = {
  monitored: [
    listed('us-east', 'Ashburn', { co2eGrams: 1029.4, services: { ativo: 2, indisponivel: 0, sem_metricas: 0 } }),
    listed('br-sudeste', 'São Paulo', { co2eGrams: null, energyKwh: null, carbonIntensityGco2ePerKwh: null, renewableSharePercent: null, services: { ativo: 1, indisponivel: 1, sem_metricas: 0 }, worstStatus: 'indisponivel' }),
  ],
  idle: [listed('eu-north', 'Estocolmo', { co2eGrams: null, energyKwh: null, carbonIntensityGco2ePerKwh: 25, renewableSharePercent: 98, services: { ativo: 0, indisponivel: 0, sem_metricas: 0 }, worstStatus: null, monitoredServices: 0 })],
  outside: { services: 1, co2eGrams: 12 },
  unplacedServices: 1,
};

function render(overview: RegionOverview = OVERVIEW, selectedCode: string | null = null, stale = false): string {
  return renderToStaticMarkup(<RegionList overview={overview} selectedCode={selectedCode} onSelect={() => {}} periodLabel="últimas 24 h" stale={stale} />);
}

describe('RegionList', () => {
  it('lista as regiões monitoradas na ordem recebida, com o CO₂e ou o motivo da falta', () => {
    const html = render();
    const names = [...html.matchAll(/aria-hidden="true"><\/i>([^<]+)<small>/g)].map((match) => match[1]);
    expect(names).toEqual(['Ashburn', 'São Paulo', 'Estocolmo']);
    expect(html).toContain(`Ashburn<small>us-east</small></span><span class="region-list__value font-data">${formatQuantity('co2e', 1029.4)}</span>`);
    expect(html).toMatch(/São Paulo<small>br-sudeste<\/small><\/span><span class="region-list__value font-data">sem cálculo/);
  });

  it('mostra os serviços por estado e a rede de cada região', () => {
    const html = render();
    expect(html).toContain('2 Ativos');
    expect(html).toContain('1 Ativo · 1 Indisponível');
    expect(html).toContain('377 gCO₂e/kWh · 22% renovável');
    expect(html).toContain('rede sem dados da Carbon API');
  });

  it('marca o pior estado na cor e no desenho da marca', () => {
    const html = render();
    expect(html).toContain('region-list__key region-list__key--indisponivel');
    expect(html).toContain('region-list__key region-list__key--idle');
  });

  it('guarda as regiões sem serviço hoje num grupo à parte, sem barra nem contagem', () => {
    const html = render();
    expect(html).toContain('<summary>Sem serviço hoje (1)</summary>');
    expect(html).toMatch(/Estocolmo<small>eu-north<\/small><\/span><span class="region-list__value font-data">sem serviço hoje<\/span><\/span><span class="region-list__meta">25 gCO₂e\/kWh · 98% renovável/);
  });

  it('marca com aria-pressed só a região selecionada', () => {
    const html = render(OVERVIEW, 'br-sudeste');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-pressed="true"[^>]*>[\s\S]*?São Paulo/);
  });

  it('avisa quem fica fora do mapa e soma o CO₂e dos sem região', () => {
    expect(render()).toContain(`1 serviço sem região ou sem coordenada fica fora do mapa e continua na tabela. Os sem região conhecida somam ${formatQuantity('co2e', 12)} no período.`);
    const two = render({ ...OVERVIEW, outside: { services: 0, co2eGrams: null }, unplacedServices: 2 });
    expect(two).toContain('2 serviços sem região ou sem coordenada ficam fora do mapa e continuam na tabela.');
    expect(two).not.toContain('somam');
  });

  it('não quebra sem nenhuma região monitorada', () => {
    const html = render({ monitored: [], idle: [], outside: { services: 3, co2eGrams: null }, unplacedServices: 3 });
    expect(html).toContain('Nenhum serviço com região conhecida pela Carbon API.');
    expect(html).not.toContain('<details');
  });

  it('apaga os números quando a última busca falhou', () => {
    expect(render(OVERVIEW, null, true)).toContain('class="region-list region-list--stale"');
  });
});
