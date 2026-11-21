import { ApiError, apiRequest, unexpectedFormat } from './api';
import { readRole, readUser } from './auth.service';
import type { CurrentUser } from './auth.types';
import { instant, readRecord, readText } from './contract';
import type { CreatedInvitation, InvitationDetails, InvitationRequest, RegisterRequest } from './invitations.types';
import { isDemoMode } from './services.service';

const DEMO_MESSAGE = 'Convites e cadastro precisam do backend. Defina VITE_API_URL no .env e suba a aplicação.';

function readInstant(value: unknown, field: string): number {
  const time = instant(value);
  if (time === undefined) throw unexpectedFormat(field);
  return time;
}

/** POST /invitations (só administrador; conta `usuario` recebe 403 e e-mail com conta, 409). */
export async function createInvitation(request: InvitationRequest): Promise<CreatedInvitation> {
  if (isDemoMode) throw new ApiError(DEMO_MESSAGE, 0);
  const body = readRecord(await apiRequest<unknown>('/invitations', { method: 'POST', body: request }), 'convite');
  const inviteUrl = readText(body.inviteUrl, 'inviteUrl');
  // O link precisa abrir a tela de cadastro com o token: qualquer outra coisa não serve para enviar a alguém
  if (!/^https?:\/\/[^\s]+\/cadastro\?convite=[A-Za-z0-9_-]+$/.test(inviteUrl)) throw unexpectedFormat('inviteUrl');
  return { inviteUrl, expiresAt: readInstant(body.expiresAt, 'expiresAt') };
}

/** GET /invitations/:token, público: 404 inexistente, 410 usado ou expirado (com a mensagem do backend). */
export async function fetchInvitation(token: string, signal?: AbortSignal): Promise<InvitationDetails> {
  if (isDemoMode) throw new ApiError(DEMO_MESSAGE, 0);
  const body = readRecord(await apiRequest<unknown>(`/invitations/${encodeURIComponent(token)}`, { signal }), 'convite');
  return {
    email: readText(body.email, 'email'),
    role: readRole(body.role, 'role'),
    expiresAt: readInstant(body.expiresAt, 'expiresAt'),
  };
}

/** POST /auth/register, público: cria a conta com o e-mail e o papel do convite. */
export async function registerWithInvitation(request: RegisterRequest): Promise<CurrentUser> {
  if (isDemoMode) throw new ApiError(DEMO_MESSAGE, 0);
  return readUser(await apiRequest<unknown>('/auth/register', { method: 'POST', body: request }), 'cadastro');
}
