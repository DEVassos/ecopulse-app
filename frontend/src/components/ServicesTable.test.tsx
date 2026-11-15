import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MonitoredService, ServiceStatus } from '../services/services.types';
import ServicesTable from './ServicesTable';
import type { RankingShare } from '../utils/ranking';

function service(id: string, status: ServiceStatus, emissionsG: number, lastReadingAt = new Date().toISOString()): MonitoredService {
  return {
    id,
    name: id,
    country: 'Brasil',
    region: 'br-sudeste',
    city: 'São Paulo',
    cpuPercent: 50,
    energyKwh: 0.001,
    emissionsG,
    status,
    lastReadingAt,
    statusReason: null,
    // Última coleta (#298): valores fixos para os tooltips e o fator terem texto previsível nos testes
    regionCode: 'br-sudeste',
    collectionIntervalSeconds: 46,
    memoryGb: 6.04,
    diskGb: 67.11,
    networkGb: 0.53,
    powerWatts: 41.79,
    carbonIntensityGco2ePerKwh: 377,
  };
}

/** Célula numérica apagada com o valor dado, qualquer que seja a classe da fonte dos números. */
const dimmed = (value: string) => new RegExp(`font-[a-z]+ text-muted">${value}`);

/** Nomes dos serviços na ordem das linhas da tabela. */
function rowOrder(html: string): string[] {
  return [...html.matchAll(/aria-haspopup="dialog"[^>]*>([^<]+)</g)].map((match) => match[1]);
}

describe('ServicesTable', () => {
  it('põe o serviço removido no fim mesmo quando ele tem a maior emissão', () => {
    const html = renderToStaticMarkup(
      <ServicesTable
        services={[service('removido-alto', 'removido', 9), service('ativo-baixo', 'ativo', 1), service('ativo-alto', 'ativo', 5)]}
        onSelect={() => undefined}
      />,
    );
    expect(rowOrder(html)).toEqual(['ativo-alto', 'ativo-baixo', 'removido-alto']);
  });

  it('apaga os números da linha removida e mantém os das linhas ativas', () => {
    const html = renderToStaticMarkup(
      <ServicesTable services={[service('ativo', 'ativo', 1), service('removido', 'removido', 2)]} onSelect={() => undefined} />,
    );
    const [activeRow, removedRow] = html.split('<tr').filter((row) => row.includes('aria-haspopup'));
    expect(activeRow).not.toMatch(dimmed('50%'));
    expect(removedRow).toMatch(dimmed('50%'));
  });

  it('apaga os números de todas as linhas quando a última busca falhou', () => {
    const html = renderToStaticMarkup(<ServicesTable services={[service('ativo', 'ativo', 1)]} onSelect={() => undefined} stale />);
    expect(html).toMatch(dimmed('50%'));
  });

  it('mostra a data na última leitura quando ela não é de hoje', () => {
    const html = renderToStaticMarkup(
      <ServicesTable services={[service('antigo', 'ativo', 1, '2026-01-15T12:00:00Z')]} onSelect={() => undefined} />,
    );
    expect(html).toMatch(/15\/01 \d{2}:00:00/);
  });

  it('põe a ação de ver o histórico ao lado do selo só de quem tem problema (#272)', () => {
    const html = renderToStaticMarkup(
      <ServicesTable
        services={[service('a', 'ativo', 1), service('b', 'indisponivel', 1), service('c', 'sem_metricas', 1), service('d', 'removido', 1)]}
        onSelect={() => undefined}
      />,
    );
    expect(html).toContain('aria-label="Ver histórico de b"');
    expect(html).toContain('aria-label="Ver histórico de c"');
    expect(html).not.toContain('Ver histórico de a"');
    expect(html).not.toContain('Ver histórico de d"');
  });

  it('deixa o selo Ativo neutro, com o ponto verde como única cor (#272)', () => {
    const html = renderToStaticMarkup(<ServicesTable services={[service('a', 'ativo', 1)]} onSelect={() => undefined} />);
    expect(html).toMatch(/border-border text-muted[^"]*"><span class="size-1\.5 rounded-full bg-primary"/);
  });

  it('ordena os ativos pela parte no período, e não pela emissão instantânea (#260)', () => {
    const shares = new Map<string, RankingShare>([
      ['ativo-baixo', { position: 1, co2eGrams: 700, share: 0.7 }],
      ['ativo-alto', { position: 2, co2eGrams: 300, share: 0.3 }],
    ]);
    const html = renderToStaticMarkup(
      <ServicesTable
        services={[service('ativo-alto', 'ativo', 5), service('ativo-baixo', 'ativo', 1)]}
        onSelect={() => undefined}
        shares={shares}
      />,
    );
    expect(rowOrder(html)).toEqual(['ativo-baixo', 'ativo-alto']);
  });

  it('marca o 1º do período com a parte, e não só com a cor', () => {
    const shares = new Map<string, RankingShare>([['ativo', { position: 1, co2eGrams: 700, share: 0.7 }]]);
    const html = renderToStaticMarkup(<ServicesTable services={[service('ativo', 'ativo', 1)]} onSelect={() => undefined} shares={shares} />);
    expect(html).toMatch(/>1º</);
    expect(html).toMatch(/70,0%/);
  });

  it('com total zero no período, não marca 1º nem acende o neon numa barra vazia (#260)', () => {
    const shares = new Map<string, RankingShare>([
      ['a', { position: 1, co2eGrams: 0, share: 0 }],
      ['b', { position: 2, co2eGrams: 0, share: 0 }],
    ]);
    const html = renderToStaticMarkup(
      <ServicesTable services={[service('a', 'ativo', 1), service('b', 'ativo', 1)]} onSelect={() => undefined} shares={shares} />,
    );
    expect(html).not.toMatch(/>1º</);
    expect(html).not.toContain('var(--neon)');
    expect(html).toMatch(/0,0%/);
  });

  it('apaga o 1º e a barra quando a parte está desatualizada', () => {
    const shares = new Map<string, RankingShare>([['ativo', { position: 1, co2eGrams: 700, share: 1 }]]);
    const html = renderToStaticMarkup(
      <ServicesTable services={[service('ativo', 'ativo', 1)]} onSelect={() => undefined} shares={shares} sharesStale />,
    );
    expect(html).toMatch(/>1º</);
    expect(html).not.toContain('var(--neon)');
    expect(html).toContain('bg-muted');
  });

  it('mostra o fator da região numa coluna própria, com a região na célula de localização (#298)', () => {
    const html = renderToStaticMarkup(<ServicesTable services={[service('ativo', 'ativo', 1)]} onSelect={() => undefined} />);
    expect(html).toContain('Fator da região (gCO₂e/kWh)');
    expect(html).toMatch(/data-tooltip="Intensidade de carbono de br-sudeste na última leitura">377</);
    expect(html).toMatch(/data-tooltip="São Paulo, Brasil · br-sudeste" class="font-data">br-sudeste</);
  });

  it('põe potência e recursos no tooltip da CPU e o intervalo no da última leitura (#298)', () => {
    const html = renderToStaticMarkup(<ServicesTable services={[service('ativo', 'ativo', 1)]} onSelect={() => undefined} />);
    expect(html).toContain('data-tooltip="RAM 6,0 GB · disco 67,1 GB · rede 0,53 GB" data-tooltip-value="41,8 W"');
    expect(html).toContain('data-tooltip="coleta de 46 s"');
  });

  it('explica cada ausência do fator: sem região, sem leitura e sem fator nesta leitura (#298)', () => {
    const noRegion = { ...service('a', 'sem_metricas', 0, null as unknown as string), regionCode: null, carbonIntensityGco2ePerKwh: null, cpuPercent: null };
    const noReading = { ...service('b', 'indisponivel', 0), lastReadingAt: null, cpuPercent: null, carbonIntensityGco2ePerKwh: null };
    const noFactor = { ...service('c', 'ativo', 1), carbonIntensityGco2ePerKwh: null, powerWatts: null };
    const html = renderToStaticMarkup(<ServicesTable services={[noRegion, noReading, noFactor]} onSelect={() => undefined} />);
    expect(html).toContain('sem região');
    expect(html).toContain('sem leitura');
    expect(html).toContain('sem fator nesta leitura');
    // Sem potência, o tooltip da CPU traz só os recursos; sem recursos nem potência, não há tooltip
    expect(html).toContain('data-tooltip="RAM 6,0 GB · disco 67,1 GB · rede 0,53 GB" class=');
  });

  it('apaga o fator junto com os outros números quando a última busca falhou', () => {
    const html = renderToStaticMarkup(<ServicesTable services={[service('ativo', 'ativo', 1)]} onSelect={() => undefined} stale />);
    expect(html).toMatch(/font-data text-muted"><span data-tooltip="Intensidade de carbono de br-sudeste na última leitura">377</);
  });

  it('separa as três ausências de parte: ranking indisponível, fora do ranking e sem cálculo (#260)', () => {
    const noRanking = renderToStaticMarkup(
      <ServicesTable services={[service('ativo', 'ativo', 1)]} onSelect={() => undefined} />,
    );
    expect(noRanking).toMatch(/ranking do período indisponível/);

    const outOfRanking = renderToStaticMarkup(
      <ServicesTable services={[service('ativo', 'ativo', 1)]} onSelect={() => undefined} shares={new Map()} />,
    );
    expect(outOfRanking).toMatch(/serviço fora do ranking/);
    expect(outOfRanking).not.toMatch(/sem cálculo no período/);

    const withoutCalculation = renderToStaticMarkup(
      <ServicesTable
        services={[service('ativo', 'ativo', 1)]}
        onSelect={() => undefined}
        shares={new Map([['ativo', { position: null, co2eGrams: null, share: null }]])}
      />,
    );
    expect(withoutCalculation).toMatch(/sem cálculo no período/);
  });

  it('destaca as linhas da região selecionada e deixa o código da região selecionar a região (#342)', () => {
    const other = { ...service('fora', 'ativo', 1), regionCode: 'us-east' };
    const html = renderToStaticMarkup(
      <ServicesTable services={[service('dentro', 'ativo', 2), other]} onSelect={() => undefined} selectedRegion="br-sudeste" onSelectRegion={() => undefined} />,
    );
    expect(html.match(/shadow-\[inset_3px_0_0_var\(--accent\)\]/g)).toHaveLength(1);
    expect(html).toMatch(/aria-pressed="true" aria-label="Selecionar a região br-sudeste \(São Paulo, Brasil · br-sudeste\)"/);
    expect(html).toMatch(/aria-pressed="false" aria-label="Selecionar a região us-east/);
  });

  it('mantém o código da região como texto quando a página não usa a seleção', () => {
    const html = renderToStaticMarkup(<ServicesTable services={[service('a', 'ativo', 1)]} onSelect={() => undefined} />);
    expect(html).not.toContain('Selecionar a região');
  });
});
