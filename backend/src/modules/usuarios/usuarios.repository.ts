import type { QueryExecutor } from '../../db/connection';
import type { StoredUser } from '../../shared/persistence.types';

export class UserRepository {
  constructor(private readonly db: QueryExecutor) {}
  /** Contrato interno: não enviar password_hash para respostas HTTP ou logs. */
  async findByEmail(email: string): Promise<StoredUser | null> {
    return (await this.db.query<StoredUser>(
      'SELECT * FROM users WHERE lower(email) = lower($1)', [email])).rows[0] ?? null;
  }
}
