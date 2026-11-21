// Contrato de POST /api/auth/login e GET /api/auth/me (docs/api.md, #20; papel desde a #196).

/** Papel da conta: `admin` altera a configuração e convida; `usuario` só consulta (#196). */
export type UserRole = 'admin' | 'usuario';

export const ROLE_LABELS: Record<UserRole, string> = { admin: 'Administrador', usuario: 'Usuário' };

export interface LoginRequest {
  email: string;
  password: string;
}

/** Conta como o backend devolve: nunca traz hash de senha. */
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginResponse {
  /** JWT assinado pelo backend; enviado em Authorization: Bearer. */
  token: string;
  user: CurrentUser;
}
