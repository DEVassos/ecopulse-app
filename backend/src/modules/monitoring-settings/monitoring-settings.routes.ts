import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth';
import type { AuthConfig } from '../usuarios/usuarios.service';
import { readSettingsController, writeSettingsController } from './monitoring-settings.controller';
import { MonitoringSettingsRepository } from './monitoring-settings.repository';

export function monitoringSettingsRoutes(repository: MonitoringSettingsRepository, config: AuthConfig): Router {
  const router = Router();
  router.get('/api/monitoring-settings', readSettingsController(repository));
  router.put('/api/monitoring-settings', authMiddleware(config), writeSettingsController(repository));
  return router;
}
