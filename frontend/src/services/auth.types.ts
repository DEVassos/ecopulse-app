// Contrato de POST /api/auth/login, GET /api/auth/me (docs/api.md, #20; papel desde a #196) e do perfil (#400).

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

/** Corpo de PATCH /api/auth/me (#400): só o nome; e-mail e papel não mudam pelo perfil. */
export interface ProfileUpdate {
  name: string;
}

/** Corpo de PUT /api/auth/me/password (#400); a resposta é 204, sem corpo. */
export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

/** Campo do formulário de troca de senha a que um 400 do backend se refere. */
export type PasswordField = 'currentPassword' | 'newPassword';
