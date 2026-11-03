import type { QueryExecutor } from '../src/db/connection';
// IDs acima de Number.MAX_SAFE_INTEGER; o hash é sintético, só no formato exigido pelo CHECK, não credencial.
export async function prepare(db: QueryExecutor): Promise<void> {
  await db.query("SELECT setval(pg_get_serial_sequence('services', 'id'), 9007199254740993, false)");
  await db.query('INSERT INTO users (id, email, password_hash) OVERRIDING SYSTEM VALUE VALUES ($1, $2, $3)',
    ['9007199254740993', 'review@example.test', '$2b$10$'.padEnd(60, 'a')]);
}
