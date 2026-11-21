import { Router } from 'express';
import type { Database } from '../../db/connection';
import { authMiddleware, requireAdmin } from '../../middlewares/auth';
import type { UserRepository } from '../usuarios/usuarios.repository';
import type { AuthConfig } from '../usuarios/usuarios.service';
import { createInvitationController, readInvitationController, registerController } from './invitations.controller';
import type { InvitationRepository } from './invitations.repository';
import type { InvitationConfig } from './invitations.service';

export interface InvitationsDependencies {
  /** O cadastro abre uma transação: precisa do Database, não só de um executor. */
  database: Database;
  invitations: InvitationRepository;
  config: InvitationConfig;
}

/** Convites (#196): emitir é só de administrador; consultar e usar o convite é público, porque quem chega ainda não tem conta. */
export function invitationsRoutes(dependencies: InvitationsDependencies, users: UserRepository, auth: AuthConfig): Router {
  const { database, invitations, config } = dependencies;
  const router = Router();
  router.post('/api/invitations', authMiddleware(auth), requireAdmin(), createInvitationController(users, invitations, config));
  router.get('/api/invitations/:token', readInvitationController(invitations));
  router.post('/api/auth/register', registerController(database));
  return router;
}
