import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ServiceCollection } from '../services/collections.types';
import CollectionsHistoryTable from './CollectionsHistoryTable';

function collection(id: string, collectedAt: string): ServiceCollection {
  return {
    id,
    serviceId: 'service-1',
    collectedAt,
    status: 'ok',
    collectionIntervalSeconds: 30,
    cpuPercent: 10,
    memoryGb: 1,
    diskGb: 1,
    networkGb: 1,
    errorMessage: null,
  };
}

describe('CollectionsHistoryTable', () => {
  it('alinha o aviso de lacuna à esquerda para mantê-lo visível em telas estreitas', () => {
    const html = renderToStaticMarkup(
      <CollectionsHistoryTable
        collections={[
          collection('newer', '2026-10-14T20:02:00Z'),
          collection('older', '2026-10-14T20:00:00Z'),
        ]}
      />,
    );
    expect(html).toContain('text-left text-xs text-muted');
    expect(html).toContain('Sem coleta por <strong');
  });
});
