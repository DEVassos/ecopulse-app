import { hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { CollectionRepository } from '../src/modules/collections/collections.repository';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { UserRepository } from '../src/modules/usuarios/usuarios.repository';
import type { AuthConfig } from '../src/modules/usuarios/usuarios.service';
import { PASSWORD_RULE } from '../src/shared/account-rules';
import type { StoredUser, UserRole } from '../src/shared/persistence.types';
import { memoryDatabase } from './invitations-test.repository';

const config: AuthConfig = { jwtSecret: 'profile-test-local-secret', jwtExpiresIn: '1h' };
const createdAt = new Date('2026-11-01T00:00:00Z');
const servers: Server[] = [];
const hashes = { admin: '', usuario: '' };

beforeAll(async () => {
  [hashes.admin, hashes.usuario] = await Promise.all([hash('admin1234', 10), hash('usuario1234', 10)]);
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  })));
});

function account(id: string, email: string, name: string, role: UserRole): StoredUser {
  return { id, email, name, role, password_hash: hashes[role], created_at: createdAt, updated_at: createdAt };
}

async function app() {
  const users = [account('1', 'admin@ecopulse.local', 'Administrador', 'admin'),
    account('2', 'usuario@ecopulse.local', 'Pessoa Usuária', 'usuario')];
  const { database, state } = memoryDatabase({ users });
  const empty = { query: vi.fn().mockResolvedValue({ rows: [] }) };
  const server = createServer(createApp(async () => {}, new CollectionRepository(empty), new ServiceRepository(empty), [],
    new UserRepository(database), config));
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const stored = (id: string): StoredUser => {
    const user = state.users.find(item => item.id === id);
    if (user === undefined) throw new Error(`Conta ${id} sumiu do banco em memória.`);
    return user;
  };
  return { url, state, stored };
}

function tokenFor(id: string, email: string, role: UserRole): string {
  return sign({ email, role }, config.jwtSecret, { subject: id, expiresIn: '1h' });
}
const adminToken = () => tokenFor('1', 'admin@ecopulse.local', 'admin');
const userToken = () => tokenFor('2', 'usuario@ecopulse.local', 'usuario');

function send(url: string, method: string, body: unknown, token?: string): Promise<Response> {
  return fetch(url, { method, body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }) } });
}

function login(url: string, email: string, password: string): Promise<Response> {
  return send(url + '/api/auth/login', 'POST', { email, password });
}

describe('PATCH /api/auth/me', () => {
  it('troca o nome, devolve a conta pública e GET /me passa a mostrar o nome novo', async () => {
    const { url, stored } = await app();
    const response = await send(url + '/api/auth/me', 'PATCH',
      { name: '  Ana Admin  ', email: 'outro@exemplo.com', role: 'usuario' }, adminToken());
    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, unknown>;
    expect(body).toEqual({ id: '1', email: 'admin@ecopulse.local', name: 'Ana Admin', role: 'admin' });
    expect(JSON.stringify(body)).not.toContain('password');
    expect(stored('1')).toMatchObject({ name: 'Ana Admin', email: 'admin@ecopulse.local', role: 'admin' });
    expect(stored('1').updated_at.getTime()).toBeGreaterThan(createdAt.getTime());

    const me = await fetch(url + '/api/auth/me', { headers: { Authorization: `Bearer ${adminToken()}` } });
    expect(await me.json()).toEqual(body);
  });

  it('aceita nome com exatamente 100 caracteres', async () => {
    const { url } = await app();
    const response = await send(url + '/api/auth/me', 'PATCH', { name: 'a'.repeat(100) }, userToken());
    expect(response.status).toBe(200);
  });

  it.each([
    ['nome só com espaços', { name: '   ' }, 'O nome deve ter de 1 a 100 caracteres.'],
    ['nome com 101 caracteres', { name: 'a'.repeat(101) }, 'O nome deve ter de 1 a 100 caracteres.'],
    ['nome que não é texto', { name: 42 }, 'Informe name.'],
    ['corpo sem name', {}, 'Informe name.'],
    ['corpo que não é objeto', [], 'Informe name.'],
  ])('%s responde 400 sem alterar o nome', async (_label, body, message) => {
    const { url, stored } = await app();
    const response = await send(url + '/api/auth/me', 'PATCH', body, adminToken());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: 'VALIDATION_ERROR', message } });
    expect(stored('1')).toMatchObject({ name: 'Administrador', updated_at: createdAt });
  });
});

describe('PUT /api/auth/me/password', () => {
  it('preserva a primeira troca quando o hash anterior já mudou', async () => {
    const { database } = memoryDatabase({ users: [account('1', 'admin@ecopulse.local', 'Administrador', 'admin')] });
    const users = new UserRepository(database);
    const firstHash = await hash('primeira123', 10);
    const secondHash = await hash('segunda123', 10);

    expect(await users.updatePassword('1', firstHash, hashes.admin)).toBe(true);
    expect(await users.updatePassword('1', secondHash, hashes.admin)).toBe(false);
    expect((await users.findById('1'))?.password_hash).toBe(firstHash);
  });

  it('com a senha atual certa responde 204; depois a nova entra e a antiga é recusada', async () => {
    const { url, stored } = await app();
    const response = await send(url + '/api/auth/me/password', 'PUT',
      { currentPassword: 'usuario1234', newPassword: 'nova12345' }, userToken());
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(stored('2').password_hash).not.toBe(hashes.usuario);
    expect(stored('2').password_hash).toMatch(/^\$2[aby]\$10\$/);
    expect(stored('2').password_hash).toHaveLength(60);
    expect(stored('2').updated_at.getTime()).toBeGreaterThan(createdAt.getTime());

    expect((await login(url, 'usuario@ecopulse.local', 'nova12345')).status).toBe(200);
    expect((await login(url, 'usuario@ecopulse.local', 'usuario1234')).status).toBe(401);
  });

  it('senha atual errada responde 400 (não 401) e a senha antiga continua valendo', async () => {
    const { url, stored } = await app();
    const response = await send(url + '/api/auth/me/password', 'PUT',
      { currentPassword: 'errada123', newPassword: 'nova12345' }, adminToken());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'A senha atual não confere.' } });
    expect(stored('1').password_hash).toBe(hashes.admin);
    expect((await login(url, 'admin@ecopulse.local', 'admin1234')).status).toBe(200);
  });

  it.each([['curta', 'curta1'], ['sem número', 'somenteletras'], ['sem letra', '12345678'], ['com 74 caracteres', 'a1'.repeat(37)]])(
    'nova senha %s responde 400 com a regra do cadastro', async (_label, newPassword) => {
      const { url, stored } = await app();
      const response = await send(url + '/api/auth/me/password', 'PUT', { currentPassword: 'admin1234', newPassword }, adminToken());
      expect(response.status).toBe(400);
      expect((await response.json()).error.message).toBe(PASSWORD_RULE);
      expect(stored('1').password_hash).toBe(hashes.admin);
    });

  it('nova senha igual à atual responde 400', async () => {
    const { url, stored } = await app();
    const response = await send(url + '/api/auth/me/password', 'PUT',
      { currentPassword: 'admin1234', newPassword: 'admin1234' }, adminToken());
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe('A nova senha deve ser diferente da atual.');
    expect(stored('1').updated_at).toEqual(createdAt);
  });

  it.each([{}, { newPassword: 'nova12345' }, { currentPassword: '', newPassword: 'nova12345' }, { currentPassword: 'admin1234' }])(
    'corpo %j responde 400', async body => {
      const { url } = await app();
      const response = await send(url + '/api/auth/me/password', 'PUT', body, adminToken());
      expect(response.status).toBe(400);
      expect((await response.json()).error.message).toBe('Informe currentPassword e newPassword.');
    });
});

describe('quem pode alterar a conta', () => {
  it('sem token responde 401 nas duas rotas, sem consultar o banco', async () => {
    const { url, state } = await app();
    expect((await send(url + '/api/auth/me', 'PATCH', { name: 'Outro' })).status).toBe(401);
    const password = await send(url + '/api/auth/me/password', 'PUT', { currentPassword: 'admin1234', newPassword: 'nova12345' });
    expect(password.status).toBe(401);
    expect((await password.json()).error.code).toBe('UNAUTHORIZED');
    expect(state.statements).toHaveLength(0);
  });

  it('conta usuario altera o próprio nome e a própria senha, sem mexer na do administrador', async () => {
    const { url, stored } = await app();
    const profile = await send(url + '/api/auth/me', 'PATCH', { name: 'Bia' }, userToken());
    expect(profile.status).toBe(200);
    expect(await profile.json()).toEqual({ id: '2', email: 'usuario@ecopulse.local', name: 'Bia', role: 'usuario' });
    const password = await send(url + '/api/auth/me/password', 'PUT',
      { currentPassword: 'usuario1234', newPassword: 'outra1234' }, userToken());
    expect(password.status).toBe(204);
    expect(stored('1')).toMatchObject({ name: 'Administrador', password_hash: hashes.admin });
  });

  it('token de uma conta que não existe mais responde 401 nas duas rotas', async () => {
    const { url } = await app();
    const gone = tokenFor('99', 'saiu@ecopulse.local', 'usuario');
    expect((await send(url + '/api/auth/me', 'PATCH', { name: 'Fantasma' }, gone)).status).toBe(401);
    expect((await send(url + '/api/auth/me/password', 'PUT',
      { currentPassword: 'usuario1234', newPassword: 'nova12345' }, gone)).status).toBe(401);
  });
});
