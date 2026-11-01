import { useCallback, useState } from 'react';
import { ApiError } from '../services/api';
import { fetchServices } from '../services/services.service';
import type { ServicesResponse } from '../services/services.types';
import { useMonitoring } from './useMonitoring';
import { usePolling } from './usePolling';

export interface ServicesState {
  data: ServicesResponse | null;
  /** Há uma busca em andamento (a primeira ou uma atualização). */
  loading: boolean;
  /** Mensagem pronta para a tela; vazia quando a última busca deu certo. */
  error: string;
  /** Horário da última busca bem-sucedida (ISO 8601); null antes da primeira. */
  updatedAt: string | null;
  /** Busca agora, sem esperar o intervalo (botão "Atualizar agora" e "Tentar novamente"). */
  refresh: () => void;
}

/** Lista de serviços monitorados, atualizada sozinha no intervalo do MonitoringProvider. */
export function useServices(): ServicesState {
  const { refreshIntervalMs } = useMonitoring();
  const [data, setData] = useState<ServicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetchServices(signal);
      setData(response);
      setUpdatedAt(new Date().toISOString());
      setError('');
    } catch (reason) {
      if (signal.aborted) return; // cancelada (aba oculta, nova busca ou tela fechada): ninguém espera a resposta
      // Mantém o último dado recebido; a tela mostra o erro e marca o dado como desatualizado
      setError(reason instanceof ApiError ? reason.message : 'Não foi possível carregar os serviços.');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  const { refresh } = usePolling(load, refreshIntervalMs);

  return { data, loading, error, updatedAt, refresh };
}
