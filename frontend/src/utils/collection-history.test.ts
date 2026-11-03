import { describe, expect, it } from 'vitest';
import type { ServiceCollection } from '../services/collections.types';
import { missingCollectionSeconds } from './collection-history';

function collection(collectedAt: string, collectionIntervalSeconds: number | null): ServiceCollection {
  return {
    id: collectedAt,
    serviceId: 'service-1',
    collectedAt,
    status: collectionIntervalSeconds === null ? 'erro' : 'ok',
    collectionIntervalSeconds,
    cpuPercent: null,
    memoryGb: null,
    diskGb: null,
    networkGb: null,
    errorMessage: null,
  };
}

describe('missingCollectionSeconds', () => {
  it('ignora diferenças dentro da janela normal do worker', () => {
    expect(missingCollectionSeconds(
      collection('2026-10-14T20:01:00Z', 30),
      collection('2026-10-14T20:00:00Z', 30),
    )).toBeNull();
  });

  it('só marca lacuna depois do intervalo esperado mais 60 s de tolerância', () => {
    expect(missingCollectionSeconds(
      collection('2026-10-14T20:01:30Z', 30),
      collection('2026-10-14T20:00:00Z', 30),
    )).toBeNull();
    expect(missingCollectionSeconds(
      collection('2026-10-14T20:01:31Z', 30),
      collection('2026-10-14T20:00:00Z', 30),
    )).toBe(91);
  });

  it('devolve o intervalo entre registros quando excede a janela normal', () => {
    expect(missingCollectionSeconds(
      collection('2026-10-14T20:02:00Z', 30),
      collection('2026-10-14T20:00:00Z', 30),
    )).toBe(120);
  });

  it('usa o intervalo padrão se as coletas não trouxerem intervalo', () => {
    expect(missingCollectionSeconds(
      collection('2026-10-14T20:02:00Z', null),
      collection('2026-10-14T20:00:00Z', null),
    )).toBe(120);
  });

  it('não informa lacuna quando os horários não podem ser interpretados', () => {
    expect(missingCollectionSeconds(collection('inválido', 30), collection('2026-10-14T20:00:00Z', 30))).toBeNull();
  });
});
