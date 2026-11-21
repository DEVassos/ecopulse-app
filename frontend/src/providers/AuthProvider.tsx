import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { setAuthToken, setSessionExpiredHandler } from '../services/api';
import * as authService from '../services/auth.service';
import { isRecord } from '../services/contract';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthContextValue, AuthUser } from '../contexts/AuthContext';

// O token fica no sessionStorage: some ao fechar a aba e não é compartilhado entre abas (US07)
const STORAGE_KEY = 'ecopulse.session';

interface Session {
  token: string;
  user: AuthUser;
}

/**
 * Sessão salva com o formato esperado, ou null (nada salvo, outra versão ou conteúdo alterado à mão). Sessão de antes
 * da #196, sem papel, também volta null: o token dela não tem papel e o backend já o recusaria.
 */
function parseSession(value: unknown): Session | null {
  if (!isRecord(value) || typeof value.token !== 'string' || value.token === '' || !isRecord(value.user)) return null;
  const { email, name, role } = value.user;
  if (typeof email !== 'string' || typeof name !== 'string' || (role !== 'admin' && role !== 'usuario')) return null;
  return { token: value.token, user: { email, name, role } };
}

function readSession(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? parseSession(JSON.parse(raw)) : null;
  } catch {
    return null; // armazenamento bloqueado ou conteúdo inválido: segue como visitante
  }
}

function writeSession(session: Session | null): void {
  try {
    if (session) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sem armazenamento: a sessão vale só enquanto a página estiver aberta (fica no estado)
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  // O token vai para o cliente HTTP já na primeira renderização: as telas filhas fazem
  // requisições nos seus efeitos, que rodam antes dos efeitos deste provider
  const [session, setSession] = useState<Session | null>(() => {
    const saved = readSession();
    setAuthToken(saved?.token ?? null);
    return saved;
  });
  const [sessionExpired, setSessionExpired] = useState(false);
  const activeSession = useRef(session);

  const saveSession = useCallback((next: Session | null) => {
    activeSession.current = next;
    writeSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    saveSession(null);
  }, [saveSession]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authService.login({ email, password });
    const next: Session = { token, user: { email: user.email, name: user.name, role: user.role } };
    setAuthToken(token);
    setSessionExpired(false);
    saveSession(next);
  }, [saveSession]);

  // Perfil (#401): o mesmo token, com o nome que o backend devolveu; o sessionStorage acompanha para o F5 não voltar
  // ao nome antigo
  const updateUser = useCallback(
    (user: AuthUser) => {
      // A resposta do perfil só pode atualizar a sessão que iniciou a solicitação.
      if (!session || activeSession.current !== session) return;
      const next: Session = { token: session.token, user: { email: user.email, name: user.name, role: user.role } };
      saveSession(next);
    },
    [saveSession, session],
  );

  // Token recusado (expirou ou foi trocado o segredo): encerra a sessão. Sem usuário, o ProtectedRoute leva a
  // pessoa ao login guardando a tela atual, e as páginas desmontam, o que para o polling (#257)
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setSessionExpired(true);
      logout();
    });
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, sessionExpired, login, logout, updateUser }),
    [session, sessionExpired, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
