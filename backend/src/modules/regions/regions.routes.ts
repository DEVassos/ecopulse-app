import { Router } from 'express';
import type { CarbonApi } from '../../integrations/carbon-api';
import { ServiceRepository } from '../services/services.repository';
import { regionsController } from './regions.controller';

export function regionsRoutes(carbonApi: CarbonApi, services: ServiceRepository): Router {
  const router = Router();
  router.get('/api/regions', regionsController(carbonApi, services));
  return router;
}
