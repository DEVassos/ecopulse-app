import { describe, expect, it } from 'vitest';
import { statusReasonText } from './status';

describe('statusReasonText', () => {
  it('não explica o estado ativo', () => {
    expect(statusReasonText({ status: 'ativo', statusReason: null })).toBeNull();
  });

  it('mostra o motivo gravado pelo worker quando o serviço está indisponível', () => {
    expect(statusReasonText({ status: 'indisponivel', statusReason: 'Serviço indisponível (HTTP 500).' })).toBe(
      'Serviço indisponível (HTTP 500).',
    );
  });

  it('avisa a falha mesmo sem motivo gravado', () => {
    expect(statusReasonText({ status: 'indisponivel', statusReason: null })).toBe('A última coleta falhou, sem motivo informado.');
  });

  it('usa o texto fixo do contrato para sem métricas e removido', () => {
    expect(statusReasonText({ status: 'sem_metricas', statusReason: null })).toBe('O agregador não tem métricas deste serviço.');
    expect(statusReasonText({ status: 'removido', statusReason: null })).toBe('Saiu da lista do agregador.');
  });
});
