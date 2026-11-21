import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { StatusChange } from '../hooks/useStatusChanges';
import ChangeToast, { narrowToastTop, toastLayout } from './ChangeToast';

// A renderização estática não roda efeitos: o teste cobre a marcação do primeiro render, que é o que o leitor de tela
// encontra. O relógio e o botão de fechar ficam com o teste do hook (#331) e a verificação no navegador.

function change(index: number): StatusChange {
  return {
    key: `s${index}`,
    serviceId: `id-${index}`,
    kind: 'indisponivel',
    at: `14:3${index}`,
    message: `Serviço ${index} ficou indisponível às 14:3${index}`,
  };
}

function render(changes: StatusChange[], narrow?: boolean): string {
  if (narrow !== undefined) {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: narrow, addEventListener: () => {}, removeEventListener: () => {} }),
    });
  }
  const markup = renderToStaticMarkup(<ChangeToast toast={{ id: 'lote-1', changes }} />);
  vi.unstubAllGlobals();
  return markup;
}

describe('toastLayout', () => {
  it('na tela larga fica no canto inferior direito, com até três frases', () => {
    const layout = toastLayout(false);
    expect(layout.lines).toBe(3);
    expect(layout.wrapper).toContain('bottom-4');
    expect(layout.wrapper).toContain('right-4');
    expect(layout.wrapper).toContain('w-[min(360px,calc(100vw-32px))]');
  });

  it('no celular vai para o topo, 8 px abaixo da base do cabeçalho, e mostra uma frase', () => {
    // 121 px: o cabeçalho de duas linhas em 390 px, com "Atualizar agora" na segunda (#388)
    const layout = toastLayout(true, 121);
    expect(layout.lines).toBe(1);
    expect(layout.style).toEqual({ top: 129 });
    expect(layout.wrapper).not.toContain('bottom-4');
  });
});

describe('narrowToastTop', () => {
  it('acompanha a base do cabeçalho, inclusive empurrada pela faixa do modo demonstração', () => {
    expect(narrowToastTop(121)).toBe(129);
    expect(narrowToastTop(165.6)).toBe(174);
  });

  it('fica a 8 px do topo quando o cabeçalho já saiu da tela ou não foi encontrado', () => {
    expect(narrowToastTop(-300)).toBe(8);
    expect(narrowToastTop(0)).toBe(8);
    expect(narrowToastTop(null)).toBe(8);
  });
});

describe('ChangeToast', () => {
  it('mostra as três frases e conta o resto em "Últimas mudanças" na tela larga', () => {
    const markup = render([change(1), change(2), change(3), change(4)]);
    expect(markup.match(/<li /g)).toHaveLength(3);
    expect(markup).toContain('Serviço 1 ficou indisponível');
    expect(markup).not.toContain('Serviço 4 ficou indisponível');
    expect(markup).toContain('e mais 1 em “Últimas mudanças”');
  });

  it('no celular mostra uma frase e conta o resto, sem repetir as outras', () => {
    const markup = render([change(1), change(2), change(3), change(4)], true);
    expect(markup.match(/<li /g)).toHaveLength(1);
    expect(markup).toContain('Serviço 1 ficou indisponível');
    expect(markup).not.toContain('Serviço 2 ficou indisponível');
    expect(markup).toContain('e mais 3 em “Últimas mudanças”');
    // Sem medida do cabeçalho na renderização estática, o topo cai na folga mínima
    expect(markup).toContain('top:8px');
  });

  it('mantém a região viva montada e sem aviso quando não há mudança', () => {
    const markup = renderToStaticMarkup(<ChangeToast toast={null} />);
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).not.toContain('<li');
    expect(markup).not.toContain('Fechar aviso');
  });

  it('deixa o botão de fechar fora da região viva', () => {
    const markup = render([change(1)]);
    const live = markup.slice(markup.indexOf('role="status"'), markup.indexOf('Fechar aviso'));
    expect(live).not.toContain('×');
  });
});
