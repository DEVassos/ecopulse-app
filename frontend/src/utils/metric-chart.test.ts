import { describe, expect, it } from 'vitest';
import type { ServiceCollection } from '../services/collections.types';
import { buildMetricChart, formatMetricValue } from './metric-chart';

function collection(overrides: Partial<ServiceCollection> = {}): ServiceCollection {
  return {
    id: 'a',
    serviceId: 'svc-1',
    collectedAt: '2026-11-20T12:00:00.000Z',
    status: 'ok',
    collectionIntervalSeconds: 60,
    cpuPercent: 10,
    memoryGb: 2,
    diskGb: 20,
    networkGb: 0.5,
    errorMessage: null,
    ...overrides,
  };
}

/** Da mais recente para a mais antiga, como a API devolve. */
const history = [
  collection({ id: 'd', collectedAt: '2026-11-20T13:00:00.000Z', cpuPercent: 30, memoryGb: 3.17, diskGb: 19.26, networkGb: 0.45 }),
  collection({ id: 'c', collectedAt: '2026-11-20T12:00:00.000Z', status: 'erro', cpuPercent: null, memoryGb: null, diskGb: null, networkGb: null, errorMessage: 'HTTP 500' }),
  collection({ id: 'b', collectedAt: '2026-11-20T11:00:00.000Z', cpuPercent: 20, memoryGb: 2.4, diskGb: 15, networkGb: 0.3 }),
  collection({ id: 'a', collectedAt: '2026-11-20T10:00:00.000Z', cpuPercent: 10, memoryGb: 1.1, diskGb: 10, networkGb: 0.1 }),
];

describe('buildMetricChart', () => {
  it('ordena as coletas da mais antiga para a mais recente', () => {
    expect(buildMetricChart(history, 'cpu').points.map((point) => point.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('lê o campo da métrica escolhida', () => {
    const memory = buildMetricChart(history, 'memory');
    expect(memory.plotted.map((point) => point.value)).toEqual([1.1, 2.4, 3.17]);
    expect(buildMetricChart(history, 'disk').plotted.map((point) => point.value)).toEqual([10, 15, 19.26]);
    expect(buildMetricChart(history, 'network').plotted.map((point) => point.value)).toEqual([0.1, 0.3, 0.45]);
    expect(buildMetricChart(history, 'cpu').plotted.map((point) => point.value)).toEqual([10, 20, 30]);
  });

  it('interrompe a linha na coleta com erro, sem ligar os trechos', () => {
    const { segments, errors, noMetrics } = buildMetricChart(history, 'memory');
    expect(segments.map((segment) => segment.map((point) => point.id))).toEqual([['a', 'b'], ['d']]);
    expect(errors).toBe(1);
    expect(noMetrics).toBe(0);
  });

  it('não desenha valor de coleta que não está ok, mesmo que o campo venha preenchido', () => {
    const { plotted } = buildMetricChart([collection({ status: 'sem_metricas' })], 'cpu');
    expect(plotted).toEqual([]);
  });

  it('mantém o eixo da CPU fixo de 0 a 100%', () => {
    const { axis } = buildMetricChart(history, 'cpu');
    expect(axis.ceiling).toBe(100);
    expect(axis.labels).toEqual(['0%', '50%', '100%']);
  });

  it('ajusta o eixo em GB ao maior valor da série', () => {
    const memory = buildMetricChart(history, 'memory');
    expect(memory.axis.ceiling).toBe(4);
    expect(memory.axis.labels).toEqual(['0', '1', '2', '3', '4']);

    const disk = buildMetricChart(history, 'disk');
    expect(disk.axis.ceiling).toBe(20);
    expect(disk.axis.labels).toEqual(['0', '5', '10', '15', '20']);

    const network = buildMetricChart(history, 'network');
    expect(network.axis.ceiling).toBe(0.6);
    expect(network.axis.labels).toEqual(['0', '0,2', '0,4', '0,6']);
  });

  it('mostra as casas decimais do passo, sem arredondar a marca', () => {
    const series = [collection({ id: 'b', collectedAt: '2026-11-20T13:00:00.000Z', memoryGb: 9.4 }), collection({ id: 'a', memoryGb: 1 })];
    expect(buildMetricChart(series, 'memory').axis.labels).toEqual(['0', '2,5', '5', '7,5', '10']);
  });

  it('dá escala ao gráfico quando todas as coletas estão em zero', () => {
    const series = [collection({ id: 'b', collectedAt: '2026-11-20T13:00:00.000Z', networkGb: 0 }), collection({ id: 'a', networkGb: 0 })];
    expect(buildMetricChart(series, 'network').axis.ceiling).toBe(1);
  });
});

describe('formatMetricValue', () => {
  it('usa a unidade e as casas decimais da tabela de histórico', () => {
    expect(formatMetricValue('cpu', 42.55)).toBe('42,6%');
    expect(formatMetricValue('memory', 3.1)).toBe('3,10 GB');
    expect(formatMetricValue('disk', 19.264)).toBe('19,26 GB');
    expect(formatMetricValue('network', 0.4567)).toBe('0,457 GB');
  });
});
