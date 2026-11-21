import { compare } from 'bcryptjs';
import { sign, verify, type SignOptions } from 'jsonwebtoken';
import { AppError, UnauthorizedError } from '../../shared/errors';
import { isUserRole, type StoredUser, type UserRole } from '../../shared/persistence.types';
import { UserRepository } from './usuarios.repository';

export interface AuthConfig { jwtSecret: string; jwtExpiresIn: NonNullable<SignOptions['expiresIn']> }
/** Quem o JWT identifica; o papel decide o que a sessão pode alterar (#196). */
export interface AuthenticatedUser { id: string; email: string; role: UserRole }
/** Conta como sai nas respostas HTTP: nunca leva password_hash. */
export interface PublicUser { id: string; email: string; name: string; role: UserRole }
export interface LoginResult { token: string; user: PublicUser }
const DUMMY_PASSWORD_HASH = '$2b$10$wXvZFVHwuRiALF1fPMejAO8nKTXwWqIiX9TIOHPfCJe3Ljd0WRF8O';

export function toPublicUser(user: StoredUser): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function login(users: UserRepository, email: string, password: string, config: AuthConfig): Promise<LoginResult> {
  const user = await users.findByEmail(email);
  const passwordHash = user?.password_hash ?? DUMMY_PASSWORD_HASH;
  if (!await compare(password, passwordHash) || user === null) throw new UnauthorizedError('Credenciais inválidas.');
  // Volume criado antes da #196: sem a coluna, o token sairia sem papel e toda rota responderia 401 sem explicar
  if (!isUserRole(user.role)) {
    throw new AppError('DATABASE_ERROR', 500, 'O banco não tem o papel dos usuários: aplique database/migrations/003-users-role-invitations.sql.');
  }
  const token = sign({ email: user.email, role: user.role }, config.jwtSecret,
    { subject: user.id, expiresIn: config.jwtExpiresIn, algorithm: 'HS256' });
  return { token, user: toPublicUser(user) };
}

/** Token sem papel (emitido antes da #196) é recusado: a pessoa entra de novo e recebe um token com papel. */
export function readToken(token: string, config: AuthConfig): AuthenticatedUser {
  try {
    const payload = verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.email !== 'string'
      || typeof payload.exp !== 'number' || !isUserRole(payload.role)) throw new Error('Payload inválido');
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    throw new UnauthorizedError('Token ausente, inválido ou expirado.');
  }
}

/** GET /api/auth/me: confirma no banco que a conta do token ainda existe e devolve nome e papel atuais. */
export async function currentUser(users: UserRepository, auth: AuthenticatedUser): Promise<PublicUser> {
  const user = await users.findById(auth.id);
  if (user === null) throw new UnauthorizedError('Token ausente, inválido ou expirado.');
  return toPublicUser(user);
}
