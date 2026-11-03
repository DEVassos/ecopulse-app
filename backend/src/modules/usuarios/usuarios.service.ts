import { compare } from 'bcryptjs';
import { sign, verify, type SignOptions } from 'jsonwebtoken';
import { UnauthorizedError } from '../../shared/errors';
import { UserRepository } from './usuarios.repository';

export interface AuthConfig { jwtSecret: string; jwtExpiresIn: NonNullable<SignOptions['expiresIn']> }
export interface AuthenticatedUser { id: string; email: string }
const DUMMY_PASSWORD_HASH = '$2b$10$wXvZFVHwuRiALF1fPMejAO8nKTXwWqIiX9TIOHPfCJe3Ljd0WRF8O';

export async function login(users: UserRepository, email: string, password: string, config: AuthConfig): Promise<string> {
  const user = await users.findByEmail(email);
  const passwordHash = user?.password_hash ?? DUMMY_PASSWORD_HASH;
  if (!await compare(password, passwordHash) || user === null) throw new UnauthorizedError('Credenciais inválidas.');
  return sign({ email: user.email }, config.jwtSecret, { subject: user.id, expiresIn: config.jwtExpiresIn, algorithm: 'HS256' });
}

export function readToken(token: string, config: AuthConfig): AuthenticatedUser {
  try {
    const payload = verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.email !== 'string' || typeof payload.exp !== 'number') throw new Error('Payload inválido');
    return { id: payload.sub, email: payload.email };
  } catch {
    throw new UnauthorizedError('Token ausente, inválido ou expirado.');
  }
}
