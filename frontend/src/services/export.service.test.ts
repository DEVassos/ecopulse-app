import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXPORT_PAGE_SIZE, fetchAllCollections } from './export.service';

// Os testes falam com um backend (fetch simulado), não com o modo demonstração, como os da paginação do gráfico (#256)
vi.mock('./services.service', () => ({ isDemoMode: false }));

afterEach(() => {
  vi.unstubAllGlobals();
});

const START = Date.parse('2026-10-14T00:00:00.000Z');
const END = START + 24 * 3600_000;

function collection(collectedAt: string, overrides: Record<string, unknown> = {}) {
  return {
    id: collectedAt, serviceId: '1', collectedAt, status: 'ok', collectionIntervalSeconds: 30,
    cpuPercent: 40, memoryGb: 1, diskGb: 10, networkGb: 0.1, errorMessage: null, calculationStatus: 'disponivel',
    energyKwh: 0.0005, co2eGrams: 0.04, carbonIntensityGco2ePerKwh: 85, ...overrides,
  };
}

/** `count` coletas a cada 30 s, da mais recente (`newest`) para a mais antiga, como a rota devolve. */
function page(newest: number, count: number) {
  return Array.from({ length: count }, (_, index) => collection(new Date(newest - index * 30_000).toISOString()));
}

/** Backend simulado: responde as partes em ordem e guarda o `to` e o `limit` de cada pedido. */
function serve(pages: unknown[][]) {
  const asked: URLSearchParams[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      asked.push(new URL(url, 'http://localhost').searchParams);
      return Response.json({ collections: pages[asked.length - 1] ?? [], period: { from: null, to: null } });
    }),
  );
  return asked;
}

describe('fetchAllCollections (#24)', () => {
  it('busca em partes de 500, cada uma logo antes da mais antiga recebida, e devolve da mais antiga para a mais recente', async () => {
    const first = page(END - 30_000, EXPORT_PAGE_SIZE);
    const oldestOfFirst = Date.parse(first[EXPORT_PAGE_SIZE - 1].collectedAt);
    const second = page(oldestOfFirst - 30_000, 120);
    const asked = serve([first, second]);
    const progress: number[] = [];

    const result = await fetchAllCollections({ serviceId: '1', fromMs: START, toMs: END }, { onProgress: (count) => progress.push(count) });

    expect(asked).toHaveLength(2);
    expect(asked[0].get('limit')).toBe('500');
    expect(asked[0].get('from')).toBe(new Date(START).toISOString());
    expect(asked[0].get('to')).toBe(new Date(END - 1).toISOString());
    expect(asked[1].get('to')).toBe(new Date(oldestOfFirst - 1).toISOString());
    expect(progress).toEqual([500, 620]);
    expect(result).toHaveLength(620);
    expect(Date.parse(result[0].collectedAt)).toBeLessThan(Date.parse(result[619].collectedAt));
    expect(new Set(result.map((item) => item.id)).size).toBe(620);
  });

  it('para quando a parte vem com menos de 500', async () => {
    const asked = serve([page(END - 30_000, 10)]);
    expect(await fetchAllCollections({ serviceId: '1', fromMs: START, toMs: END })).toHaveLength(10);
    expect(asked).toHaveLength(1);
  });

  it('coleta fora do contrato recusa a exportação inteira: nada de arquivo pela metade', async () => {
    const first = page(END - 30_000, EXPORT_PAGE_SIZE);
    const second = page(Date.parse(first[EXPORT_PAGE_SIZE - 1].collectedAt) - 30_000, 5);
    second[2] = collection(second[2].collectedAt, { status: 'pausado' });
    serve([first, second]);
    await expect(fetchAllCollections({ serviceId: '1', fromMs: START, toMs: END })).rejects.toThrow(/formato inesperado/);
  });

  it('falha de rede no meio também recusa tudo', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        if (calls === 2) throw new TypeError('Failed to fetch');
        return Response.json({ collections: page(END - 30_000, EXPORT_PAGE_SIZE), period: { from: null, to: null } });
      }),
    );
    await expect(fetchAllCollections({ serviceId: '1', fromMs: START, toMs: END })).rejects.toThrow();
  });
});
