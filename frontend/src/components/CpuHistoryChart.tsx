import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { ServiceCollection } from '../services/collections.types';
import { buildCpuChart, type CpuChartPoint } from '../utils/cpu-chart';
import { formatDayTime, formatNumber } from '../utils/format';
import './CpuHistoryChart.css';

// Geometria em px reais: o SVG é desenhado na largura medida do contêiner, então texto e traço não se deformam
const PAD_LEFT = 40;
const PAD_RIGHT = 12;
const PLOT_TOP = 8;
const PLOT_HEIGHT = 140;
const MARK_Y = PLOT_TOP + PLOT_HEIGHT + 10; // faixa das falhas, abaixo do 0% para não parecer um valor
const LABEL_Y = MARK_Y + 20;
const HEIGHT = LABEL_Y + 4;
const Y_TICKS = [0, 50, 100];

const percent = (value: number) => `${formatNumber(value, 1)}%`;

/** Erro e sem métricas têm cores próximas (laranja e vermelho): a forma também diferencia (× e anel). */
function FailureMark({ status, x, y }: { status: CpuChartPoint['status']; x: number; y: number }) {
  if (status === 'erro') {
    return <path className="cpu-chart__mark cpu-chart__mark--erro" d={`M${x - 4} ${y - 4}l8 8m0 -8l-8 8`} />;
  }
  return <circle className="cpu-chart__mark cpu-chart__mark--sem-metricas" cx={x} cy={y} r={3.5} />;
}

function readout(point: CpuChartPoint) {
  if (point.cpuPercent !== null) return `CPU ${percent(point.cpuPercent)}`;
  if (point.status === 'erro') return 'Erro na coleta';
  if (point.status === 'sem_metricas') return 'Sem métricas';
  return 'Sem CPU nesta coleta';
}

interface Props {
  /** Coletas que a janela já buscou, da mais recente para a mais antiga, como a API devolve. */
  collections: ServiceCollection[];
}

/** Evolução da CPU (%) no histórico do serviço (RF10). A tabela abaixo continua sendo a fonte acessível dos dados. */
export default function CpuHistoryChart({ collections }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { points, segments, plotted, errors, noMetrics } = buildCpuChart(collections);
  const canDraw = plotted.length >= 2;

  // Mede a largura antes da pintura; religa quando o gráfico aparece depois do aviso de "menos de 2 coletas"
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [canDraw]);

  if (!canDraw) {
    return (
      <p className="m-0 rounded-xl border border-border px-4 py-3 text-sm text-muted">
        O gráfico da CPU aparece quando houver pelo menos 2 coletas com CPU no histórico; agora há {plotted.length}.
      </p>
    );
  }

  const first = points[0];
  const last = points[points.length - 1];
  const plotWidth = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const span = last.time - first.time;
  const x = (time: number) => PAD_LEFT + (span === 0 ? plotWidth / 2 : ((time - first.time) / span) * plotWidth);
  const y = (cpu: number) => PLOT_TOP + (1 - Math.min(Math.max(cpu, 0), 100) / 100) * PLOT_HEIGHT;

  const cpuValues = plotted.map((point) => point.cpuPercent ?? 0);
  const min = Math.min(...cpuValues);
  const max = Math.max(...cpuValues);
  const latest = plotted[plotted.length - 1];
  const interrupted = errors + noMetrics;
  const summary =
    `CPU entre ${percent(min)} e ${percent(max)} em ${plotted.length} coletas, ` +
    `de ${formatDayTime(first.collectedAt)} a ${formatDayTime(last.collectedAt)}` +
    (interrupted > 0 ? `; linha interrompida em ${interrupted} coletas sem CPU.` : '.');

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
        <span className="font-display font-semibold">CPU (%)</span>
        <span className="text-muted">
          {latest.id === last.id ? 'última ' : 'última com CPU '}
          <strong className="font-mono font-medium text-text">{percent(latest.cpuPercent ?? 0)}</strong>
          {' · faixa '}
          <span className="font-mono">
            {percent(min)}–{percent(max)}
          </span>
        </span>
      </figcaption>

      <div
        ref={containerRef}
        className="cpu-chart"
        tabIndex={0}
        role="group"
        aria-label="Gráfico da CPU. Use as setas para percorrer as coletas."
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
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line className="cpu-chart__grid" x1={PAD_LEFT} x2={PAD_LEFT + plotWidth} y1={y(tick)} y2={y(tick)} />
              <text className="cpu-chart__axis" x={PAD_LEFT - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                {tick}%
              </text>
            </g>
          ))}

          {segments.map((segment) =>
            segment.length === 1 ? (
              <circle key={segment[0].id} className="cpu-chart__dot" cx={x(segment[0].time)} cy={y(segment[0].cpuPercent ?? 0)} r={4} />
            ) : (
              <path
                key={segment[0].id}
                className="cpu-chart__line"
                d={segment.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.time)} ${y(point.cpuPercent ?? 0)}`).join('')}
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
              <line className="cpu-chart__crosshair" x1={x(active.time)} x2={x(active.time)} y1={PLOT_TOP} y2={MARK_Y} />
              {active.cpuPercent !== null && <circle className="cpu-chart__dot" cx={x(active.time)} cy={y(active.cpuPercent)} r={4} />}
            </g>
          )}

          <text className="cpu-chart__axis" x={PAD_LEFT} y={LABEL_Y} textAnchor="start">
            {formatDayTime(first.collectedAt)}
          </text>
          <text className="cpu-chart__axis" x={PAD_LEFT + plotWidth} y={LABEL_Y} textAnchor="end">
            {formatDayTime(last.collectedAt)}
          </text>
        </svg>

        <div className="cpu-chart__tooltip" aria-live="polite" hidden={!active} style={{ left: tooltipLeft }}>
          {active && (
            <>
              <strong className="flex items-center gap-2 font-mono font-medium text-text">
                {active.cpuPercent !== null && <span className="cpu-chart__key" aria-hidden="true" />}
                {readout(active)}
              </strong>
              <span className="font-mono text-muted">{formatDayTime(active.collectedAt)}</span>
              {active.errorMessage && <span className="text-muted">{active.errorMessage}</span>}
            </>
          )}
        </div>
      </div>

      {interrupted > 0 && (
        <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span>A linha é interrompida nas coletas sem CPU:</span>
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
