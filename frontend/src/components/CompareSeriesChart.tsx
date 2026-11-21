import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { CompareHighlight } from './CompareChart';
import type { CompareBucket, CompareSeries } from '../utils/compare-series';
import { BUCKET_LABEL, BUCKET_MS, formatPointTime, formatShort, formatTimeTick, niceTicks, timeTicks } from '../utils/emissions';
import { CHAR_WIDTH, freeBaseline, labelBox } from '../utils/chart-labels';
import type { LabelBox } from '../utils/chart-labels';
import { formatInScale, scaleFor } from '../utils/units';
import './CompareSeriesChart.css';

const MARGIN = { top: 16, right: 16, bottom: 50, left: 64 };
const SHORT_HEIGHT = 300;
const LONG_HEIGHT = 360;
/** Distância (em intervalos) a partir da qual a linha é interrompida, e não ligada ao ponto anterior. */
const BREAK_FACTOR = 1.5;
const LABEL_GAP = 6;

/**
 * Cor por serviço nesta tela (#406), só para separar as linhas: dez tons claros, todos acima de 6:1 sobre `--surface`.
 * A cor identifica a série na legenda e no tooltip; nenhuma informação fica só na cor.
 */
const SERIES_COLORS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
  'var(--series-6)',
  'var(--series-7)',
  'var(--series-8)',
  'var(--series-9)',
  'var(--series-10)',
];

const colorOf = (index: number) => SERIES_COLORS[index % SERIES_COLORS.length];

/** Índice do instante mais próximo de `t` (tempos em ordem crescente). */
function nearestIndex(times: number[], t: number): number {
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && t - times[lo - 1] < times[lo] - t) return lo - 1;
  return lo;
}

function truncate(name: string, maxChars: number): string {
  return name.length <= maxChars ? name : `${name.slice(0, Math.max(maxChars - 1, 1))}…`;
}

interface Props {
  /** Séries alinhadas de `alignCompareSeries`, na ordem dos serviços da matriz. */
  series: CompareSeries;
  bucket: CompareBucket;
  /** Início e fim do eixo do tempo (ms): o período comparado, o mesmo do cabeçalho da página. */
  fromMs: number;
  toMs: number;
  /** Destaque de CO₂e do serviço (menor e maior), o mesmo da matriz e das barras. */
  highlightOf: (id: string) => CompareHighlight | null;
}

/**
 * CO₂e de cada serviço ao longo do período, uma linha por serviço no mesmo eixo (RF15, #406): a comparação principal
 * é a do total, que fica na matriz, e este gráfico mostra **quando** cada serviço emitiu — dois totais iguais podem vir
 * de uma linha constante e de um pico. SVG próprio, sem biblioteca; os dados vêm de `GET /api/collections/series`.
 *
 * A linha é interrompida onde o serviço não tem cálculo no intervalo: um intervalo sem cálculo não vale zero. Cada
 * linha leva o nome escrito na ponta, além da cor na legenda e do tooltip com todos os serviços no mesmo instante.
 */
export default function CompareSeriesChart({ series, bucket, fromMs, toMs, highlightOf }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipW, setTooltipW] = useState(0);
  const ids = `compare-series-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;

  // Mede a largura antes da pintura e acompanha a janela: com 375 px o gráfico encolhe, sem rolagem lateral (RNF01)
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const height = width < 600 ? SHORT_HEIGHT : LONG_HEIGHT;
  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const span = Math.max(1, toMs - fromMs);
  const stepMs = BUCKET_MS[bucket];
  const top = MARGIN.top;
  const bottom = MARGIN.top + plotH;

  // O valor do intervalo é a soma dele: o ponto fica no meio, como no gráfico de Emissões
  const at = (t: number) => MARGIN.left + ((t + stepMs / 2 - fromMs) / span) * plotW;

  // Uma unidade só no eixo: as linhas são a mesma grandeza (CO₂e por intervalo), então a escala é a do maior valor
  const scale = useMemo(() => scaleFor('co2e', series.rows.flatMap((row) => row.values)), [series]);
  const yTicks = useMemo(() => niceTicks(series.max), [series.max]);
  const yMax = yTicks[yTicks.length - 1] || 1;
  const y = (value: number) => bottom - (value / yMax) * plotH;

  const { ticks: xTicks, stepMs: tickStepMs } = timeTicks(fromMs, toMs, Math.max(2, Math.floor(plotW / 90)));

  const { paths, singles, labels } = useMemo(() => {
    const breakMs = stepMs * BREAK_FACTOR;
    const fmt = (value: number) => value.toFixed(1);
    const drawn: LabelBox[] = [];
    const pathList: string[] = [];
    const singleList: Array<{ at: number; value: number; color: string }> = [];
    const labelList: Array<{ x: number; y: number; text: string; anchor: 'start' | 'end'; color: string }> = [];

    series.rows.forEach((row, index) => {
      const color = colorOf(index);
      let path = '';
      let previous: number | null = null;
      let segmentStart: number | null = null;
      let segmentLength = 0;
      let last: number | null = null;

      // Um "M x,y" sozinho não desenha nada: o intervalo isolado vira um ponto
      const closeSegment = () => {
        if (segmentStart !== null && segmentLength === 1) {
          const value = row.values[segmentStart];
          if (value !== null) singleList.push({ at: at(series.times[segmentStart]), value, color });
        }
        segmentStart = null;
        segmentLength = 0;
      };

      row.values.forEach((value, position) => {
        if (value === null) {
          closeSegment();
          previous = null;
          return;
        }
        const linked = previous !== null && series.times[position] - series.times[previous] <= breakMs;
        if (!linked) closeSegment();
        path += `${linked ? 'L' : 'M'}${fmt(at(series.times[position]))},${fmt(y(value))}`;
        if (!linked) segmentStart = position;
        segmentLength += 1;
        previous = position;
        last = position;
      });
      closeSegment();
      pathList.push(path);

      const value = last === null ? null : row.values[last];
      if (last === null || value === null) return;
      const px = at(series.times[last]);
      const py = y(value);
      // Nome na ponta da linha, sempre dentro do plot: à direita do último ponto ou, sem espaço, à esquerda dele
      const room = MARGIN.left + plotW - (px + LABEL_GAP);
      const right = room >= 60;
      const anchor: 'start' | 'end' = right ? 'start' : 'end';
      const anchorX = right ? px + LABEL_GAP : px - LABEL_GAP;
      const text = truncate(row.name, Math.max(Math.floor(Math.min(room, 120) / CHAR_WIDTH.sans11), 3));
      const baselines = [py - 4, py - 18, py + 14, py - 32, py + 28, py - 46, py + 42, py - 60, py + 56];
      const baseline = freeBaseline(
        baselines.filter((candidate) => candidate >= top + 11 && candidate <= bottom - 2),
        (candidate) => labelBox(text, anchorX, candidate, anchor, CHAR_WIDTH.sans11, 11),
        drawn,
      );
      if (baseline === null) return;
      drawn.push(labelBox(text, anchorX, baseline, anchor, CHAR_WIDTH.sans11, 11));
      labelList.push({ x: anchorX, y: baseline, text, anchor, color });
    });

    return { paths: pathList, singles: singleList, labels: labelList };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- at e y mudam com width e yMax, que estão na lista
  }, [series, stepMs, plotW, plotH, fromMs, toMs, yMax]);

  const hoverT = hover !== null ? Math.min(series.times[hover] + stepMs / 2, toMs) : 0;
  const hoverX = MARGIN.left + ((hoverT - fromMs) / span) * plotW;

  useLayoutEffect(() => {
    setTooltipW(tooltipRef.current?.offsetWidth ?? 0);
  }, [hover, series, bucket]);
  const tooltipLeft = Math.min(Math.max(hoverX, tooltipW / 2), Math.max(width - tooltipW / 2, tooltipW / 2));

  // No instante do cursor, do maior para o menor: a ordem em que os serviços aparecem na leitura
  const hovered = useMemo(() => {
    if (hover === null) return [];
    return series.rows
      .map((row, index) => ({ row, color: colorOf(index), value: row.values[hover], highlight: highlightOf(row.id) }))
      .filter((item) => item.value !== null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- highlightOf deriva da comparação, que muda com `series`
  }, [hover, series]);
  const missingHere = hover === null ? 0 : series.rows.length - hovered.length;

  function handlePointer(event: PointerEvent<SVGRectElement>) {
    if (series.times.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHover(nearestIndex(series.times, fromMs + ((event.clientX - rect.left) / rect.width) * span));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (series.times.length === 0) return;
    if (event.key === 'Escape') {
      setHover(null);
      return;
    }
    const current = hover ?? series.times.length - 1;
    const next: Record<string, number> = {
      ArrowLeft: Math.max(current - 1, 0),
      ArrowRight: Math.min(current + 1, series.times.length - 1),
      Home: 0,
      End: series.times.length - 1,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    setHover(next[event.key]);
  }

  const total = (value: number | null) => (value === null ? 'sem cálculo' : `${formatInScale(value, scale)} ${scale.unit}`);
  const nameOf = (id: string) => series.rows.find((row) => row.id === id)?.name ?? '';
  const reading = `CO₂e de cada serviço a cada ${BUCKET_LABEL[bucket]}, de ${formatPointTime(fromMs)} a ${formatPointTime(toMs)}. ${series.rows
    .map((row) => `${row.name}: ${total(row.total)} no período.`)
    .join(' ')}`;

  return (
    <div
      ref={containerRef}
      className="compare-series"
      tabIndex={0}
      role="group"
      aria-label="CO₂e por serviço ao longo do período. Use as setas para percorrer os instantes; Esc fecha o detalhe."
      onKeyDown={handleKeyDown}
      onFocus={(event) => {
        if (event.target === event.currentTarget && event.currentTarget.matches(':focus-visible')) {
          setHover((current) => current ?? (series.times.length > 0 ? series.times.length - 1 : null));
        }
      }}
      onBlur={() => setHover(null)}
    >
      {width > 0 && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`CO₂e de cada serviço a cada ${BUCKET_LABEL[bucket]}, entre ${formatPointTime(fromMs)} e ${formatPointTime(toMs)}`}
          aria-describedby={`${ids}-reading`}
        >
          <defs>
            <clipPath id={`${ids}-plot`}>
              <rect x={MARGIN.left} y={top} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Grade e eixo Y */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line className="compare-series__grid" x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y(tick)} y2={y(tick)} />
              <text className="compare-series__tick" x={MARGIN.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                {formatShort(tick * scale.factor)}
              </text>
            </g>
          ))}
          <text className="compare-series__axis-title" transform={`translate(16 ${top + plotH / 2}) rotate(-90)`} textAnchor="middle">
            {`${scale.unit} CO₂e a cada ${BUCKET_LABEL[bucket]}`}
          </text>

          {/* Eixo X */}
          {xTicks.map((tick) => (
            <g key={tick}>
              <line className="compare-series__grid compare-series__grid--x" x1={MARGIN.left + ((tick - fromMs) / span) * plotW} x2={MARGIN.left + ((tick - fromMs) / span) * plotW} y1={top} y2={bottom} />
              <text className="compare-series__tick" x={MARGIN.left + ((tick - fromMs) / span) * plotW} y={height - 14} textAnchor="middle">
                {formatTimeTick(tick, tickStepMs)}
              </text>
            </g>
          ))}
          <line className="compare-series__axis" x1={MARGIN.left} x2={MARGIN.left + plotW} y1={bottom} y2={bottom} />

          {/* Uma linha por serviço, interrompida onde não há cálculo */}
          <g clipPath={`url(#${ids}-plot)`}>
            {series.rows.map((row, index) => (
              <path key={row.id} className="compare-series__line" d={paths[index]} style={{ stroke: colorOf(index) }} />
            ))}
            {singles.map((dot, index) => (
              <circle key={`${dot.at}-${dot.value}-${index}`} className="compare-series__single" cx={dot.at} cy={y(dot.value)} r={2.5} style={{ fill: dot.color }} />
            ))}
            {hover !== null && (
              <g pointerEvents="none">
                <line className="compare-series__cursor" x1={hoverX} x2={hoverX} y1={top} y2={bottom} />
                {series.rows.map((row, index) => {
                  const value = row.values[hover];
                  return value === null ? null : (
                    <circle key={row.id} className="compare-series__dot" cx={hoverX} cy={y(value)} r={3.5} style={{ stroke: colorOf(index) }} />
                  );
                })}
              </g>
            )}
          </g>

          {/* Nome na ponta de cada linha: fora do clip para não ser cortado na borda do plot */}
          {labels.map((label) => (
            <text
              key={`${label.text}-${label.x}-${label.y}`}
              className="compare-series__name"
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              style={{ fill: label.color }}
              pointerEvents="none"
            >
              {label.text}
            </text>
          ))}

          <rect
            x={MARGIN.left}
            y={top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            // No toque, o dedo saindo da tela não fecha o detalhe: ele fica até o próximo toque
            onPointerLeave={(event) => event.pointerType !== 'touch' && setHover(null)}
          />
        </svg>
      )}

      <div
        ref={tooltipRef}
        className="compare-series__tooltip"
        aria-live="polite"
        hidden={hover === null}
        style={{ left: tooltipLeft, top }}
      >
        {hover !== null && (
          <>
            <strong>{formatPointTime(hoverT)}</strong>
            {hovered.map((item) => (
              <span key={item.row.id} className="compare-series__tooltip-row">
                <span className="compare-series__swatch" style={{ background: item.color }} aria-hidden="true" />
                {item.row.name}
                {item.highlight && <span aria-hidden="true">{item.highlight.arrow}</span>}: {total(item.value)}
              </span>
            ))}
            {missingHere > 0 && (
              <span className="compare-series__tooltip-gap">
                {missingHere === 1 ? '1 serviço sem cálculo no intervalo' : `${missingHere} serviços sem cálculo no intervalo`}
              </span>
            )}
          </>
        )}
      </div>

      <p id={`${ids}-reading`} className="sr-only">
        {reading}
      </p>

      {/* Legenda: a cor identifica a linha, e o total do período fica escrito para bater com a matriz */}
      <ul className="compare-series__legend">
        {series.rows.map((row, index) => {
          const highlight = highlightOf(row.id);
          return (
            <li key={row.id} title={`${nameOf(row.id)}: ${total(row.total)} no período`}>
              <span className="compare-series__swatch" style={{ background: colorOf(index) }} aria-hidden="true" />
              {highlight && (
                <span className={`compare-series__flag compare-series__flag--${highlight.kind}`} aria-label={highlight.label}>
                  <span aria-hidden="true">{highlight.arrow}</span>
                </span>
              )}
              {row.name}
              <span className="compare-series__legend-total">{total(row.total)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
