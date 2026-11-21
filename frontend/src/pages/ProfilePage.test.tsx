import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import PasswordChangeForm from '../components/PasswordChangeForm';
import ProfileDetailsForm from '../components/ProfileDetailsForm';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthContextValue } from '../contexts/AuthContext';
import type { CurrentUser } from '../services/auth.types';
import { PASSWORD_RULE } from '../utils/validation';
import ProfilePage from './ProfilePage';

// Sem DOM (renderToStaticMarkup): os efeitos não rodam, então a página aparece como na primeira pintura, confirmando
// a sessão. Os formulários são conferidos à parte, com a conta já carregada.
const USER: CurrentUser = { id: '2', email: 'usuario@ecopulse.local', name: 'Ana Souza', role: 'usuario' };

function render(children: ReactNode): string {
  const auth: AuthContextValue = {
    user: { email: USER.email, name: USER.name, role: USER.role },
    sessionExpired: false,
    login: async () => {},
    logout: () => {},
    updateUser: () => {},
  };
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/perfil']}>
      <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('ProfilePage (#401)', () => {
  it('confirma a sessão no backend antes de mostrar os formulários, e o nome do cabeçalho leva ao Perfil', () => {
    const html = render(<ProfilePage />);
    expect(html).toContain('<h1');
    expect(html).toContain('Perfil');
    expect(html).toContain('Confirmando a sessão…');
    expect(html).not.toContain('Trocar senha');
    // O nome no cabeçalho é o link do Perfil, marcado como página atual
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/perfil"[^>]*>Olá, <strong>Ana Souza<\/strong><\/a>/);
  });
});

describe('Seus dados', () => {
  it('nome editável; e-mail e papel só para leitura, com o motivo', () => {
    const html = render(<ProfileDetailsForm user={USER} />);
    expect(html).toContain('id="profile-name"');
    expect(html).toContain('value="Ana Souza"');
    expect(html).toContain('autoComplete="name"');
    // E-mail e papel são texto, não campos: não há input para eles
    expect(html.match(/<input/g)).toHaveLength(1);
    expect(html).toContain('usuario@ecopulse.local');
    expect(html).toContain('O e-mail identifica a conta no login e não muda por aqui.');
    expect(html).toContain('font-semibold">Usuário</dd>');
    expect(html).toContain('O papel é definido quando a conta é criada e não muda por aqui.');
  });

  it('Salvar nome começa desabilitado (nada mudou) e o resultado sai numa região role="status"', () => {
    const html = render(<ProfileDetailsForm user={USER} />);
    expect(html).toMatch(/<button type="submit" disabled=""[^>]*>Salvar nome<\/button>/);
    expect(html).toContain('role="status"');
  });
});

describe('Trocar senha', () => {
  it('três campos de senha com autocomplete certo e a regra do cadastro como dica', () => {
    const html = render(<PasswordChangeForm />);
    expect(html).toMatch(/type="password" id="password-current"[^>]*autoComplete="current-password"/);
    expect(html).toMatch(/type="password" id="password-new"[^>]*autoComplete="new-password"/);
    expect(html).toMatch(/type="password" id="password-confirmation"[^>]*autoComplete="new-password"/);
    expect(html).toContain(PASSWORD_RULE);
    expect(html).toContain('aria-describedby="hint-password-new"');
  });

  it('um só "Mostrar as senhas" para os três campos, sem o botão de cada campo', () => {
    const html = render(<PasswordChangeForm />);
    expect(html).toMatch(/<input type="checkbox"[^>]*\/>Mostrar as senhas<\/label>/);
    expect(html).not.toContain('aria-label="Mostrar senha"');
  });

  it('avisa que trocar a senha não encerra as sessões já abertas', () => {
    const html = render(<PasswordChangeForm />);
    expect(html).toContain('Trocar a senha não encerra as sessões já abertas');
    expect(html).toMatch(/<button type="submit"[^>]*>Trocar senha<\/button>/);
  });
});
