import type { QueryResult, QueryResultRow } from 'pg';
import type { Database, QueryExecutor } from '../src/db/connection';
import type { StoredInvitation, StoredUser } from '../src/shared/persistence.types';

/**
 * Banco em memória para os testes HTTP dos convites (#196) e do perfil (#400): reconhece as consultas de
 * UserRepository e InvitationRepository pelo início do texto e imita BEGIN/COMMIT/ROLLBACK com uma cópia do estado.
 * O comportamento real do SQL é conferido em invitations.integration.test.ts, com PostgreSQL.
 */
export interface MemoryState { users: StoredUser[]; invitations: StoredInvitation[]; statements: string[] }

function result<T extends QueryResultRow>(rows: unknown[]): QueryResult<T> {
  return { rows: rows as T[], rowCount: rows.length, command: '', oid: 0, fields: [] };
}

function clone(state: MemoryState): MemoryState {
  return { users: state.users.map(user => ({ ...user })), invitations: state.invitations.map(item => ({ ...item })), statements: state.statements };
}

export function memoryDatabase(initial: Partial<MemoryState> = {}, now: () => Date = () => new Date()) {
  const state: MemoryState = { users: initial.users ?? [], invitations: initial.invitations ?? [], statements: [] };
  let snapshot: MemoryState | null = null;
  let nextId = 100;

  const executor: QueryExecutor = {
    async query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
      const sql = text.replace(/\s+/g, ' ').trim();
      state.statements.push(sql.split(' ').slice(0, 3).join(' '));
      const [first, second, third, fourth, fifth] = params;
      if (sql === 'BEGIN') { snapshot = clone(state); return result<T>([]); }
      if (sql === 'COMMIT') { snapshot = null; return result<T>([]); }
      if (sql === 'ROLLBACK') {
        if (snapshot !== null) { state.users = snapshot.users; state.invitations = snapshot.invitations; }
        snapshot = null;
        return result<T>([]);
      }
      if (sql.startsWith('SELECT * FROM users WHERE lower(email)')) {
        return result<T>(state.users.filter(user => user.email.toLowerCase() === String(first).toLowerCase()));
      }
      if (sql.startsWith('SELECT * FROM users WHERE id')) return result<T>(state.users.filter(user => user.id === first));
      if (sql.startsWith('INSERT INTO users')) {
        const user: StoredUser = { id: String(nextId++), email: String(first), name: String(second), password_hash: String(third),
          role: fourth === 'admin' ? 'admin' : 'usuario', created_at: now(), updated_at: now() };
        state.users.push(user);
        return result<T>([user]);
      }
      const updateUser = /^UPDATE users SET (name|password_hash) = \$2/.exec(sql);
      if (updateUser !== null) {
        const user = state.users.find(item => item.id === first);
        if (user === undefined) return result<T>([]);
        if (updateUser[1] === 'password_hash' && user.password_hash !== third) return result<T>([]);
        if (updateUser[1] === 'name') user.name = String(second); else user.password_hash = String(second);
        user.updated_at = now();
        return result<T>([user]);
      }
      if (sql.startsWith('INSERT INTO invitations')) {
        const invitation: StoredInvitation = { id: String(nextId++), email: String(first), role: second === 'admin' ? 'admin' : 'usuario',
          token_hash: String(third), invited_by: String(fourth), expires_at: new Date(now().getTime() + Number(fifth) * 3_600_000),
          used_at: null, created_at: now() };
        state.invitations.push(invitation);
        return result<T>([invitation]);
      }
      if (sql.startsWith('SELECT * FROM invitations')) return result<T>(state.invitations.filter(item => item.token_hash === first));
      if (sql.startsWith('UPDATE invitations')) {
        const invitation = state.invitations.find(item => item.token_hash === first && item.used_at === null
          && item.expires_at.getTime() > now().getTime());
        if (invitation === undefined) return result<T>([]);
        invitation.used_at = now();
        return result<T>([invitation]);
      }
      throw new Error(`Consulta não prevista no banco em memória: ${sql}`);
    },
  };

  const database: Database = { ...executor, withClient: async work => work(executor), close: async () => undefined };
  return { database, state };
}
