import { hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { CollectionRepository } from '../src/modules/collections/collections.repository';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { UserRepository } from '../src/modules/usuarios/usuarios.repository';
import { type AuthConfig } from '../src/modules/usuarios/usuarios.service';

const config: AuthConfig = { jwtSecret: 'development-secret-123', jwtExpiresIn: '8h' };
const servers: Server[] = [];

async function serve(app: ReturnType<typeof express>): Promise<string> {
  const server = createServer(app); servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function authApp(rows: unknown[]): Promise<string> {
  const collections = new CollectionRepository({ query: vi.fn().mockResolvedValue({ rows: [] }) });
  const services = new ServiceRepository({ query: vi.fn().mockResolvedValue({ rows: [] }) });
  const users = new UserRepository({ query: vi.fn().mockResolvedValue({ rows }) });
  return serve(createApp(async () => {}, collections, services, [], users, config));
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  })));
  vi.restoreAllMocks();
});

describe('autenticacao', () => {
  it('emite token no login valido e identifica o usuario na rota protegida', async () => {
    const password = 'senha-segura';
    const url = await authApp([{ id: '7', email: 'admin@ecopulse.dev', password_hash: await hash(password, 10), created_at: new Date(), updated_at: new Date() }]);
    const login = await fetch(url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ecopulse.dev', password }) });
    expect(login.status).toBe(200);
    const { token } = await login.json() as { token: string };
    expect(typeof token).toBe('string');
    const me = await fetch(url + '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({ id: '7', email: 'admin@ecopulse.dev' });
  });

  it('devolve o mesmo 401 para email inexistente e senha incorreta', async () => {
    const rows = [{ id: '7', email: 'admin@ecopulse.dev', password_hash: await hash('senha-segura', 10), created_at: new Date(), updated_at: new Date() }];
    for (const [url, body] of [[await authApp([]), { email: 'nao@existe.dev', password: 'errada' }], [await authApp(rows), { email: 'admin@ecopulse.dev', password: 'errada' }]] as const) {
      const response = await fetch(url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Credenciais inválidas.' } });
    }
  });

  it('valida o corpo e rejeita token ausente, invalido ou expirado', async () => {
    const url = await authApp([]);
    const missing = await fetch(url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@b.dev' }) });
    expect(missing.status).toBe(400);
    const expired = sign({ email: 'admin@ecopulse.dev' }, config.jwtSecret, { subject: '7', expiresIn: -1 });
    for (const authorization of [undefined, 'Bearer invalido', `Bearer ${expired}`]) {
      const response = await fetch(url + '/api/auth/me', authorization === undefined ? {} : { headers: { Authorization: authorization } });
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe('UNAUTHORIZED');
    }
  });
});
