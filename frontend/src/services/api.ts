// Cliente HTTP base: único ponto do frontend que chama fetch.

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** Erro de chamada à API, com mensagem pronta para mostrar na tela. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Resposta que chegou, mas fora do contrato de docs/api.md (corpo que não é JSON, campo ausente ou de outro tipo).
 * `field` é o caminho do primeiro campo recusado, como `services[3].id`, para quem investiga saber onde olhar.
 */
export function unexpectedFormat(field?: string): ApiError {
  const where = field ? ` (${field})` : '';
  // status 0: a requisição deu certo, mas o conteúdo não é o combinado em docs/api.md
  return new ApiError(`O servidor respondeu num formato inesperado${where}. Avise a equipe do backend.`, 0);
}

const DEFAULT_MESSAGES: Record<number, string> = {
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para esta ação.',
  404: 'O recurso pedido não foi encontrado.',
};

let authToken: string | null = null;
let onSessionExpired: () => void = () => {};

/**
 * Token enviado em Authorization: Bearer. O AuthProvider atualiza na hora (ao abrir a página,
 * no login e no logout), antes de qualquer tela fazer requisição.
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** O que fazer quando a API recusa o token (401): o AuthProvider encerra a sessão. */
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

/** Mensagem do corpo de erro do backend: `{ "error": { "code", "message" } }` (padrão do error-handler). */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: unknown } } | null;
    const message = body?.error?.message;
    if (typeof message === 'string' && message !== '') return message;
  } catch {
    // corpo vazio ou fora do formato JSON: usa a mensagem padrão abaixo
  }
  if (response.status >= 500) return 'O servidor encontrou um erro. Tente novamente em instantes.';
  return DEFAULT_MESSAGES[response.status] ?? `Falha na requisição (HTTP ${response.status}).`;
}

/**
 * Faz a requisição e devolve o JSON da resposta; falhas viram ApiError com mensagem em pt-BR.
 * Com sessão aberta, envia Authorization: Bearer.
 * O JSON não é conferido aqui: o tipo `T` some no build. Quem precisa de garantia pede `unknown` e confere o
 * formato com os leitores de `contract.ts` (#161), como `services.service.ts` e `collections.service.ts`.
 */
export async function apiRequest<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = authToken;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    // Cancelamento pedido pela tela (troca de página, nova busca): repassa sem trocar a mensagem
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Não foi possível conectar ao servidor. Verifique se o backend está no ar.', 0);
  }

  // Token recusado: encerra a sessão local (o controle de acesso de verdade é do backend)
  if (response.status === 401 && token) onSessionExpired();

  if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status);
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    // 2xx com corpo que não é JSON (página HTML de um proxy, corpo cortado): não há dado para mostrar
    throw unexpectedFormat();
  }
}
