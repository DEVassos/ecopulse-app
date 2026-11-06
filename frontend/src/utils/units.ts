// Escala única de energia e CO₂e (#271): a mesma grandeza aparece na mesma unidade em todas as telas. Num conjunto
// (coluna da tabela, linha da matriz, eixo do gráfico), todos os números usam a unidade do maior valor, para continuarem
// comparáveis e alinhados; a unidade vai no cabeçalho. Base: energia em kWh e CO₂e em gramas, como a API devolve.
import { formatFixed } from './format';

export type Quantity = 'energy' | 'co2e';

interface Step {
  unit: string;
  /** Multiplica o valor na base (kWh ou g) para chegar à unidade. */
  factor: number;
}

/** Da menor para a maior unidade. */
const STEPS: Record<Quantity, Step[]> = {
  energy: [
    { unit: 'mWh', factor: 1_000_000 },
    { unit: 'Wh', factor: 1_000 },
    { unit: 'kWh', factor: 1 },
    { unit: 'MWh', factor: 0.001 },
  ],
  co2e: [
    { unit: 'mg', factor: 1_000 },
    { unit: 'g', factor: 1 },
    { unit: 'kg', factor: 0.001 },
    { unit: 't', factor: 0.000_001 },
  ],
};

const BASE: Record<Quantity, Step> = { energy: STEPS.energy[2], co2e: STEPS.co2e[1] };

export interface Scale {
  unit: string;
  factor: number;
  /** Casas decimais pela ordem de grandeza do maior valor: 2 abaixo de 10, 1 abaixo de 100, 0 a partir daí. */
  decimals: number;
}

/** Escala de um conjunto: a maior unidade em que o maior valor fica em pelo menos 1. Sem valor, a unidade base. */
export function scaleFor(quantity: Quantity, values: ReadonlyArray<number | null>): Scale {
  const known = values.filter((value): value is number => value !== null && Number.isFinite(value)).map(Math.abs);
  const max = known.length > 0 ? Math.max(...known) : 0;
  let step = BASE[quantity];
  if (max > 0) {
    step = STEPS[quantity][0];
    for (const candidate of STEPS[quantity]) if (max * candidate.factor >= 1) step = candidate;
  }
  const scaled = max * step.factor;
  return { unit: step.unit, factor: step.factor, decimals: scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2 };
}

/** Número na escala do conjunto, sem a unidade (que fica no cabeçalho). Positivo abaixo da resolução: "< 0,01". */
export function formatInScale(value: number, scale: Scale): string {
  return formatFixed(value * scale.factor, scale.decimals);
}

/** Um valor sozinho, com a unidade: "841 Wh", "44,6 g". Zero fica na unidade base ("0 g"). */
export function formatQuantity(quantity: Quantity, value: number): string {
  if (value === 0) return `0 ${BASE[quantity].unit}`;
  const scale = scaleFor(quantity, [value]);
  return `${formatInScale(value, scale)} ${scale.unit}`;
}

/**
 * Valor exato para o tooltip de um número compacto (#274): 4 algarismos significativos na unidade do próprio valor,
 * "1,438 Wh" para o 1,44 da coluna, ou "301,5 g" para o 301 do card.
 */
export function formatPrecise(quantity: Quantity, value: number): string {
  if (value === 0) return `0 ${BASE[quantity].unit}`;
  const scale = scaleFor(quantity, [value]);
  return `${(value * scale.factor).toLocaleString('pt-BR', { maximumSignificantDigits: 4 })} ${scale.unit}`;
}
