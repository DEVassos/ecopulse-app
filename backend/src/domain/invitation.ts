import type { StoredInvitation, UserRole } from '../shared/persistence.types';

export type InvitationState = 'disponivel' | 'usado' | 'expirado';

/** Convite de cadastro (#196): uso único e com validade; o token do link nunca fica aqui, só no link. */
export class Invitation {
  readonly #email: string;
  readonly #role: UserRole;
  readonly #expiresAt: Date;
  readonly #usedAt: Date | null;

  private constructor(email: string, role: UserRole, expiresAt: Date, usedAt: Date | null) {
    this.#email = email;
    this.#role = role;
    this.#expiresAt = expiresAt;
    this.#usedAt = usedAt;
  }

  static fromStored(invitation: StoredInvitation): Invitation {
    return new Invitation(invitation.email, invitation.role, invitation.expires_at, invitation.used_at);
  }

  email(): string { return this.#email; }

  role(): UserRole { return this.#role; }

  expiresAt(): Date { return new Date(this.#expiresAt); }

  /** Usado vence expirado: quem abre um link já usado precisa saber que a conta existe. */
  state(now: Date): InvitationState {
    if (this.#usedAt !== null) return 'usado';
    return this.#expiresAt.getTime() <= now.getTime() ? 'expirado' : 'disponivel';
  }
}
