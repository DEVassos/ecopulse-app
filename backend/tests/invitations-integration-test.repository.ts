import type { QueryExecutor } from '../src/db/connection';
import type { StoredInvitation } from '../src/shared/persistence.types';

// Hash sintético só no formato exigido pelo CHECK; não é credencial.
export async function prepareInviter(db: QueryExecutor): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4)
     ON CONFLICT (lower(email)) DO UPDATE SET role = EXCLUDED.role
     RETURNING id`, ['convites-admin@example.test', 'Administrador', '$2b$10$'.padEnd(60, 'a'), 'admin']);
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('Administrador de teste não criado.');
  return id;
}

export async function storedInvitations(db: QueryExecutor, email: string): Promise<StoredInvitation[]> {
  return (await db.query<StoredInvitation>('SELECT * FROM invitations WHERE email = $1 ORDER BY id', [email])).rows;
}

export async function usersByEmail(db: QueryExecutor, email: string): Promise<number> {
  return Number((await db.query<{ total: string }>('SELECT count(*) AS total FROM users WHERE lower(email) = lower($1)', [email])).rows[0]?.total);
}

export async function invitationsCount(db: QueryExecutor): Promise<number> {
  return Number((await db.query<{ total: string }>('SELECT count(*) AS total FROM invitations')).rows[0]?.total);
}
