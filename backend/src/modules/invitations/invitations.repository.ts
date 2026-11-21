import type { QueryExecutor } from '../../db/connection';
import { DatabaseError } from '../../shared/errors';
import type { StoredInvitation, UserRole } from '../../shared/persistence.types';

export class InvitationRepository {
  constructor(private readonly db: QueryExecutor) {}

  /** A validade é calculada pelo relógio do banco, o mesmo que confere o uso em claimAvailable. */
  async insertInvitation(email: string, role: UserRole, tokenHash: string, invitedBy: string, ttlHours: number): Promise<StoredInvitation> {
    const row = (await this.db.query<StoredInvitation>(
      `INSERT INTO invitations (email, role, token_hash, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, now() + make_interval(hours => $5::int))
       RETURNING *`, [email, role, tokenHash, invitedBy, ttlHours])).rows[0];
    if (row === undefined) throw new DatabaseError();
    return row;
  }

  async findByTokenHash(tokenHash: string): Promise<StoredInvitation | null> {
    return (await this.db.query<StoredInvitation>(
      'SELECT * FROM invitations WHERE token_hash = $1', [tokenHash])).rows[0] ?? null;
  }

  /**
   * Marca o convite como usado só se ainda estiver disponível. Duas requisições simultâneas com o mesmo
   * token disputam a mesma linha: só uma recebe o convite de volta, a outra recebe null.
   */
  async claimAvailable(tokenHash: string): Promise<StoredInvitation | null> {
    return (await this.db.query<StoredInvitation>(
      `UPDATE invitations
          SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING *`, [tokenHash])).rows[0] ?? null;
  }
}
