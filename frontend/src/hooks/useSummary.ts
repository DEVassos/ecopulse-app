import { useEffect, useState } from 'react';
import { fetchServicesSummary } from '../services/summary.service';
import type { ServicesSummaryResponse } from '../services/services.types';

/**
 * Indicadores das últimas 24 h e das 24 h anteriores (GET /api/services/summary), numa única chamada por ciclo.
 * A busca espera a primeira atualização dos serviços (`updatedAt`), como os demais dados do dashboard. Numa falha, o
 * último resumo fica como está e `error` traz a mensagem: quem chama decide como mostrar.
 */
export function useSummary(updatedAt: string | null): { summary: ServicesSummaryResponse | null; error: string } {
  const [summary, setSummary] = useState<ServicesSummaryResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (updatedAt === null) return;
    const controller = new AbortController();
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    void (async () => {
      try {
        const current = await fetchServicesSummary(from.toISOString(), to.toISOString(), controller.signal);
        if (controller.signal.aborted) return;
        setSummary(current);
        setError('');
      } catch (reason: unknown) {
        // O prefixo diz o que parou: a faixa do #217 mostra esta mensagem ao lado de uma tabela que segue atualizando (#234)
        if (!controller.signal.aborted) {
          const detail = reason instanceof Error ? reason.message : 'não foi possível carregar os indicadores.';
          setError(`Indicadores das 24 h: ${detail}`);
        }
      }
    })();
    return () => controller.abort();
  }, [updatedAt]);

  return { summary, error };
}
