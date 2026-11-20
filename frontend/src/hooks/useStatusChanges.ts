import { useState } from 'react';
import type { MonitoredService, ServiceStatus } from '../services/services.types';
import { formatHourMinute } from '../utils/format';

/** O que aconteceu com o serviço entre duas listas do polling (RF02, RF05, RF06): chegou ou passou a um estado. */
export type StatusChangeKind = ServiceStatus | 'novo';

export interface StatusChange {
  /** Chave estável para listas: serviço + horário da lista que trouxe a mudança. */
  key: string;
  serviceId: string;
  kind: StatusChangeKind;
  /** Frase pronta para a tela, com o horário: "Billing API ficou indisponível às 14:32". */
  message: string;
  /** Horário da lista que trouxe a mudança (ISO 8601). */
  at: string;
}

export type Trend = 'up' | 'down';

/** Valores da tabela que subiram ou desceram desde a lista anterior; ausente quando não mudou. */
export interface ValueTrends {
  cpuPercent?: Trend;
  carbonIntensityGco2ePerKwh?: Trend;
}

/** Quantas mudanças a lista "Últimas mudanças" guarda. */
export const RECENT_LIMIT = 10;

/** Problema primeiro: no aviso, a mudança mais grave aparece no topo. */
const SEVERITY: Record<StatusChangeKind, number> = { indisponivel: 0, sem_metricas: 1, removido: 2, novo: 3, ativo: 4 };

function changeMessage(kind: StatusChangeKind, name: string, time: string): string {
  switch (kind) {
    case 'novo':
      return `Novo serviço: ${name}, às ${time}`;
    case 'removido':
      return `${name} saiu do agregador às ${time}`;
    case 'ativo':
      return `${name} voltou a ficar ativo às ${time}`;
    case 'indisponivel':
      return `${name} ficou indisponível às ${time}`;
    case 'sem_metricas':
      return `${name} ficou sem métricas às ${time}`;
  }
}

/**
 * Mudanças entre duas listas: serviço novo, removido (estado `removido` ou fora da lista) e troca de estado. Valores
 * que mudam sem trocar o estado (CPU, fator) não são mudança de estado: ficam com `valueTrends`.
 */
export function diffServices(previous: readonly MonitoredService[], current: readonly MonitoredService[], at: string): StatusChange[] {
  const time = formatHourMinute(at);
  const before = new Map(previous.map((service) => [service.id, service]));
  const changes: StatusChange[] = [];
  const add = (service: MonitoredService, kind: StatusChangeKind) =>
    changes.push({ key: `${service.id}@${at}`, serviceId: service.id, kind, message: changeMessage(kind, service.name, time), at });

  for (const service of current) {
    const old = before.get(service.id);
    before.delete(service.id);
    if (!old) add(service, 'novo');
    // Passar a `ativo` é voltar: na lista anterior ele estava indisponível, sem métricas ou removido
    else if (old.status !== service.status) add(service, service.status);
  }
  // Sobrou na lista anterior: saiu da resposta. Quem já estava removido não sai de novo
  for (const service of before.values()) {
    if (service.status !== 'removido') add(service, 'removido');
  }
  return changes.sort((a, b) => SEVERITY[a.kind] - SEVERITY[b.kind]);
}

function trend(before: number | null, after: number | null): Trend | undefined {
  // Compara como a tabela mostra (sem casas): 41,2% → 41,4% não ganha seta
  if (before === null || after === null || Math.round(before) === Math.round(after)) return undefined;
  return after > before ? 'up' : 'down';
}

/** Setas ▲/▼ da tabela: CPU e fator da região que mudaram desde a lista anterior, pelo id do serviço. */
export function valueTrends(previous: readonly MonitoredService[], current: readonly MonitoredService[]): Map<string, ValueTrends> {
  const before = new Map(previous.map((service) => [service.id, service]));
  const trends = new Map<string, ValueTrends>();
  for (const service of current) {
    const old = before.get(service.id);
    if (!old) continue;
    const cpuPercent = trend(old.cpuPercent, service.cpuPercent);
    const carbonIntensityGco2ePerKwh = trend(old.carbonIntensityGco2ePerKwh, service.carbonIntensityGco2ePerKwh);
    if (cpuPercent || carbonIntensityGco2ePerKwh) trends.set(service.id, { cpuPercent, carbonIntensityGco2ePerKwh });
  }
  return trends;
}

export interface StatusChangesState {
  /** Até RECENT_LIMIT mudanças, da mais nova para a mais antiga. */
  recent: StatusChange[];
  /** Último lote com alguma mudança, para o aviso que some sozinho; `id` muda a cada lote novo. */
  toast: { id: string; changes: StatusChange[] } | null;
  /** Serviços que mudaram de estado na lista mais recente: a linha deles ganha destaque breve. */
  changedIds: ReadonlySet<string>;
  trends: ReadonlyMap<string, ValueTrends>;
}

export interface StatusTracker extends StatusChangesState {
  /** Lista já comparada; null antes da primeira. */
  services: readonly MonitoredService[] | null;
}

export const INITIAL_TRACKER: StatusTracker = { services: null, recent: [], toast: null, changedIds: new Set(), trends: new Map() };

/**
 * Próximo estado com a lista que acabou de chegar. A primeira lista só vira referência: sem aviso na carga da página.
 * A mesma lista de novo (busca que falhou mantém o último dado) não gera mudança.
 */
export function trackServices(tracker: StatusTracker, services: readonly MonitoredService[], at: string): StatusTracker {
  if (tracker.services === services) return tracker;
  if (tracker.services === null) return { ...INITIAL_TRACKER, services };
  const changes = diffServices(tracker.services, services, at);
  return {
    services,
    recent: changes.length ? [...changes, ...tracker.recent].slice(0, RECENT_LIMIT) : tracker.recent,
    toast: changes.length ? { id: at, changes } : tracker.toast,
    changedIds: new Set(changes.map((change) => change.serviceId)),
    trends: valueTrends(tracker.services, services),
  };
}

/**
 * Compara cada lista do polling com a anterior (sem requisição nova): avisos de mudança de estado, "Últimas mudanças"
 * e setas da tabela. `updatedAt` é o horário da lista, como `useServices` entrega.
 */
export function useStatusChanges(services: readonly MonitoredService[] | null, updatedAt: string | null): StatusChangesState {
  const [tracker, setTracker] = useState(INITIAL_TRACKER);
  // Ajuste durante a renderização (padrão do React para "valor anterior"): a lista nova e os avisos chegam na mesma tela
  if (services && updatedAt && services !== tracker.services) setTracker(trackServices(tracker, services, updatedAt));
  return tracker;
}
