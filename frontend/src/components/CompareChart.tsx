import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { ComparedService } from '../services/compare.types';
import { formatNumber } from '../utils/format';
import './CompareChart.css';

// Geometria em px reais, como no CpuHistoryChart: o SVG é desenhado na largura medida do contêiner
const ROW_HEIGHT = 40;
const TEXT_Y = 13; // linha de base do nome e do valor, acima da barra
const BAR_Y = 20;
const BAR_HEIGHT = 12;
const MIN_BAR = 2; // valor positivo muito menor que o maior nunca parece zero
// Largura média de um caractere a 12 px (IBM Plex Mono e Sans): corta o nome longo antes de encostar no valor
const MONO_CHAR = 7.2;
const SANS_CHAR = 6.6;

/** Destaque de CO₂e de um serviço, o mesmo da tabela: seta e texto, nunca só a cor. */
export interface CompareHighlight {
  kind: 'lowest' | 'highest';
  arrow: string;
  label: string;
}

interface Metric {
  title: string;
  value: (service: ComparedService) => number | null;
  /** Mesmas casas da tabela, para os valores baterem com ela. */
  format: (value: number) => string;
  /** Só o CO₂e leva o destaque de menor e maior, como na tabela. */
  highlighted: boolean;
}

const METRICS: Metric[] = [
  { title: 'Energia (kWh)', value: (service) => service.energyKwh, format: (value) => `${formatNumber(value, 4)} kWh`, highlighted: false },
  { title: 'CO₂e (g)', value: (service) => service.co2eGrams, format: (value) => `${formatNumber(value, 2)} g`, highlighted: true },
];

const HIGHLIGHT_ORDER: CompareHighlight['kind'][] = ['lowest', 'highest'];

function truncate(name: string, maxChars: number): string {
  return name.length <= maxChars ? name : `${name.slice(0, Math.max(maxChars - 1, 1))}…`;
}

interface MetricBarsProps {
  metric: Metric;
  services: ComparedService[];
  highlightOf: (id: string) => CompareHighlight | null;
}

function MetricBars({ metric, services, highlightOf }: MetricBarsProps) {
  const titleId = useId();
  const descId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);

  // Mede a largura antes da pintura e acompanha a janela: com 375 px o gráfico encolhe, sem rolagem lateral
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Sem coletas ou sem cálculo: só o texto, sem barra (um zero ali seria inventado)
  const rows = services.map((service) => {
    const value = service.collections === 0 ? null : metric.value(service);
    const text = service.collections === 0 ? 'sem coletas' : value === null ? 'sem cálculo' : metric.format(value);
    return { service, value, text, highlight: metric.highlighted ? highlightOf(service.id) : null };
  });
  const max = Math.max(0, ...rows.map((row) => row.value ?? 0));
  const description = rows
    .map((row) => `${row.service.name}: ${row.text}${row.highlight ? ` (${row.highlight.label})` : ''}`)
    .join('; ');

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="m-0 font-display text-sm font-semibold">{metric.title}</h3>
      <div ref={containerRef} className="compare-chart">
        <svg role="img" aria-labelledby={titleId} aria-describedby={descId} width={width} height={rows.length * ROW_HEIGHT}>
          <title id={titleId}>{`${metric.title} por serviço`}</title>
          <desc id={descId}>{`${description}.`}</desc>
          {rows.map(({ service, value, text, highlight }, index) => {
            const top = index * ROW_HEIGHT;
            const flag = highlight ? `${highlight.arrow} ` : '';
            const nameRoom = width - text.length * MONO_CHAR - 12 - flag.length * SANS_CHAR;
            const barWidth = value === null || max === 0 ? 0 : Math.max((value / max) * width, value > 0 ? MIN_BAR : 0);
            return (
              <g key={service.id}>
                <text className="compare-chart__name" x={0} y={top + TEXT_Y}>
                  {highlight && <tspan className={`compare-chart__flag--${highlight.kind}`}>{flag}</tspan>}
                  {truncate(service.name, Math.floor(nameRoom / SANS_CHAR))}
                </text>
                <text
                  className={`compare-chart__value${value === null ? ' compare-chart__value--missing' : ''}`}
                  x={width}
                  y={top + TEXT_Y}
                  textAnchor="end"
                >
                  {text}
                </text>
                {value !== null && (
                  <>
                    <rect className="compare-chart__track" x={0} y={top + BAR_Y} width={width} height={BAR_HEIGHT} rx={3} />
                    <rect
                      className={`compare-chart__bar${highlight ? ` compare-chart__bar--${highlight.kind}` : ''}`}
                      x={0}
                      y={top + BAR_Y}
                      width={barWidth}
                      height={BAR_HEIGHT}
                      rx={3}
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

interface Props {
  /** Serviços na ordem das colunas da tabela, com os valores de GET /api/services/compare. */
  services: ComparedService[];
  /** Destaque de CO₂e do serviço, o mesmo da tabela, ou null. */
  highlightOf: (id: string) => CompareHighlight | null;
}

/**
 * Energia e CO₂e por serviço em barras (RF15, #218), cada grandeza na sua escala, na mesma ordem da tabela. Barras em
 * SVG, sem biblioteca; a tabela continua sendo a fonte completa dos dados.
 */
export default function CompareChart({ services, highlightOf }: Props) {
  const found = new Map(
    services.flatMap((service) => {
      const highlight = highlightOf(service.id);
      return highlight ? [[highlight.kind, highlight] as const] : [];
    }),
  );
  const legend = HIGHLIGHT_ORDER.flatMap((kind) => found.get(kind) ?? []);

  return (
    <figure className="m-0 flex flex-col gap-3 border-t border-border px-5 py-4">
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        {METRICS.map((metric) => (
          <MetricBars key={metric.title} metric={metric} services={services} highlightOf={highlightOf} />
        ))}
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>Cada gráfico tem a sua escala: a barra mais longa é o maior valor daquela grandeza no período.</span>
        {legend.map((highlight) => (
          <span key={highlight.kind} className="inline-flex items-center gap-1.5">
            <span className={`compare-chart__key compare-chart__key--${highlight.kind}`} aria-hidden="true" />
            {highlight.arrow} {highlight.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
