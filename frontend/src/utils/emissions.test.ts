import { describe, expect, it } from 'vitest';
import { readPeriodFilter } from './emissions';

const TODAY = '2026-11-02';

function read(query: string) {
  return readPeriodFilter(new URLSearchParams(query), TODAY);
}

describe('readPeriodFilter', () => {
  it('liga o tempo real com tempo=real e o período de hoje', () => {
    expect(read(`de=${TODAY}&ate=${TODAY}&tempo=real`)).toEqual({ start: TODAY, end: TODAY, live: true });
  });

  it('desliga o tempo real quando a URL volta ao período anterior, sem tempo=real (Voltar do navegador)', () => {
    expect(read('de=2026-09-01&ate=2026-09-30')).toEqual({ start: '2026-09-01', end: '2026-09-30', live: false });
  });

  it('não liga o tempo real num link antigo com tempo=real e datas passadas', () => {
    expect(read('de=2026-09-01&ate=2026-09-30&tempo=real')).toEqual({ start: '2026-09-01', end: '2026-09-30', live: false });
  });

  it('não liga o tempo real quando o período termina hoje mas começa antes', () => {
    expect(read(`de=2026-11-01&ate=${TODAY}&tempo=real`).live).toBe(false);
  });

  it('mantém o limite de 31 dias: ate além do limite vale o dia inicial', () => {
    expect(read('de=2026-09-01&ate=2026-10-15&tempo=real')).toEqual({ start: '2026-09-01', end: '2026-09-01', live: false });
  });

  it('cai em hoje com datas ausentes, inválidas ou no futuro', () => {
    expect(read('')).toEqual({ start: TODAY, end: TODAY, live: false });
    expect(read('de=2026-02-30&ate=amanha')).toEqual({ start: TODAY, end: TODAY, live: false });
    expect(read('de=2026-11-10&ate=2026-11-12&tempo=real')).toEqual({ start: TODAY, end: TODAY, live: true });
  });
});
