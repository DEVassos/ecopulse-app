import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { fetchInvitation } from '../services/invitations.service';
import type { InvitationDetails } from '../services/invitations.types';

export type InvitationState =
  | { status: 'loading' }
  | { status: 'ready'; invitation: InvitationDetails }
  /** O convite não serve mais (inexistente, usado, expirado ou link incompleto): a tela explica e não mostra o formulário. */
  | { status: 'unavailable'; message: string }
  /** Falha que pode passar (rede, servidor): a tela oferece Tentar novamente. */
  | { status: 'error'; message: string };

const MISSING_TOKEN = 'Este link de convite está incompleto. Confira o link recebido ou peça um novo ao administrador.';
const NOT_FOUND = 'Convite não encontrado. Confira o link recebido ou peça um novo ao administrador.';

/** Lê o convite de `/cadastro?convite=<token>` (#197). Sem token não chama o backend. */
export function useInvitation(token: string | null): InvitationState & { retry: () => void } {
  const [state, setState] = useState<InvitationState>(() =>
    token ? { status: 'loading' } : { status: 'unavailable', message: MISSING_TOKEN },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetchInvitation(token, controller.signal)
      .then((invitation) => setState({ status: 'ready', invitation }))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return; // a tela foi fechada: ninguém espera a resposta
        if (reason instanceof ApiError && reason.status === 404) setState({ status: 'unavailable', message: NOT_FOUND });
        // 410: a mensagem do backend já diz se foi usado ou expirou
        else if (reason instanceof ApiError && reason.status === 410) setState({ status: 'unavailable', message: reason.message });
        else setState({ status: 'error', message: reason instanceof ApiError ? reason.message : 'Não foi possível ler o convite.' });
      });
    return () => controller.abort();
  }, [token, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  return { ...state, retry };
}
