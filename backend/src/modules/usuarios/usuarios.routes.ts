import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth';
import { loginController, meController } from './usuarios.controller';
import { UserRepository } from './usuarios.repository';
import type { AuthConfig } from './usuarios.service';

export function authRoutes(users: UserRepository, config: AuthConfig): Router {
  const router = Router();
  router.post('/api/auth/login', loginController(users, config));
  router.get('/api/auth/me', authMiddleware(config), meController);
  return router;
}
