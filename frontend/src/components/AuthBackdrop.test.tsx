import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import AuthBackdrop from './AuthBackdrop';

// A renderização estática não roda efeitos: o teste cobre a marcação do primeiro render. O autoplay, o
// silêncio e o fallback dependem do <video> vivo e foram conferidos no navegador (issue #436).

function render(reducedMotion: boolean): string {
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: reducedMotion, addEventListener: () => {}, removeEventListener: () => {} }),
  });
  const markup = renderToStaticMarkup(<AuthBackdrop />);
  vi.unstubAllGlobals();
  return markup;
}

describe('AuthBackdrop', () => {
  it('sobe o vídeo em looping atrás do cartão, mudo, sem controles e fora da árvore de acessibilidade (#436)', () => {
    const html = render(false);
    expect(html).toContain('<div class="auth-backdrop" aria-hidden="true">');
    expect(html).toMatch(/<video[^>]*class="auth-backdrop-video"/);
    expect(html).toMatch(/<video[^>]*\bloop\b/);
    expect(html).toMatch(/<video[^>]*\bplaysinline\b/i);
    expect(html).toMatch(/<video[^>]*\bpreload="auto"/);
    expect(html).toMatch(/<video[^>]*\btabindex="-1"/i);
    // Sem controles e sem áudio: o vídeo original tem faixa de som, que não deve tocar
    expect(html).not.toMatch(/<video[^>]*\bcontrols\b/);
    expect(html).not.toMatch(/<video[^>]*\bunmuted\b/);
    expect(html).toContain('class="auth-backdrop-veil"');
  });

  it('não renderiza nada quando o sistema pede menos movimento, para o arquivo nem ser baixado', () => {
    expect(render(true)).toBe('');
  });
});
