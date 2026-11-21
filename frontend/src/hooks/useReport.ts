import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { fetchServicesRanking } from '../services/ranking.service';
import type { ServicesRankingResponse } from '../services/ranking.types';
import { periodMs } from '../utils/emissions';
import { previousWindow } from '../utils/insights';

export interface ReportData {
  current: ServicesRankingResponse;
  /** null quando a busca do período anterior falhou: o relatório sai sem comparação, e a tela diz isso. */
  previous: ServicesRankingResponse | null;
  /** Instante em que as duas respostas chegaram (ISO 8601). */
  generatedAt: string;
}

export interface ReportState {
  data: ReportData | null;
  loading: boolean;
  /** Falha do período escolhido: sem relatório. Vazia quando a última busca deu certo. */
  error: string;
  /** Falha só do período anterior; vazia quando ele chegou. */
  previousError: string;
  refresh: () => void;
}

function messageOf(reason: unknown, fallback: string): string {
  return reason instanceof ApiError ? reason.message : fallback;
}

/**
 * Relatório do período de `start` a `end` (AAAA-MM-DD, fuso do navegador; #403): o ranking por CO₂e do período e o do
 * período anterior de mesma duração, imediatamente antes, buscados juntos. Sem polling, como a Comparação: uma busca por
 * filtro, e cada filtro novo limpa o resultado anterior, para um relatório antigo não aparecer como o atual.
 */
export function useReport(start: string, end: string): ReportState {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previousError, setPreviousError] = useState('');
  const [attempt, setAttempt] = useState(0);

  // Filtro novo (ou "Tentar novamente"): o ajuste acontece na renderização, como em useComparison
  const filter = `${start}|${end}|${attempt}`;
  const [shownFilter, setShownFilter] = useState(filter);
  if (shownFilter !== filter) {
    setShownFilter(filter);
    setData(null);
    setError('');
    setPreviousError('');
    setLoading(true);
  }

  useEffect(() => {
    const controller = new AbortController();
    // Até 24:00 do dia final, ou até agora se for hoje (o mesmo período de Emissões e da Comparação)
    const { fromMs, toMs } = periodMs(start, end);
    const before = previousWindow(fromMs, toMs);
    const iso = (ms: number) => new Date(ms).toISOString();
    // allSettled: a falha do período anterior não derruba o relatório do período escolhido
    void Promise.allSettled([
      fetchServicesRanking('co2e', iso(fromMs), iso(toMs), controller.signal),
      fetchServicesRanking('co2e', iso(before.fromMs), iso(before.toMs), controller.signal),
    ]).then(([current, previous]) => {
      if (controller.signal.aborted) return; // filtro trocado ou tela fechada: ninguém espera esta resposta
      if (current.status === 'rejected') {
        setError(messageOf(current.reason, 'Não foi possível gerar o relatório.'));
      } else {
        setData({
          current: current.value,
          previous: previous.status === 'fulfilled' ? previous.value : null,
          generatedAt: new Date().toISOString(),
        });
        setPreviousError(previous.status === 'rejected' ? messageOf(previous.reason, 'Não foi possível buscar o período anterior.') : '');
      }
      setLoading(false);
    });
    return () => controller.abort();
  }, [start, end, attempt]);

  const refresh = useCallback(() => setAttempt((current) => current + 1), []);

  return { data, loading, error, previousError, refresh };
}
