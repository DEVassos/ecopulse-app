import type { Database, QueryExecutor } from './connection';
import { DatabaseError } from '../shared/errors';

/** A mesma conexão atende todos os repositories criados dentro do callback. */
export function withTransaction<T>(database: Database, work: (tx: QueryExecutor) => Promise<T>): Promise<T> {
  return database.withClient(async tx => {
    await tx.query('BEGIN');
    try {
      const result = await work(tx);
      await tx.query('COMMIT');
      return result;
    } catch (cause) {
      try { await tx.query('ROLLBACK'); }
      catch (rollbackCause) {
        throw Object.assign(new DatabaseError(), { cause: new AggregateError([cause, rollbackCause]) });
      }
      throw cause;
    }
  });
}
