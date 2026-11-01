import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { DatabaseError } from '../shared/errors';

export interface QueryExecutor {
  query<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}
export interface Database extends QueryExecutor {
  withClient<T>(work: (client: QueryExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

function guarded(target: QueryExecutor): QueryExecutor {
  return { async query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
    try { return await target.query<T>(text, params); }
    catch (cause) { throw Object.assign(new DatabaseError(), { cause }); }
  } };
}

export function createDatabase(databaseUrl: string): Database {
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000,
    statement_timeout: 3000, query_timeout: 4000 });
  // Erro em conexão ociosa não pode virar evento sem listener nem expor a URL.
  pool.on('error', () => console.error('Falha em conexão ociosa do PostgreSQL.'));
  return {
    ...guarded(pool),
    async withClient<T>(work: (client: QueryExecutor) => Promise<T>): Promise<T> {
      const client = await pool.connect().catch((cause: unknown) => {
        throw Object.assign(new DatabaseError(), { cause });
      });
      let failure: Error | undefined;
      try { return await work(guarded(client)); }
      catch (cause) {
        failure = cause instanceof Error ? cause : new Error('Operação interrompida.');
        throw cause;
      } finally { client.release(failure); }
    },
    close: () => pool.end(),
  };
}
