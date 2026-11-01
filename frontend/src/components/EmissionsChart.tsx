import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, RefObject } from 'react';
import type { EmissionPoint, EmissionsBucket } from '../services/emissions.types';
import {
  BUCKET_LABEL,
  BUCKET_MS,
  cumulative,
  formatGrams,
  formatKwh,
  formatPeakTime,
  formatPointTime,
  formatShort,
  formatTimeTick,
  niceTicks,
  timeTicks,
  typicalIntervalMs,
} from '../utils/emissions';
import './EmissionsChart.css';

/** `intervalo`: a emissão de cada ponto (coleta ou intervalo); `acumulado`: a soma ao longo do período. */
export type EmissionsChartMode = 'intervalo' | 'acumulado';

interface Props {
  points: EmissionPoint[];
  bucket: EmissionsBucket;
  mode: EmissionsChartMode;
  /** Início e fim do eixo do tempo (ms), iguais ao período buscado. */
  fromMs: number;
  toMs: number;
  /** A última atualização falhou: o gráfico fica apagado, como o resumo. */
  stale?: boolean;
}

const MARGIN = { top: 16, right: 20, bottom: 50, left: 64 };
const STRIP_H = 6;
/** A faixa mín./máx. pode passar da linha até este múltiplo; acima disso é cortada no topo do gráfico. */
const BAND_HEADROOM = 1.5;

/** Marca da faixa abaixo do gráfico: coletas com falha ou sem cálculo no ponto. */
type GapKind = 'falha' | 'sem_calculo';

const GAP_LABEL: Record<GapKind, string> = {
  falha: 'Falha na coleta ou sem métricas',
  sem_calculo: 'Cálculo indisponível',
};

function gapKind(point: EmissionPoint): GapKind | null {
  if (point.failed > 0) return 'falha';
  if (point.notCalculated > 0) return 'sem_calculo';
  return null;
}

/** Coletas do ponto que entraram na soma. */
function calculatedOf(point: EmissionPoint): number {
  return point.collections - point.failed - point.notCalculated;
}

/** Largura do contêiner, acompanhando o redimensionamento da janela. */
function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** Índice do ponto mais próximo de `t` (tempos em ordem crescente). */
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

/**
 * Gráfico de linha da emissão de CO₂e ao longo do tempo (SVG próprio, sem biblioteca).
 * Agrupado, cada ponto é a soma do intervalo, desenhada no meio dele, com uma faixa clara de onde a soma estaria se
 * todas as coletas fossem a menor ou a maior do intervalo (o pico de uma coleta não some na soma).
 * A linha é interrompida onde não há cálculo ou onde a coleta parou; falhas aparecem na faixa acima do eixo do tempo.
 */
export default function EmissionsChart({ points, bucket, mode, fromMs, toMs, stale = false }: Props) {
  const [containerRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipW, setTooltipW] = useState(0);
  // useId traz caracteres que não servem em url(#…): fica só o que é letra, número ou hífen
  const ids = `emissions-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const height = width < 600 ? 280 : 360;

  const grouped = bucket !== 'coleta';
  const stepMs = grouped ? BUCKET_MS[bucket] : (typicalIntervalMs(points) ?? BUCKET_MS.coleta);
  const times = useMemo(() => points.map((p) => (grouped ? p.t + BUCKET_MS[bucket] / 2 : p.t)), [points, grouped, bucket]);
  const raw = useMemo(() => points.map((p) => p.co2eGrams), [points]);
  const values = useMemo(() => (mode === 'acumulado' ? cumulative(raw) : raw), [raw, mode]);

  // Faixa mín./máx. na escala da soma (só agrupado e por intervalo)
  const band = useMemo(
    () =>
      grouped && mode === 'intervalo'
        ? points.map((p) =>
            p.co2eMinGrams === null || p.co2eMaxGrams === null
              ? null
              : { lo: p.co2eMinGrams * calculatedOf(p), hi: p.co2eMaxGrams * calculatedOf(p) },
          )
        : [],
    [points, grouped, mode],
  );

  // Último intervalo ainda aberto (o período termina em "agora"): soma parcial, fica fora da linha
  const openIndex = grouped && points.length > 0 && points[points.length - 1].t + stepMs > toMs ? points.length - 1 : null;

  const known = raw.filter((v, i): v is number => v !== null && i !== openIndex);
  // Com um ponto só, a média seria o próprio ponto e o rótulo cairia em cima do "maior intervalo"
  const mean = mode === 'intervalo' && known.length > 1 ? known.reduce((a, b) => a + b, 0) / known.length : null;
  const peakIndex =
    mode === 'intervalo' && known.length > 0 ? raw.reduce<number>((best, v, i) => (v !== null && i !== openIndex && v > (raw[best] ?? -1) ? i : best), 0) : null;

  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const span = Math.max(1, toMs - fromMs);
  const x = (t: number) => MARGIN.left + ((t - fromMs) / span) * plotW;

  // A escala segue a linha: uma coleta fora da curva num intervalo de 30 não pode achatar o resto
  const lineMax = values.reduce<number>((max, v) => (v !== null && v > max ? v : max), 0);
  const bandMax = band.reduce<number>((max, b) => (b !== null && b.hi > max ? b.hi : max), 0);
  const maxValue = Math.max(lineMax, lineMax > 0 ? Math.min(bandMax, lineMax * BAND_HEADROOM) : bandMax);
  const yTicks = niceTicks(maxValue);
  const yMax = yTicks[yTicks.length - 1] || 1;
  const y = (value: number) => MARGIN.top + plotH - (value / yMax) * plotH;

  const { ticks: xTicks, stepMs: tickStepMs } = timeTicks(fromMs, toMs, Math.max(2, Math.floor(plotW / 90)));

  const { line, area, bandPath, dots } = useMemo(() => {
    const breakMs = stepMs * (grouped ? 1.5 : 3);
    const baseline = MARGIN.top + plotH;
    // Largura da barra da faixa quando o trecho tem um ponto só (não há vizinho para formar a área)
    const barW = Math.max(4, (x(fromMs + stepMs) - x(fromMs)) * 0.6);
    const fmt = (n: number) => n.toFixed(1);
    let linePath = '';
    let areaPath = '';
    let bandD = '';
    const single: Array<{ cx: number; cy: number }> = [];
    let segment: Array<{ i: number; v: number }> = [];
    const flush = () => {
      if (segment.length === 0) return;
      const pts = segment.map(({ i, v }) => [x(times[i]), y(v)] as const);
      const withBand = segment.flatMap(({ i }) => {
        const b = band[i];
        return b ? [{ px: x(times[i]), b }] : [];
      });
      if (pts.length === 1) {
        // Um "M x,y" sozinho não desenha nada: o ponto vira um círculo e a faixa, uma barra vertical
        single.push({ cx: pts[0][0], cy: pts[0][1] });
        for (const { px, b } of withBand) {
          const l = fmt(px - barW / 2);
          const r = fmt(px + barW / 2);
          bandD += `M${l},${fmt(y(b.hi))}L${r},${fmt(y(b.hi))}L${r},${fmt(y(b.lo))}L${l},${fmt(y(b.lo))}Z`;
        }
      } else {
        linePath += pts.map(([px, py], k) => `${k === 0 ? 'M' : 'L'}${fmt(px)},${fmt(py)}`).join('');
        areaPath += `M${fmt(pts[0][0])},${baseline}${pts.map(([px, py]) => `L${fmt(px)},${fmt(py)}`).join('')}L${fmt(pts[pts.length - 1][0])},${baseline}Z`;
        if (withBand.length > 0) {
          const top = withBand.map(({ px, b }) => `${fmt(px)},${fmt(y(b.hi))}`);
          const bottom = withBand.reverse().map(({ px, b }) => `${fmt(px)},${fmt(y(b.lo))}`);
          bandD += `M${top.join('L')}L${bottom.join('L')}Z`;
        }
      }
      segment = [];
    };
    points.forEach((point, i) => {
      const v = values[i];
      if (v === null || i === openIndex) return flush();
      if (i > 0 && point.t - points[i - 1].t > breakMs) flush();
      segment.push({ i, v });
    });
    flush();
    return { line: linePath, area: areaPath, bandPath: bandD, dots: single };
    // x e y são recriadas a cada renderização, mas dependem só de plotW, plotH, fromMs, toMs e yMax, que estão na lista
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listar x e y refaria os caminhos do gráfico a cada renderização
  }, [points, times, values, band, stepMs, grouped, openIndex, plotW, plotH, fromMs, toMs, yMax]);

  // Intervalo em andamento: o meio dele passa de "agora", então o ponto fica no fim do plot
  const openValue = openIndex !== null ? values[openIndex] : null;
  const open = openIndex !== null && openValue !== null ? { cx: x(Math.min(times[openIndex], toMs)), cy: y(openValue) } : null;
  // No Acumulado o valor do intervalo aberto não é parcial (é o total até agora): a curva vai até ele, tracejada
  const prevValue = openIndex !== null && openIndex > 0 ? values[openIndex - 1] : null;
  const openLink =
    open && mode === 'acumulado' && openIndex !== null && prevValue !== null
      ? { x1: x(times[openIndex - 1]), y1: y(prevValue), x2: open.cx, y2: open.cy }
      : null;

  // Trechos contínuos com o mesmo tipo de falha, para a faixa de status
  const gaps = useMemo(() => {
    const runs: Array<{ kind: GapKind; start: number; end: number }> = [];
    for (const point of points) {
      const kind = gapKind(point);
      if (kind === null) continue;
      const end = point.t + stepMs;
      const last = runs[runs.length - 1];
      if (last && last.kind === kind && last.end >= point.t) last.end = end;
      else runs.push({ kind, start: point.t, end });
    }
    return runs;
  }, [points, stepMs]);

  function handlePointer(event: PointerEvent<SVGRectElement>) {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHover(nearestIndex(times, fromMs + ((event.clientX - rect.left) / rect.width) * span));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (points.length === 0) return;
    if (event.key === 'Escape') {
      setHover(null);
      return;
    }
    const current = hover ?? points.length - 1;
    const next: Record<string, number> = {
      ArrowLeft: Math.max(current - 1, 0),
      ArrowRight: Math.min(current + 1, points.length - 1),
      Home: 0,
      End: points.length - 1,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    setHover(next[event.key]);
  }

  const hovered = hover !== null ? points[hover] : null;
  const hoveredValue = hover !== null ? values[hover] : null;
  // O meio do intervalo em andamento passa de "agora": cursor e tooltip ficam no fim do plot
  const hoverX = hover !== null ? x(Math.min(times[hover], toMs)) : 0;

  // Largura real do tooltip, para ele não vazar do card nas bordas
  useLayoutEffect(() => {
    setTooltipW(tooltipRef.current?.offsetWidth ?? 0);
  }, [hover, mode, bucket]);
  const tooltipLeft = Math.min(Math.max(hoverX, tooltipW / 2), Math.max(width - tooltipW / 2, tooltipW / 2));
  const stripY = MARGIN.top + plotH + 4;
  const presentGaps = new Set(gaps.map((g) => g.kind));
  const unit = grouped ? `a cada ${BUCKET_LABEL[bucket]}` : 'por coleta';
  const peak = peakIndex !== null ? { cx: x(times[peakIndex]), cy: y(raw[peakIndex] as number), point: points[peakIndex] } : null;

  return (
    <div
      className={stale ? 'emissions-chart emissions-chart--stale' : 'emissions-chart'}
      ref={containerRef}
      tabIndex={0}
      role="group"
      aria-label="Gráfico de emissões. Use as setas para percorrer os pontos; Esc fecha o detalhe."
      onKeyDown={handleKeyDown}
      onFocus={(event) => {
        // Só o foco pelo teclado abre o último ponto; no clique, o ponteiro já escolhe o ponto
        if (event.target === event.currentTarget && event.currentTarget.matches(':focus-visible')) {
          setHover((h) => h ?? (points.length > 0 ? points.length - 1 : null));
        }
      }}
      onBlur={() => setHover(null)}
    >
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Emissão de CO₂e ${mode === 'acumulado' ? 'acumulada' : unit} entre ${formatPointTime(fromMs)} e ${formatPointTime(toMs)}`}
        >
          <defs>
            <linearGradient id={`${ids}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="emissions-chart__area-top" />
              <stop offset="100%" className="emissions-chart__area-bottom" />
            </linearGradient>
            <clipPath id={`${ids}-plot`}>
              <rect x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Grade e eixo Y */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line className="emissions-chart__grid" x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y(tick)} y2={y(tick)} />
              <text className="emissions-chart__tick" x={MARGIN.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                {formatShort(tick)}
              </text>
            </g>
          ))}
          <text className="emissions-chart__axis-title" transform={`translate(16 ${MARGIN.top + plotH / 2}) rotate(-90)`} textAnchor="middle">
            {mode === 'acumulado' ? 'g CO₂e acumulado' : `g CO₂e ${unit}`}
          </text>

          {/* Eixo X */}
          {xTicks.map((tick) => (
            <g key={tick}>
              <line className="emissions-chart__grid emissions-chart__grid--x" x1={x(tick)} x2={x(tick)} y1={MARGIN.top} y2={MARGIN.top + plotH} />
              <text className="emissions-chart__tick" x={x(tick)} y={height - 14} textAnchor="middle">
                {formatTimeTick(tick, tickStepMs)}
              </text>
            </g>
          ))}
          <line className="emissions-chart__axis" x1={MARGIN.left} x2={MARGIN.left + plotW} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH} />

          {/* Série */}
          <g clipPath={`url(#${ids}-plot)`}>
            {bandPath && <path d={bandPath} className="emissions-chart__band" />}
            {/* Com a faixa mín./máx., a área preenchida embaixo da linha ficaria pesada demais */}
            {!bandPath && <path d={area} fill={`url(#${ids}-area)`} />}
            <path d={line} className="emissions-chart__line" />
            {dots.map((dot) => (
              <circle key={dot.cx} className="emissions-chart__single" cx={dot.cx} cy={dot.cy} r={3} />
            ))}
            {openLink && <line className="emissions-chart__open-link" {...openLink} />}

            {mean !== null && (
              <g>
                <line className="emissions-chart__mean" x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y(mean)} y2={y(mean)} />
                <text className="emissions-chart__mean-label" x={MARGIN.left + plotW - 4} y={y(mean) - 6} textAnchor="end">
                  {grouped ? 'média por intervalo' : 'média'} {formatGrams(mean)}
                </text>
              </g>
            )}
          </g>

          {open && <circle className="emissions-chart__open" cx={open.cx} cy={open.cy} r={4} pointerEvents="none" />}

          {/* Pico: o único ponto em neon do gráfico, fora do clip para o halo e o rótulo não serem cortados */}
          {peak && (
            <g className="emissions-chart__peak" pointerEvents="none">
              <circle className="emissions-chart__peak-halo" cx={peak.cx} cy={peak.cy} r={10} />
              <circle className="emissions-chart__peak-dot" cx={peak.cx} cy={peak.cy} r={4.5} />
              <text
                className="emissions-chart__peak-label"
                x={peak.cx}
                y={peak.cy - 14}
                textAnchor={peak.cx > MARGIN.left + plotW * 0.85 ? 'end' : peak.cx < MARGIN.left + plotW * 0.15 ? 'start' : 'middle'}
              >
                {grouped ? 'maior intervalo' : 'pico'} {formatGrams(raw[peakIndex as number] as number)} · {formatTimeTick(peak.point.t, 0)}
              </text>
            </g>
          )}

          {/* Faixa de falhas */}
          {gaps.map((gap) => (
            <rect
              key={`${gap.kind}-${gap.start}`}
              className={`emissions-chart__gap emissions-chart__gap--${gap.kind}`}
              x={x(gap.start)}
              y={stripY}
              width={Math.max(2, x(gap.end) - x(gap.start))}
              height={STRIP_H}
            />
          ))}

          {/* Cursor */}
          {hovered && hover !== null && (
            <g pointerEvents="none">
              <line className="emissions-chart__cursor" x1={hoverX} x2={hoverX} y1={MARGIN.top} y2={MARGIN.top + plotH} />
              {hoveredValue !== null && <circle className="emissions-chart__dot" cx={hoverX} cy={y(hoveredValue)} r={4} />}
            </g>
          )}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={plotW}
            height={plotH + STRIP_H + 6}
            fill="transparent"
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            // No toque, o dedo saindo da tela não fecha o detalhe: ele fica até o próximo toque
            onPointerLeave={(event) => event.pointerType !== 'touch' && setHover(null)}
          />
        </svg>
      )}

      <div ref={tooltipRef} className="emissions-chart__tooltip" aria-live="polite" hidden={!hovered} style={{ left: tooltipLeft, top: MARGIN.top }}>
        {hovered && hover !== null && (
          <>
            <strong>
              {formatPeakTime(hovered, bucket)}
              {hover === openIndex && ' · em andamento'}
            </strong>
            {hovered.co2eGrams !== null ? (
              <>
                <span>
                  Emissão{grouped ? ' (soma)' : ''}: {formatGrams(hovered.co2eGrams)} CO₂e
                </span>
                {mode === 'acumulado' && hoveredValue !== null && <span>Acumulado: {formatGrams(hoveredValue)} CO₂e</span>}
                {hovered.energyKwh !== null && <span>Energia: {formatKwh(hovered.energyKwh)}</span>}
                {grouped && hovered.co2eMinGrams !== null && hovered.co2eMaxGrams !== null && (
                  <span>
                    Por coleta: {formatGrams(hovered.co2eMinGrams)} a {formatGrams(hovered.co2eMaxGrams)}
                  </span>
                )}
              </>
            ) : (
              <span className="emissions-chart__tooltip-gap">{hovered.failed > 0 ? GAP_LABEL.falha : GAP_LABEL.sem_calculo}</span>
            )}
            {grouped && (
              <span>
                {hovered.collections.toLocaleString('pt-BR')} coleta(s)
                {hovered.failed > 0 && ` · ${hovered.failed} com falha`}
                {hovered.notCalculated > 0 && ` · ${hovered.notCalculated} sem cálculo`}
              </span>
            )}
          </>
        )}
      </div>

      {(presentGaps.size > 0 || bandPath) && (
        <ul className="emissions-chart__legend" aria-label="Legenda do gráfico">
          {bandPath && (
            <li>
              <span className="emissions-chart__swatch emissions-chart__swatch--band" aria-hidden="true" />
              Faixa: menor e maior coleta do intervalo
            </li>
          )}
          {(Object.keys(GAP_LABEL) as GapKind[])
            .filter((kind) => presentGaps.has(kind))
            .map((kind) => (
              <li key={kind}>
                <span className={`emissions-chart__swatch emissions-chart__gap--${kind}`} aria-hidden="true" />
                {GAP_LABEL[kind]}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
