import { afterAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db/connection';
import { MonitoringSettingsRepository } from '../src/modules/monitoring-settings/monitoring-settings.repository';
import { DatabaseError } from '../src/shared/errors';
import { invalidSettings, settingsCount } from './monitoring-settings-test.repository';

const url = process.env.REPOSITORY_TEST_DATABASE_URL;
describe.skipIf(!url)('monitoring-settings em PostgreSQL exclusivo', () => {
  const db = createDatabase(url ?? 'postgresql://localhost/test');
  const repository = new MonitoringSettingsRepository(db);
  afterAll(() => db.close());
  it('leitura inicial não grava e restrições rejeitam id/intervalo inválidos', async () => {
    expect(await repository.find()).toBeNull();
    expect(await settingsCount(db)).toBe(0);
    await expect(invalidSettings(db, 2, 30)).rejects.toBeInstanceOf(DatabaseError);
    await expect(invalidSettings(db, 1, 120)).rejects.toBeInstanceOf(DatabaseError);
    expect(await settingsCount(db)).toBe(0);
  });
  it('upsert mantém uma linha e persiste em outra conexão', async () => {
    const first = await repository.save(15);
    const second = await repository.save(60);
    expect(second.updated_at.getTime()).toBeGreaterThanOrEqual(first.updated_at.getTime());
    expect(await settingsCount(db)).toBe(1);
    const another = createDatabase(url!);
    try { expect(await new MonitoringSettingsRepository(another).find()).toEqual(second); }
    finally { await another.close(); }
    expect(second.refresh_interval_seconds).toBe(60);
  });
});
