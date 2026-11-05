import type { RequestHandler } from 'express';
import { MonitoringSettingsRepository } from './monitoring-settings.repository';
import { getMonitoringSettings, updateMonitoringSettings } from './monitoring-settings.service';

export function readSettingsController(repository: MonitoringSettingsRepository): RequestHandler {
  return async (_req, res) => { res.status(200).json(await getMonitoringSettings(repository)); };
}

export function writeSettingsController(repository: MonitoringSettingsRepository): RequestHandler {
  return async (req, res) => {
    const body: unknown = req.body;
    const seconds = typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>).refreshIntervalSeconds : undefined;
    res.status(200).json(await updateMonitoringSettings(repository, seconds));
  };
}
