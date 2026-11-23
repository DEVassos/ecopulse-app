import { ApiError, apiRequest, unexpectedFormat } from './api';
import type { CurrentUser, LoginRequest, LoginResponse, PasswordChange, PasswordField, ProfileUpdate, UserRole } from './auth.types';
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

/** PATCH /auth/me (#400): a própria conta troca o nome; devolve a conta conferida, como no login. */
export async function updateProfile(update: ProfileUpdate): Promise<CurrentUser> {
  return readUser(await apiRequest<unknown>('/auth/me', { method: 'PATCH', body: update }), 'me');
}

/**
 * PUT /auth/me/password (#400): 204 sem corpo. Senha atual errada volta como 400 (não 401), então não encerra a
 * sessão: o ApiError traz a mensagem do backend, e `passwordErrorField` diz em que campo mostrá-la.
 */
export async function changePassword(change: PasswordChange): Promise<void> {
  await apiRequest<unknown>('/auth/me/password', { method: 'PUT', body: change });
}

/** Mensagens do 400 de PUT /auth/me/password (docs/api.md): o backend não diz o campo, só a mensagem. */
const CURRENT_PASSWORD_MESSAGE = 'A senha atual não confere.';
const NEW_PASSWORD_MESSAGES = ['A nova senha deve ser diferente da atual.', 'A senha deve ter de 8 a 72 caracteres'];

/** Campo em que a tela mostra o 400 da troca de senha; null quando é outro erro (vai para o aviso do formulário). */
export function passwordErrorField(error: unknown): PasswordField | null {
  if (!(error instanceof ApiError) || error.status !== 400) return null;
  if (error.message === CURRENT_PASSWORD_MESSAGE) return 'currentPassword';
  return NEW_PASSWORD_MESSAGES.some((message) => error.message.startsWith(message)) ? 'newPassword' : null;
}
