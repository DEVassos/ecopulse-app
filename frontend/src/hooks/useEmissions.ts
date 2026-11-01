import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { fetchEmissions } from '../services/emissions.service';
import type { EmissionsBucket, EmissionsSeries } from '../services/emissions.types';
import { autoBucket, periodMs } from '../utils/emissions';

export interface EmissionsParams {
  /** Serviço (estação de coleta) escolhido; null enquanto não há nenhum. */
  serviceId: string | null;
  /** Data inicial "yyyy-mm-dd". */
  start: string;
  /** Data final "yyyy-mm-dd" (no tempo real é sempre hoje). */
  end: string;
  /** Agrupamento escolhido pela pessoa; null usa o automático pelo tamanho do período. */
  bucket: EmissionsBucket | null;
  /** Tempo real: busca de novo a cada `intervalMs`, com o fim do período em "agora". */
  live: boolean;
  intervalMs: number;
}

export interface EmissionsState {
  data: EmissionsSeries | null;
  /** Período da última busca bem-sucedida, em milissegundos (o fim acompanha o "agora" no tempo real). */
  period: { fromMs: number; toMs: number } | null;
  loading: boolean;
  /** Mensagem pronta para a tela; vazia quando a última busca deu certo. */
  error: string;
  /** Horário da última busca bem-sucedida do filtro atual (ISO 8601); null antes dela. */
  updatedAt: string | null;
  /** Busca de novo agora (botão "Atualizar" e "Tentar novamente"). */
  refresh: () => void;
}

/**
 * Série de emissão de CO₂e de uma estação no período escolhido.
 * Fora do tempo real busca uma vez por mudança de filtro (ou por "Atualizar"); no tempo real repete no intervalo
 * do MonitoringProvider, só depois que a busca anterior terminar, e pausa com a aba oculta (como o usePolling).
 */
export function useEmissions({ serviceId, start, end, bucket, live, intervalMs }: EmissionsParams): EmissionsState {
  const [data, setData] = useState<EmissionsSeries | null>(null);
  const [period, setPeriod] = useState<EmissionsState['period']>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // Trocar de estação, período ou agrupamento não deixa a série antiga na tela como se fosse a nova; o horário e o
  // erro também são da série anterior ("Desatualizado desde …" só vale para o dado que está na tela).
  // O ajuste acontece na própria renderização, e não num efeito, para a série antiga não aparecer nem por um quadro.
  const filter = `${serviceId}|${start}|${end}|${bucket}`;
  const [shownFilter, setShownFilter] = useState(filter);
  if (shownFilter !== filter) {
    setShownFilter(filter);
    setData(null);
    setPeriod(null);
    setUpdatedAt(null);
    setError('');
  }

  useEffect(() => {
    if (serviceId === null) return undefined;
    const id = serviceId;
    let timer: number | undefined;
    let controller: AbortController | null = null;
    let stopped = false;

    async function run() {
      window.clearTimeout(timer);
      controller?.abort();
      const current = new AbortController();
      controller = current;
      setLoading(true);
      try {
        const range = periodMs(start, end);
        const series = await fetchEmissions(
          {
            serviceId: id,
            from: new Date(range.fromMs).toISOString(),
            to: new Date(range.toMs).toISOString(),
            bucket: bucket ?? autoBucket(range.fromMs, range.toMs),
          },
          current.signal,
        );
        if (current.signal.aborted) return;
        setData(series);
        setPeriod(range);
        setUpdatedAt(new Date().toISOString());
        setError('');
      } catch (reason) {
        if (current.signal.aborted) return;
        // Mantém a última série recebida; a tela mostra o erro junto com ela
        setError(reason instanceof ApiError ? reason.message : 'Não foi possível carregar as emissões.');
      } finally {
        if (!current.signal.aborted) setLoading(false);
        if (live && !stopped && !current.signal.aborted && !document.hidden) {
          timer = window.setTimeout(run, intervalMs);
        }
      }
    }

    function handleVisibilityChange() {
      if (!live) return;
      if (document.hidden) {
        window.clearTimeout(timer);
        controller?.abort();
      } else {
        void run();
      }
    }

    void run();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [serviceId, start, end, bucket, live, intervalMs, reload]);

  const refresh = useCallback(() => setReload((n) => n + 1), []);

  return { data, period, loading, error, updatedAt, refresh };
}
