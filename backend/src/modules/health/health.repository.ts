import type { Database } from '../../db/connection';
import { DatabaseError } from '../../shared/errors';

export async function verifyConnection(database: Database): Promise<void> {
  const result = await database.query<{ connected: number }>('SELECT 1 AS connected');
  if (result.rows[0]?.connected !== 1) throw new DatabaseError();
}
