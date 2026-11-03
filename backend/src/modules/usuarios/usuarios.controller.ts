import type { RequestHandler, Response } from 'express';
import type { AuthLocals } from '../../middlewares/auth';
import { ValidationError } from '../../shared/errors';
import { UserRepository } from './usuarios.repository';
import { login, type AuthConfig } from './usuarios.service';

function credentials(body: unknown): { email: string; password: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ValidationError('Informe email e password.');
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== 'string' || email.trim() === '' || typeof password !== 'string' || password === '') {
    throw new ValidationError('Informe email e password.');
  }
  return { email: email.trim(), password };
}

export function loginController(users: UserRepository, config: AuthConfig): RequestHandler {
  return async (req, res) => {
    const { email, password } = credentials(req.body);
    res.status(200).json({ token: await login(users, email, password, config) });
  };
}
export function meController(_req: Parameters<RequestHandler>[0], res: Response<unknown, AuthLocals>): void {
  res.status(200).json(res.locals.auth);
}
