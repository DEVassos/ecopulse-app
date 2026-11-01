import { useCallback, useState } from 'react';
import { ApiError } from '../services/api';
import { fetchServiceCollections } from '../services/collections.service';
import type { CollectionsResponse } from '../services/collections.types';
import { useMonitoring } from './useMonitoring';
import { usePolling } from './usePolling';

export interface CollectionsState {
  data: CollectionsResponse | null;
  /** Há uma busca em andamento (a primeira ou uma atualização). */
  loading: boolean;
  /** Mensagem pronta para a tela; vazia quando a última busca deu certo. */
  error: string;
  /** Horário da última busca bem-sucedida (ISO 8601); null antes da primeira. */
  updatedAt: string | null;
  /** Busca agora, sem esperar o intervalo ("Tentar novamente"). */
  refresh: () => void;
}

/** Histórico de coletas de um serviço, atualizado sozinho no intervalo do MonitoringProvider (RF10, RF11). */
export function useCollections(serviceId: string): CollectionsState {
  const { refreshIntervalMs } = useMonitoring();
  const [data, setData] = useState<CollectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      try {
        const response = await fetchServiceCollections(serviceId, signal);
        setData(response);
        setUpdatedAt(new Date().toISOString());
        setError('');
      } catch (reason) {
        if (signal.aborted) return; // cancelada (aba oculta, nova busca ou janela fechada): ninguém espera a resposta
        // Mantém o último histórico recebido; a janela mostra o erro e marca o dado como desatualizado
        setError(reason instanceof ApiError ? reason.message : 'Não foi possível carregar o histórico de coletas.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [serviceId],
  );

  const { refresh } = usePolling(load, refreshIntervalMs);

  return { data, loading, error, updatedAt, refresh };
}
