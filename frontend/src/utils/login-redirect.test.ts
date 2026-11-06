import { describe, expect, it } from 'vitest';
import { loginDestination, returnPath } from './login-redirect';

describe('returnPath', () => {
  it('guarda o caminho com a query e a âncora, para o login voltar à mesma tela (#257)', () => {
    expect(returnPath({ pathname: '/emissoes', search: '?servico=fraud-detector&de=2026-09-01', hash: '#grafico' })).toBe(
      '/emissoes?servico=fraud-detector&de=2026-09-01#grafico',
    );
  });
});

describe('loginDestination', () => {
  it('volta para a tela guardada pelo ProtectedRoute', () => {
    expect(loginDestination({ from: '/comparacao?ids=1,2' })).toBe('/comparacao?ids=1,2');
  });

  it.each([
    ['sem state (abriu /login direto)', null],
    ['state sem from', {}],
    ['from que não é texto', { from: 42 }],
    ['endereço de outro site', { from: 'https://exemplo.com' }],
    ['caminho com duas barras (outro host)', { from: '//exemplo.com' }],
  ])('vai para o dashboard: %s', (_case, state) => {
    expect(loginDestination(state)).toBe('/');
  });
});
