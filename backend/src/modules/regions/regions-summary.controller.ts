import type { RequestHandler } from 'express';
import { summaryPeriod } from '../../shared/summary-period';
import type { RegionsSummaryRepository } from './regions-summary.repository';
import { getRegionsSummary } from './regions-summary.service';

export function regionsSummaryController(repository: RegionsSummaryRepository): RequestHandler {
  return async (req, res) => { res.status(200).json(await getRegionsSummary(repository, summaryPeriod(req.query))); };
}
