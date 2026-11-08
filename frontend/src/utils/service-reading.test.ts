import { describe, expect, it } from 'vitest';
import { factorMissing, factorTooltip, intervalText, powerText, resourcesText } from './service-reading';

describe('factorMissing', () => {
  it('distingue sem região, sem leitura e sem fator nesta leitura', () => {
    expect(factorMissing({ regionCode: null, lastReadingAt: null, cpuPercent: null }).label).toBe('sem região');
    expect(factorMissing({ regionCode: 'us-east', lastReadingAt: null, cpuPercent: null }).label).toBe('sem leitura');
    expect(factorMissing({ regionCode: 'us-east', lastReadingAt: '2026-11-07T19:00:00.000Z', cpuPercent: null }).label).toBe('sem leitura');
    expect(factorMissing({ regionCode: 'us-east', lastReadingAt: '2026-11-07T19:00:00.000Z', cpuPercent: 50 }).label).toBe('sem fator nesta leitura');
  });
});

describe('textos da leitura', () => {
  it('formata potência, recursos e intervalo em pt-BR, só com as partes presentes', () => {
    expect(powerText({ powerWatts: 41.794993 })).toBe('41,8 W');
    expect(powerText({ powerWatts: null })).toBeNull();
    expect(resourcesText({ memoryGb: 6.035456, diskGb: 67.11296, networkGb: 0.52836 })).toBe('RAM 6,0 GB · disco 67,1 GB · rede 0,53 GB');
    expect(resourcesText({ memoryGb: 6, diskGb: null, networkGb: null })).toBe('RAM 6,0 GB');
    expect(resourcesText({ memoryGb: null, diskGb: null, networkGb: null })).toBeNull();
    expect(intervalText({ collectionIntervalSeconds: 46 })).toBe('coleta de 46 s');
    expect(intervalText({ collectionIntervalSeconds: 3600 })).toBe('coleta de 1 h');
    expect(intervalText({ collectionIntervalSeconds: null })).toBeNull();
    expect(factorTooltip({ regionCode: 'jp-east' })).toBe('Intensidade de carbono de jp-east na última leitura');
  });
});
