// Textos da última coleta de um serviço (#298): fator da região, potência, recursos e intervalo, usados na tabela e na
// janela de detalhes. Só formatação: os números vêm de GET /api/services (#297).
import type { MonitoredService } from '../services/services.types';
import { formatDurationSeconds, formatNumber } from './format';

export interface MissingText {
  /** Texto curto para o leitor de tela. */
  label: string;
  /** Explicação do tooltip. */
  title: string;
}

/**
 * Por que o fator da região está ausente, em três situações que não podem parecer a mesma coisa: cadastro sem região
 * (nunca haverá cálculo), serviço sem leitura e leitura sem cálculo disponível.
 */
export function factorMissing(service: Pick<MonitoredService, 'regionCode' | 'lastReadingAt' | 'cpuPercent'>): MissingText {
  if (service.regionCode === null) {
    return { label: 'sem região', title: 'Sem região no cadastro: sem fator e sem cálculo de emissão' };
  }
  if (service.lastReadingAt === null || service.cpuPercent === null) {
    return { label: 'sem leitura', title: 'Sem leitura: o fator aparece com a primeira coleta calculada' };
  }
  return { label: 'sem fator nesta leitura', title: 'Sem fator nesta leitura: cálculo indisponível (API de carbono fora ou região sem fator)' };
}

/** "Intensidade de carbono de us-east na última leitura". */
export function factorTooltip(service: Pick<MonitoredService, 'regionCode'>): string {
  return `Intensidade de carbono de ${service.regionCode ?? 'região desconhecida'} na última leitura`;
}

/** "41,8 W" para destacar no tooltip; null sem potência. */
export function powerText(service: Pick<MonitoredService, 'powerWatts'>): string | null {
  return service.powerWatts === null ? null : `${formatNumber(service.powerWatts, 1)} W`;
}

/**
 * "RAM 6,0 GB · disco 67,1 GB · rede 0,53 GB", só com as partes presentes; null quando a leitura não trouxe recurso
 * nenhum, para a célula não ganhar um tooltip vazio.
 */
export function resourcesText(service: Pick<MonitoredService, 'memoryGb' | 'diskGb' | 'networkGb'>): string | null {
  const parts = [
    service.memoryGb === null ? null : `RAM ${formatNumber(service.memoryGb, 1)} GB`,
    service.diskGb === null ? null : `disco ${formatNumber(service.diskGb, 1)} GB`,
    service.networkGb === null ? null : `rede ${formatNumber(service.networkGb, 2)} GB`,
  ].filter((part): part is string => part !== null);
  return parts.length ? parts.join(' · ') : null;
}

/** "coleta de 46 s"; null sem intervalo. */
export function intervalText(service: Pick<MonitoredService, 'collectionIntervalSeconds'>): string | null {
  return service.collectionIntervalSeconds === null ? null : `coleta de ${formatDurationSeconds(service.collectionIntervalSeconds)}`;
}
