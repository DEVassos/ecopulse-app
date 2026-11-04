import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MonitoredService, ServiceStatus } from '../services/services.types';
import ServicesTable from './ServicesTable';

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
});
