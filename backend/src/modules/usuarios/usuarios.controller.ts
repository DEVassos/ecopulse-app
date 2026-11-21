import type { RequestHandler, Response } from 'express';
import type { AuthLocals } from '../../middlewares/auth';
import { ValidationError } from '../../shared/errors';
import { UserRepository } from './usuarios.repository';
import { currentUser, login, type AuthConfig } from './usuarios.service';

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
    res.status(200).json(await login(users, email, password, config));
  };
}

export function meController(users: UserRepository): RequestHandler {
  const handler = async (_req: Parameters<RequestHandler>[0], res: Response<unknown, AuthLocals>): Promise<void> => {
    res.status(200).json(await currentUser(users, res.locals.auth));
  };
  return handler as unknown as RequestHandler;
}
