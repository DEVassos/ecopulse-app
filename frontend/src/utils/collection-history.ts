import type { ServiceCollection } from '../services/collections.types';

const POLLING_INTERVAL_SECONDS = 30;
const CYCLE_SLACK_SECONDS = 30;
const DEFAULT_COLLECTION_INTERVAL_SECONDS = 30;

/** Retorna o intervalo entre registros somente quando excede a janela normal de coleta. */
export function missingCollectionSeconds(newer: ServiceCollection, older: ServiceCollection): number | null {
  const seconds = (Date.parse(newer.collectedAt) - Date.parse(older.collectedAt)) / 1_000;
  if (!Number.isFinite(seconds)) return null;
  const interval = older.collectionIntervalSeconds ?? newer.collectionIntervalSeconds ?? DEFAULT_COLLECTION_INTERVAL_SECONDS;
  const tolerance = Math.max(1, interval) + POLLING_INTERVAL_SECONDS + CYCLE_SLACK_SECONDS;
  return seconds > tolerance ? seconds : null;
}
