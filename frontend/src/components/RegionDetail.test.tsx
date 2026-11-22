import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ListedRegion, RegionOverview } from '../utils/region-map';
import RegionDetail from './RegionDetail';

const FETCHED_AT = new Date(2026, 10, 19, 14, 5).toISOString();
const NOW = new Date(2026, 10, 19, 14, 30);

function listed(code: string, name: string, intensity: number | null, overrides: Partial<ListedRegion> = {}): ListedRegion {
  return {
    code, name, place: null, country: 'País', region: 'Região', city: name, latitude: 0, longitude: 0,
    carbonIntensityGco2ePerKwh: intensity, renewableSharePercent: 20, monitoredServices: 1,
    energyKwh: 1, co2eGrams: 100, services: { ativo: 1, indisponivel: 0, sem_metricas: 0 }, worstStatus: 'ativo', ...overrides,
  };
}

const idle = (code: string, name: string, intensity: number | null) =>
  listed(code, name, intensity, { energyKwh: null, co2eGrams: null, services: { ativo: 0, indisponivel: 0, sem_metricas: 0 }, worstStatus: null, monitoredServices: 0 });

/** Critério 1 da #326: us-east com 0,118 kWh e 44,6 g; a mais limpa (Montreal, sem serviço) a 40 g/kWh. */
const OVERVIEW: RegionOverview = {
  monitored: [
    listed('us-east', 'Ashburn', 378, { energyKwh: 0.118, co2eGrams: 44.6 }),
    listed('jp-east', 'Tóquio', 465),
  ],
  idle: [idle('ca-central', 'Montreal', 40), idle('sa-east', 'Santiago', null)],
  outside: { services: 0, co2eGrams: null },
  unplacedServices: 0,
  fetchedAt: FETCHED_AT,
};

function render(props: Partial<Parameters<typeof RegionDetail>[0]> = {}): string {
  return renderToStaticMarkup(
    <RegionDetail
      overview={OVERVIEW}
      originCode="us-east"
      destinationCode={null}
      onDestination={() => {}}
      periodLabel="últimas 24 h"
      now={NOW}
      {...props}
    />,
  );
}

const text = (html: string) => html.replace(/<[^>]+>/g, '');

describe('RegionDetail (#326)', () => {
  it('critério 1: veredito da mais limpa com 89,42%, antes e depois, a diferença e a linha da conta', () => {
    const html = text(render());
    expect(html).toContain('Mover para Montreal reduziria o CO₂e desta região em cerca de 89,42%');
    expect(html).toContain('Hoje em Ashburn44,6 g');
    expect(html).toContain('Simulado em Montreal4,72 g');
    expect(html).toContain('39,9 g a menos de CO₂e nas últimas 24 h');
    expect(html).toContain('Conta: 0,118 kWh × 40 g/kWh = 4,72 g');
    expect(html).toContain('Alternativa mais limpa nas últimas 24 h');
    expect(html).toContain('Ver alternativa mais limpa');
    expect(html).not.toContain('Voltar para');
  });

  it('critério 1: barras no mesmo eixo, a maior com 100% e a outra proporcional, com rótulo para o leitor de tela', () => {
    const html = render();
    expect(html).toContain('region-detail__fill region-detail__fill--origin" style="width:100%"');
    // 4,72 ÷ 44,6 = 10,6%
    expect(html).toContain('region-detail__fill region-detail__fill--reducao" style="width:10.6%"');
    expect(html).toContain('aria-label="CO₂e nas últimas 24 h: hoje em Ashburn, 44,6 g; simulado em Montreal, 4,72 g."');
    expect(html).toContain('region-detail__reco region-detail__reco--reducao');
  });

  it('por que a diferença: intensidade do período × a do destino, a energia considerada e o destino sem serviço', () => {
    const html = text(render());
    // 44,6 g ÷ 0,118 kWh = 378 g/kWh; 378 ÷ 40 = 9,4
    expect(html).toContain('Intensidade de carbono: 378 g/kWh em Ashburn no período (CO₂e ÷ energia) contra 40 g/kWh em Montreal agora: 9,4 vezes menor.');
    // Mesma escala da linha de totais do painel (formatQuantity): 0,118 kWh = 118 Wh
    expect(html).toContain('Energia considerada: 118 Wh, a mesma que o serviço de Ashburn consumiu nas últimas 24 h. A simulação troca só a rede.');
    expect(html).toContain('Destino: Montreal não tem serviço monitorado hoje.');
  });

  it('destino em rede limpa ganha o selo, com texto', () => {
    expect(text(render())).toContain('Rede limpa');
    expect(text(render({ destinationCode: 'jp-east' }))).not.toContain('Rede limpa');
  });

  it('tabela da mais limpa para a mais suja, sem a origem, com a mais limpa destacada e a sem intensidade bloqueada', () => {
    const html = render();
    const names = [...html.matchAll(/class="region-detail__pick"[^>]*>([^<]+)/g)].map((match) => match[1]);
    expect(names).toEqual(['Montreal (sem serviço hoje)', 'Tóquio', 'Santiago (sem serviço hoje)']);
    expect(html).toMatch(/region-detail__row--cleanest"><th scope="row"><button[^>]*>Montreal \(sem serviço hoje\)<span class="region-detail__tag">mais limpa/);
    expect(html).toMatch(/disabled=""[^>]*>Santiago/);
    expect(text(html)).toContain('Santiago (sem serviço hoje)indisponível—indisponível');
  });

  it('critério 3: com outro destino escolhido, refaz a conta com a intensidade dele e oferece voltar', () => {
    const html = text(render({ destinationCode: 'jp-east' }));
    // 0,118 × 465 = 54,87 g; 54,87 − 44,6 = 10,27 g a mais, 23,03% de 44,6
    expect(html).toContain('Destino escolhido nas últimas 24 h');
    expect(html).toContain('Mover para Tóquio aumentaria o CO₂e desta região em cerca de 23,03%');
    expect(html).toContain('10,3 g a mais de CO₂e nas últimas 24 h');
    expect(html).toContain('contra 465 g/kWh em Tóquio agora: 1,2 vez maior.');
    expect(html).toContain('Conta: 0,118 kWh × 465 g/kWh = 54,87 g');
    expect(html).toContain('Voltar para Ashburn');
    expect(html).toContain('Ver alternativa mais limpa');
    expect(render({ destinationCode: 'jp-east' })).toContain('region-detail__reco region-detail__reco--aumento');
  });

  it('tabela: diferença com seta e porcentagem, e a palavra para o leitor de tela', () => {
    const html = text(render());
    expect(html).toContain('▼ 89,42%redução de 89,42%');
    expect(html).toContain('▲ 23,03%aumento de 23,03%');
  });

  it('critério 2: a região de menor intensidade diz que já é a mais limpa', () => {
    const overview = { ...OVERVIEW, monitored: [...OVERVIEW.monitored, listed('eu-north', 'Estocolmo', 25)] };
    const html = text(render({ overview, originCode: 'eu-north' }));
    expect(html).toContain('Esta já é a região de menor intensidade de carbono.');
    expect(html).not.toContain('Ver alternativa mais limpa');
    expect(html).not.toContain('emitiria');
    // Nenhum destino é "a mais limpa" quando a origem já é (#434): a etiqueta contradiria a frase
    const markup = render({ overview, originCode: 'eu-north' });
    expect(markup).not.toContain('region-detail__tag');
    expect(markup).not.toContain('region-detail__row--cleanest');
  });

  it('separa a decisão da tabela de destinos em dois blocos, para o painel abrir em duas colunas (#434)', () => {
    const html = render();
    expect(html).toMatch(
      /<div class="region-detail__body"><div class="region-detail__main"><h3 class="region-detail__subtitle">[\s\S]*?<\/div><div class="region-detail__scroll"><table/,
    );
  });

  it('empate com outra região também conta como "já é a mais limpa"', () => {
    const overview = { ...OVERVIEW, monitored: [...OVERVIEW.monitored, listed('ca-east', 'Quebec', 40)] };
    expect(text(render({ overview, originCode: 'ca-east' }))).toContain('Esta já é a região de menor intensidade de carbono.');
  });

  it('sem energia ou CO₂e no período: texto próprio, nunca 0%', () => {
    const overview = { ...OVERVIEW, monitored: [listed('us-east', 'Ashburn', 378, { energyKwh: null, co2eGrams: null, worstStatus: 'indisponivel' })] };
    const html = text(render({ overview }));
    expect(html).toContain('Sem dado no período para estimar.');
    expect(html).not.toMatch(/0,00%|Mover para|region-detail__bars/);
  });

  it('CO₂e de origem 0: veredito com a diferença em gramas, sem percentual inventado', () => {
    const overview = { ...OVERVIEW, monitored: [listed('us-east', 'Ashburn', 378, { energyKwh: 0.118, co2eGrams: 0 })] };
    const html = text(render({ overview }));
    expect(html).toContain('Mover para Montreal aumentaria o CO₂e desta região em 4,72 g');
    // Nenhum percentual de diferença (o "20% renovável" do selo não conta)
    expect(html).not.toMatch(/\d+,\d{2}%/);
  });

  it('região sem serviço selecionada não abre o painel', () => {
    expect(render({ originCode: 'ca-central' })).toBe('');
  });

  it('mostra a hora da intensidade e só avisa quando passou de 1 h', () => {
    expect(text(render())).toContain('Intensidade de 14:05.');
    expect(text(render({ now: new Date(2026, 10, 19, 15, 30) }))).toContain('Intensidade de 14:05: a Carbon API não respondeu desde então');
  });

  it('ressalva completa com link para o docs/calculos.md', () => {
    const html = render();
    expect(text(html)).toContain('não considera latência, custo de nuvem, disponibilidade, mudança de hardware ou de arquitetura, nem a energia para mover os dados.');
    expect(html).toContain('href="https://github.com/DEVassos/ecopulse-app/blob/develop/docs/calculos.md#simulação-de-migração-regional"');
  });

  it('com a busca falhando, fica em cinza com o último dado', () => {
    expect(render({ stale: true })).toContain('class="region-detail region-detail--stale"');
  });
});
