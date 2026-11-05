import express from 'express';
import { healthRoutes } from './modules/health/health.routes';
import { collectionsRoutes } from './modules/collections/collections.routes';
import { CollectionRepository } from './modules/collections/collections.repository';
import { servicesRoutes } from './modules/services/services.routes';
import { ServiceRepository } from './modules/services/services.repository';
import { cors } from './middlewares/cors';
import { errorHandler } from './middlewares/error-handler';
import { NotFoundError } from './shared/errors';
import { UserRepository } from './modules/usuarios/usuarios.repository';
import { authRoutes } from './modules/usuarios/usuarios.routes';
import type { AuthConfig } from './modules/usuarios/usuarios.service';
import { MonitoringSettingsRepository } from './modules/monitoring-settings/monitoring-settings.repository';
import { monitoringSettingsRoutes } from './modules/monitoring-settings/monitoring-settings.routes';

export function createApp(verify: () => Promise<void>, collections: CollectionRepository, services: ServiceRepository,
  corsOrigins: readonly string[] = [], users?: UserRepository, auth?: AuthConfig, settings?: MonitoringSettingsRepository) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors(corsOrigins));
  app.use(express.json());
  app.use(healthRoutes(verify));
  app.use(collectionsRoutes(collections, services));
  app.use(servicesRoutes(services));
  if (users !== undefined && auth !== undefined) app.use(authRoutes(users, auth));
  if (settings !== undefined && auth !== undefined) app.use(monitoringSettingsRoutes(settings, auth));
  app.use((_req, _res, next) => next(new NotFoundError()));
  app.use(errorHandler);
  return app;
}
