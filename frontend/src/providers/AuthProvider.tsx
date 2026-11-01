import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
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

/** Sessão salva com o formato esperado, ou null (nada salvo, outra versão ou conteúdo alterado à mão). */
function parseSession(value: unknown): Session | null {
  if (!isRecord(value) || typeof value.token !== 'string' || value.token === '' || !isRecord(value.user)) return null;
  const { email, name } = value.user;
  return typeof email === 'string' && typeof name === 'string' ? { token: value.token, user: { email, name } } : null;
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
  const navigate = useNavigate();
  // O token vai para o cliente HTTP já na primeira renderização: as telas filhas fazem
  // requisições nos seus efeitos, que rodam antes dos efeitos deste provider
  const [session, setSession] = useState<Session | null>(() => {
    const saved = readSession();
    setAuthToken(saved?.token ?? null);
    return saved;
  });

  const logout = useCallback(() => {
    writeSession(null);
    setAuthToken(null);
    setSession(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token } = await authService.login({ email, password });
    const next: Session = { token, user: { email, name: email.split('@')[0] } };
    writeSession(next);
    setAuthToken(token);
    setSession(next);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      logout();
      navigate('/login', { replace: true });
    });
  }, [logout, navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, login, logout }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
