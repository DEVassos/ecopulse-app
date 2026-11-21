import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../contexts/AuthContext';
import HelpAdmin from './HelpAdmin';

const render = (user: AuthUser | null, allowed: number[] | null = [15, 30, 60]) =>
  renderToStaticMarkup(<HelpAdmin user={user} refreshSeconds={30} allowedSeconds={allowed} />);

describe('HelpAdmin', () => {
  it('diz o papel da conta comum e que ela não altera o que é do administrador (critério 2 da #398)', () => {
    const html = render({ name: 'Usuária', email: 'usuario@ecopulse.local', role: 'usuario' });
    expect(html).toContain('Papel: <strong>Usuário</strong>');
    expect(html).toContain('Sua conta não altera estes itens.');
    expect(html).toContain('Intervalo de atualização da tela (15, 30 ou 60 s; agora, a cada 30 s)');
    for (const item of ['Coeficientes do modelo de potência', 'Intensidade de carbono das regiões', 'Lista de serviços monitorados']) {
      expect(html).toContain(item);
    }
  });

  it('para o administrador, diz o que a conta altera', () => {
    const html = render({ name: 'Administrador', email: 'admin@ecopulse.local', role: 'admin' });
    expect(html).toContain('Papel: <strong>Administrador</strong>');
    expect(html).toContain('Sua conta altera estes itens.');
  });

  it('sem a lista do backend, mostra só o intervalo em uso; sem sessão, explica o modo demonstração', () => {
    const html = render(null, null);
    expect(html).toContain('Intervalo de atualização da tela (agora, a cada 30 s)');
    expect(html).toContain('Modo demonstração: não há sessão nem papel.');
    expect(html).not.toContain('Sua conta');
  });
});
