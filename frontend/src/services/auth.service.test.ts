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

const ADMIN = { id: '1', email: 'admin@ecopulse.local', name: 'Administrador', role: 'admin' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('login', () => {
  it('envia e-mail e senha em POST /auth/login e devolve o token e a conta com o papel (#196)', async () => {
    const fetchMock = respondWith(Response.json({ token: 'abc.def.ghi', user: ADMIN }));

    await expect(login({ email: 'admin@ecopulse.local', password: 'admin1234' })).resolves.toEqual({ token: 'abc.def.ghi', user: ADMIN });

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

  it('recusa um login sem a conta ou com papel desconhecido (backend anterior à #196)', async () => {
    respondWith(Response.json({ token: 'abc.def.ghi' }));
    await expect(login({ email: 'admin@ecopulse.local', password: 'admin1234' })).rejects.toThrow('formato inesperado (user)');
    respondWith(Response.json({ token: 'abc.def.ghi', user: { ...ADMIN, role: 'root' } }));
    await expect(login({ email: 'admin@ecopulse.local', password: 'admin1234' })).rejects.toThrow('formato inesperado (role)');
  });

  it('recusa um 200 sem token, em vez de abrir uma sessão vazia', async () => {
    respondWith(Response.json({ ok: true }));

    const request = login({ email: 'admin@ecopulse.local', password: 'admin1234' });
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toThrow('formato inesperado (token)');
  });
});

describe('fetchCurrentUser', () => {
  it('devolve id, e-mail, nome e papel de GET /auth/me', async () => {
    respondWith(Response.json(ADMIN));
    await expect(fetchCurrentUser()).resolves.toEqual(ADMIN);
  });

  it('trata como falha uma resposta sem e-mail', async () => {
    respondWith(Response.json({ id: '1', name: 'Administrador', role: 'admin' }));
    await expect(fetchCurrentUser()).rejects.toThrow('formato inesperado (email)');
  });
});
