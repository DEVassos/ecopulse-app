import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth';
import type { AuthConfig } from '../usuarios/usuarios.service';
import { compareServicesController, rankingController, servicesController, summaryController } from './services.controller';
import { ServiceRepository } from './services.repository';

export function servicesRoutes(repository: ServiceRepository, auth?: AuthConfig): Router {
  const router = Router();
  if (auth !== undefined) router.get('/api/services/ranking', authMiddleware(auth), rankingController(repository));
  router.get('/api/services/summary', summaryController(repository));
  router.get('/api/services/compare', compareServicesController(repository));
  router.get('/api/services', servicesController(repository));
  return router;
}
