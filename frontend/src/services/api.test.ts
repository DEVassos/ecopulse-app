import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './api';

function respondWith(response: Response) {
  vi.stubGlobal('fetch', vi.fn(async () => response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('devolve o JSON de uma resposta 2xx', async () => {
    respondWith(Response.json({ services: [], period: 'x' }));
    await expect(apiRequest<unknown>('/services')).resolves.toEqual({ services: [], period: 'x' });
  });

  it('transforma um 2xx com corpo que não é JSON em ApiError', async () => {
    respondWith(new Response('<html>proxy</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }));
    const request = apiRequest<unknown>('/services');
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toThrow('O servidor respondeu num formato inesperado. Avise a equipe do backend.');
  });

  it('usa a mensagem do corpo de erro do backend', async () => {
    respondWith(Response.json({ error: { code: 'DATABASE_ERROR', message: 'Banco fora do ar.' } }, { status: 500 }));
    await expect(apiRequest<unknown>('/services')).rejects.toMatchObject({ name: 'ApiError', status: 500, message: 'Banco fora do ar.' });
  });
});
