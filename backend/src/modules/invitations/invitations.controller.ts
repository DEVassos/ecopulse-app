import type { Request, RequestHandler, Response } from 'express';
import type { Database } from '../../db/connection';
import type { AuthLocals } from '../../middlewares/auth';
import { isValidPassword, PASSWORD_RULE, validName } from '../../shared/account-rules';
import { ValidationError } from '../../shared/errors';
import { isUserRole, type UserRole } from '../../shared/persistence.types';
import type { UserRepository } from '../usuarios/usuarios.repository';
import type { InvitationRepository } from './invitations.repository';
import { createInvitation, readInvitation, register, type InvitationConfig } from './invitations.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function record(body: unknown, message: string): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ValidationError(message);
  return body as Record<string, unknown>;
}

function invitationBody(body: unknown): { email: string; role: UserRole } {
  const message = 'Informe email válido e role "admin" ou "usuario".';
  const { email, role } = record(body, message);
  if (typeof email !== 'string' || !isUserRole(role)) throw new ValidationError(message);
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) throw new ValidationError(message);
  return { email: normalized, role };
}

function registerBody(body: unknown): { token: string; name: string; password: string } {
  const { token, name, password } = record(body, 'Informe token, name e password.');
  if (typeof token !== 'string' || typeof name !== 'string' || typeof password !== 'string') {
    throw new ValidationError('Informe token, name e password.');
  }
  const trimmedName = validName(name);
  if (!isValidPassword(password)) throw new ValidationError(PASSWORD_RULE);
  return { token, name: trimmedName, password };
}

export function createInvitationController(users: UserRepository, invitations: InvitationRepository,
  config: InvitationConfig): RequestHandler {
  const handler = async (req: Request, res: Response<unknown, AuthLocals>): Promise<void> => {
    const { email, role } = invitationBody(req.body);
    res.status(201).json(await createInvitation(users, invitations, email, role, res.locals.auth.id, config));
  };
  return handler as unknown as RequestHandler;
}

export function readInvitationController(invitations: InvitationRepository): RequestHandler {
  return async (req, res) => {
    const token = req.params.token;
    res.status(200).json(await readInvitation(invitations, typeof token === 'string' ? token : ''));
  };
}

export function registerController(database: Database): RequestHandler {
  return async (req, res) => {
    const { token, name, password } = registerBody(req.body);
    res.status(201).json(await register(database, token, name, password));
  };
}
