import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../shared/errors';
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

/**
 * Depois do authMiddleware: só o papel `admin` passa (#196). Sem sessão lida, responde 401, nunca deixa passar;
 * conta `usuario` recebe 403. O controle de acesso é este; esconder botão no frontend é só conveniência.
 */
export function requireAdmin(): RequestHandler {
  const middleware = (_req: Request, res: Response<unknown, Partial<AuthLocals>>, next: NextFunction): void => {
    const auth = res.locals.auth;
    if (auth === undefined) return next(new UnauthorizedError('Token ausente, inválido ou expirado.'));
    if (auth.role !== 'admin') return next(new ForbiddenError());
    return next();
  };
  return middleware as unknown as RequestHandler;
}
