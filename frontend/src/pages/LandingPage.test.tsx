import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthContextValue } from '../contexts/AuthContext';
import LandingPage from './LandingPage';

// O <Navigate> só navega num efeito, que a renderização estática não roda: aqui ele vira um marcador com o destino
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, Navigate: ({ to }: { to: string }) => <p>vai para {to}</p> };
});

// Sem DOM (renderToStaticMarkup): os efeitos não rodam. O AuthBackdrop lê o matchMedia no primeiro render, então o
// window é simulado com "menos movimento" desligado; o vídeo e o pulso do logo foram conferidos no navegador (#438).
function render(path: string, user: AuthContextValue['user']): string {
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  });
  const auth: AuthContextValue = { user, sessionExpired: false, login: async () => {}, logout: () => {}, updateUser: () => {} };
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route path="/inicio" element={<LandingPage />} />
          <Route path="/login" element={<p>tela de login</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>painel</p>} />
            <Route path="/emissoes" element={<p>emissões</p>} />
          </Route>
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LandingPage (#438)', () => {
  it('mostra a chamada, a prévia marcada como ilustrativa e os seis recursos, com ícones SVG e sem emoji', () => {
    const html = render('/inicio', null);
    expect(html).toContain('O impacto ambiental do seu software, <span>finalmente visível.</span>');
    expect(html).toContain('Dados ilustrativos');
    expect(html.match(/<li class="panel">/g)).toHaveLength(6);
    expect(html.match(/class="landing-feature-icon"><svg/g)).toHaveLength(6);
    expect(html).not.toMatch(/\p{Extended_Pictographic}️?/u);
    expect(html).toContain('class="auth-backdrop-video"');
  });

  it('sem sessão, os botões levam ao login; com sessão, ao painel', () => {
    const visitor = render('/inicio', null);
    expect(visitor).toMatch(/<a class="landing-btn landing-btn--small" href="\/login"[^>]*>Entrar<\/a>/);
    expect(visitor).toContain('Entrar no painel');

    const member = render('/inicio', { email: 'admin@ecopulse.local', name: 'Administrador', role: 'admin' });
    expect(member).toMatch(/<a class="landing-btn landing-btn--small" href="\/"[^>]*>Painel<\/a>/);
    expect(member).toContain('Ir para o painel');
  });
});

describe('ProtectedRoute com a página inicial (#438)', () => {
  it('manda o visitante da raiz para /inicio e o das outras telas para o login', () => {
    expect(render('/', null)).toContain('vai para /inicio');
    expect(render('/emissoes', null)).toContain('vai para /login');
    // Com query na raiz, a pessoa queria uma tela específica: continua indo para o login
    expect(render('/?servico=fraud-detector', null)).toContain('vai para /login');
  });

  it('com sessão, a raiz abre o painel', () => {
    expect(render('/', { email: 'admin@ecopulse.local', name: 'Administrador', role: 'admin' })).toContain('painel');
  });
});
