import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import { fetchCurrentUser, login } from './auth.service';

// Os testes falam com um backend (fetch simulado), não com o modo demonstração, que depende do .env da máquina
vi.mock('./services.service', () => ({ isDemoMode: false }));

function respondWith(response: Response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('login', () => {
  it('envia e-mail e senha em POST /auth/login e devolve o token', async () => {
    const fetchMock = respondWith(Response.json({ token: 'abc.def.ghi' }));

    await expect(login({ email: 'admin@ecopulse.local', password: 'admin1234' })).resolves.toEqual({ token: 'abc.def.ghi' });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/auth\/login$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'admin@ecopulse.local', password: 'admin1234' });
  });

  it('troca o 401 do backend por "E-mail ou senha incorretos."', async () => {
    respondWith(Response.json({ error: { code: 'UNAUTHORIZED', message: 'Credenciais inválidas.' } }, { status: 401 }));

    await expect(login({ email: 'admin@ecopulse.local', password: 'errada' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'E-mail ou senha incorretos.',
    });
  });

  it('recusa um 200 sem token, em vez de abrir uma sessão vazia', async () => {
    respondWith(Response.json({ ok: true }));

    const request = login({ email: 'admin@ecopulse.local', password: 'admin1234' });
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toThrow('formato inesperado (token)');
  });
});

describe('fetchCurrentUser', () => {
  it('devolve o id e o e-mail de GET /auth/me', async () => {
    respondWith(Response.json({ id: '1', email: 'admin@ecopulse.local' }));
    await expect(fetchCurrentUser()).resolves.toEqual({ id: '1', email: 'admin@ecopulse.local' });
  });

  it('trata como falha uma resposta sem e-mail', async () => {
    respondWith(Response.json({ id: '1' }));
    await expect(fetchCurrentUser()).rejects.toThrow('formato inesperado (email)');
  });
});
