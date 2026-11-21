import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { ServiceCollection } from '../services/collections.types';
import { CHAR_WIDTH } from '../utils/chart-labels';
import { formatDayTime } from '../utils/format';
import {
  buildMetricChart,
  CHART_METRICS,
  formatMetricValue,
  METRICS,
  type ChartMetric,
  type MetricChartData,
  type MetricChartPoint,
} from '../utils/metric-chart';
import './MetricHistoryChart.css';

// Geometria em px reais: o SVG é desenhado na largura medida do contêiner, então texto e traço não se deformam
const PAD_LEFT_MIN = 40;
const PAD_RIGHT = 12;
const PLOT_TOP = 8;
const PLOT_HEIGHT = 140;
const MARK_Y = PLOT_TOP + PLOT_HEIGHT + 10; // faixa das falhas, abaixo do zero para não parecer um valor
const LABEL_Y = MARK_Y + 20;
const HEIGHT = LABEL_Y + 4;

/** Erro e sem métricas têm cores próximas (laranja e vermelho): a forma também diferencia (× e anel). */
function FailureMark({ status, x, y }: { status: MetricChartPoint['status']; x: number; y: number }) {
  if (status === 'erro') {
    return <path className="metric-chart__mark metric-chart__mark--erro" d={`M${x - 4} ${y - 4}l8 8m0 -8l-8 8`} />;
  }
  return <circle className="metric-chart__mark metric-chart__mark--sem-metricas" cx={x} cy={y} r={3.5} />;
}

function readout(point: MetricChartPoint, metric: ChartMetric) {
  if (point.value !== null) return `${METRICS[metric].label} ${formatMetricValue(metric, point.value)}`;
  if (point.status === 'erro') return 'Erro na coleta';
  if (point.status === 'sem_metricas') return 'Sem métricas';
  return `Sem ${METRICS[metric].name} nesta coleta`;
}

interface Props {
  /** Coletas que a janela já buscou, da mais recente para a mais antiga, como a API devolve. */
  collections: ServiceCollection[];
}

/** Evolução de uma métrica no histórico do serviço (RF09, RF10). A tabela abaixo continua sendo a fonte acessível. */
export default function MetricHistoryChart({ collections }: Props) {
  const [metric, setMetric] = useState<ChartMetric>('cpu');
  const data = buildMetricChart(collections, metric);
  const definition = METRICS[metric];

  return (
    <div className="flex flex-col gap-2">
      <div className="metric-chart__picker" role="group" aria-label="Métrica do gráfico">
        {CHART_METRICS.map((option) => (
          <button
            key={option}
            type="button"
            className="metric-chart__btn"
            aria-pressed={option === metric}
            onClick={() => setMetric(option)}
          >
            {METRICS[option].label}
          </button>
        ))}
      </div>

      {data.plotted.length >= 2 ? (
        <MetricChartFigure data={data} metric={metric} />
      ) : (
        <p className="m-0 rounded-xl border border-border px-4 py-3 text-sm text-muted">
          O gráfico de {definition.name} aparece quando houver pelo menos 2 coletas com {definition.name} no histórico;
          agora há {data.plotted.length}.
        </p>
      )}
    </div>
  );
}

interface FigureProps {
  data: MetricChartData;
  metric: ChartMetric;
}

function MetricChartFigure({ data, metric }: FigureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { points, segments, plotted, errors, noMetrics, axis } = data;
  const definition = METRICS[metric];

  // Mede a largura antes da pintura; o gráfico já nasce com pelo menos 2 coletas, e o observer acompanha o resto
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const padLeft = Math.max(PAD_LEFT_MIN, ...axis.labels.map((label) => Math.round(label.length * CHAR_WIDTH.sans11) + 12));
  const first = points[0];
  const last = points[points.length - 1];
  const plotWidth = Math.max(width - padLeft - PAD_RIGHT, 1);
  const span = last.time - first.time;
  const x = (time: number) => padLeft + (span === 0 ? plotWidth / 2 : ((time - first.time) / span) * plotWidth);
  const y = (value: number) => PLOT_TOP + (1 - Math.min(Math.max(value, 0), axis.ceiling) / axis.ceiling) * PLOT_HEIGHT;

  const values = plotted.map((point) => point.value ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = plotted[plotted.length - 1];
  const interrupted = errors + noMetrics;
  const summary =
    `${definition.label} entre ${formatMetricValue(metric, min)} e ${formatMetricValue(metric, max)} em ${plotted.length} coletas, ` +
    `de ${formatDayTime(first.collectedAt)} a ${formatDayTime(last.collectedAt)}` +
    (interrupted > 0 ? `; linha interrompida em ${interrupted} coletas sem ${definition.name}.` : '.');

  const activeIndex = points.findIndex((point) => point.id === activeId);
  const active = activeIndex >= 0 ? points[activeIndex] : null;

  // O crosshair acha a coleta mais próxima no eixo X: ninguém precisa acertar a linha de 2 px
  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const pointerX = event.clientX - event.currentTarget.getBoundingClientRect().left;
    let nearest = points[0];
    for (const point of points) {
      if (Math.abs(x(point.time) - pointerX) < Math.abs(x(nearest.time) - pointerX)) nearest = point;
    }
    setActiveId(nearest.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = activeIndex >= 0 ? activeIndex : points.length - 1;
    const next: Record<string, number> = {
      ArrowLeft: Math.max(current - 1, 0),
      ArrowRight: Math.min(current + 1, points.length - 1),
      Home: 0,
      End: points.length - 1,
    };
    if (!(event.key in next)) return; // Esc segue para o <dialog>, que fecha a janela
    event.preventDefault();
    setActiveId(points[next[event.key]].id);
  }

  // Centro do tooltip (até 240 px de largura) sem sair do gráfico nas bordas
  const tooltipLeft = active ? Math.min(Math.max(x(active.time), 120), Math.max(width - 120, 120)) : 0;

  return (
    <figure className="m-0 flex flex-col gap-2 rounded-xl border border-border px-4 py-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span className="font-display font-semibold">
          {definition.label} ({definition.unit})
        </span>
        <span className="text-muted">
          {latest.id === last.id ? 'última ' : `última com ${definition.name} `}
          <strong className="font-data font-medium text-text">{formatMetricValue(metric, latest.value ?? 0)}</strong>
          {' · faixa '}
          <span className="font-data">
            {formatMetricValue(metric, min)}–{formatMetricValue(metric, max)}
          </span>
        </span>
      </figcaption>

      <div
        ref={containerRef}
        className="metric-chart"
        tabIndex={0}
        role="group"
        aria-label={`Gráfico da métrica ${definition.name}. Use as setas para percorrer as coletas.`}
        onKeyDown={handleKeyDown}
        onFocus={() => setActiveId((id) => id ?? last.id)}
        onBlur={() => setActiveId(null)}
      >
        <svg
          role="img"
          aria-label={summary}
          width={width}
          height={HEIGHT}
          onPointerDown={handlePointerMove}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActiveId(null)}
        >
          {axis.ticks.map((tick, index) => (
            <g key={tick}>
              <line className="metric-chart__grid" x1={padLeft} x2={padLeft + plotWidth} y1={y(tick)} y2={y(tick)} />
              <text className="metric-chart__axis" x={padLeft - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                {axis.labels[index]}
              </text>
            </g>
          ))}

          {segments.map((segment) =>
            segment.length === 1 ? (
              <circle key={segment[0].id} className="metric-chart__dot" cx={x(segment[0].time)} cy={y(segment[0].value ?? 0)} r={4} />
            ) : (
              <path
                key={segment[0].id}
                className="metric-chart__line"
                d={segment.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.time)} ${y(point.value ?? 0)}`).join('')}
              />
            ),
          )}

          {points
            .filter((point) => point.status !== 'ok')
            .map((point) => (
              <FailureMark key={point.id} status={point.status} x={x(point.time)} y={MARK_Y} />
            ))}

          {active && (
            <g>
              <line className="metric-chart__crosshair" x1={x(active.time)} x2={x(active.time)} y1={PLOT_TOP} y2={MARK_Y} />
              {active.value !== null && <circle className="metric-chart__dot" cx={x(active.time)} cy={y(active.value)} r={4} />}
            </g>
          )}

          <text className="metric-chart__axis" x={padLeft} y={LABEL_Y} textAnchor="start">
            {formatDayTime(first.collectedAt)}
          </text>
          <text className="metric-chart__axis" x={padLeft + plotWidth} y={LABEL_Y} textAnchor="end">
            {formatDayTime(last.collectedAt)}
          </text>
        </svg>

        <div className="metric-chart__tooltip" aria-live="polite" hidden={!active} style={{ left: tooltipLeft }}>
          {active && (
            <>
              <strong className="flex items-center gap-2 font-data font-medium text-[var(--tooltip-text)]">
                {active.value !== null && <span className="metric-chart__key" aria-hidden="true" />}
                {readout(active, metric)}
              </strong>
              <span className="font-data">{formatDayTime(active.collectedAt)}</span>
              {active.errorMessage && <span>{active.errorMessage}</span>}
            </>
          )}
        </div>
      </div>

      {interrupted > 0 && (
        <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span>A linha é interrompida nas coletas sem {definition.name}:</span>
          {errors > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <svg width="10" height="10" aria-hidden="true">
                <FailureMark status="erro" x={5} y={5} />
              </svg>
              {errors === 1 ? '1 com erro' : `${errors} com erro`}
            </span>
          )}
          {noMetrics > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <svg width="10" height="10" aria-hidden="true">
                <FailureMark status="sem_metricas" x={5} y={5} />
              </svg>
              {noMetrics === 1 ? '1 sem métricas' : `${noMetrics} sem métricas`}
            </span>
          )}
        </p>
      )}
    </figure>
  );
}
