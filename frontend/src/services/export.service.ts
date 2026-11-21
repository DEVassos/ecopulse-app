// Exportação das coletas de um período (#24, US13 #54): todas as coletas de um serviço, buscadas em partes em
// GET /api/collections (até 500 por vez, da mais recente para a mais antiga). Nenhuma rota nova.
import { apiRequest } from './api';
import { parseCollectionsResponse } from './collections.service';
import type { ServiceCollection } from './collections.types';
import { demoCollections } from './demo-data';
import { isDemoMode } from './services.service';

/** Máximo da rota (docs/api.md § GET /api/collections). */
export const EXPORT_PAGE_SIZE = 500;
/** 31 dias de coletas a cada 30 s dão cerca de 180 partes; acima disto, algo está errado e a busca para. */
export const EXPORT_MAX_PAGES = 400;

export interface ExportQuery {
  serviceId: string;
  /** Início do período, incluído (ms). */
  fromMs: number;
  /** Fim do período, excluído (ms). */
  toMs: number;
}

export interface ExportOptions {
  signal?: AbortSignal;
  /** Quantas coletas já chegaram, para o botão mostrar o progresso. */
  onProgress?: (received: number) => void;
}

/**
 * Todas as coletas do serviço no período, da mais antiga para a mais recente. A próxima parte começa 1 ms antes da
 * coleta mais antiga recebida, como na paginação do gráfico (#256). Uma parte fora do contrato ou uma falha recusa a
 * exportação inteira: nunca há arquivo pela metade.
 */
export async function fetchAllCollections(query: ExportQuery, options: ExportOptions = {}): Promise<ServiceCollection[]> {
  const { signal, onProgress } = options;
  if (isDemoMode) return demoExport(query);
  const all: ServiceCollection[] = [];
  const from = new Date(query.fromMs).toISOString();
  // A rota de coletas inclui o `to`; o período da exportação é aberto no fim, como o do gráfico
  let to = query.toMs - 1;
  for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      service_id: query.serviceId,
      from,
      to: new Date(to).toISOString(),
      limit: String(EXPORT_PAGE_SIZE),
    });
    const { collections } = parseCollectionsResponse(await apiRequest<unknown>(`/collections?${params}`, { signal }));
    all.push(...collections);
    onProgress?.(all.length);
    const oldest = collections[collections.length - 1];
    if (collections.length < EXPORT_PAGE_SIZE || oldest === undefined) return all.reverse();
    to = Date.parse(oldest.collectedAt) - 1;
    if (to < query.fromMs) return all.reverse();
  }
  throw new Error('Período com coletas demais para exportar de uma vez. Escolha um período menor.');
}

/** Modo demonstração: as coletas ilustrativas que caem no período. */
function demoExport(query: ExportQuery): ServiceCollection[] {
  return demoCollections(query.serviceId, 2880)
    .collections.filter((item) => {
      const time = Date.parse(item.collectedAt);
      return time >= query.fromMs && time < query.toMs;
    })
    .reverse();
}
