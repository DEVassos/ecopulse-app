import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { fetchServiceSeries } from '../services/emissions.service';
import { alignCompareSeries, compareBucket } from '../utils/compare-series';
import type { CompareBucket, CompareSeries, CompareSeriesInput, CompareServiceRef } from '../utils/compare-series';
import { periodMs } from '../utils/emissions';

export interface CompareSeriesState {
  data: CompareSeries | null;
  /** Agrupamento do filtro atual (`15min` ou `1h`); o gráfico mostra na legenda. */
  bucket: CompareBucket;
  /** Período buscado (ms), o mesmo dos pontos: é o eixo do tempo do gráfico. */
  fromMs: number;
  toMs: number;
  loading: boolean;
  /** Mensagem pronta para a tela; vazia quando pelo menos uma série chegou. */
  error: string;
  /** Serviços cuja série falhou: saem do gráfico, e os demais continuam com o nome deles escrito. */
  failed: string[];
  /** Busca de novo as séries do mesmo filtro ("Tentar novamente" e "Comparar" sem mudança). */
  refresh: () => void;
}

/**
 * Séries de CO₂e dos `services` no período de `start` a `end` (yyyy-mm-dd, fuso do navegador), uma busca por serviço
 * em paralelo: `GET /api/collections/series` atende um serviço por vez, e a comparação só lê (#406). Busca uma vez por
 * filtro, sem polling; com menos de dois serviços não busca, porque a linha única é a página Emissões.
 *
 * Uma falha isolada não derruba as outras linhas: o serviço vai para `failed`. Só quando nenhuma série chega é que a
 * tela fica com erro — nunca com um gráfico vazio apresentado como válido. Filtro novo limpa o resultado anterior.
 */
export function useCompareSeries(services: CompareServiceRef[], start: string, end: string): CompareSeriesState {
  const key = services.map((service) => service.id).join(',');
  const enabled = services.length >= 2;
  const { fromMs, toMs } = periodMs(start, end);
  const bucket = compareBucket(fromMs, toMs);

  const [data, setData] = useState<CompareSeries | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  // Mesmo ajuste na renderização de `useComparison`: série antiga não aparece nem por um quadro com o filtro novo
  const filter = `${key}|${start}|${end}|${attempt}`;
  const [shownFilter, setShownFilter] = useState(filter);
  if (shownFilter !== filter) {
    setShownFilter(filter);
    setData(null);
    setFailed([]);
    setError('');
    setLoading(enabled);
  }

  useEffect(() => {
    const list = services;
    if (list.length < 2) return;

    const controller = new AbortController();
    const from = new Date(fromMs).toISOString();
    const to = new Date(toMs).toISOString();
    Promise.allSettled(
      list.map((service) => fetchServiceSeries({ serviceId: service.id, from, to, bucket }, controller.signal)),
    )
      .then((results) => {
        if (controller.signal.aborted) return; // filtro trocado ou tela fechada: ninguém espera esta resposta
        const inputs: CompareSeriesInput[] = [];
        const missing: string[] = [];
        let firstError = '';
        results.forEach((result, index) => {
          const service = list[index];
          if (result.status === 'fulfilled') inputs.push({ service, points: result.value.points });
          else missing.push(service.id);
          if (result.status === 'rejected' && firstError === '') {
            const reason: unknown = result.reason;
            firstError = reason instanceof ApiError ? reason.message : 'Não foi possível carregar as séries.';
          }
        });

        setFailed(missing);
        if (inputs.length === 0) {
          setData(null);
          setError(firstError);
        } else {
          setData(alignCompareSeries(inputs));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- services entra pela chave: lista nova de mesma composição não refaz a busca
  }, [key, start, end, attempt, bucket]);

  const refresh = useCallback(() => setAttempt((current) => current + 1), []);

  return { data, bucket, fromMs, toMs, loading, error, failed, refresh };
}
