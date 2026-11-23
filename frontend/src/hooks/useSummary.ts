import { useEffect, useState } from 'react';
import { fetchServicesSummary } from '../services/summary.service';
import type { ServicesSummaryResponse } from '../services/services.types';
import type { DashboardPeriod } from '../utils/dashboard-period';

/**
 * Indicadores das últimas 24 h e das 24 h anteriores (GET /api/services/summary), numa única chamada por ciclo.
 * Recebe a mesma janela calculada a partir de `updatedAt` para ranking e regiões (#375). Numa falha, o
 * último resumo fica como está e `error` traz a mensagem: quem chama decide como mostrar.
 */
export function useSummary(period: DashboardPeriod | null): { summary: ServicesSummaryResponse | null; error: string } {
  const [summary, setSummary] = useState<ServicesSummaryResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (period === null) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const current = await fetchServicesSummary(period.from, period.to, controller.signal);
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
  }, [period]);

  return { summary, error };
}
