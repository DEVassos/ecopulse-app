import { describe, expect, it } from 'vitest';
import type { EmissionPoint } from '../services/emissions.types';
import { printTable } from './print-report';

function point(hour: number, minute: number, energyKwh: number | null, co2eGrams: number | null, collections = 30): EmissionPoint {
  return {
    t: new Date(2026, 10, 18, hour, minute).getTime(), collections, failed: 0, notCalculated: 0,
    energyKwh, co2eGrams, co2eMinGrams: null, co2eMaxGrams: null,
  };
}

describe('printTable (#13)', () => {
  it('uma linha por intervalo, na escala da maior linha de cada coluna, com o total no fim na mesma unidade', () => {
    const table = printTable([point(0, 0, 0.009, 4.2), point(0, 15, 0.0095, 4.4), point(0, 30, null, null, 2)], '15min', false);
    expect(table?.energyUnit).toBe('Wh');
    expect(table?.co2eUnit).toBe('g');
    expect(table?.rows.map((row) => row.label)).toEqual(['00:00', '00:15', '00:30']);
    expect(table?.rows[0]).toEqual({ kind: 'intervalo', label: '00:00', collections: 30, energy: '9,00', co2e: '4,20' });
    expect(table?.rows[2]).toMatchObject({ energy: '—', co2e: '—', collections: 2 });
    expect(table?.total).toEqual({ collections: 62, energy: '18,50', co2e: '8,60' });
  });

  it('linhas pequenas não perdem as casas por causa de um total grande', () => {
    const points = Array.from({ length: 96 }, (_, index) => point(Math.floor(index / 4), (index % 4) * 15, 0.00906, 4.21));
    const table = printTable(points, '15min', false);
    expect(table?.rows[0]).toMatchObject({ energy: '9,06', co2e: '4,21' });
    expect(table?.total).toMatchObject({ energy: '869,76', co2e: '404,16' });
  });

  it('período de mais de um dia leva a data no início do intervalo', () => {
    expect(printTable([point(23, 0, 1, 1)], '1h', true)?.rows[0].label).toBe('18/11 23:00');
  });

  it('agrupamento "Cada coleta" não vira tabela: o relatório aponta o CSV', () => {
    expect(printTable([point(0, 0, 1, 1)], 'coleta', false)).toBeNull();
  });

  it('trechos sem coleta viram linhas na ordem do tempo, com a duração, e ficam fora do total (#272)', () => {
    const at = (hour: number, minute: number) => new Date(2026, 10, 18, hour, minute).getTime();
    const table = printTable(
      [point(3, 15, 0.009, 4.2), point(10, 15, 0.009, 4.2)],
      '15min',
      false,
      [{ start: at(3, 30), end: at(10, 15) }],
    );
    expect(table?.rows.map((row) => row.label)).toEqual(['03:15', '03:30–10:15', '10:15']);
    expect(table?.rows[1]).toEqual({ kind: 'sem-coleta', label: '03:30–10:15', duration: '6 h 45 min' });
    expect(table?.total.collections).toBe(60);
  });

  it('trecho sem coleta que vira o dia leva a data nas duas pontas', () => {
    const start = new Date(2026, 10, 18, 23, 0).getTime();
    const end = new Date(2026, 10, 19, 2, 0).getTime();
    const sameDay = { start: new Date(2026, 10, 18, 20, 0).getTime(), end: start };
    const rows = printTable([point(19, 0, 1, 1)], '1h', true, [sameDay, { start, end }])?.rows;
    expect(rows?.map((row) => row.label)).toEqual(['18/11 19:00', '18/11 20:00–23:00', '18/11 23:00–19/11 02:00']);
  });

  it('sem nenhum cálculo, o total é "—", nunca 0', () => {
    expect(printTable([point(0, 0, null, null)], '1h', false)?.total).toMatchObject({ energy: '—', co2e: '—' });
  });
});
