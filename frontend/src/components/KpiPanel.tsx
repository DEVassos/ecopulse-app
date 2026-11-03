import type { StatusSummary } from '../utils/summary';
import { formatDayTime } from '../utils/format';
import MetricTile, { type MetricTone } from './MetricTile';
import './KpiPanel.css';

interface Props {
  summary: StatusSummary;
  /** Horário dos dados exibidos quando a última busca falhou; null quando estão em dia. */
  staleSince: string | null;
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Cards de nível 1 com o estado dos serviços (RF08, RF09). Energia e CO₂e do período ficam no painel de indicadores agregados. */
export default function KpiPanel({ summary, staleSince }: Props) {
  const stale = staleSince !== null;
  // Cor só quando há algo a ver: com contagem zero o card fica neutro e sem nota
  const tone = (count: number, active: MetricTone): MetricTone => (count > 0 ? active : 'neutral');
  const share = (count: number) =>
    count > 0 && summary.monitored > 0 ? `${Math.round((count / summary.monitored) * 100)}% do total` : undefined;
  const removedNote =
    summary.removed === 0 ? undefined : summary.removed === 1 ? 'sem contar 1 removido' : `sem contar ${summary.removed} removidos`;

  return (
    <section
      className="kpis"
      aria-label="Estado dos serviços monitorados"
      title={staleSince ? `Dados de ${formatDayTime(staleSince)}: a última atualização falhou` : undefined}
    >
      <MetricTile
        label="Total"
        value={String(summary.monitored)}
        note={removedNote}
        stale={stale}
        icon={
          <svg {...iconProps}>
            <rect x="3" y="4" width="18" height="7" rx="2" />
            <rect x="3" y="13" width="18" height="7" rx="2" />
            <path d="M7 7.5h.01M7 16.5h.01" />
          </svg>
        }
      />
      <MetricTile
        label="Ativos"
        value={String(summary.active)}
        note={share(summary.active)}
        tone={tone(summary.active, 'success')}
        stale={stale}
        icon={
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        }
      />
      <MetricTile
        label="Indisponíveis"
        value={String(summary.unavailable)}
        note={share(summary.unavailable)}
        tone={tone(summary.unavailable, 'danger')}
        stale={stale}
        icon={
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>
        }
      />
      <MetricTile
        label="Sem métricas"
        value={String(summary.withoutMetrics)}
        note={share(summary.withoutMetrics)}
        tone={tone(summary.withoutMetrics, 'warning')}
        stale={stale}
        icon={
          <svg {...iconProps}>
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        }
      />
    </section>
  );
}
