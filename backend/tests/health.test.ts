import { expect, it, vi } from 'vitest';
import { getHealth } from '../src/modules/health/health.service';
import { DatabaseError } from '../src/shared/errors';

it('só devolve sucesso após concluir a verificação', async () => {
  let finish!: () => void;
  const verify = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  let completed = false;
  const health = getHealth(verify).then(result => { completed = true; return result; });
  await Promise.resolve();
  expect(completed).toBe(false);
  finish();
  expect(await health).toEqual({ status: 'ok', db: 'ok' });
});
it('propaga falha de banco', async () => {
  await expect(getHealth(async () => { throw new DatabaseError(); })).rejects.toBeInstanceOf(DatabaseError);
});
