import { ApiError, apiRequest } from './api';
import type { CurrentUser, LoginRequest, LoginResponse } from './auth.types';
import { readId, readRecord, readText } from './contract';
import { isDemoMode } from './services.service';

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
  return { token: readId(response.token, 'token') };
}

/** Rota privada: o api.ts envia o token da sessão em Authorization: Bearer; 401 encerra a sessão. */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  const response = readRecord(await apiRequest<unknown>('/auth/me', { signal }), 'me');
  return { id: readId(response.id, 'id'), email: readText(response.email, 'email') };
}
