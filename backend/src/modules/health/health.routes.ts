import { Router } from 'express';
import { healthController } from './health.controller';

export function healthRoutes(verify: () => Promise<void>): Router {
  const router = Router();
  router.get('/health', healthController(verify));
  return router;
}
