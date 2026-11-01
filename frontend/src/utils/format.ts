// Formatação de números e horários no padrão brasileiro.

/** 0.3843 → "0,384" (com `decimals` casas). */
export function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * Número com resolução fixa de `decimals` casas: numa coluna, a vírgula fica alinhada e o número não muda de tamanho
 * a cada leitura. Com 3: 0.04 → "0,040" · 0.511 → "0,511" · 0.0007 → "0,001" · 0 → "0,000".
 * Positivo menor que a resolução nunca parece zero: 0.0004 → "< 0,001". Valor ausente (null) continua com o
 * MissingValue de quem chama.
 */
export function formatFixed(value: number, decimals: number): string {
  const resolution = 10 ** -decimals;
  if (value > 0 && value < resolution / 2) return `< ${formatNumber(resolution, decimals)}`;
  return formatNumber(value, decimals);
}

/** ISO 8601 → "08:52:14". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** ISO 8601 → "07/10 08:52:14". */
export function formatDayTime(iso: string): string {
  const day = new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${day} ${formatTime(iso)}`;
}
