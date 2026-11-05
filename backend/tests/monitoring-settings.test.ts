import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { sign } from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { CollectionRepository } from '../src/modules/collections/collections.repository';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { MonitoringSettingsRepository } from '../src/modules/monitoring-settings/monitoring-settings.repository';
import { DatabaseError } from '../src/shared/errors';

const config = { jwtSecret: 'monitoring-test-local-secret', jwtExpiresIn: '8h' };
const token = sign({ email: 'admin@example.test' }, config.jwtSecret, { subject: '1', expiresIn: '1h' });
const servers: Server[] = [];
async function app(failure = false) {
  let row: { refresh_interval_seconds: number; updated_at: Date } | null = null;
  const query = vi.fn(async (_sql: string, values: unknown[]) => {
    if (failure) throw new DatabaseError();
    if (values.length === 2) row = { refresh_interval_seconds: values[1] as number, updated_at: new Date('2026-11-03T12:00:00Z') };
    return { rows: row ? [row] : [] };
  });
  const empty = { query: vi.fn().mockResolvedValue({ rows: [] }) };
  const server = createServer(createApp(async () => {}, new CollectionRepository(empty), new ServiceRepository(empty),
    ['http://localhost:5173'], undefined, config, new MonitoringSettingsRepository({ query })));
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/monitoring-settings`, query };
}
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  })));
});
function put(url: string, body: unknown, authorization: string | null = `Bearer ${token}`) {
  return fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json',
    ...(authorization === null ? {} : { Authorization: authorization }) }, body: JSON.stringify(body) });
}
describe('contrato HTTP de monitoring-settings', () => {
  it('upsert sem confirmação do banco não é tratado como configuração padrão', async () => {
    const repository = new MonitoringSettingsRepository({ query: vi.fn().mockResolvedValue({ rows: [] }) });
    await expect(repository.save(60)).rejects.toBeInstanceOf(DatabaseError);
  });
  it('GET é público, ignora token inválido e devolve padrão sem escrever', async () => {
    const { url, query } = await app();
    for (const headers of [{}, { Authorization: 'Bearer invalido' }]) {
      const response = await fetch(url, { headers });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ refreshIntervalSeconds: 30, allowedIntervalsSeconds: [15, 30, 60], updatedAt: null });
    }
    expect(query.mock.calls.every(([, values]) => values.length === 1)).toBe(true);
  });
  it.each([15, 30, 60])('PUT aceita %i e GET devolve o valor persistido', async seconds => {
    const { url, query } = await app();
    const response = await put(url, { refreshIntervalSeconds: seconds });
    expect(response.status).toBe(200);
    const expected = { refreshIntervalSeconds: seconds, allowedIntervalsSeconds: [15, 30, 60], updatedAt: '2026-11-03T12:00:00.000Z' };
    expect(await response.json()).toEqual(expected);
    expect(await (await fetch(url)).json()).toEqual(expected);
    expect(query.mock.calls[0][1]).toEqual([1, seconds]);
  });
  it.each([{}, null, [], true, { refreshIntervalSeconds: '30' }, { refreshIntervalSeconds: true },
    { refreshIntervalSeconds: null }, { refreshIntervalSeconds: 15.5 }, { refreshIntervalSeconds: 0 },
    { refreshIntervalSeconds: -15 }, { refreshIntervalSeconds: 120 }])('rejeita corpo inválido %j sem consultar banco', async body => {
    const { url, query } = await app();
    const response = await put(url, body);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    expect(query).not.toHaveBeenCalled();
  });
  it('rejeita JWT ausente, inválido ou expirado sem gravar', async () => {
    const { url, query } = await app();
    const expired = sign({ email: 'admin@example.test' }, config.jwtSecret, { subject: '1', expiresIn: -1 });
    for (const authorization of [null, 'Bearer invalido', `Bearer ${expired}`]) {
      const response = await put(url, { refreshIntervalSeconds: 60 }, authorization);
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe('UNAUTHORIZED');
    }
    expect(query).not.toHaveBeenCalled();
  });
  it('falha de banco nunca vira padrão válido ou sucesso no PUT', async () => {
    const { url } = await app(true);
    for (const response of [await fetch(url), await put(url, { refreshIntervalSeconds: 60 })]) {
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: { code: 'DATABASE_ERROR', message: 'Não foi possível acessar o banco de dados.' } });
    }
  });
  it('preflight permite PUT e Bearer sem exigir sessão', async () => {
    const { url, query } = await app();
    const response = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'Content-Type,Authorization' } });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('PUT');
    expect(response.headers.get('access-control-allow-headers')).toContain('Authorization');
    expect(query).not.toHaveBeenCalled();
  });
});
