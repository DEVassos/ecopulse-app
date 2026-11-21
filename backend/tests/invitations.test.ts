import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { Invitation } from '../src/domain/invitation';
import { CollectionRepository } from '../src/modules/collections/collections.repository';
import { isValidPassword } from '../src/modules/invitations/invitations.controller';
import { InvitationRepository } from '../src/modules/invitations/invitations.repository';
import { hashToken } from '../src/modules/invitations/invitations.service';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { UserRepository } from '../src/modules/usuarios/usuarios.repository';
import type { AuthConfig } from '../src/modules/usuarios/usuarios.service';
import type { StoredInvitation, StoredUser } from '../src/shared/persistence.types';
import { memoryDatabase } from './invitations-test.repository';

const auth: AuthConfig = { jwtSecret: 'invitations-test-local-secret', jwtExpiresIn: '1h' };
const adminToken = sign({ email: 'admin@ecopulse.local', role: 'admin' }, auth.jwtSecret, { subject: '1', expiresIn: '1h' });
const userToken = sign({ email: 'ana@exemplo.com', role: 'usuario' }, auth.jwtSecret, { subject: '2', expiresIn: '1h' });
const admin: StoredUser = { id: '1', email: 'admin@ecopulse.local', name: 'Administrador', role: 'admin',
  password_hash: '$2b$10$'.padEnd(60, 'a'), created_at: new Date(), updated_at: new Date() };
const servers: Server[] = [];

function invitationRow(token: string, changes: Partial<StoredInvitation> = {}): StoredInvitation {
  return { id: '50', email: 'bia@exemplo.com', role: 'usuario', token_hash: hashToken(token), invited_by: '1',
    expires_at: new Date(Date.now() + 3_600_000), used_at: null, created_at: new Date(), ...changes };
}

async function app(initial: { users?: StoredUser[]; invitations?: StoredInvitation[] } = {}) {
  const { database, state } = memoryDatabase({ users: [admin, ...(initial.users ?? [])], invitations: initial.invitations ?? [] });
  const empty = { query: vi.fn().mockResolvedValue({ rows: [] }) };
  const server = createServer(createApp(async () => {}, new CollectionRepository(empty), new ServiceRepository(empty), [],
    new UserRepository(database), auth, undefined, undefined, undefined,
    { database, invitations: new InvitationRepository(database), config: { ttlHours: 72, appUrl: 'http://localhost:5173' } }));
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, state };
}

function post(url: string, body: unknown, token?: string): Promise<Response> {
  return fetch(url, { method: 'POST', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }) } });
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  })));
});

describe('POST /api/invitations', () => {
  it('administrador recebe 201 com o link e a validade, e o banco guarda só o hash do token', async () => {
    const { url, state } = await app();
    const response = await post(url + '/api/invitations', { email: ' Ana@Exemplo.com ', role: 'usuario' }, adminToken);
    expect(response.status).toBe(201);
    const body = await response.json() as { inviteUrl: string; expiresAt: string };
    const link = new URL(body.inviteUrl);
    expect(link.origin + link.pathname).toBe('http://localhost:5173/cadastro');
    const token = link.searchParams.get('convite') ?? '';
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const hours = (Date.parse(body.expiresAt) - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(71.9);
    expect(hours).toBeLessThanOrEqual(72);
    expect(state.invitations).toHaveLength(1);
    expect(state.invitations[0]).toMatchObject({ email: 'ana@exemplo.com', role: 'usuario', invited_by: '1', token_hash: hashToken(token) });
    expect(JSON.stringify(state.invitations)).not.toContain(token);
  });

  it('cada convite tem um token diferente', async () => {
    const { url } = await app();
    const links = await Promise.all([1, 2].map(async () =>
      (await (await post(url + '/api/invitations', { email: 'ana@exemplo.com', role: 'admin' }, adminToken)).json() as { inviteUrl: string }).inviteUrl));
    expect(links[0]).not.toBe(links[1]);
  });

  it('e-mail já cadastrado responde 409 sem criar convite', async () => {
    const { url, state } = await app();
    const response = await post(url + '/api/invitations', { email: 'ADMIN@ecopulse.local', role: 'usuario' }, adminToken);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('CONFLICT');
    expect(state.invitations).toHaveLength(0);
  });

  it.each([{}, null, [], { email: 'ana@exemplo.com' }, { email: 'ana@exemplo.com', role: 'root' },
    { email: 'sem-arroba', role: 'usuario' }, { email: 42, role: 'usuario' }])('corpo inválido %j responde 400', async body => {
    const { url, state } = await app();
    const response = await post(url + '/api/invitations', body, adminToken);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    expect(state.invitations).toHaveLength(0);
  });

  it('conta usuario recebe 403 e sem token recebe 401, sem consultar o banco', async () => {
    const { url, state } = await app();
    const forbidden = await post(url + '/api/invitations', { email: 'x@exemplo.com', role: 'admin' }, userToken);
    expect(forbidden.status).toBe(403);
    expect((await forbidden.json()).error.code).toBe('FORBIDDEN');
    expect((await post(url + '/api/invitations', { email: 'x@exemplo.com', role: 'admin' })).status).toBe(401);
    expect(state.statements).toHaveLength(0);
  });
});

describe('GET /api/invitations/:token', () => {
  const token = 'a'.repeat(43);

  it('convite válido devolve e-mail, papel e validade, sem exigir sessão', async () => {
    const row = invitationRow(token, { role: 'admin' });
    const { url } = await app({ invitations: [row] });
    const response = await fetch(`${url}/api/invitations/${token}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: 'bia@exemplo.com', role: 'admin', expiresAt: row.expires_at.toISOString() });
  });

  it.each([
    ['usado', { used_at: new Date() }, 'Este convite já foi usado.'],
    ['expirado', { expires_at: new Date(Date.now() - 1000) }, 'Este convite expirou. Peça um novo ao administrador.'],
  ] as const)('convite %s responde 410', async (_label, changes, message) => {
    const { url } = await app({ invitations: [invitationRow(token, changes)] });
    const response = await fetch(`${url}/api/invitations/${token}`);
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({ error: { code: 'GONE', message } });
  });

  it.each(['b'.repeat(43), 'curto', 'a'.repeat(44)])('convite inexistente ou fora do formato (%s) responde 404', async other => {
    const { url } = await app({ invitations: [invitationRow(token)] });
    const response = await fetch(`${url}/api/invitations/${other}`);
    expect(response.status).toBe(404);
    expect((await response.json()).error.message).toBe('Convite não encontrado.');
  });
});

describe('POST /api/auth/register', () => {
  const token = 'c'.repeat(43);

  it('cria a conta com e-mail e papel do convite, marca o convite como usado e a conta entra', async () => {
    const { url, state } = await app({ invitations: [invitationRow(token)] });
    const response = await post(url + '/api/auth/register', { token, name: '  Bia  ', password: 'senha1234', role: 'admin', email: 'outro@x.com' });
    expect(response.status).toBe(201);
    const created = await response.json() as Record<string, unknown>;
    expect(created).toEqual({ id: expect.any(String), email: 'bia@exemplo.com', name: 'Bia', role: 'usuario' });
    const stored = state.users.find(user => user.email === 'bia@exemplo.com');
    expect(stored?.password_hash).not.toBe('senha1234');
    expect(await compare('senha1234', stored?.password_hash ?? '')).toBe(true);
    expect(state.invitations[0]?.used_at).toBeInstanceOf(Date);
    expect(state.statements).toEqual(expect.arrayContaining(['BEGIN', 'COMMIT']));

    const login = await post(url + '/api/auth/login', { email: 'bia@exemplo.com', password: 'senha1234' });
    expect(login.status).toBe(200);
    expect((await login.json()).user).toEqual(created);
  });

  it('segundo uso do mesmo convite responde 410 e não cria outra conta', async () => {
    const { url, state } = await app({ invitations: [invitationRow(token)] });
    expect((await post(url + '/api/auth/register', { token, name: 'Bia', password: 'senha1234' })).status).toBe(201);
    const again = await post(url + '/api/auth/register', { token, name: 'Bia 2', password: 'senha1234' });
    expect(again.status).toBe(410);
    expect(state.users).toHaveLength(2);
  });

  it('convite expirado responde 410 e inexistente responde 404, sem criar conta', async () => {
    const { url, state } = await app({ invitations: [invitationRow(token, { expires_at: new Date(Date.now() - 1000) })] });
    expect((await post(url + '/api/auth/register', { token, name: 'Bia', password: 'senha1234' })).status).toBe(410);
    expect((await post(url + '/api/auth/register', { token: 'd'.repeat(43), name: 'Bia', password: 'senha1234' })).status).toBe(404);
    expect(state.users).toHaveLength(1);
  });

  it('e-mail cadastrado depois do convite responde 409 e o convite continua disponível (ROLLBACK)', async () => {
    const { url, state } = await app({ invitations: [invitationRow(token, { email: 'admin@ecopulse.local' })] });
    const response = await post(url + '/api/auth/register', { token, name: 'Outro', password: 'senha1234' });
    expect(response.status).toBe(409);
    expect(state.statements).toContain('ROLLBACK');
    expect(state.invitations[0]?.used_at).toBeNull();
    expect(state.users).toHaveLength(1);
  });

  it.each([
    [{ token: 'c'.repeat(43), name: 'Bia', password: 'curta1' }, 'A senha deve ter'],
    [{ token: 'c'.repeat(43), name: 'Bia', password: 'somenteletras' }, 'A senha deve ter'],
    [{ token: 'c'.repeat(43), name: 'Bia', password: '12345678' }, 'A senha deve ter'],
    [{ token: 'c'.repeat(43), name: '   ', password: 'senha1234' }, 'O nome deve ter'],
    [{ token: 'c'.repeat(43), password: 'senha1234' }, 'Informe token, name e password.'],
    [[], 'Informe token, name e password.'],
  ])('corpo inválido %j responde 400 sem usar o convite', async (body, message) => {
    const { url, state } = await app({ invitations: [invitationRow(token)] });
    const response = await post(url + '/api/auth/register', body);
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toContain(message);
    expect(state.statements).toHaveLength(0);
    expect(state.invitations[0]?.used_at).toBeNull();
  });
});

describe('regras do convite e da senha', () => {
  it('estado do convite: usado vence expirado', () => {
    const now = new Date('2026-11-21T12:00:00Z');
    const base = invitationRow('e'.repeat(43), { expires_at: new Date('2026-11-21T13:00:00Z') });
    expect(Invitation.fromStored(base).state(now)).toBe('disponivel');
    expect(Invitation.fromStored({ ...base, expires_at: now }).state(now)).toBe('expirado');
    expect(Invitation.fromStored({ ...base, expires_at: now, used_at: now }).state(now)).toBe('usado');
  });

  it.each([['senha1234', true], ['Senhaçã9', true], ['abcdefg1', true], ['abc1', false], ['abcdefgh', false],
    ['12345678', false], ['a1'.repeat(37), false]])('senha %j é válida? %s', (password, valid) => {
    expect(isValidPassword(password)).toBe(valid);
  });
});
