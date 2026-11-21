import { describe, expect, it } from 'vitest';
import { nextTabId, readTab } from './tabs';

const IDS = ['como-usar', 'administracao', 'formulas'] as const;

describe('nextTabId', () => {
  it('→ e ← andam uma aba e dão a volta nas pontas', () => {
    expect(nextTabId(IDS, 'como-usar', 'ArrowRight')).toBe('administracao');
    expect(nextTabId(IDS, 'formulas', 'ArrowRight')).toBe('como-usar');
    expect(nextTabId(IDS, 'administracao', 'ArrowLeft')).toBe('como-usar');
    expect(nextTabId(IDS, 'como-usar', 'ArrowLeft')).toBe('formulas');
  });

  it('Home vai à primeira aba e End à última', () => {
    expect(nextTabId(IDS, 'administracao', 'Home')).toBe('como-usar');
    expect(nextTabId(IDS, 'como-usar', 'End')).toBe('formulas');
  });

  it('outras teclas não mudam a aba', () => {
    for (const key of ['Enter', ' ', 'Tab', 'ArrowDown', 'a']) expect(nextTabId(IDS, 'administracao', key)).toBeNull();
  });

  it('com uma aba só, as setas ficam nela', () => {
    expect(nextTabId(['unica'] as const, 'unica', 'ArrowRight')).toBe('unica');
    expect(nextTabId(['unica'] as const, 'unica', 'ArrowLeft')).toBe('unica');
  });
});

describe('readTab', () => {
  it('lê a aba conhecida do endereço', () => {
    expect(readTab(IDS, 'administracao')).toBe('administracao');
  });

  it('sem aba, com aba desconhecida ou vazia, abre a primeira', () => {
    expect(readTab(IDS, null)).toBe('como-usar');
    expect(readTab(IDS, 'admin')).toBe('como-usar');
    expect(readTab(IDS, '')).toBe('como-usar');
  });
});
