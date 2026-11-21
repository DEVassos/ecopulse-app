import type { Request, RequestHandler, Response } from 'express';
import type { AuthLocals } from '../../middlewares/auth';
import { isValidPassword, PASSWORD_RULE, validName } from '../../shared/account-rules';
import { ValidationError } from '../../shared/errors';
import { UserRepository } from './usuarios.repository';
import { changePassword, currentUser, login, updateProfile, type AuthConfig } from './usuarios.service';

function record(body: unknown, message: string): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ValidationError(message);
  return body as Record<string, unknown>;
}

function credentials(body: unknown): { email: string; password: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ValidationError('Informe email e password.');
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== 'string' || email.trim() === '' || typeof password !== 'string' || password === '') {
    throw new ValidationError('Informe email e password.');
  }
  return { email: email.trim(), password };
}

/** Só `name`: e-mail e papel vêm do convite e não são alterados pelo perfil (campos extras são ignorados). */
function profileBody(body: unknown): { name: string } {
  const { name } = record(body, 'Informe name.');
  if (typeof name !== 'string') throw new ValidationError('Informe name.');
  return { name: validName(name) };
}

function passwordBody(body: unknown): { currentPassword: string; newPassword: string } {
  const message = 'Informe currentPassword e newPassword.';
  const { currentPassword, newPassword } = record(body, message);
  if (typeof currentPassword !== 'string' || currentPassword === '' || typeof newPassword !== 'string') {
    throw new ValidationError(message);
  }
  if (!isValidPassword(newPassword)) throw new ValidationError(PASSWORD_RULE);
  return { currentPassword, newPassword };
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

export function updateProfileController(users: UserRepository): RequestHandler {
  const handler = async (req: Request, res: Response<unknown, AuthLocals>): Promise<void> => {
    const { name } = profileBody(req.body);
    res.status(200).json(await updateProfile(users, res.locals.auth, name));
  };
  return handler as unknown as RequestHandler;
}

export function changePasswordController(users: UserRepository): RequestHandler {
  const handler = async (req: Request, res: Response<unknown, AuthLocals>): Promise<void> => {
    const { currentPassword, newPassword } = passwordBody(req.body);
    await changePassword(users, res.locals.auth, currentPassword, newPassword);
    res.status(204).end();
  };
  return handler as unknown as RequestHandler;
}
