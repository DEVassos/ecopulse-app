import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MonitoredService, ServiceStatus } from '../services/services.types';
import ServicesTable from './ServicesTable';

function service(id: string, status: ServiceStatus): MonitoredService {
  return {
    id,
    name: `Serviço ${id}`,
    country: 'Brazil',
    region: 'Sudeste',
    city: 'Sao Paulo',
    cpuPercent: status === 'ativo' ? 40 : null,
    energyKwh: status === 'ativo' ? 0.0009 : null,
    emissionsG: status === 'ativo' ? 0.3 : null,
    status,
    lastReadingAt: '2026-11-04T22:00:00Z',
  };
}

describe('ServicesTable', () => {
  it('põe a ação de ver o histórico ao lado do selo só de quem tem problema (#272)', () => {
    const html = renderToStaticMarkup(
      <ServicesTable
        services={[service('a', 'ativo'), service('b', 'indisponivel'), service('c', 'sem_metricas'), service('d', 'removido')]}
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('aria-label="Ver histórico de Serviço b"');
    expect(html).toContain('aria-label="Ver histórico de Serviço c"');
    expect(html).not.toContain('Ver histórico de Serviço a');
    expect(html).not.toContain('Ver histórico de Serviço d');
  });

  it('deixa o selo Ativo neutro, com o ponto verde como única cor', () => {
    const html = renderToStaticMarkup(<ServicesTable services={[service('a', 'ativo')]} onSelect={() => {}} />);
    expect(html).toMatch(/border-border text-muted[^"]*"><span class="size-1\.5 rounded-full bg-primary"/);
  });
});
