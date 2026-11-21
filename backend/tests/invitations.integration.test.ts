import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db/connection';
import { InvitationRepository } from '../src/modules/invitations/invitations.repository';
import { createInvitation, register } from '../src/modules/invitations/invitations.service';
import { UserRepository } from '../src/modules/usuarios/usuarios.repository';
import { DatabaseError, GoneError } from '../src/shared/errors';
import { invitationsCount, prepareInviter, storedInvitations, usersByEmail } from './invitations-integration-test.repository';

const url = process.env.REPOSITORY_TEST_DATABASE_URL;
describe.skipIf(!url)('convites e cadastro em PostgreSQL exclusivo (#196)', () => {
  const db = createDatabase(url ?? 'postgresql://localhost/test');
  const users = new UserRepository(db);
  const invitations = new InvitationRepository(db);
  const config = { ttlHours: 72, appUrl: 'http://localhost:5173' };
  let inviterId = '';
  beforeAll(async () => { inviterId = await prepareInviter(db); });
  afterAll(() => db.close());

  function tokenOf(inviteUrl: string): string {
    return new URL(inviteUrl).searchParams.get('convite') ?? '';
  }

  it('grava só o hash do token, com validade calculada pelo banco', async () => {
    const created = await createInvitation(users, invitations, 'cadastro1@example.test', 'usuario', inviterId, config);
    const token = tokenOf(created.inviteUrl);
    const [row] = await storedInvitations(db, 'cadastro1@example.test');
    expect(row?.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row?.token_hash).not.toContain(token);
    expect(JSON.stringify(row)).not.toContain(token);
    const hours = ((row?.expires_at.getTime() ?? 0) - (row?.created_at.getTime() ?? 0)) / 3_600_000;
    expect(hours).toBeCloseTo(72, 5);
  });

  it('cadastro cria a conta e usa o convite na mesma transação; o segundo uso é 410 e não cria conta', async () => {
    const created = await createInvitation(users, invitations, 'cadastro2@example.test', 'admin', inviterId, config);
    const token = tokenOf(created.inviteUrl);
    const user = await register(db, token, 'Cadastro Dois', 'senha1234');
    expect(user).toMatchObject({ email: 'cadastro2@example.test', role: 'admin', name: 'Cadastro Dois' });
    const [row] = await storedInvitations(db, 'cadastro2@example.test');
    expect(row?.used_at).toBeInstanceOf(Date);
    await expect(register(db, token, 'De Novo', 'senha1234')).rejects.toBeInstanceOf(GoneError);
    expect(await usersByEmail(db, 'cadastro2@example.test')).toBe(1);
  });

  it('dois cadastros simultâneos com o mesmo convite criam uma conta só', async () => {
    const created = await createInvitation(users, invitations, 'cadastro3@example.test', 'usuario', inviterId, config);
    const token = tokenOf(created.inviteUrl);
    const results = await Promise.allSettled([register(db, token, 'A', 'senha1234'), register(db, token, 'B', 'senha1234')]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(await usersByEmail(db, 'cadastro3@example.test')).toBe(1);
  });

  it('restrições do banco recusam papel desconhecido e token fora do formato', async () => {
    const before = await invitationsCount(db);
    await expect(invitations.insertInvitation('x@example.test', 'root' as 'admin', 'f'.repeat(64), inviterId, 1)).rejects.toBeInstanceOf(DatabaseError);
    await expect(invitations.insertInvitation('x@example.test', 'usuario', 'nao-e-hash', inviterId, 1)).rejects.toBeInstanceOf(DatabaseError);
    await expect(users.insertUser('y@example.test', 'Y', '$2b$10$'.padEnd(60, 'a'), 'root' as 'admin')).rejects.toBeInstanceOf(DatabaseError);
    expect(await invitationsCount(db)).toBe(before);
  });
});
