import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { UnauthorizedError } from '../shared/errors';
import { readToken, type AuthConfig, type AuthenticatedUser } from '../modules/usuarios/usuarios.service';

export interface AuthLocals { auth: AuthenticatedUser }

export function authMiddleware(config: AuthConfig): RequestHandler {
  const middleware = (req: Request, res: Response<unknown, AuthLocals>, next: NextFunction): void => {
    const match = req.get('authorization')?.match(/^Bearer\s+(.+)$/i);
    if (match?.[1] === undefined) return next(new UnauthorizedError('Token ausente, inválido ou expirado.'));
    try { res.locals.auth = readToken(match[1], config); return next(); }
    catch (error) { return next(error); }
  };
  return middleware as unknown as RequestHandler;
}
