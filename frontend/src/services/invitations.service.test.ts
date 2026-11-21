import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import { createInvitation, fetchInvitation, registerWithInvitation } from './invitations.service';

// Os testes falam com um backend (fetch simulado), não com o modo demonstração, que depende do .env da máquina
vi.mock('./services.service', () => ({ isDemoMode: false }));

const TOKEN = 'jav-t9mhiWzKLvkFREXj6hyLzCcvzrf8dGCLAxrFQpY';

function respondWith(response: Response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function request(fetchMock: ReturnType<typeof respondWith>): [string, RequestInit] {
  return fetchMock.mock.calls[0] as unknown as [string, RequestInit];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createInvitation (#197)', () => {
  it('envia e-mail e papel em POST /invitations e devolve o link e a validade em ms', async () => {
    const fetchMock = respondWith(
      Response.json({ inviteUrl: `http://localhost:5173/cadastro?convite=${TOKEN}`, expiresAt: '2026-11-24T03:05:31.492Z' }, { status: 201 }),
    );

    await expect(createInvitation({ email: 'ana@exemplo.com', role: 'usuario' })).resolves.toEqual({
      inviteUrl: `http://localhost:5173/cadastro?convite=${TOKEN}`,
      expiresAt: Date.parse('2026-11-24T03:05:31.492Z'),
    });
    const [url, init] = request(fetchMock);
    expect(url).toMatch(/\/invitations$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'ana@exemplo.com', role: 'usuario' });
  });

  it('repassa a mensagem do 409 e do 403 do backend', async () => {
    respondWith(Response.json({ error: { code: 'CONFLICT', message: 'Já existe uma conta com este e-mail.' } }, { status: 409 }));
    await expect(createInvitation({ email: 'admin@ecopulse.local', role: 'usuario' })).rejects.toMatchObject({
      status: 409,
      message: 'Já existe uma conta com este e-mail.',
    });
    respondWith(Response.json({ error: { code: 'FORBIDDEN', message: 'Só administradores podem fazer esta ação.' } }, { status: 403 }));
    await expect(createInvitation({ email: 'x@exemplo.com', role: 'admin' })).rejects.toMatchObject({ status: 403 });
  });

  it.each([
    ['link que não abre o cadastro', { inviteUrl: 'http://localhost:5173/login', expiresAt: '2026-11-24T03:05:31.492Z' }, 'inviteUrl'],
    ['validade que não é data', { inviteUrl: `http://localhost:5173/cadastro?convite=${TOKEN}`, expiresAt: 'amanhã' }, 'expiresAt'],
  ])('recusa %s, em vez de mostrar um link que não serve', async (_label, body, field) => {
    respondWith(Response.json(body, { status: 201 }));
    await expect(createInvitation({ email: 'ana@exemplo.com', role: 'usuario' })).rejects.toThrow(`formato inesperado (${field})`);
  });
});

describe('fetchInvitation (#197)', () => {
  it('lê e-mail, papel e validade em GET /invitations/:token', async () => {
    const fetchMock = respondWith(Response.json({ email: 'ana@exemplo.com', role: 'admin', expiresAt: '2026-11-24T03:05:31.492Z' }));
    await expect(fetchInvitation(TOKEN)).resolves.toEqual({
      email: 'ana@exemplo.com',
      role: 'admin',
      expiresAt: Date.parse('2026-11-24T03:05:31.492Z'),
    });
    expect(request(fetchMock)[0]).toMatch(new RegExp(`/invitations/${TOKEN}$`));
  });

  it('mantém o status e a mensagem do 410 para a tela explicar o motivo', async () => {
    respondWith(Response.json({ error: { code: 'GONE', message: 'Este convite já foi usado.' } }, { status: 410 }));
    const result = fetchInvitation(TOKEN);
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({ status: 410, message: 'Este convite já foi usado.' });
  });
});

describe('registerWithInvitation (#197)', () => {
  it('envia token, nome e senha em POST /auth/register e devolve a conta criada', async () => {
    const user = { id: '2', email: 'ana@exemplo.com', name: 'Ana', role: 'usuario' };
    const fetchMock = respondWith(Response.json(user, { status: 201 }));
    await expect(registerWithInvitation({ token: TOKEN, name: 'Ana', password: 'senha1234' })).resolves.toEqual(user);
    const [url, init] = request(fetchMock);
    expect(url).toMatch(/\/auth\/register$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ token: TOKEN, name: 'Ana', password: 'senha1234' });
  });
});
