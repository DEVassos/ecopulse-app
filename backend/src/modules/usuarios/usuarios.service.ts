import { compare, hash } from 'bcryptjs';
import { sign, verify, type SignOptions } from 'jsonwebtoken';
import { BCRYPT_ROUNDS } from '../../shared/account-rules';
import { AppError, UnauthorizedError, ValidationError } from '../../shared/errors';
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

/** Token válido de uma conta que não existe mais: a sessão acabou, como em GET /api/auth/me. */
function accountGone(): UnauthorizedError {
  return new UnauthorizedError('Token ausente, inválido ou expirado.');
}

/** GET /api/auth/me: confirma no banco que a conta do token ainda existe e devolve nome e papel atuais. */
export async function currentUser(users: UserRepository, auth: AuthenticatedUser): Promise<PublicUser> {
  const user = await users.findById(auth.id);
  if (user === null) throw accountGone();
  return toPublicUser(user);
}

/** PATCH /api/auth/me (#400): a própria conta troca o nome; e-mail e papel não mudam por aqui. */
export async function updateProfile(users: UserRepository, auth: AuthenticatedUser, name: string): Promise<PublicUser> {
  const user = await users.updateName(auth.id, name);
  if (user === null) throw accountGone();
  return toPublicUser(user);
}

/**
 * PUT /api/auth/me/password (#400). Senha atual errada é 400, não 401: o frontend encerra a sessão em qualquer 401.
 * Não revoga outros tokens: o JWT não tem lista de revogação e vale até JWT_EXPIRES_IN.
 */
export async function changePassword(users: UserRepository, auth: AuthenticatedUser,
  currentPassword: string, newPassword: string): Promise<void> {
  const user = await users.findById(auth.id);
  if (user === null) throw accountGone();
  if (!await compare(currentPassword, user.password_hash)) throw new ValidationError('A senha atual não confere.');
  if (newPassword === currentPassword) throw new ValidationError('A nova senha deve ser diferente da atual.');
  if (!await users.updatePassword(user.id, await hash(newPassword, BCRYPT_ROUNDS))) throw accountGone();
}
