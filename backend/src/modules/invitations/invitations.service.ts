import { createHash, randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import type { Database } from '../../db/connection';
import { withTransaction } from '../../db/transaction.repository';
import { Invitation } from '../../domain/invitation';
import { ConflictError, GoneError, NotFoundError } from '../../shared/errors';
import type { StoredInvitation, UserRole } from '../../shared/persistence.types';
import { UserRepository } from '../usuarios/usuarios.repository';
import { toPublicUser, type PublicUser } from '../usuarios/usuarios.service';
import { InvitationRepository } from './invitations.repository';

export interface InvitationConfig {
  /** Validade do convite em horas (INVITATION_TTL_HOURS). */
  ttlHours: number;
  /** Origem do frontend que abre /cadastro?convite=<token> (primeira origem de CORS_ORIGIN). */
  appUrl: string;
}
export interface CreatedInvitation { inviteUrl: string; expiresAt: string }
export interface InvitationView { email: string; role: UserRole; expiresAt: string }

/** 32 bytes aleatórios em base64url: 43 caracteres. Qualquer outro formato nem chega ao banco. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const BCRYPT_ROUNDS = 10;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function checkTokenFormat(token: string): void {
  if (!TOKEN_PATTERN.test(token)) throw new NotFoundError('Convite não encontrado.');
}

/** Inexistente → 404; usado ou expirado → 410. Devolve o convite só quando ele ainda pode ser usado. */
function availableInvitation(stored: StoredInvitation | null, now: Date): Invitation {
  if (stored === null) throw new NotFoundError('Convite não encontrado.');
  const invitation = Invitation.fromStored(stored);
  const state = invitation.state(now);
  if (state === 'usado') throw new GoneError('Este convite já foi usado.');
  if (state === 'expirado') throw new GoneError('Este convite expirou. Peça um novo ao administrador.');
  return invitation;
}

export async function createInvitation(users: UserRepository, invitations: InvitationRepository, email: string, role: UserRole,
  invitedBy: string, config: InvitationConfig): Promise<CreatedInvitation> {
  if (await users.findByEmail(email) !== null) throw new ConflictError('Já existe uma conta com este e-mail.');
  const token = randomBytes(32).toString('base64url');
  const stored = await invitations.insertInvitation(email, role, hashToken(token), invitedBy, config.ttlHours);
  const inviteUrl = new URL('/cadastro', config.appUrl);
  inviteUrl.searchParams.set('convite', token);
  return { inviteUrl: inviteUrl.toString(), expiresAt: stored.expires_at.toISOString() };
}

export async function readInvitation(invitations: InvitationRepository, token: string, now = new Date()): Promise<InvitationView> {
  checkTokenFormat(token);
  const invitation = availableInvitation(await invitations.findByTokenHash(hashToken(token)), now);
  return { email: invitation.email(), role: invitation.role(), expiresAt: invitation.expiresAt().toISOString() };
}

/**
 * Cria a conta do convite e marca o convite como usado na mesma transação: se a conta não puder ser criada,
 * o convite volta a ficar disponível (ROLLBACK). O e-mail e o papel vêm do convite, nunca do corpo.
 */
export async function register(database: Database, token: string, name: string, password: string): Promise<PublicUser> {
  checkTokenFormat(token);
  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const tokenHash = hashToken(token);
  return withTransaction(database, async tx => {
    const invitations = new InvitationRepository(tx);
    const claimed = await invitations.claimAvailable(tokenHash);
    if (claimed === null) {
      availableInvitation(await invitations.findByTokenHash(tokenHash), new Date());
      // Disponível pelo relógio da aplicação, mas não pelo do banco: o banco decide
      throw new GoneError('Este convite expirou. Peça um novo ao administrador.');
    }
    const users = new UserRepository(tx);
    if (await users.findByEmail(claimed.email) !== null) throw new ConflictError('Já existe uma conta com este e-mail.');
    return toPublicUser(await users.insertUser(claimed.email, name, passwordHash, claimed.role));
  });
}
