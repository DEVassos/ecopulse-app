import { describe, expect, it } from 'vitest';
import { demoComparison, demoEmissions, demoSummary } from './emissions.demo';

// Modo demonstração: a série, o resumo e a comparação saem dos mesmos pontos sintéticos, mas cada rota tem a sua regra
// de `notCalculated` (docs/api.md). O Inventory Sync não tem métricas: todas as coletas dele falham.

const FROM = '2026-11-20T00:00:00.000Z';
const TO = '2026-11-20T02:00:00.000Z';

async function inventoryCollections(): Promise<number> {
  const series = await demoEmissions({ serviceId: 'inventory-sync', from: FROM, to: TO, bucket: 'coleta' });
  expect(series.totals.failed).toBe(series.totals.collections);
  return series.totals.collections;
}

describe('série ilustrativa de emissões (#234)', () => {
  it('não conta a coleta com falha como sem cálculo, como GET /api/collections/series', async () => {
    const series = await demoEmissions({ serviceId: 'inventory-sync', from: FROM, to: TO, bucket: 'coleta' });
    expect(series.totals.collections).toBeGreaterThan(0);
    // Na série as contagens não se sobrepõem: `collections - failed - notCalculated` é o número de calculadas. Com
    // notCalculated igual a failed, o gráfico daria -1 por coleta com falha
    expect(series.totals.notCalculated).toBe(0);
  });

  it('soma as duas contagens no resumo, onde a falha também está sem cálculo como em GET /api/services/summary', async () => {
    const failedCollections = await inventoryCollections();
    const summary = await demoSummary(FROM, TO);
    // As coletas que falharam entram nas duas contagens: sem a soma, notCalculated ficaria menor que failed
    expect(summary.totals.failed).toBeGreaterThanOrEqual(failedCollections);
    expect(summary.totals.notCalculated).toBeGreaterThanOrEqual(summary.totals.failed);
    expect(summary.previous.totals.notCalculated).toBeGreaterThanOrEqual(summary.previous.totals.failed);
  });

  it('soma as duas contagens na comparação, como em GET /api/services/compare', async () => {
    const failedCollections = await inventoryCollections();
    const comparison = await demoComparison(['inventory-sync'], FROM, TO);
    const [service] = comparison.services;
    expect(service.failed).toBe(failedCollections);
    expect(service.notCalculated).toBe(failedCollections);
  });
});
