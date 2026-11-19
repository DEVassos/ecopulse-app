import { Router } from 'express';
import { regionsSummaryController } from './regions-summary.controller';
import type { RegionsSummaryRepository } from './regions-summary.repository';

export function regionsSummaryRoutes(repository: RegionsSummaryRepository): Router {
  const router = Router();
  router.get('/api/regions/summary', regionsSummaryController(repository));
  return router;
}
