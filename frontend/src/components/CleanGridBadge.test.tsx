import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { RegionGrid } from '../utils/regions';
import CleanGridBadge from './CleanGridBadge';

function render(grid: RegionGrid, options: { stale?: boolean; describe?: boolean } = {}): string {
  return renderToStaticMarkup(<CleanGridBadge grid={grid} {...options} />);
}

describe('CleanGridBadge', () => {
  it('mostra "Rede limpa" com folha e a intensidade e o % renovável no tooltip (#324)', () => {
    const html = render({ carbonIntensityGco2ePerKwh: 40, renewableSharePercent: 89 });
    expect(html).toContain('data-tooltip-value="40 g CO₂e/kWh · 89% renovável"');
    expect(html).toContain('data-tooltip="Rede limpa: intensidade de agora até 100 g CO₂e/kWh"');
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).toContain('Rede limpa<span class="sr-only"> (40 g CO₂e/kWh · 89% renovável)</span>');
  });

  it('aceita o limite exato e mostra só a intensidade quando falta o % renovável', () => {
    const html = render({ carbonIntensityGco2ePerKwh: 100, renewableSharePercent: null });
    expect(html).toContain('data-tooltip-value="100 g CO₂e/kWh"');
  });

  it('não aparece acima do limite nem sem intensidade conhecida', () => {
    expect(render({ carbonIntensityGco2ePerKwh: 295, renewableSharePercent: 38 })).toBe('');
    expect(render({ carbonIntensityGco2ePerKwh: null, renewableSharePercent: 90 })).toBe('');
  });

  it('fica em cinza e avisa no tooltip quando a última busca das regiões falhou', () => {
    const html = render({ carbonIntensityGco2ePerKwh: 85, renewableSharePercent: 83 }, { stale: true });
    expect(html).toContain('border-border text-muted');
    expect(html).not.toContain('text-primary');
    expect(html).toContain('(dado da atualização anterior)');
  });

  it('não repete os números para o leitor de tela quando eles já estão ao lado do selo', () => {
    const html = render({ carbonIntensityGco2ePerKwh: 85, renewableSharePercent: 83 }, { describe: false });
    expect(html).toContain('Rede limpa');
    expect(html).not.toContain('sr-only');
  });
});
