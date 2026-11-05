import type { MonitoredService } from '../services/services.types';

/** `sem_metricas` e `removido` não têm mensagem no banco: o texto é fixo, combinado no contrato da #176. */
const FIXED_REASON = {
  sem_metricas: 'O agregador não tem métricas deste serviço.',
  removido: 'Saiu da lista do agregador.',
} as const;

/**
 * Motivo do estado em texto, para aparecer ao lado do badge (DW05: estado com texto e motivo, não só cor).
 * `ativo` não precisa de explicação e devolve null.
 */
export function statusReasonText(service: Pick<MonitoredService, 'status' | 'statusReason'>): string | null {
  switch (service.status) {
    case 'ativo':
      return null;
    case 'indisponivel':
      return service.statusReason ?? 'A última coleta falhou, sem motivo informado.';
    default:
      return FIXED_REASON[service.status];
  }
}
