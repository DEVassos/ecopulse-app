/** Estado que o ProtectedRoute manda para /login (#257). */
export interface LoginRedirectState {
  /** Caminho com a query (`/emissoes?servico=…`), para voltar exatamente à mesma tela depois do login. */
  from: string;
}

/** Caminho completo da tela atual, com query e âncora, para o login devolver a pessoa ao mesmo lugar. */
export function returnPath(location: { pathname: string; search: string; hash: string }): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

/**
 * Para onde ir depois do login: a tela guardada pelo ProtectedRoute, ou o dashboard. Só aceita caminho interno
 * (uma barra só no começo), para um `state` montado à mão não levar a pessoa para fora da aplicação.
 */
export function loginDestination(state: unknown): string {
  const from = (state as Partial<LoginRedirectState> | null)?.from;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';
}

/** Estado que o cadastro por convite manda para /login (#197): mostra "Conta criada…" e já preenche o e-mail. */
export interface RegisteredState {
  registeredEmail: string;
}

export function registeredEmail(state: unknown): string | null {
  const email = (state as Partial<RegisteredState> | null)?.registeredEmail;
  return typeof email === 'string' && email !== '' ? email : null;
}
