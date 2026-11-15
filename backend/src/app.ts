import express from 'express';
import { authMiddleware } from './middlewares/auth';
import { cors } from './middlewares/cors';
import { errorHandler } from './middlewares/error-handler';
import { healthRoutes } from './modules/health/health.routes';
import { collectionsRoutes } from './modules/collections/collections.routes';
import { CollectionRepository } from './modules/collections/collections.repository';
import { servicesRoutes } from './modules/services/services.routes';
import { ServiceRepository } from './modules/services/services.repository';
import { UserRepository } from './modules/usuarios/usuarios.repository';
import { authRoutes } from './modules/usuarios/usuarios.routes';
import type { AuthConfig } from './modules/usuarios/usuarios.service';
import { MonitoringSettingsRepository } from './modules/monitoring-settings/monitoring-settings.repository';
import { monitoringSettingsRoutes } from './modules/monitoring-settings/monitoring-settings.routes';
import { NotFoundError } from './shared/errors';
import type { CarbonApi } from './integrations/carbon-api';
import { regionsRoutes } from './modules/regions/regions.routes';

export function createApp(verify: () => Promise<void>, collections: CollectionRepository, services: ServiceRepository,
  corsOrigins: readonly string[], users: UserRepository, auth: AuthConfig, settings?: MonitoringSettingsRepository, carbonApi?: CarbonApi) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors(corsOrigins));
  app.use(express.json());
  app.use(healthRoutes(verify));
  app.use('/api/services', authMiddleware(auth));
  app.use('/api/collections', authMiddleware(auth));
  app.use('/api/regions', authMiddleware(auth));
  app.use(collectionsRoutes(collections, services));
  app.use(servicesRoutes(services));
  app.use(authRoutes(users, auth));
  if (settings !== undefined) app.use(monitoringSettingsRoutes(settings, auth));
  if (carbonApi !== undefined) app.use(regionsRoutes(carbonApi, services));
  app.use((_req, _res, next) => next(new NotFoundError()));
  app.use(errorHandler);
  return app;
}
