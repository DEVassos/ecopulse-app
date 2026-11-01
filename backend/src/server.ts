import { createServer, type Server } from 'node:http';
import { createApp } from './app';
import { readEnvironment, type Environment } from './config/env';
import { createDatabase, type Database } from './db/connection';
import { verifyConnection } from './modules/health/health.repository';
import { CollectionRepository } from './modules/collections/collections.repository';
import { ServiceRepository } from './modules/services/services.repository';
import { UserRepository } from './modules/usuarios/usuarios.repository';
import { AppError } from './shared/errors';
import { Collector, type CollectorLifecycle } from './jobs/collector';
import { createMetricsApi } from './integrations/metrics-api';
import { createCarbonApi } from './integrations/carbon-api';

export async function startServer(env: Environment, database: Database, collector?: CollectorLifecycle): Promise<Server> {
  try {
    await verifyConnection(database);
    const server = createServer(createApp(() => verifyConnection(database), new CollectionRepository(database), new ServiceRepository(database), env.corsOrigins,
      new UserRepository(database), { jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn }));
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(env.port, () => { server.off('error', reject); resolve(); });
    });
    collector?.start();
    return server;
  } catch (error) {
    await database.close();
    throw error;
  }
}

export async function stopServer(server: Server, database: Database, collector?: CollectorLifecycle): Promise<void> {
  try {
    await collector?.stop();
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeIdleConnections();
    });
  } finally { await database.close(); }
}

async function main(): Promise<void> {
  const env = readEnvironment();
  const database = createDatabase(env.databaseUrl);
  const collector = new Collector(database, createMetricsApi({ baseUrl: env.metricsApiUrl }), env.pollingIntervalMs,
    Date.now, console.error, createCarbonApi({ baseUrl: env.carbonApiUrl }));
  const server = await startServer(env, database, collector);
  console.info(`API disponível na porta ${env.port}.`);
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    void stopServer(server, database, collector).then(() => clearTimeout(deadline)).catch(() => {
      console.error('Falha ao encerrar servidor e banco.');
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error instanceof AppError ? error.message : 'Não foi possível iniciar o servidor.');
    process.exitCode = 1;
  });
}
