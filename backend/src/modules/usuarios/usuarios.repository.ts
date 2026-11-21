import type { QueryExecutor } from '../../db/connection';
import { DatabaseError } from '../../shared/errors';
import type { StoredUser, UserRole } from '../../shared/persistence.types';

export class UserRepository {
  constructor(private readonly db: QueryExecutor) {}
  /** Contrato interno: não enviar password_hash para respostas HTTP ou logs. */
  async findByEmail(email: string): Promise<StoredUser | null> {
    return (await this.db.query<StoredUser>(
      'SELECT * FROM users WHERE lower(email) = lower($1)', [email])).rows[0] ?? null;
  }

  async findById(id: string): Promise<StoredUser | null> {
    return (await this.db.query<StoredUser>('SELECT * FROM users WHERE id = $1', [id])).rows[0] ?? null;
  }

  /** Cadastro por convite (#196): o papel vem do convite, nunca do corpo da requisição. */
  async insertUser(email: string, name: string, passwordHash: string, role: UserRole): Promise<StoredUser> {
    const row = (await this.db.query<StoredUser>(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [email, name, passwordHash, role])).rows[0];
    if (row === undefined) throw new DatabaseError();
    return row;
  }
}
