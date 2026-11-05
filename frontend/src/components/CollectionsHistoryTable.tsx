import { Fragment } from 'react';
import type { CollectionStatus, ServiceCollection } from '../services/collections.types';
import { formatDayTime, formatDurationSeconds, formatNumber } from '../utils/format';
import { missingCollectionSeconds } from '../utils/collection-history';
import MissingValue from './MissingValue';

/** Resultado da coleta em texto e cor (nunca só pela cor), no mesmo estilo do StatusBadge. */
const COLLECTION_STATUS: Record<CollectionStatus, { label: string; className: string }> = {
  ok: { label: 'OK', className: 'border-primary/50 bg-primary/10 text-primary-hover' },
  erro: { label: 'Erro', className: 'border-error/50 bg-error/10 text-danger' },
  sem_metricas: { label: 'Sem métricas', className: 'border-warning/50 bg-warning/10 text-warning' },
};

function CollectionStatusBadge({ status }: { status: CollectionStatus }) {
  const { label, className } = COLLECTION_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

function metric(value: number | null, decimals: number) {
  return value === null ? <MissingValue label="sem métrica nesta coleta" title="Sem métrica nesta coleta" /> : formatNumber(value, decimals);
}

/** Linha entre duas coletas: mostra o período em que não houve registro nenhum. */
function MissingCollectionRow({ seconds }: { seconds: number }) {
  return (
    <tr className="border-t border-dashed border-warning/40 bg-warning/5">
      <td colSpan={7} className="px-4 py-2 text-left text-xs text-muted">
        Sem coleta por <strong className="font-data font-medium text-text">{formatDurationSeconds(seconds)}</strong>
      </td>
    </tr>
  );
}

interface Props {
  /** Da coleta mais recente para a mais antiga, como a API devolve. */
  collections: ServiceCollection[];
}

/** Histórico de coletas de um serviço (RF10), com o período exibido explícito na legenda. */
export default function CollectionsHistoryTable({ collections }: Props) {
  const newest = collections[0];
  const oldest = collections[collections.length - 1];
  const gaps = collections.map((collection, index) =>
    index === 0 ? null : missingCollectionSeconds(collections[index - 1], collection));

  return (
    // relative: os textos sr-only (position: absolute) das células ficam dentro da rolagem, sem alargar a janela
    // Focável e nomeada (#262): no celular as colunas cortadas só aparecem rolando, e pelo teclado a rolagem precisa do foco
    <div
      className="relative overflow-x-auto rounded-xl border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      tabIndex={0}
      role="region"
      aria-label="Histórico de coletas (role na horizontal para ver todas as colunas)"
    >
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="px-4 py-3 text-left text-sm text-muted">
          {collections.length === 1 ? '1 coleta' : `${collections.length} coletas mais recentes`}
          {newest && oldest && (
            <>
              {' · de '}
              <strong className="font-data font-medium text-text">{formatDayTime(oldest.collectedAt)}</strong>
              {' a '}
              <strong className="font-data font-medium text-text">{formatDayTime(newest.collectedAt)}</strong>
            </>
          )}
        </caption>
        <thead>
          <tr className="whitespace-nowrap text-left text-xs text-muted">
            <th scope="col" className="px-4 py-2 font-medium">Data/hora</th>
            <th scope="col" className="px-4 py-2 font-medium">Status</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">CPU (%)</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Memória (GB)</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Disco (GB)</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Rede (GB)</th>
            <th scope="col" className="px-4 py-2 font-medium">Observação</th>
          </tr>
        </thead>
        <tbody>
          {collections.map((collection, index) => {
            const gap = gaps[index];
            return (
              <Fragment key={collection.id}>
                {gap !== null && <MissingCollectionRow seconds={gap} />}
                <tr className="border-t border-border">
                  <th scope="row" className="whitespace-nowrap px-4 py-2 text-left font-data font-normal text-muted">
                    {formatDayTime(collection.collectedAt)}
                  </th>
                  <td className="px-4 py-2">
                    <CollectionStatusBadge status={collection.status} />
                  </td>
                  <td className="px-4 py-2 text-right font-data">{metric(collection.cpuPercent, 1)}</td>
                  <td className="px-4 py-2 text-right font-data">{metric(collection.memoryGb, 2)}</td>
                  <td className="px-4 py-2 text-right font-data">{metric(collection.diskGb, 2)}</td>
                  <td className="px-4 py-2 text-right font-data">{metric(collection.networkGb, 3)}</td>
                  <td className="px-4 py-2 text-muted">{collection.errorMessage}</td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {gaps.some((gap) => gap !== null) && (
        <p className="m-0 border-t border-border px-4 py-2 text-xs text-muted">
          <strong className="font-medium text-text">Sem coleta</strong> indica um período sem nenhum registro.
          Isso não prova que o serviço estava indisponível: o worker pode ter sido interrompido ou a descoberta
          de serviços pode ter falhado.
        </p>
      )}
    </div>
  );
}
