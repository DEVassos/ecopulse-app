import type { ReactNode } from 'react';
import { formatDayTime, formatNumber } from '../utils/format';
import './LastUpdated.css';

interface Props {
  /** Horário da última busca bem-sucedida (ISO 8601); null antes da primeira. */
  updatedAt: string | null;
  /** Intervalo da atualização automática, em segundos (omitido quando não há). */
  intervalSeconds?: number;
  /** A última tentativa falhou: o dado na tela é o da atualização anterior. */
  stale?: boolean;
  /** Ações ao lado do texto (ex.: botão de atualizar agora). */
  children?: ReactNode;
}

/**
 * Selo "tempo real": ponto pulsando enquanto os dados estão em dia, laranja quando desatualizados.
 * Sem role="status": o horário mudaria a cada ciclo e seria anunciado pelo leitor de tela; a falha já é
 * anunciada pelo aviso da tela (ErrorState, ou UpdateFailedBanner quando há dados no dashboard).
 */
export default function LastUpdated({ updatedAt, intervalSeconds, stale = false, children }: Props) {
  return (
    <div className={stale ? 'last-updated last-updated--stale' : 'last-updated'}>
      {updatedAt && <span className="live-dot" aria-hidden="true" />}
      <span>
        {updatedAt ? (
          <>
            {stale ? 'Desatualizado desde ' : 'Última atualização: '}
            <strong>{formatDayTime(updatedAt)}</strong>
          </>
        ) : (
          'Aguardando a primeira atualização'
        )}
        {intervalSeconds !== undefined &&
          ` · intervalo: ${formatNumber(intervalSeconds, Number.isInteger(intervalSeconds) ? 0 : 1)} s`}
      </span>
      {children}
    </div>
  );
}
