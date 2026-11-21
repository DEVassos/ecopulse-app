import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import { changePassword, fetchCurrentUser, login, passwordErrorField, updateProfile } from './auth.service';

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

describe('perfil (#401, rotas da #400)', () => {
  it('updateProfile envia só o nome em PATCH /auth/me e devolve a conta conferida', async () => {
    const fetchMock = respondWith(Response.json({ ...ADMIN, name: 'Ana Souza' }));

    await expect(updateProfile({ name: 'Ana Souza' })).resolves.toEqual({ ...ADMIN, name: 'Ana Souza' });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/auth\/me$/);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Ana Souza' });
  });

  it('updateProfile recusa uma resposta sem o papel, em vez de gravar a sessão pela metade', async () => {
    respondWith(Response.json({ id: '1', email: 'admin@ecopulse.local', name: 'Ana Souza' }));
    await expect(updateProfile({ name: 'Ana Souza' })).rejects.toThrow('formato inesperado (role)');
  });

  it('changePassword envia a atual e a nova em PUT /auth/me/password e aceita o 204 sem corpo', async () => {
    const fetchMock = respondWith(new Response(null, { status: 204 }));

    await expect(changePassword({ currentPassword: 'usuario1234', newPassword: 'nova12345' })).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/auth\/me\/password$/);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ currentPassword: 'usuario1234', newPassword: 'nova12345' });
  });

  it('senha atual errada chega como 400 com a mensagem do backend, ligada ao campo da senha atual', async () => {
    respondWith(Response.json({ error: { code: 'VALIDATION_ERROR', message: 'A senha atual não confere.' } }, { status: 400 }));

    const request = changePassword({ currentPassword: 'errada', newPassword: 'nova12345' });
    await expect(request).rejects.toMatchObject({ name: 'ApiError', status: 400, message: 'A senha atual não confere.' });
    expect(passwordErrorField(await request.catch((error: unknown) => error))).toBe('currentPassword');
  });

  it.each([
    [new ApiError('A nova senha deve ser diferente da atual.', 400), 'newPassword'],
    [new ApiError('A senha deve ter de 8 a 72 caracteres, com pelo menos uma letra e um número.', 400), 'newPassword'],
    [new ApiError('Informe currentPassword e newPassword.', 400), null],
    [new ApiError('A senha atual não confere.', 500), null],
    [new Error('A senha atual não confere.'), null],
  ])('passwordErrorField(%s) → %s', (error, field) => {
    expect(passwordErrorField(error)).toBe(field);
  });
});
