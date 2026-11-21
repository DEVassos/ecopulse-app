import { useEffect, useRef, useState } from 'react';
import { fetchAllCollections } from '../services/export.service';
import { collectionsCsv, collectionsFileName } from '../utils/csv';
import { downloadText } from '../utils/download';

interface Props {
  serviceId: string;
  serviceName: string;
  /** Datas do filtro (AAAA-MM-DD), para o nome do arquivo. */
  start: string;
  end: string;
  /** Período do filtro em ms: início incluído, fim excluído. */
  fromMs: number;
  toMs: number;
}

type CsvState = { kind: 'idle' } | { kind: 'loading'; received: number } | { kind: 'done'; count: number } | { kind: 'error'; message: string };

/**
 * Exportação do período da página Emissões (#24, US13 #54): **Baixar CSV** com todas as coletas do serviço no período,
 * buscadas em partes (com progresso e cancelamento), e **Baixar PDF**, que abre a impressão do navegador ("Salvar como
 * PDF"). Uma falha no meio não entrega arquivo pela metade.
 */
export default function ExportButtons({ serviceId, serviceName, start, end, fromMs, toMs }: Props) {
  const [csv, setCsv] = useState<CsvState>({ kind: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  // Trocar de serviço ou de período cancela a busca em andamento e limpa o aviso anterior
  const key = `${serviceId}|${fromMs}|${toMs}`;
  const [shownKey, setShownKey] = useState(key);
  if (shownKey !== key) {
    setShownKey(key);
    setCsv({ kind: 'idle' });
  }
  useEffect(() => () => controllerRef.current?.abort(), [key]);

  async function downloadCsv() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setCsv({ kind: 'loading', received: 0 });
    try {
      const collections = await fetchAllCollections(
        { serviceId, fromMs, toMs },
        { signal: controller.signal, onProgress: (received) => setCsv({ kind: 'loading', received }) },
      );
      if (controller.signal.aborted) return;
      if (collections.length === 0) {
        setCsv({ kind: 'error', message: 'nenhuma coleta deste serviço no período escolhido.' });
        return;
      }
      downloadText(collectionsCsv(collections), collectionsFileName(serviceName, start, end));
      setCsv({ kind: 'done', count: collections.length });
    } catch (reason: unknown) {
      if (controller.signal.aborted) return;
      setCsv({ kind: 'error', message: reason instanceof Error ? reason.message : 'não foi possível baixar as coletas.' });
    }
  }

  function cancel() {
    controllerRef.current?.abort();
    setCsv({ kind: 'idle' });
  }

  return (
    <div className="emissions__export" role="group" aria-label="Exportar o período">
      {csv.kind === 'loading' ? (
        <>
          <span className="emissions__export-progress" role="status">
            Baixando… {csv.received.toLocaleString('pt-BR')} coletas
          </span>
          <button type="button" className="emissions__btn" onClick={cancel}>
            Cancelar
          </button>
        </>
      ) : (
        <button type="button" className="emissions__btn" onClick={() => void downloadCsv()}>
          Baixar CSV
        </button>
      )}
      <button type="button" className="emissions__btn" onClick={() => window.print()}>
        Baixar PDF
      </button>
      {csv.kind === 'done' && (
        <span className="emissions__export-progress" role="status">
          CSV com {csv.count.toLocaleString('pt-BR')} coletas baixado.
        </span>
      )}
      {csv.kind === 'error' && (
        <span className="emissions__export-error" role="alert">
          Não foi possível baixar o CSV: {csv.message}
        </span>
      )}
    </div>
  );
}
