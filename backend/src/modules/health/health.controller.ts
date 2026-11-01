import type { RequestHandler } from 'express';
import { getHealth } from './health.service';

export function healthController(verify: () => Promise<void>): RequestHandler {
  return async (_req, res) => { res.status(200).json(await getHealth(verify)); };
}
