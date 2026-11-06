import type { ReactNode } from 'react';
import './MetricTile.css';

/** Cor do card: ativo, indisponível e sem métricas seguem o StatusBadge; neutral não destaca nada. */
export type MetricTone = 'neutral' | 'success' | 'danger' | 'warning';

/** Traço comum dos ícones dos cards (SVG de linha 24×24, na cor do tom): uma família só em todos os painéis. */
export const metricIconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

interface Props {
  label: string;
  /** Número já formatado, ou o MissingValue quando não há valor. */
  value: ReactNode;
  unit?: string;
  /** Texto curto ao lado do valor (proporção, base da contagem, variação); omitido quando não acrescenta nada. */
  note?: ReactNode;
  icon: ReactNode;
  tone?: MetricTone;
  /** Última busca falhou: o valor continua, em cor apagada, para não parecer atual. */
  stale?: boolean;
  /** Versão mais baixa (cerca de 64 px), para a linha de estado que fica abaixo dos indicadores do período (#259). */
  compact?: boolean;
}

/** Card de indicador de nível 1. O que ele mede está sempre no rótulo: a cor nunca é a única pista. */
export default function MetricTile({ label, value, unit, note, icon, tone = 'neutral', stale = false, compact = false }: Props) {
  return (
    <div className={`metric metric--${tone}${stale ? ' metric--stale' : ''}${compact ? ' metric--compact' : ''}`}>
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="metric-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="metric-value">
        <span>
          {value} {unit && <span className="metric-unit">{unit}</span>}
        </span>
        {note && <span className="metric-note">{note}</span>}
      </div>
    </div>
  );
}
