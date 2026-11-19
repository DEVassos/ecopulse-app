import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import AppHeader from '../components/AppHeader';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import KpiPanel from '../components/KpiPanel';
import LastUpdated from '../components/LastUpdated';
import LoadingState from '../components/LoadingState';
import RegionDetail from '../components/RegionDetail';
import RegionList from '../components/RegionList';
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
import { rankingIsStale, rankingShares, rankingSentence } from '../utils/ranking';
import SummaryPanel from '../components/SummaryPanel';
import { summarizeStatus } from '../utils/summary';
import { fetchRegions, fetchRegionsSummary } from '../services/regions.service';
import {
  buildRegionOverview,
  mapDestination,
  nextPresentationCode,
  PRESENTATION_ARRIVAL_TIMEOUT_MS,
  PRESENTATION_DWELL_MS,
  presentationOrder,
} from '../utils/region-map';
import type { PresentationStatus } from '../components/RegionMap';
import type { RegionOverview } from '../utils/region-map';
import { gridByCode } from '../utils/regions';
import type { RegionGrid } from '../utils/regions';
import './DashboardPage.css';

// O mapa (MapLibre, mais pesado que o app inteiro) fica num arquivo à parte e só baixa quando há regiões (ADR 0010)
const RegionMap = lazy(() => import('../components/RegionMap'));

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
  const shares = useMemo(() => (ranking ? rankingShares(ranking) : null), [ranking]);
  const sentence = ranking ? rankingSentence(ranking, 'das últimas 24 h') : null;
  // Parte de cada serviço no CO₂e das 24 h (#260): em cinza quando a última busca do ranking ou da lista falhou
  const rankingStale = rankingIsStale(rankingError, error);
  const [regions, setRegions] = useState<RegionOverview | null>(null);
  const [regionsError, setRegionsError] = useState('');
  // Rede de cada região, só de GET /api/regions (#324): o selo "Rede limpa" da tabela não depende dos totais do período,
  // então continua na tela quando só GET /api/regions/summary falha. Falhou a lista, fica o último dado em cinza
  const [regionGrids, setRegionGrids] = useState<Map<string, RegionGrid> | null>(null);
  const [regionGridsFailed, setRegionGridsFailed] = useState(false);
  // Uma seleção para a lista de regiões e a tabela (#342); o mapa da #322 entra nela. Clicar de novo desfaz.
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const toggleRegion = (code: string) => setSelectedRegion((current) => (current === code ? null : code));
  // Modo apresentação do mapa (#323): percorre as regiões da maior para a menor emissão, 6 s em cada uma depois que o
  // mapa chega. Nunca liga sozinho, e sair do Dashboard desmonta o estado (volta desligado)
  const [presenting, setPresenting] = useState<PresentationStatus>('off');
  const [arrivedRegion, setArrivedRegion] = useState<string | null>(null);
  /** Escolha feita pela pessoa (mapa, lista ou tabela): pausa a apresentação, que não passa por cima dela. */
  const pickRegion = (code: string) => {
    setPresenting((status) => (status === 'playing' ? 'paused' : status));
    toggleRegion(code);
  };
  // Destino da simulação de migração (#326), guardado com a origem: trocar a origem zera o destino sem efeito extra, e a
  // atualização periódica não mexe nele, porque fica pelo `code`
  const [simulation, setSimulation] = useState<{ origin: string; destination: string } | null>(null);
  const destinationCode = simulation !== null && simulation.origin === selectedRegion ? simulation.destination : null;
  const regionAreaRef = useRef<HTMLDivElement | null>(null);
  /**
   * `reveal`: os botões do painel trazem o mapa à vista quando ele saiu da tela por cima (no celular, o painel fica
   * abaixo do mapa e da lista), para a câmera andar à vista (#326). Escolher uma linha da tabela não rola a página.
   */
  const chooseDestination = (code: string | null, reveal = false) => {
    setSimulation(code === null || selectedRegion === null ? null : { origin: selectedRegion, destination: code });
    const area = regionAreaRef.current;
    if (reveal && area && area.getBoundingClientRect().top < 0) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      area.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }
  };
  // Como o ranking e as regiões, espera a primeira lista: antes, a busca do primeiro render era cancelada logo em seguida
  useEffect(() => {
    if (isDemoMode || updatedAt === null) return;
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
  // Ranking de CO₂e das mesmas 24 h do painel (#260): busca a cada ciclo, inclusive no modo demonstração. Esperar a
  // primeira lista evita duas buscas no mesmo instante; numa falha, a última parte continua na tela, em cinza.
  useEffect(() => {
    if (updatedAt === null) return;
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
        if (!controller.signal.aborted) {
          const detail = reason instanceof Error ? reason.message : 'não foi possível carregar o ranking.';
          setRankingError(`Ranking de CO₂e do período: ${detail}`);
        }
      }
    })();
    return () => controller.abort();
  }, [updatedAt]);
  // Regiões (#342): as mesmas 24 h dos KPIs, a cada ciclo. Uma falha aqui (ex.: Carbon API fora do ar) fica só no lugar
  // da lista, com o último dado em cinza se houver: o resto do Dashboard continua funcionando
  useEffect(() => {
    if (updatedAt === null) return;
    const controller = new AbortController();
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    void (async () => {
      // allSettled, e não all: a lista de regiões serve sozinha ao selo de rede limpa da tabela (#324)
      const [list, totals] = await Promise.allSettled([
        fetchRegions(controller.signal),
        fetchRegionsSummary(from.toISOString(), to.toISOString(), controller.signal),
      ]);
      if (controller.signal.aborted) return;
      if (list.status === 'fulfilled') setRegionGrids(gridByCode(list.value.regions));
      setRegionGridsFailed(list.status === 'rejected');
      if (list.status === 'fulfilled' && totals.status === 'fulfilled') {
        setRegions(buildRegionOverview(list.value, totals.value));
        setRegionsError('');
        return;
      }
      const reason: unknown = list.status === 'rejected' ? list.reason : totals.status === 'rejected' ? totals.reason : null;
      setRegionsError(reason instanceof Error ? reason.message : 'não foi possível carregar as regiões.');
    })();
    return () => controller.abort();
  }, [updatedAt]);
  const presentationCodes = useMemo(() => (regions ? presentationOrder(regions) : []), [regions]);
  const presentationKey = presentationCodes.join(',');
  // Próxima região: 6 s depois da chegada do mapa; se o mapa não avisar (sem WebGL), 6 s depois de 8 s de espera
  useEffect(() => {
    if (presenting !== 'playing') return;
    const order = presentationKey === '' ? [] : presentationKey.split(',');
    const delay = arrivedRegion === selectedRegion ? PRESENTATION_DWELL_MS : PRESENTATION_ARRIVAL_TIMEOUT_MS + PRESENTATION_DWELL_MS;
    const timer = window.setTimeout(() => setSelectedRegion(nextPresentationCode(order, selectedRegion)), delay);
    return () => window.clearTimeout(timer);
  }, [presenting, selectedRegion, arrivedRegion, presentationKey]);
  const presentation = {
    status: presenting,
    onStart: () => {
      setPresenting('playing');
      // Começa na região já selecionada, se ela estiver no ciclo; senão, na de maior emissão
      setSelectedRegion((current) => (current !== null && presentationCodes.includes(current) ? current : nextPresentationCode(presentationCodes, null)));
    },
    onToggle: () => setPresenting((status) => (status === 'playing' ? 'paused' : 'playing')),
    onStop: () => setPresenting('off'),
    onInteract: () => setPresenting((status) => (status === 'playing' ? 'paused' : status)),
    onArrive: setArrivedRegion,
  };
  // Um aviso por página (#271): com a lista falhando e dados na tela, basta a faixa de falha; sem dados, o aviso grande;
  // com a lista em dia, o primeiro erro entre resumo, comparação e ranking. Nunca avisos iguais empilhados.
  const pageError = error ? (data ? '' : error) : summaryError || comparisonError || rankingError;
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
            data-tooltip="Atualizar agora"
            className="btn-outline grid size-11 place-items-center"
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

      <main id="conteudo" tabIndex={-1} className="content">
        <h1 className="sr-only">Dashboard de energia e emissões</h1>

        {/* Falha não apaga o que já estava na tela: com dados, faixa compacta junto do último dado; sem dados, o aviso grande */}
        {data && <UpdateFailedBanner message={error} updatedAt={updatedAt} onRetry={refresh} />}
        {pageError && <ErrorState message={pageError} onRetry={refresh} />}

        {loading && !data && <LoadingState message="Carregando serviços…" />}

        {data && data.services.length === 0 && (
          <EmptyState
            title="Nenhum serviço monitorado ainda"
            description="Os serviços aparecem aqui assim que o agregador os descobrir na próxima coleta."
          />
        )}

        {/* Impacto primeiro (#259): energia e CO₂e do período no topo. Com os serviços na tela e o resumo a caminho, o painel
            já ocupa o lugar dele em "Calculando…", para a página não pular quando a resposta chega */}
        {(summary || (data && data.services.length > 0 && !isDemoMode && !summaryError)) && (
          <SummaryPanel summary={summary} previousSummary={previousSummary} comparisonLoading={comparisonLoading} stale={error !== '' || summaryError !== ''} />
        )}

        {/* Estado dos serviços logo abaixo, em cards compactos. Sem dado ainda, os cards não aparecem (nunca zeros inventados);
            depois de uma falha, mostram o último dado */}
        {data && data.services.length > 0 && (
          <KpiPanel summary={summarizeStatus(data.services)} staleSince={error ? updatedAt : null} compact />
        )}

        {/* Leitura do período em uma frase (#260): quem respondeu pela maior parte do CO₂e das 24 h. Some enquanto o
            ranking não chegou; depois de uma falha, fica em cinza com a última resposta. Sem aria-live: a parte muda a cada
            ciclo com a janela de 24 h deslizando, e anunciar a frase a cada 30 s atrapalharia o leitor de tela (como no LastUpdated) */}
        {data && data.services.length > 0 && sentence && (
          <p className={rankingStale ? 'dashboard-reading dashboard-reading--stale' : 'dashboard-reading'}>
            <span className="dashboard-reading__title">Quem pesa mais</span>
            {sentence}
          </p>
        )}

        {/* Onde está o impacto (#342, RF13): entre a leitura do período e a tabela. A falha só das regiões fica neste lugar */}
        {data && data.services.length > 0 && regionsError && (
          <p className="region-list-error" role="status">
            {regions ? 'Regiões desatualizadas' : 'Regiões indisponíveis'}: {regionsError}
          </p>
        )}
        {/* Mapa e lista lado a lado; no celular, o mapa em cima e a lista embaixo (#322, RNF01) */}
        {data && data.services.length > 0 && regions && (
          <div className="region-area" ref={regionAreaRef}>
            <Suspense fallback={<LoadingState message="Carregando o mapa…" />}>
              <RegionMap
                overview={regions}
                selectedCode={selectedRegion}
                onSelect={pickRegion}
                stale={regionsError !== '' || error !== ''}
                destination={mapDestination(regions, selectedRegion, destinationCode)}
                presentation={presentation}
              />
            </Suspense>
            <RegionList
              overview={regions}
              selectedCode={selectedRegion}
              onSelect={pickRegion}
              periodLabel="últimas 24 h"
              stale={regionsError !== '' || error !== ''}
            />
          </div>
        )}
        {/* Simulação de migração da região selecionada (#326, RF15): abaixo do mapa e da lista, com o último dado em cinza
            depois de uma falha; região sem serviço não tem o que migrar e não abre o painel */}
        {data && data.services.length > 0 && regions && selectedRegion !== null && (
          <RegionDetail
            overview={regions}
            originCode={selectedRegion}
            destinationCode={destinationCode}
            onDestination={chooseDestination}
            periodLabel="últimas 24 h"
            stale={regionsError !== '' || error !== ''}
          />
        )}

        {data && data.services.length > 0 && (
          <ServicesTable
            services={data.services}
            onSelect={(service) => setSelectedId(service.id)}
            stale={error !== ''}
            shares={shares}
            sharesStale={rankingStale}
            selectedRegion={selectedRegion}
            onSelectRegion={pickRegion}
            regionGrids={regionGrids}
            regionGridsStale={regionGridsFailed || error !== ''}
          />
        )}

        {/* Montada só enquanto aberta: fechar desmonta e cancela o polling do histórico */}
        {selected && <ServiceDetailsDialog key={selected.id} service={selected} onClose={() => setSelectedId(null)} />}
      </main>

      <footer className="page-footer">EcoPulse · DEVassos · Fatec Jacareí 2DSM 2026-2</footer>
    </div>
  );
}
