import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { fetchCurrentUser } from '../services/auth.service';
import type { CurrentUser } from '../services/auth.types';

export interface CurrentUserState {
  user: CurrentUser | null;
  loading: boolean;
  /** Mensagem pronta para a tela; vazia quando a última busca deu certo. */
  error: string;
  /** Busca de novo ("Tentar novamente"). */
  refresh: () => void;
}

/**
 * Confirma a sessão no backend com GET /auth/me (área restrita). Um 401 encerra a sessão pelo api.ts, e o
 * ProtectedRoute leva para /login; outra falha fica na tela com "Tentar novamente", sem dado antigo.
 */
export function useCurrentUser(): CurrentUserState {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchCurrentUser(controller.signal)
      .then((current) => {
        setUser(current);
        setError('');
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return; // a tela foi fechada: ninguém espera a resposta
        setUser(null);
        setError(reason instanceof ApiError ? reason.message : 'Não foi possível confirmar a sessão.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [attempt]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError('');
    setAttempt((current) => current + 1);
  }, []);

  return { user, loading, error, refresh };
}
