import { describe, expect, it } from 'vitest';
import { displayToIso, isoToDisplay, maskDate } from './date-input';

describe('maskDate', () => {
  it('põe as barras de DD/MM/AAAA conforme os dígitos chegam', () => {
    expect(maskDate('0')).toBe('0');
    expect(maskDate('041')).toBe('04/1');
    expect(maskDate('0411')).toBe('04/11');
    expect(maskDate('04112026')).toBe('04/11/2026');
  });

  it('ignora o que não é dígito e corta no oitavo dígito', () => {
    expect(maskDate('04-11-2026 extra')).toBe('04/11/2026');
    expect(maskDate('041120261')).toBe('04/11/2026');
  });
});

describe('displayToIso', () => {
  it('converte DD/MM/AAAA para AAAA-MM-DD', () => {
    expect(displayToIso('04/11/2026')).toBe('2026-11-04');
  });

  it('recusa texto incompleto e data que não existe', () => {
    expect(displayToIso('04/11/20')).toBe('');
    expect(displayToIso('31/02/2026')).toBe('');
    expect(displayToIso('29/02/2028')).toBe('2028-02-29');
  });
});

describe('isoToDisplay', () => {
  it('converte AAAA-MM-DD para DD/MM/AAAA e deixa vazio o que não é data', () => {
    expect(isoToDisplay('2026-11-04')).toBe('04/11/2026');
    expect(isoToDisplay('')).toBe('');
  });
});
