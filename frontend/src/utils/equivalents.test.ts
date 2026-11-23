import { describe, expect, it } from 'vitest';
import {
  EQUIVALENT_FACTORS,
  describeEquivalents,
  equivalentsOf,
  equivalentsSources,
  formatEquivalentUnits,
} from './equivalents';

describe('formatEquivalentUnits', () => {
  it('arredonda para dois algarismos significativos no padrão brasileiro', () => {
    expect(formatEquivalentUnits(1.0565)).toBe('1,1');
    expect(formatEquivalentUnits(20.806)).toBe('21');
    expect(formatEquivalentUnits(0.0193)).toBe('0,019');
    expect(formatEquivalentUnits(1200)).toBe('1.200');
  });

  it('nunca mostra zero nem notação científica para valores minúsculos', () => {
    expect(formatEquivalentUnits(0.0004)).toBe('< 0,01');
    expect(formatEquivalentUnits(0)).toBe('< 0,01');
    expect(formatEquivalentUnits(Number.NaN)).toBe('< 0,01');
  });
});

describe('equivalentsOf', () => {
  it('usa o fator de docs/calculos.md: 258 g → 1,1 km de carro e 21 cargas de celular', () => {
    expect(equivalentsOf(258).map((equivalent) => equivalent.text)).toEqual([
      '1,1 km de carro a gasolina',
      '21 cargas de celular',
    ]);
  });

  it('mantém a conta do fator publicado, sem arredondar o fator', () => {
    const car = equivalentsOf(EQUIVALENT_FACTORS.carKm.gramsPerUnit * 3)[0];
    expect(car.text).toBe('3 km de carro a gasolina');
  });

  it('sem CO₂e conhecido não inventa equivalência', () => {
    expect(equivalentsOf(null)).toEqual([]);
    expect(equivalentsOf(0)).toEqual([]);
    expect(equivalentsOf(Number.NaN)).toEqual([]);
  });

  it('traz a fonte em cada fator', () => {
    for (const equivalent of equivalentsOf(258)) {
      expect(equivalent.factor.source).toContain('EPA');
      expect(equivalent.factor.source).toContain('13/11/2026');
    }
  });
});

describe('describeEquivalents', () => {
  it('junta as unidades numa linha só', () => {
    expect(describeEquivalents(258)).toBe('≈ 1,1 km de carro a gasolina · ≈ 21 cargas de celular');
  });

  it('devolve null quando não há o que mostrar', () => {
    expect(describeEquivalents(null)).toBeNull();
    expect(describeEquivalents(0)).toBeNull();
  });
});

describe('equivalentsSources', () => {
  it('cita os dois fatores com a data de consulta', () => {
    const sources = equivalentsSources();
    expect(sources.match(/consultado em 13\/11\/2026/g)).toHaveLength(2);
  });
});
