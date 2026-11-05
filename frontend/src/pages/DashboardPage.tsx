import { useEffect, useMemo, useState } from 'react';
import AppHeader from '../components/AppHeader';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import KpiPanel from '../components/KpiPanel';
import LastUpdated from '../components/LastUpdated';
import LoadingState from '../components/LoadingState';
import ServiceDetailsDialog from '../components/ServiceDetailsDialog';
import ServicesTable from '../components/ServicesTable';
import UpdateFailedBanner from '../components/UpdateFailedBanner';
import { useMonitoring } from '../hooks/useMonitoring';
import { useServices } from '../hooks/useServices';
import { isDemoMode } from '../services/services.service';
import { fetchServicesSummary } from '../services/services.service';
import type { ServicesSummaryResponse } from '../services/services.types';
import { fetchServicesRanking } from '../services/ranking.service';
import type { ServicesRankingResponse } from '../services/ranking.types';
import { rankingShares, rankingSentence } from '../utils/ranking';
import SummaryPanel from '../components/SummaryPanel';
import { summarizeStatus } from '../utils/summary';
import './DashboardPage.css';

export default function DashboardPage() {
  const { data, loading, error, updatedAt, refresh } = useServices();
  const { refreshIntervalMs } = useMonitoring();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ServicesSummaryResponse | null>(null);
  const [previousSummary, setPreviousSummary] = useState<ServicesSummaryResponse | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [comparisonError, setComparisonError] = useState('');
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [ranking, setRanking] = useState<ServicesRankingResponse | null>(null);
  const [rankingError, setRankingError] = useState('');
  // Ranking de CO₂e das mesmas 24 h do painel (#260): busca a cada ciclo, inclusive no modo demonstração.
  // Numa falha, a última parte continua na tela, em cinza, e a tabela mantém a ordem.
  useEffect(() => {
    const controller = new AbortController();
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    void (async () => {
      try {
        const current = await fetchServicesRanking('co2e', from.toISOString(), to.toISOString(), controller.signal);
        if (controller.signal.aborted) return;
        setRanking(current);
        setRankingError('');
      } catch (reason: unknown) {
        if (!controller.signal.aborted) setRankingError(reason instanceof Error ? reason.message : 'Não foi possível carregar o ranking.');
      }
    })();
    return () => controller.abort();
  }, [updatedAt]);
  const shares = useMemo(() => (ranking ? rankingShares(ranking) : null), [ranking]);
  const sentence = ranking ? rankingSentence(ranking, 'das últimas 24 h') : null;
  const rankingStale = rankingError !== '' || error !== '';
  useEffect(() => {
    if (isDemoMode) return;
    const controller = new AbortController(); const to = new Date(); const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    const previousFrom = new Date(from.getTime() - (to.getTime() - from.getTime()));
    void (async () => {
      try {
        const current = await fetchServicesSummary(from.toISOString(), to.toISOString(), controller.signal);
        if (controller.signal.aborted) return;
        setSummary(current);
        setSummaryError('');
        // A variação anterior continua na tela até chegar a nova resposta, sem piscar "Comparando…" a cada ciclo
        setComparisonError('');
        setComparisonLoading(true);
        try {
          const previous = await fetchServicesSummary(previousFrom.toISOString(), from.toISOString(), controller.signal);
          if (!controller.signal.aborted) setPreviousSummary(previous);
        } catch (reason: unknown) {
          if (!controller.signal.aborted) setComparisonError(reason instanceof Error ? reason.message : 'Não foi possível carregar a comparação.');
        } finally {
          // Também quando cancelada: o ciclo seguinte não herda "Comparando…" de uma busca que não terminou
          setComparisonLoading(false);
        }
      } catch (reason: unknown) {
        if (!controller.signal.aborted) setSummaryError(reason instanceof Error ? reason.message : 'Não foi possível carregar os indicadores.');
      }
    })();
    return () => controller.abort();
  }, [updatedAt]);
  // A janela usa a linha atual da lista: status, CPU e última leitura acompanham cada atualização
  const selected = data?.services.find((service) => service.id === selectedId) ?? null;

  return (
    <div className="page">
      {isDemoMode && (
        <div className="demo-banner" role="note">
          Você está vendo uma demonstração com dados ilustrativos: o frontend ainda não está ligado ao backend.
        </div>
      )}

      <AppHeader updatedAt={updatedAt}>
        <LastUpdated updatedAt={updatedAt} intervalSeconds={refreshIntervalMs / 1000} stale={error !== ''}>
          <button
            type="button"
            // aria-disabled em vez de disabled: o botão não perde o foco do teclado a cada ciclo
            onClick={() => {
              if (!loading) refresh();
            }}
            aria-disabled={loading}
            aria-label="Atualizar agora"
            title="Atualizar agora"
            className="btn-outline grid size-9 place-items-center"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={loading ? 'size-4 motion-safe:animate-spin' : 'size-4'}
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
        </LastUpdated>
      </AppHeader>

      <main className="content">
        <h1 className="sr-only">Dashboard de energia e emissões</h1>

        {/* Falha não apaga o que já estava na tela: com dados, faixa compacta junto do último dado; sem dados, o aviso grande */}
        {data && <UpdateFailedBanner message={error} updatedAt={updatedAt} onRetry={refresh} />}
        {error && !data && <ErrorState message={error} onRetry={refresh} />}
        {summaryError && <ErrorState message={summaryError} onRetry={refresh} />}
        {comparisonError && <ErrorState message={comparisonError} onRetry={refresh} />}
        {rankingError && <ErrorState message={rankingError} onRetry={refresh} />}

        {loading && !data && <LoadingState message="Carregando serviços…" />}

        {data && data.services.length === 0 && (
          <EmptyState
            title="Nenhum serviço monitorado ainda"
            description="Os serviços aparecem aqui assim que o agregador os descobrir na próxima coleta."
          />
        )}

        {/* Sem dado ainda, os cards não aparecem (nunca zeros inventados); depois de uma falha, mostram o último dado */}
        {data && data.services.length > 0 && (
          <KpiPanel summary={summarizeStatus(data.services)} staleSince={error ? updatedAt : null} />
        )}
        {summary && <SummaryPanel summary={summary} previousSummary={previousSummary} comparisonLoading={comparisonLoading} stale={error !== '' || summaryError !== ''} />}

        {data && data.services.length > 0 && sentence && (
          <p className={rankingStale ? 'dashboard-reading dashboard-reading--stale' : 'dashboard-reading'} aria-live="polite">
            <span className="dashboard-reading__title">Quem pesa mais</span>
            {sentence}
          </p>
        )}

        {data && data.services.length > 0 && (
          <ServicesTable
            services={data.services}
            onSelect={(service) => setSelectedId(service.id)}
            shares={shares}
            sharesStale={rankingStale}
          />
        )}

        {/* Montada só enquanto aberta: fechar desmonta e cancela o polling do histórico */}
        {selected && <ServiceDetailsDialog key={selected.id} service={selected} onClose={() => setSelectedId(null)} />}
      </main>

      <footer className="page-footer">EcoPulse · DEVassos · Fatec Jacareí 2DSM 2026-2</footer>
    </div>
  );
}
