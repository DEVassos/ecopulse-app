import { ApiError, apiRequest, unexpectedFormat } from './api';
import type { CurrentUser, LoginRequest, LoginResponse, UserRole } from './auth.types';
import { readId, readRecord, readText } from './contract';
import { isDemoMode } from './services.service';

export function readRole(value: unknown, field: string): UserRole {
  if (value === 'admin' || value === 'usuario') return value;
  throw unexpectedFormat(field);
}

/** Conta de `user` no login, `GET /auth/me` e `POST /auth/register`: id, e-mail, nome e papel (#196). */
export function readUser(value: unknown, field: string): CurrentUser {
  const user = readRecord(value, field);
  return {
    id: readId(user.id, 'id'),
    email: readText(user.email, 'email'),
    name: readText(user.name, 'name'),
    role: readRole(user.role, 'role'),
  };
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  // Sem backend não há quem confira a senha: o modo demonstração não abre a área restrita
  if (isDemoMode) throw new ApiError('O login precisa do backend. Defina VITE_API_URL no .env e suba a aplicação.', 0);

  let body: unknown;
  try {
    body = await apiRequest<unknown>('/auth/login', { method: 'POST', body: credentials });
  } catch (error) {
    // No login, 401 significa credencial errada, não sessão expirada
    if (error instanceof ApiError && error.status === 401) throw new ApiError('E-mail ou senha incorretos.', 401);
    throw error;
  }
  const response = readRecord(body, 'login');
  return { token: readId(response.token, 'token'), user: readUser(response.user, 'user') };
}

/** Rota privada: o api.ts envia o token da sessão em Authorization: Bearer; 401 encerra a sessão. */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  return readUser(await apiRequest<unknown>('/auth/me', { signal }), 'me');
}
