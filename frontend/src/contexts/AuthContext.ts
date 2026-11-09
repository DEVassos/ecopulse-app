import { createContext } from 'react';

export interface AuthUser {
  email: string;
  /** Nome mostrado no cabeçalho: a parte do e-mail antes do @. */
  name: string;
}

export interface AuthContextValue {
  /** Usuário logado, ou null para o visitante. */
  user: AuthUser | null;
  /** A última sessão acabou porque a API recusou o token (401), e não pelo "Sair": a tela de login avisa. */
  sessionExpired: boolean;
  /** Lança ApiError com a mensagem pronta quando o login falha. */
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
