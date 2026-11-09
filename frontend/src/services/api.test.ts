import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, setAuthToken, setSessionExpiredHandler } from './api';

function respondWith(response: Response) {
  vi.stubGlobal('fetch', vi.fn(async () => response));
}

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthToken(null);
  setSessionExpiredHandler(() => {});
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

  it('envia Authorization: Bearer só com sessão aberta', async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest<unknown>('/services');
    setAuthToken('abc.def.ghi');
    await apiRequest<unknown>('/auth/me');

    const headersOf = (call: number) => (fetchMock.mock.calls[call] as unknown[])[1] as { headers: Record<string, string> };
    expect(headersOf(0).headers.Authorization).toBeUndefined();
    expect(headersOf(1).headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('encerra a sessão quando o backend recusa o token (401)', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    setAuthToken('expirado');
    respondWith(Response.json({ error: { code: 'UNAUTHORIZED', message: 'Token ausente, inválido ou expirado.' } }, { status: 401 }));

    await expect(apiRequest<unknown>('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('não encerra sessão nenhuma num 401 sem token (login com senha errada)', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    respondWith(Response.json({ error: { code: 'UNAUTHORIZED', message: 'Credenciais inválidas.' } }, { status: 401 }));

    await expect(apiRequest<unknown>('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 401 });
    expect(expired).not.toHaveBeenCalled();
  });
});
