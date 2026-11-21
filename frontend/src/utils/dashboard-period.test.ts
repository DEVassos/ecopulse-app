import { describe, expect, it } from 'vitest';
import { dashboardPeriod } from './dashboard-period';

describe('janela única do Dashboard (#375)', () => {
  it('usa o instante da lista para as três consultas, com os mesmos from e to', () => {
    const updatedAt = '2026-11-21T15:36:38.123Z';
    const period = dashboardPeriod(updatedAt);
    expect(period).toEqual({ from: '2026-11-20T15:36:38.123Z', to: updatedAt });
    if (period === null) throw new Error('Janela ausente');
    // Contrato dos três consumidores: a janela é compartilhada, não recalculada em cada efeito.
    const requests = [
      { endpoint: '/api/services/summary', ...period },
      { endpoint: '/api/services/ranking', ...period },
      { endpoint: '/api/regions/summary', ...period },
    ];
    expect(new Set(requests.map(({ from, to }) => `${from}|${to}`)).size).toBe(1);
  });

  it('não cria janela antes da primeira lista e mantém instantes determinísticos', () => {
    expect(dashboardPeriod(null)).toBeNull();
    expect(dashboardPeriod('inválido')).toBeNull();
    expect(dashboardPeriod('2026-11-21T15:36:38.123Z')).toEqual(dashboardPeriod('2026-11-21T15:36:38.123Z'));
  });

  it('uma nova atualização move os dois limites pelo mesmo intervalo', () => {
    const before = dashboardPeriod('2026-11-21T15:00:00.000Z');
    const after = dashboardPeriod('2026-11-21T15:00:30.000Z');
    expect(Date.parse(after!.to) - Date.parse(before!.to)).toBe(30_000);
    expect(Date.parse(after!.from) - Date.parse(before!.from)).toBe(30_000);
  });
});
