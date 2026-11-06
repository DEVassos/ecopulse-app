import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { sign } from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import type { AuthConfig } from '../src/modules/usuarios/usuarios.service';
import { CollectionRepository } from '../src/modules/collections/collections.repository';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { UserRepository } from '../src/modules/usuarios/usuarios.repository';
import { DatabaseError } from '../src/shared/errors';

const auth: AuthConfig = { jwtSecret: 'ranking-test-secret-123', jwtExpiresIn: '1h' };
const token = sign({ email: 'ranking@example.test' }, auth.jwtSecret, { subject: '1', expiresIn: auth.jwtExpiresIn });
const alpha = { id: '3', name: 'Alpha', region: 'Sul', status: 'ativo', collections: '4', failed: '1', not_calculated: '2', energy_kwh: '0', co2e_grams: '2.5' };
const beta = { id: '12', name: 'Beta', region: null, status: 'removido', collections: '2', failed: '0', not_calculated: '0', energy_kwh: '3', co2e_grams: '1' };
const rows = [
  beta,
  alpha,
  { id: '9007199254740993', name: 'Sem cálculo', region: null, status: 'sem_metricas', collections: '1', failed: '1', not_calculated: '1', energy_kwh: null, co2e_grams: null },
];
const servers: Server[] = [];

async function serve(query = vi.fn().mockResolvedValue({ rows })) {
  const collections = new CollectionRepository({ query: vi.fn().mockResolvedValue({ rows: [] }) });
  const users = new UserRepository({ query: vi.fn().mockResolvedValue({ rows: [] }) });
  const app = createApp(async () => {}, collections, new ServiceRepository({ query }), [], users, auth);
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/services/ranking`, query };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  })));
});

describe('GET /api/services/ranking', () => {
  it('exige JWT e devolve as duas métricas, contagens e IDs bigint como string', async () => {
    const { url, query } = await serve();
    expect((await fetch(url + '?metric=energy', { headers: { Authorization: 'Bearer invalid' } })).status).toBe(401);
    const response = await fetch(url + '?metric=energy&from=2026-11-02T00:00:00-03:00&to=2026-12-03T00:00:00-03:00',
      { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      metric: 'energy', from: '2026-11-02T03:00:00.000Z', to: '2026-12-03T03:00:00.000Z',
      services: [
        { position: 1, id: '12', name: 'Beta', region: null, status: 'removido', energyKwh: 3, co2eGrams: 1, collections: 2, failed: 0, notCalculated: 0 },
        { position: 2, id: '3', name: 'Alpha', region: 'Sul', status: 'ativo', energyKwh: 0, co2eGrams: 2.5, collections: 4, failed: 1, notCalculated: 2 },
        { position: null, id: '9007199254740993', name: 'Sem cálculo', region: null, status: 'sem_metricas', energyKwh: null, co2eGrams: null, collections: 1, failed: 1, notCalculated: 1 },
      ],
    });
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][1]).toEqual([new Date('2026-11-02T03:00:00.000Z'), new Date('2026-12-03T03:00:00.000Z')]);
  });

  it('usa CO₂e para atribuir posições sem omitir energia', async () => {
    const { url } = await serve(vi.fn().mockResolvedValue({ rows: [alpha, beta, rows[2]] }));
    const response = await fetch(url + '?metric=co2e', { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.services.map((service: { id: string; position: number | null }) => [service.id, service.position]))
      .toEqual([['3', 1], ['12', 2], ['9007199254740993', null]]);
    expect(body.services[0]).toMatchObject({ energyKwh: 0, co2eGrams: 2.5 });
  });

  it.each([
    ['sem token', undefined],
    ['token inválido', 'Bearer invalid'],
    ['token expirado', `Bearer ${sign({ email: 'ranking@example.test' }, auth.jwtSecret, { subject: '1', expiresIn: -1 })}`],
  ])('rejeita %s com 401', async (_case, authorization) => {
    const { url, query } = await serve();
    const headers = authorization === undefined ? {} : { Authorization: authorization };
    expect((await fetch(url + '?metric=co2e', { headers })).status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    ['metric ausente', ''],
    ['metric inválida', '?metric=energy_kwh'],
    ['somente from', '?metric=co2e&from=2026-11-01T00:00:00Z'],
    ['somente to', '?metric=co2e&to=2026-11-02T00:00:00Z'],
    ['data sem hora', '?metric=co2e&from=2026-11-01&to=2026-11-02T00:00:00Z'],
    ['data impossível', '?metric=co2e&from=2026-02-30T00:00:00Z&to=2026-03-02T00:00:00Z'],
    ['limites iguais', '?metric=co2e&from=2026-11-01T00:00:00Z&to=2026-11-01T00:00:00Z'],
    ['período acima de 31 dias', '?metric=co2e&from=2026-11-01T00:00:00Z&to=2026-12-02T00:00:00.001Z'],
  ])('recusa %s antes de consultar o banco', async (_case, search) => {
    const { url, query } = await serve();
    const response = await fetch(url + search, { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    expect(query).not.toHaveBeenCalled();
  });

  it('usa as últimas 24 horas sem período explícito', async () => {
    const { url, query } = await serve();
    const response = await fetch(url + '?metric=co2e', { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.to).toBe(new Date(body.to).toISOString());
    expect(new Date(body.to).getTime() - new Date(body.from).getTime()).toBe(24 * 60 * 60 * 1000);
    expect(query).toHaveBeenCalledOnce();
  });

  it('converte falha do repository em DATABASE_ERROR sem detalhes internos', async () => {
    const { url } = await serve(vi.fn().mockRejectedValue(new DatabaseError()));
    const response = await fetch(url + '?metric=co2e', { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: 'DATABASE_ERROR', message: 'Não foi possível acessar o banco de dados.' },
    });
  });
});
