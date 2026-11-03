import type { ServiceCollection } from '../services/collections.types';

const COLLECTION_GAP_GRACE_SECONDS = 60;
const DEFAULT_COLLECTION_INTERVAL_SECONDS = 30;

/** Exige o intervalo informado mais 60 s de tolerância para não marcar um ciclo atrasado como lacuna. */
export function missingCollectionSeconds(newer: ServiceCollection, older: ServiceCollection): number | null {
  const seconds = (Date.parse(newer.collectedAt) - Date.parse(older.collectedAt)) / 1_000;
  if (!Number.isFinite(seconds)) return null;
  const interval = older.collectionIntervalSeconds ?? newer.collectionIntervalSeconds ?? DEFAULT_COLLECTION_INTERVAL_SECONDS;
  const tolerance = Math.max(1, interval) + COLLECTION_GAP_GRACE_SECONDS;
  return seconds > tolerance ? seconds : null;
}
