import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { fetchComparison } from '../services/compare.service';
import type { ServicesComparison } from '../services/compare.types';
import { periodMs } from '../utils/emissions';

export interface ComparisonState {
  data: ServicesComparison | null;
  loading: boolean;
  /** Mensagem pronta para a tela; vazia quando a última busca deu certo. */
  error: string;
  /** Busca de novo o mesmo filtro ("Tentar novamente" e "Comparar" sem mudança). */
  refresh: () => void;
}

/**
 * Comparação dos serviços `ids` no período de `start` a `end` (yyyy-mm-dd, fuso do navegador).
 * Busca uma vez por filtro, sem polling; com menos de dois serviços não busca. Cada busca nova limpa o resultado
 * anterior: depois de uma falha, a tela mostra o erro, e não uma comparação antiga como se fosse a atual.
 */
export function useComparison(ids: string[], start: string, end: string): ComparisonState {
  const key = ids.join(',');
  const enabled = ids.length >= 2;
  const [data, setData] = useState<ServicesComparison | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  // Filtro novo (ou "Tentar novamente"): o ajuste acontece na própria renderização, e não num efeito, para a
  // comparação anterior não aparecer nem por um quadro junto com o filtro novo
  const filter = `${key}|${start}|${end}|${attempt}`;
  const [shownFilter, setShownFilter] = useState(filter);
  if (shownFilter !== filter) {
    setShownFilter(filter);
    setData(null);
    setError('');
    setLoading(enabled);
  }

  useEffect(() => {
    const list = key === '' ? [] : key.split(',');
    if (list.length < 2) return;

    const controller = new AbortController();
    // Até 24:00 do dia final, ou até agora se for hoje (o mesmo período da página Emissões)
    const { fromMs, toMs } = periodMs(start, end);
    fetchComparison(list, new Date(fromMs).toISOString(), new Date(toMs).toISOString(), controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setData(response);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return; // filtro trocado ou tela fechada: ninguém espera esta resposta
        setError(reason instanceof ApiError ? reason.message : 'Não foi possível comparar os serviços.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [key, start, end, attempt]);

  const refresh = useCallback(() => setAttempt((current) => current + 1), []);

  return { data, loading, error, refresh };
}
