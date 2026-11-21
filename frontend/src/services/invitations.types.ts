// Contrato de POST /api/invitations, GET /api/invitations/:token e POST /api/auth/register (docs/api.md, #196).
import type { UserRole } from './auth.types';

export interface InvitationRequest {
  email: string;
  role: UserRole;
}

/** Convite emitido: o administrador copia o link e o envia pelo canal que quiser (não há envio de e-mail). */
export interface CreatedInvitation {
  inviteUrl: string;
  /** Fim da validade, em ms desde a época. */
  expiresAt: number;
}

/** O que a tela de cadastro mostra em somente leitura: o e-mail e o papel vêm do convite. */
export interface InvitationDetails {
  email: string;
  role: UserRole;
  expiresAt: number;
}

export interface RegisterRequest {
  token: string;
  name: string;
  password: string;
}
