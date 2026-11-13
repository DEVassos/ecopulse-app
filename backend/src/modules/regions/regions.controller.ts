import type { RequestHandler } from 'express';
import type { CarbonApi } from '../../integrations/carbon-api';
import { ServiceRepository } from '../services/services.repository';
import { getRegions } from './regions.service';

export function regionsController(carbonApi: CarbonApi, services: ServiceRepository): RequestHandler {
  return async (_req, res) => { res.status(200).json(await getRegions(carbonApi, services)); };
}
