// Modelo de potência, energia e CO₂e de uma coleta (RF07, #404): os mesmos coeficientes de
// backend/src/domain/carbon-calculator.ts e de docs/calculos.md § Fonte e fórmula. A aba Fórmulas da Ajuda, a nota da
// potência na Comparação e o modo demonstração usam daqui; o teste fixa o exemplo oficial do documento.
import type { PowerBreakdown } from '../services/compare.types';

/** W por unidade de cada recurso. CPU: 100 W a 100% de uso, ou seja, 1 W por ponto percentual; os demais, por GB. */
export const POWER_COEFFICIENTS = {
  cpuWattsPerPercent: 1,
  memoryWattsPerGb: 0.375,
  diskWattsPerGb: 0.01,
  networkWattsPerGb: 0.02,
} as const;

/** W × s ÷ 3.600.000 = kWh. */
export const WATT_SECONDS_PER_KWH = 3_600_000;

/** Coeficiente no padrão brasileiro, sem zeros à direita: 0.375 → "0,375", 1 → "1". */
export function formatCoefficient(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

/** "CPU (1 W por ponto percentual), RAM (0,375 W/GB), disco (0,01 W/GB) e rede (0,02 W/GB)". */
export const COEFFICIENTS_TEXT = `CPU (${formatCoefficient(POWER_COEFFICIENTS.cpuWattsPerPercent)} W por ponto percentual), RAM (${formatCoefficient(POWER_COEFFICIENTS.memoryWattsPerGb)} W/GB), disco (${formatCoefficient(POWER_COEFFICIENTS.diskWattsPerGb)} W/GB) e rede (${formatCoefficient(POWER_COEFFICIENTS.networkWattsPerGb)} W/GB)`;

/** Métricas de uma coleta, nas unidades da API (CPU em %, demais em GB), o intervalo dela e a intensidade da região. */
export interface CollectionInput {
  cpuPercent: number;
  memoryGb: number;
  diskGb: number;
  networkGb: number;
  intervalSeconds: number;
  intensityGco2ePerKwh: number;
}

export interface CollectionEstimate {
  parts: PowerBreakdown;
  powerW: number;
  energyKwh: number;
  co2eGrams: number;
}

/** Parcelas da potência, cada uma com seis casas, como `powerBreakdown` do backend (a precisão da coluna). */
export function powerBreakdown(input: Pick<CollectionInput, 'cpuPercent' | 'memoryGb' | 'diskGb' | 'networkGb'>): PowerBreakdown {
  const watts = (value: number) => Number(value.toFixed(6));
  return {
    cpuW: watts(input.cpuPercent * POWER_COEFFICIENTS.cpuWattsPerPercent),
    memoryW: watts(input.memoryGb * POWER_COEFFICIENTS.memoryWattsPerGb),
    diskW: watts(input.diskGb * POWER_COEFFICIENTS.diskWattsPerGb),
    networkW: watts(input.networkGb * POWER_COEFFICIENTS.networkWattsPerGb),
  };
}

/** P = soma das parcelas; E = P × s ÷ 3.600.000; C = E × intensidade (docs/calculos.md § Fonte e fórmula). */
export function estimateCollection(input: CollectionInput): CollectionEstimate {
  const parts = powerBreakdown(input);
  const powerW = parts.cpuW + parts.memoryW + parts.diskW + parts.networkW;
  const energyKwh = (powerW * input.intervalSeconds) / WATT_SECONDS_PER_KWH;
  return { parts, powerW, energyKwh, co2eGrams: energyKwh * input.intensityGco2ePerKwh };
}

/** Exemplo oficial de docs/calculos.md § Exemplo numérico e precisão. */
export const OFFICIAL_EXAMPLE: CollectionInput = {
  cpuPercent: 50,
  memoryGb: 2,
  diskGb: 10,
  networkGb: 1,
  intervalSeconds: 60,
  intensityGco2ePerKwh: 85,
};

/** O exemplo oficial calculado: 50,87 W; 0,000847833333… kWh; 0,072065833333… g. */
export function exampleCalculation(): CollectionEstimate {
  return estimateCollection(OFFICIAL_EXAMPLE);
}

/**
 * Potência média de um período (docs/calculos.md § Eficiência energética e de carbono): energia × 3.600.000 ÷ segundos
 * monitorados das mesmas coletas. Sem segundos não há média: null, nunca 0 W.
 */
export function averagePowerW(energyKwh: number, monitoredSeconds: number): number | null {
  return monitoredSeconds > 0 ? (energyKwh * WATT_SECONDS_PER_KWH) / monitoredSeconds : null;
}
