import type { MonitoredService, ServiceStatus } from '../services/services.types';

/** Contagem dos serviços por estado, para os cards de nível 1 do dashboard (RF08, RF09). */
export interface StatusSummary {
  /** Serviços monitorados: todos os da lista menos os removidos. */
  monitored: number;
  active: number;
  unavailable: number;
  withoutMetrics: number;
  /** Fora do total: saíram da lista do agregador na última descoberta do worker. */
  removed: number;
}

export function summarizeStatus(services: MonitoredService[]): StatusSummary {
  const count = (status: ServiceStatus) => services.filter((service) => service.status === status).length;
  const removed = count('removido');

  return {
    monitored: services.length - removed,
    active: count('ativo'),
    unavailable: count('indisponivel'),
    withoutMetrics: count('sem_metricas'),
    removed,
  };
}
