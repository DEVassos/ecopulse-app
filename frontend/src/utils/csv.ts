// CSV das coletas de um período (#24, US13 #54). Cálculo puro, sem React e sem HTTP: a página busca as coletas
// (services/export.service.ts) e entrega aqui; o download fica em utils/download.ts.
import type { ServiceCollection } from '../services/collections.types';

/**
 * Formato do arquivo, num lugar só. `;` com vírgula decimal é o que o Excel em português abre direto, em colunas
 * (proposta do contrato na #54); se o PO escolher `,` com ponto decimal, muda só aqui.
 */
export const CSV_FORMAT: { separator: ';' | ','; decimal: ',' | '.' } = { separator: ';', decimal: ',' };

/** Colunas na ordem do contrato da #54, com o campo de GET /api/collections de onde cada uma vem. */
export const CSV_COLUMNS = [
  'coletado_em',
  'status',
  'cpu_percent',
  'memoria_gb',
  'disco_gb',
  'rede_gb',
  'intervalo_s',
  'energia_kwh',
  'co2e_g',
  'fator_gco2e_kwh',
  'calculo',
  'erro',
] as const;

/** Brasília não tem horário de verão desde 2019: o fuso é sempre −03:00. */
const BRASILIA_OFFSET_MS = -3 * 60 * 60 * 1000;

/** ISO 8601 em UTC → "2026-11-19T08:30:12-03:00", no horário de Brasília e com o fuso escrito. */
export function brasiliaInstant(iso: string): string {
  const local = new Date(Date.parse(iso) + BRASILIA_OFFSET_MS).toISOString();
  return `${local.slice(0, 19)}-03:00`;
}

/**
 * Número com todas as casas que a API mandou, sem notação científica (0.00000048 sairia "4.8e-7") e sem separador de
 * milhar, com o separador decimal do formato. Ausente (null ou undefined) fica vazio, nunca 0.
 */
export function csvNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const plain = value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 });
  return CSV_FORMAT.decimal === '.' ? plain : plain.replace('.', CSV_FORMAT.decimal);
}

/**
 * Texto numa célula: entre aspas quando tem separador, aspas ou quebra de linha. Texto que começa com = + - @ ganha um
 * apóstrofo na frente, para a planilha não o executar como fórmula (a mensagem de erro vem do agregador, de fora).
 */
export function csvText(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /["\r\n]/.test(safe) || safe.includes(CSV_FORMAT.separator) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function row(collection: ServiceCollection): string[] {
  return [
    brasiliaInstant(collection.collectedAt),
    collection.status,
    csvNumber(collection.cpuPercent),
    csvNumber(collection.memoryGb),
    csvNumber(collection.diskGb),
    csvNumber(collection.networkGb),
    csvNumber(collection.collectionIntervalSeconds),
    csvNumber(collection.energyKwh),
    csvNumber(collection.co2eGrams),
    csvNumber(collection.carbonIntensityGco2ePerKwh),
    collection.calculationStatus ?? '',
    csvText(collection.errorMessage),
  ];
}

/**
 * O arquivo inteiro: BOM do UTF-8 (para o Excel ler os acentos), cabeçalho e uma linha por coleta, na ordem recebida,
 * com quebra de linha CRLF.
 */
export function collectionsCsv(collections: readonly ServiceCollection[]): string {
  const lines = [CSV_COLUMNS.join(CSV_FORMAT.separator), ...collections.map((item) => row(item).join(CSV_FORMAT.separator))];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** "Fraud Detector" → "fraud-detector": minúsculas, sem acentos, com hífens. */
export function fileSlug(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'servico' : slug;
}

/** "ecopulse-coletas-fraud-detector-2026-11-18-a-2026-11-19.csv"; as datas são as do filtro (AAAA-MM-DD). */
export function collectionsFileName(serviceName: string, start: string, end: string): string {
  return `ecopulse-coletas-${fileSlug(serviceName)}-${start}-a-${end}.csv`;
}
