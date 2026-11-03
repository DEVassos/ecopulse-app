import { beforeEach, expect, it, vi } from 'vitest';
import { createDatabase } from '../src/db/connection';
import { withTransaction } from '../src/db/transaction.repository';
import { CollectionRepository } from '../src/modules/collections/collections.repository';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { CollectionRepository } from '../src/modules/collections/collections.repository';
import { UserRepository } from '../src/modules/usuarios/usuarios.repository';
import { DatabaseError } from '../src/shared/errors';

const fake = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn(), connect: vi.fn(), poolQuery: vi.fn() }));
vi.mock('pg', () => ({ Pool: class {
  on = vi.fn(); end = vi.fn(); query = fake.poolQuery; connect = fake.connect;
} }));
beforeEach(() => {
  vi.resetAllMocks();
  fake.query.mockResolvedValue({ rows: [], rowCount: 0 });
  fake.connect.mockResolvedValue({ query: fake.query, release: fake.release });
});
it('usa uma conexão, parâmetros separados e libera após commit', async () => {
  const db = createDatabase('postgresql://localhost/test');
  const id = '9007199254740993';
  const email = "x' OR '1'='1";
  await withTransaction(db, async tx => {
    expect(await new ServiceRepository(tx).findById(id)).toBeNull();
    expect(await new UserRepository(tx).findByEmail(email)).toBeNull();
  });
  expect(fake.query.mock.calls.map(call => call[0])).toEqual([
    'BEGIN', 'SELECT * FROM services WHERE id = $1',
    'SELECT * FROM users WHERE lower(email) = lower($1)', 'COMMIT',
  ]);
  expect(fake.query.mock.calls[1][1]).toEqual([id]);
  expect(fake.query.mock.calls[2][1]).toEqual([email]);
  expect(fake.poolQuery).not.toHaveBeenCalled();
  expect(fake.connect).toHaveBeenCalledOnce();
  expect(fake.release).toHaveBeenCalledExactlyOnceWith(undefined);
});
it('agrupa a série por intervalo e devolve o total do período na mesma consulta', async () => {
  fake.poolQuery.mockResolvedValueOnce({ rows: [] });
  await new CollectionRepository(createDatabase('postgresql://localhost/test')).findSeries({
    serviceId: '1', from: new Date('2026-10-23T00:00:00.000Z'), to: new Date('2026-10-24T00:00:00.000Z'), bucket: '15min' });
  expect(fake.poolQuery).toHaveBeenCalledOnce();
  const [sql, params] = fake.poolQuery.mock.calls[0];
  expect(sql).toContain("date_bin($4::interval, collected_at, 'epoch'::timestamptz) AS bucket_start");
  expect(sql).toContain('GROUP BY GROUPING SETS ((bucket_start), ())');
  expect(sql).toContain("COUNT(*) FILTER (WHERE status <> 'ok') AS failed");
  expect(sql).toContain("COUNT(*) FILTER (WHERE status = 'ok' AND calculation_status <> 'disponivel') AS not_calculated");
  expect(sql).toContain("SUM(energy_kwh) FILTER (WHERE calculation_status = 'disponivel') AS energy_kwh");
  expect(sql).toContain("AVG(carbon_intensity_gco2e_per_kwh) FILTER (WHERE calculation_status = 'disponivel')");
  expect(sql).toContain('ORDER BY bucket_start');
  expect(sql).not.toContain('15 minutes');
  expect(params).toEqual(['1', new Date('2026-10-23T00:00:00.000Z'), new Date('2026-10-24T00:00:00.000Z'), '15 minutes']);
});
it.each([['15min', '15 minutes'], ['1h', '1 hour'], ['1d', '1 day']] as const)(
  'traduz o bucket %s em intervalo %s sem concatenar no SQL', async (bucket, interval) => {
    fake.poolQuery.mockResolvedValueOnce({ rows: [] });
    await new CollectionRepository(createDatabase('postgresql://localhost/test')).findSeries({
      serviceId: '1', from: new Date('2026-10-23T00:00:00.000Z'), to: new Date('2026-10-24T00:00:00.000Z'), bucket });
    expect(fake.poolQuery.mock.calls[0][1][3]).toBe(interval);
    expect(fake.poolQuery.mock.calls[0][0]).not.toContain(interval);
  });
it('busca cada serviço com sua última coleta por LEFT JOIN LATERAL', async () => {
  fake.poolQuery.mockResolvedValueOnce({ rows: [] });
  await new ServiceRepository(createDatabase('postgresql://localhost/test')).findAllWithLastReading();
  expect(fake.poolQuery).toHaveBeenCalledOnce();
  expect(fake.poolQuery.mock.calls[0][0]).toContain('LEFT JOIN LATERAL');
  expect(fake.poolQuery.mock.calls[0][0]).toContain('ORDER BY collected_at DESC, id DESC');
  expect(fake.poolQuery.mock.calls[0][1]).toEqual([]);
});
it('agrega indicadores por intervalo com parâmetros de data', async () => {
  const from = new Date('2026-10-20T00:00:00.000Z');
  const to = new Date('2026-10-21T00:00:00.000Z');
  const row = { energy_kwh: '1.25', co2e_grams: '85.5', active: '3', unavailable: '1', without_metrics: '2', removed: '0' };
  fake.poolQuery.mockResolvedValueOnce({ rows: [row] });
  const result = await new ServiceRepository(createDatabase('postgresql://localhost/test')).findSummary(from, to);
  const sql = fake.poolQuery.mock.calls[0][0] as string;
  expect(sql).toContain('SUM(c.energy_kwh)');
  expect(sql).toContain('SUM(c.co2e_grams)');
  expect(sql).not.toContain('COALESCE(SUM(c.energy_kwh)');
  expect(sql).not.toContain('COALESCE(SUM(c.co2e_grams)');
  expect(sql).toContain('c.collected_at >= $1 AND c.collected_at < $2');
  expect(sql).toContain('COUNT(DISTINCT s.id) FILTER (WHERE s.status = \'ativo\')');
  expect(fake.poolQuery.mock.calls[0][1]).toEqual([from, to]);
  expect(result).toEqual(row);
});
it('traz os campos de cálculo na listagem de coletas', async () => {
  fake.poolQuery.mockResolvedValueOnce({ rows: [] });
  await new CollectionRepository(createDatabase('postgresql://localhost/test'))
    .findAll({ serviceId: null, from: null, to: null, limit: 50 });
  const sql = fake.poolQuery.mock.calls[0][0] as string;
  for (const column of ['calculation_status', 'carbon_intensity_gco2e_per_kwh', 'energy_kwh', 'co2e_grams']) {
    expect(sql).toContain(column);
  }
  expect(fake.poolQuery.mock.calls[0][1]).toEqual([null, null, null, 50]);
});
it.each(['BEGIN', 'consulta', 'COMMIT', 'ROLLBACK'])('libera conexão após falha em %s', async stage => {
  const original = new Error('falha controlada');
  fake.query.mockImplementation(async (sql: string) => {
    if (sql === stage) throw original;
    return { rows: [], rowCount: 0 };
  });
  const pending = withTransaction(createDatabase('postgresql://localhost/test'), async () => {
    if (stage === 'consulta' || stage === 'ROLLBACK') throw original;
  });
  await expect(pending).rejects.toBeInstanceOf(stage === 'consulta' ? Error : DatabaseError);
  expect(fake.release).toHaveBeenCalledOnce();
  expect(fake.release.mock.calls[0][0]).toBeInstanceOf(Error);
  const commands = fake.query.mock.calls.map(call => call[0]);
  expect(commands.includes('ROLLBACK')).toBe(stage !== 'BEGIN');
  if (stage === 'ROLLBACK') {
    await expect(pending).rejects.toMatchObject({ cause: { errors: [original, expect.any(DatabaseError)] } });
  }
});
it('falha de aquisição é tipada e não tenta liberar conexão inexistente', async () => {
  fake.connect.mockRejectedValue(new Error('pool indisponível'));
  await expect(withTransaction(createDatabase('postgresql://localhost/test'), async () => undefined))
    .rejects.toBeInstanceOf(DatabaseError);
  expect(fake.release).not.toHaveBeenCalled();
});
