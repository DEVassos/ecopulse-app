import { describe, expect, it } from 'vitest';
import type { MonitoredService, ServiceStatus } from '../services/services.types';
import { INITIAL_TRACKER, RECENT_LIMIT, diffServices, trackServices, valueTrends } from './useStatusChanges';

function service(id: string, name: string, status: ServiceStatus, cpuPercent: number | null = 40, factor: number | null = 377): MonitoredService {
  return {
    id, name, status, cpuPercent, carbonIntensityGco2ePerKwh: factor, statusReason: null, lastReadingAt: null,
    country: 'Brasil', region: 'Sudeste', city: 'São Paulo', regionCode: 'br-sudeste', energyKwh: 0.001, emissionsG: 0.4,
    collectionIntervalSeconds: 30, memoryGb: 4, diskGb: 50, networkGb: 0.5, powerWatts: 40,
  };
}

// Horários locais: a frase usa o relógio do navegador, então o teste não depende do fuso da máquina
const FIRST_AT = new Date(2026, 10, 18, 14, 31, 0).toISOString();
const SECOND_AT = new Date(2026, 10, 18, 14, 32, 5).toISOString();

const FIRST_LIST = [service('billing', 'Billing API', 'ativo'), service('auth', 'Auth API', 'indisponivel'), service('old', 'Legacy API', 'ativo')];
const SECOND_LIST = [
  service('billing', 'Billing API', 'indisponivel'),
  service('auth', 'Auth API', 'ativo'),
  service('search', 'Search API', 'ativo'),
];

describe('diffServices', () => {
  it('avisa serviço novo, removido, que ficou indisponível e que voltou a ficar ativo, o mais grave primeiro', () => {
    const messages = diffServices(FIRST_LIST, SECOND_LIST, SECOND_AT).map((change) => change.message);
    expect(messages).toEqual([
      'Billing API ficou indisponível às 14:32',
      'Legacy API saiu do agregador às 14:32',
      'Novo serviço: Search API, às 14:32',
      'Auth API voltou a ficar ativo às 14:32',
    ]);
  });

  it('avisa quem ficou sem métricas e quem passou ao estado removido', () => {
    const before = [service('a', 'A', 'ativo'), service('b', 'B', 'ativo')];
    const after = [service('a', 'A', 'sem_metricas'), service('b', 'B', 'removido')];
    expect(diffServices(before, after, SECOND_AT).map((change) => [change.serviceId, change.kind])).toEqual([
      ['a', 'sem_metricas'],
      ['b', 'removido'],
    ]);
  });

  it('não avisa de novo quem já estava removido e saiu da lista, nem quem só mudou a CPU', () => {
    const before = [service('a', 'A', 'removido'), service('b', 'B', 'ativo', 10)];
    const after = [service('b', 'B', 'ativo', 90)];
    expect(diffServices(before, after, SECOND_AT)).toEqual([]);
  });
});

describe('valueTrends', () => {
  it('marca CPU e fator que subiram ou desceram, comparando como a tabela mostra (sem casas)', () => {
    const before = [service('a', 'A', 'ativo', 40.2, 377), service('b', 'B', 'ativo', 40.2, 377), service('c', 'C', 'ativo', null, 377)];
    const after = [service('a', 'A', 'ativo', 55, 377), service('b', 'B', 'ativo', 40.4, 120), service('c', 'C', 'ativo', 30, 377)];
    const trends = valueTrends(before, after);
    expect(trends.get('a')).toEqual({ cpuPercent: 'up', carbonIntensityGco2ePerKwh: undefined });
    expect(trends.get('b')).toEqual({ cpuPercent: undefined, carbonIntensityGco2ePerKwh: 'down' });
    // Sem leitura antes não há com o que comparar
    expect(trends.has('c')).toBe(false);
  });
});

describe('trackServices', () => {
  it('não avisa nada na primeira lista da página', () => {
    const first = trackServices(INITIAL_TRACKER, FIRST_LIST, FIRST_AT);
    expect(first.recent).toEqual([]);
    expect(first.toast).toBeNull();
    expect(first.changedIds.size).toBe(0);
  });

  it('avisa a partir da segunda lista, com o lote no aviso e as linhas que mudaram', () => {
    const second = trackServices(trackServices(INITIAL_TRACKER, FIRST_LIST, FIRST_AT), SECOND_LIST, SECOND_AT);
    expect(second.toast?.id).toBe(SECOND_AT);
    expect(second.toast?.changes[0].message).toBe('Billing API ficou indisponível às 14:32');
    expect(second.recent).toHaveLength(4);
    expect([...second.changedIds].sort()).toEqual(['auth', 'billing', 'old', 'search']);
  });

  it('mantém o estado quando a mesma lista volta (busca que falhou) e limpa o destaque num ciclo sem mudança', () => {
    const second = trackServices(trackServices(INITIAL_TRACKER, FIRST_LIST, FIRST_AT), SECOND_LIST, SECOND_AT);
    expect(trackServices(second, SECOND_LIST, SECOND_AT)).toBe(second);
    const quiet = trackServices(second, [...SECOND_LIST], new Date(2026, 10, 18, 14, 33).toISOString());
    expect(quiet.changedIds.size).toBe(0);
    expect(quiet.toast).toBe(second.toast);
    expect(quiet.recent).toBe(second.recent);
  });

  it(`guarda só as ${RECENT_LIMIT} mudanças mais recentes, da mais nova para a mais antiga`, () => {
    let tracker = trackServices(INITIAL_TRACKER, [service('a', 'A', 'ativo')], FIRST_AT);
    for (let minute = 0; minute < 12; minute += 1) {
      const status: ServiceStatus = minute % 2 === 0 ? 'indisponivel' : 'ativo';
      tracker = trackServices(tracker, [service('a', 'A', status)], new Date(2026, 10, 18, 15, minute).toISOString());
    }
    expect(tracker.recent).toHaveLength(RECENT_LIMIT);
    expect(tracker.recent[0].message).toBe('A voltou a ficar ativo às 15:11');
    expect(tracker.recent[RECENT_LIMIT - 1].message).toBe('A ficou indisponível às 15:02');
  });
});
