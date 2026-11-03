import { describe, expect, it } from 'vitest';
import { missingCollectionSeconds } from '../utils/collection-history';
import { demoCollections } from './demo-data';

describe('demoCollections', () => {
  it('inclui uma lacuna ilustrativa no histórico do Fraud Detector', () => {
    const { collections } = demoCollections('fraud-detector', 10);
    expect(missingCollectionSeconds(collections[4], collections[5])).toBe(120);
  });
});
