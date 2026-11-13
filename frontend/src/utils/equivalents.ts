// Equivalências do CO₂e em unidades do dia a dia (#333): a conta é só de apresentação, nunca gravada.
// Os fatores, o arredondamento e a fonte de cada um estão em docs/calculos.md § Equivalências.

/** Chaves dos fatores publicados em `docs/calculos.md`; uma por unidade familiar. */
export type EquivalentKey = 'carKm' | 'smartphoneCharge';

export interface EquivalentFactor {
  /** Gramas de CO₂e por unidade do fator, como publicado na fonte. */
  gramsPerUnit: number;
  /** Unidade no plural ("km de carro a gasolina"), sem o valor: o fator fica em `gramsPerUnit`. */
  unit: string;
  /** Fonte e data de consulta: vai no tooltip, porque fator sem origem é número solto. */
  source: string;
}

/**
 * Fatores de `docs/calculos.md` § Equivalências, consultados em 13/11/2026 na calculadora de equivalências da EPA
 * (valores em toneladas por unidade, convertidos para gramas).
 */
export const EQUIVALENT_FACTORS: Record<EquivalentKey, EquivalentFactor> = {
  carKm: {
    gramsPerUnit: 244.2,
    unit: 'km de carro a gasolina',
    source:
      'EPA, Greenhouse Gas Equivalencies Calculator: 3,93×10⁻⁴ t CO₂e por milha (393 g/mi ≈ 244,2 g/km, 22,8 mpg) — consultado em 13/11/2026',
  },
  smartphoneCharge: {
    gramsPerUnit: 12.4,
    unit: 'cargas de celular',
    source:
      'EPA, Greenhouse Gas Equivalencies Calculator: 1,24×10⁻⁵ t CO₂ por carga (0,0194 kWh × 1.405,3 lb CO₂/MWh) — consultado em 13/11/2026',
  },
};

/** Aviso que acompanha a equivalência: é ordem de grandeza, não medição. */
export const EQUIVALENTS_DISCLAIMER =
  'Equivalência aproximada, só para dar ordem de grandeza: é o CO₂e do período dividido pelo fator da fonte, não uma medição.';

/**
 * Dois algarismos significativos, no padrão brasileiro: 1,0565 → "1,1" · 20,8 → "21" · 0,0193 → "0,019".
 * Abaixo de 0,01 a unidade familiar perde o sentido: mostra "< 0,01", nunca zero.
 */
export function formatEquivalentUnits(units: number): string {
  if (!Number.isFinite(units) || units < 0.01) return '< 0,01';
  return units.toLocaleString('pt-BR', { maximumSignificantDigits: 2 });
}

export interface Equivalent {
  key: EquivalentKey;
  /** Texto pronto da unidade: "1,1 km de carro a gasolina". */
  text: string;
  factor: EquivalentFactor;
}

/**
 * Equivalências do total de CO₂e do período. Devolve lista vazia quando o CO₂e é desconhecido (`null`) — sem
 * cálculo não há o que comparar — e quando é zero, em que a equivalência não diria nada (#333).
 */
export function equivalentsOf(co2eGrams: number | null): Equivalent[] {
  if (co2eGrams === null || !Number.isFinite(co2eGrams) || co2eGrams <= 0) return [];
  return (Object.keys(EQUIVALENT_FACTORS) as EquivalentKey[]).map((key) => {
    const factor = EQUIVALENT_FACTORS[key];
    return { key, text: `${formatEquivalentUnits(co2eGrams / factor.gramsPerUnit)} ${factor.unit}`, factor };
  });
}

/** "≈ 1,1 km de carro a gasolina · ≈ 21 cargas de celular"; `null` quando não há equivalência para mostrar. */
export function describeEquivalents(co2eGrams: number | null): string | null {
  const equivalents = equivalentsOf(co2eGrams);
  if (equivalents.length === 0) return null;
  return equivalents.map((equivalent) => `≈ ${equivalent.text}`).join(' · ');
}

/** Fontes de todos os fatores numa linha, para o tooltip da linha de equivalência. */
export function equivalentsSources(): string {
  return (Object.keys(EQUIVALENT_FACTORS) as EquivalentKey[]).map((key) => EQUIVALENT_FACTORS[key].source).join(' · ');
}
