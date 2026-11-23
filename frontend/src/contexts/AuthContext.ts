import { createContext } from 'react';
import type { UserRole } from '../services/auth.types';

export interface AuthUser {
  email: string;
  /** Nome mostrado no cabeçalho, como o backend devolveu no login (#196). */
  name: string;
  /** Só decide o que a tela mostra (ex.: Convidar pessoa); quem bloqueia a ação é o backend, com 403. */
  role: UserRole;
}

export interface AuthContextValue {
  /** Usuário logado, ou null para o visitante. */
  user: AuthUser | null;
  /** A última sessão acabou porque a API recusou o token (401), e não pelo "Sair": a tela de login avisa. */
  sessionExpired: boolean;
  /** Lança ApiError com a mensagem pronta quando o login falha. */
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Troca os dados da conta na sessão aberta, sem novo login: o nome salvo no Perfil vai ao cabeçalho (#401). */
  updateUser: (user: AuthUser) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
