import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useCollections } from '../hooks/useCollections';
import { useMonitoring } from '../hooks/useMonitoring';
import type { MonitoredService } from '../services/services.types';
import { formatDayTime, formatNumber } from '../utils/format';
import { factorMissing, intervalText, resourcesText } from '../utils/service-reading';
import { statusReasonText } from '../utils/status';
import CollectionsHistoryTable from './CollectionsHistoryTable';
import CpuHistoryChart from './CpuHistoryChart';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import LastUpdated from './LastUpdated';
import LoadingState from './LoadingState';
import MissingValue from './MissingValue';
import StatusBadge from './StatusBadge';
import './ServiceDetailsDialog.css';

/** `data` (algarismos tabulares) só para número, horário e código (região); nome de lugar fica no texto corrido. */
function Detail({ label, children, data = true }: { label: string; children: ReactNode; data?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`m-0 mt-1 text-sm ${data ? 'font-data' : 'font-sans'}`}>{children}</dd>
    </div>
  );
}

interface Props {
  /** Linha da tabela de serviços; acompanha a atualização da lista enquanto a janela está aberta. */
  service: MonitoredService;
  /** Chamado quando a janela fecha (Esc, botão Fechar ou clique fora). */
  onClose: () => void;
}

/** Janela sobre o dashboard com os detalhes do serviço e o histórico de coletas já gravado (RF09, RF10). */
export default function ServiceDetailsDialog({ service, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const { refreshIntervalMs } = useMonitoring();
  const { data, loading, error, updatedAt, refresh } = useCollections(service.id);

  // showModal(): foco preso na janela, Esc e fundo escurecido nativos; ao fechar, o foco volta para quem abriu.
  // Sem close() na limpeza: no StrictMode o efeito roda duas vezes e o evento close fecharia a janela recém-aberta.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const location = [service.city, service.country].filter(Boolean).join(', ');

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="service-details-title"
      className="service-dialog"
      onClose={onClose}
      // Fecha só com clique que começou e terminou no fundo: arrastar uma seleção de texto para fora não fecha
      onMouseDown={(event) => {
        pressedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedOnBackdrop.current && event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="service-details-title" className="m-0 font-display text-xl font-semibold">
            {service.name}
          </h2>
          <StatusBadge status={service.status} />
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Fechar detalhes do serviço"
          data-tooltip="Fechar (Esc)"
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-border bg-transparent text-muted hover:border-muted hover:text-text"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="size-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="service-dialog__body flex flex-col gap-5 p-5">
        {/* Motivo do estado em texto, ao lado da cor do badge (#176) */}
        {statusReasonText(service) && <p className="m-0 text-sm text-muted">{statusReasonText(service)}</p>}

        {/* Duas colunas já no celular: os quatro dados curtos cabem lado a lado e a janela fica mais baixa */}
        <dl className="m-0 grid grid-cols-2 gap-3 min-[800px]:grid-cols-4">
          {/* Código da região (dado) com o nome embaixo; os dois ausentes viram "não informada" */}
          <Detail label="Região">
            {service.regionCode ?? service.region ?? <MissingValue label="não informada" title="Região não informada pelo agregador" />}
            {service.regionCode !== null && service.region && <span className="block font-sans text-xs text-muted">{service.region}</span>}
          </Detail>
          <Detail label="Cidade / país" data={false}>
            {location || <MissingValue label="não informada" title="Localização não informada pelo agregador" />}
          </Detail>
          <Detail label="Última leitura">
            {service.lastReadingAt === null ? 'nunca' : formatDayTime(service.lastReadingAt)}
            {intervalText(service) && <span className="block font-sans text-xs text-muted">{intervalText(service)}</span>}
          </Detail>
          <Detail label="CPU na última leitura">
            {service.cpuPercent === null ? <MissingValue /> : `${formatNumber(service.cpuPercent, 0)}%`}
          </Detail>
          {/* O que a tabela mostra só no tooltip (#298), acessível pelo teclado aqui: fator, potência e recursos da leitura */}
          <Detail label="Fator da região (gCO₂e/kWh)">
            {service.carbonIntensityGco2ePerKwh === null ? <MissingValue {...factorMissing(service)} /> : formatNumber(service.carbonIntensityGco2ePerKwh, 0)}
          </Detail>
          <Detail label="Potência estimada">
            {service.powerWatts === null ? <MissingValue label="sem potência" title="Sem potência: cálculo indisponível nesta leitura" /> : `${formatNumber(service.powerWatts, 1)} W`}
          </Detail>
          <Detail label="RAM · disco · rede" data={false}>
            {resourcesText(service) ?? <MissingValue label="sem recursos" title="Sem memória, disco e rede nesta leitura" />}
          </Detail>
          <Detail label="Intervalo de coleta">
            {service.collectionIntervalSeconds === null ? <MissingValue label="sem intervalo" title="Sem intervalo: a última coleta falhou ou não houve coleta" /> : intervalText(service)?.replace('coleta de ', '')}
          </Detail>
        </dl>

        {/* Atalho para a página Emissões já com este serviço escolhido (#190) */}
        <Link
          to={`/emissoes?${new URLSearchParams({ servico: service.id })}`}
          className="btn-outline self-start px-4 py-2 text-sm no-underline"
        >
          Ver emissões deste serviço
        </Link>

        <section aria-labelledby="service-history-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="service-history-title" className="m-0 font-display text-base font-semibold">
              Histórico de coletas
            </h3>
            <LastUpdated updatedAt={updatedAt} intervalSeconds={refreshIntervalMs / 1000} stale={error !== ''} />
          </div>

          {/* Falha não apaga o histórico já exibido: o erro aparece junto com o último dado */}
          {error && <ErrorState message={error} onRetry={refresh} />}

          {loading && !data && <LoadingState message="Carregando histórico…" />}

          {data && data.collections.length === 0 && (
            <EmptyState
              title="Nenhuma coleta registrada para este serviço ainda"
              description="O histórico aparece aqui assim que o worker gravar a primeira coleta deste serviço."
            />
          )}

          {data && data.collections.length > 0 && (
            <>
              <CpuHistoryChart collections={data.collections} />
              <CollectionsHistoryTable collections={data.collections} />
            </>
          )}
        </section>
      </div>
    </dialog>
  );
}
