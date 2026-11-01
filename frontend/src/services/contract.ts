// Conferência das respostas da API em tempo de execução (#161).
// Os tipos do TypeScript somem no build (erased types) e não garantem o que o servidor mandou. Cada service confere o
// JSON contra o contrato de docs/api.md antes de entregá-lo aos hooks. Resposta fora do contrato vira ApiError, e a
// tela segue o fluxo de falha que já tem: dados anteriores com "Desatualizado desde…" e Tentar novamente.

import { unexpectedFormat } from './api';

// ── Conferência tolerante: devolve `undefined` no valor inválido, e quem chama decide o que fazer ─────────────
// A página Emissões usa estas para deixar de fora (e contar) o item inválido, sem derrubar o gráfico inteiro.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Número finito ≥ 0, ou null quando o campo falta ou vem null; `undefined` quando vem inválido. */
export function amount(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Inteiro ≥ 0; `undefined` quando vem inválido. */
export function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** Data e hora (ISO 8601) em milissegundos; `undefined` quando vem inválida. */
export function instant(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const t = Date.parse(value);
  return Number.isNaN(t) ? undefined : t;
}

// ── Leitura estrita: o primeiro campo fora do contrato derruba a resposta inteira ────────────────────────────
// `field` é o caminho do campo na resposta (ex.: `services[3].id`) e vai na mensagem do erro.
// Campo que aceita null precisa vir na resposta: chave ausente também é formato inesperado.

export function readRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw unexpectedFormat(field);
  return value;
}

export function readList(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw unexpectedFormat(field);
  return value;
}

/** Identificador: texto não vazio (o id vira chave da tabela e parâmetro de URL). */
export function readId(value: unknown, field: string): string {
  if (typeof value !== 'string' || value === '') throw unexpectedFormat(field);
  return value;
}

export function readText(value: unknown, field: string): string {
  if (typeof value !== 'string') throw unexpectedFormat(field);
  return value;
}

export function readTextOrNull(value: unknown, field: string): string | null {
  return value === null ? null : readText(value, field);
}

/** Medida (%, GB, kWh, g): número finito ≥ 0, ou null quando não há valor. */
export function readAmountOrNull(value: unknown, field: string): number | null {
  const parsed = value === undefined ? undefined : amount(value);
  if (parsed === undefined) throw unexpectedFormat(field);
  return parsed;
}

/** Data e hora em ISO 8601; devolve o texto como veio. */
export function readInstant(value: unknown, field: string): string {
  if (typeof value !== 'string' || instant(value) === undefined) throw unexpectedFormat(field);
  return value;
}

export function readInstantOrNull(value: unknown, field: string): string | null {
  return value === null ? null : readInstant(value, field);
}

/** Um dos valores permitidos (estados de serviço, coleta e cálculo). */
export function readOneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  const match = allowed.find((option) => option === value);
  if (match === undefined) throw unexpectedFormat(field);
  return match;
}
