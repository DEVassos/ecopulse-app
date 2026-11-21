import { describe, expect, it } from 'vitest';
import { COEFFICIENTS_TEXT, averagePowerW, estimateCollection, exampleCalculation, powerBreakdown } from './model';

// Números de docs/calculos.md: se um lado mudar, este teste falha e a tela da Ajuda não diverge do documento (#404)
describe('modelo de potência, energia e CO₂e', () => {
  it('reproduz o exemplo oficial: 50,87 W; 0,000847833333 kWh; 0,072065833333 g', () => {
    const { parts, powerW, energyKwh, co2eGrams } = exampleCalculation();
    expect(parts).toEqual({ cpuW: 50, memoryW: 0.75, diskW: 0.1, networkW: 0.02 });
    expect(powerW).toBeCloseTo(50.87, 10);
    expect(energyKwh).toBeCloseTo(0.000847833333, 12);
    expect(co2eGrams).toBeCloseTo(0.072065833333, 12);
  });

  it('reproduz o exemplo do OpenAPI: 64,06035 W; 0,000480452625 kWh; 0,040838473125 g', () => {
    const result = estimateCollection({ cpuPercent: 62.67, memoryGb: 3.17, diskGb: 19.26, networkGb: 0.45, intervalSeconds: 27, intensityGco2ePerKwh: 85 });
    expect(result.powerW).toBeCloseTo(64.06035, 10);
    expect(result.energyKwh).toBeCloseTo(0.000480452625, 15);
    expect(result.co2eGrams).toBeCloseTo(0.040838473125, 15);
  });

  it('arredonda cada parcela a seis casas, como o backend, e mantém a carga pequena positiva', () => {
    expect(powerBreakdown({ cpuPercent: 0, memoryGb: 0, diskGb: 0, networkGb: 1 }).networkW).toBe(0.02);
    expect(powerBreakdown({ cpuPercent: 0, memoryGb: 0.0000001, diskGb: 0, networkGb: 0 }).memoryW).toBe(0);
    const small = estimateCollection({ cpuPercent: 0, memoryGb: 0, diskGb: 0, networkGb: 1, intervalSeconds: 27, intensityGco2ePerKwh: 85 });
    expect(small.energyKwh).toBeCloseTo(0.00000015, 15);
    expect(small.co2eGrams).toBeCloseTo(0.00001275, 15);
  });

  it('potência média: 0,48 kWh em 24 h dão 20 W; sem segundos monitorados, sem média', () => {
    expect(averagePowerW(0.48, 86_400)).toBeCloseTo(20, 10);
    expect(averagePowerW(0.48, 0)).toBeNull();
  });

  it('escreve os coeficientes como na nota da potência da Comparação', () => {
    expect(COEFFICIENTS_TEXT).toBe('CPU (1 W por ponto percentual), RAM (0,375 W/GB), disco (0,01 W/GB) e rede (0,02 W/GB)');
  });
});
