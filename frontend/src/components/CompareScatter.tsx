import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { ComparedService } from '../services/compare.types';
import { CHAR_WIDTH } from '../utils/chart-labels';
import { nearestPoint, placeLabels, regionRays, scatterDomain, scatterEquation, scatterPoints, spreadLabels } from '../utils/comparison';
import { formatShort } from '../utils/emissions';
import { formatNumber } from '../utils/format';
import { scaleFor } from '../utils/units';
import type { CompareHighlight } from './CompareChart';
import './CompareScatter.css';

// Geometria em px reais, como no CompareChart: o SVG é desenhado na largura medida do contêiner
const HEIGHT = 330;
const TOP = 24;
const BOTTOM = 40;
const RADIUS = 6;

interface Props {
  /** Serviços de GET /api/services/compare, os mesmos da tabela. */
  services: ComparedService[];
  /** Destaque de CO₂e do serviço, o mesmo da tabela e das barras, ou null. */
  highlightOf: (id: string) => CompareHighlight | null;
  /**
   * Serviço sob o ponteiro ou o foco em qualquer bloco da comparação (destaque cruzado, #431): com a página no controle,
   * apontar um serviço na tabela ou no ranking abre a dica dele aqui, e o ponto apontado aqui destaca os outros blocos.
   */
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
}

/**
 * Dispersão "Carga ou região?" (RF15, #399): energia no eixo X, CO₂e no Y, um ponto por serviço e uma reta tracejada
 * por região saindo da origem, com a intensidade do período de inclinação. A matriz acima é a tabela equivalente.
 */
export default function CompareScatter({ services, highlightOf, activeId: sharedId, onActiveChange }: Props) {
  const { points, missing } = useMemo(() => scatterPoints(services), [services]);
  const rays = useMemo(() => regionRays(points), [points]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [localId, setLocalId] = useState<string | null>(null);
  const activeId = sharedId === undefined ? localId : sharedId;
  const setActiveId = onActiveChange ?? setLocalId;

  // Acompanha a largura do card: com 390 px o gráfico encolhe, sem rolagem lateral
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [points.length]);

  // Eixos nas unidades das linhas Energia e CO₂e da matriz
  const energyScale = scaleFor('energy', services.map((service) => service.energyKwh));
  const co2eScale = scaleFor('co2e', services.map((service) => service.co2eGrams));
  const plotH = HEIGHT - TOP - BOTTOM;
  const rayValue = (intensity: number) => `${formatNumber(intensity, 0)} g/kWh`;
  const right = Math.min(128, 14 + CHAR_WIDTH.sans11 * Math.max(0, ...rays.map((ray) => Math.max(ray.region.length, rayValue(ray.intensity).length))));
  const domain = scatterDomain(points, rays, Math.max(2, Math.floor((width - right - 48) / 80)), Math.max(2, Math.floor(plotH / 50)));
  const yText = (tick: number) => formatShort(tick * co2eScale.factor);
  const left = Math.max(32, 10 + CHAR_WIDTH.sans11 * Math.max(...domain.yTicks.map((tick) => yText(tick).length)));
  const plotRight = Math.max(left, width - right);
  const bottomY = TOP + plotH;
  const x = (kwh: number) => left + (kwh / domain.xMax) * (plotRight - left);
  const y = (grams: number) => bottomY - (grams / domain.yMax) * plotH;

  const placed = points.map((point) => ({ ...point, x: x(point.energyKwh), y: y(point.co2eGrams), highlight: highlightOf(point.id) }));
  // Destaques primeiro: se faltar lugar, quem fica sem nome é um ponto neutro
  const targets = [...placed]
    .sort((a, b) => Number(b.highlight !== null) - Number(a.highlight !== null))
    .map((point) => ({ ...point, text: `${point.highlight ? `${point.highlight.arrow} ` : ''}${point.name}` }));
  const spots = placeLabels(targets, { left, right: plotRight, top: TOP, bottom: bottomY }, RADIUS, CHAR_WIDTH.data12);
  const unlabeled = placed.filter((point) => !spots.has(point.id)).map((point) => point.name);
  const rayYs = spreadLabels(rays.map((ray) => y(domain.xMax * ray.intensity) + 4), 26, TOP, bottomY - 14);
  const activeIndex = placed.findIndex((point) => point.id === activeId);
  const active = activeIndex >= 0 ? placed[activeIndex] : null;
  // Dica do lado com mais espaço, com a largura dele: nunca sai do card
  const toLeft = active !== null && active.x > width / 2;

  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = nearestPoint(placed, event.clientX - rect.left, event.clientY - rect.top);
    setActiveId(index === null ? null : placed[index].id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') return setActiveId(null);
    const last = placed.length - 1;
    const keys: Record<string, number> = {
      ArrowRight: activeIndex < 0 ? 0 : Math.min(activeIndex + 1, last),
      ArrowLeft: activeIndex < 0 ? last : Math.max(activeIndex - 1, 0),
      Home: 0,
      End: last,
    };
    if (!(event.key in keys) || last < 0) return;
    event.preventDefault();
    setActiveId(placed[keys[event.key]].id);
  }

  const legend = (['lowest', 'highest'] as const).flatMap((kind) => placed.find((point) => point.highlight?.kind === kind)?.highlight ?? []);
  const tooltipStyle = active && {
    [toLeft ? 'right' : 'left']: toLeft ? width - active.x + 14 : active.x + 14,
    top: Math.min(Math.max(active.y, 30), HEIGHT - 30),
    maxWidth: toLeft ? active.x - 14 : width - active.x - 14,
  };

  return (
    <figure className="m-0 flex flex-col gap-3 border-t border-border px-5 py-4">
      <div>
        <h3 className="m-0 font-display text-sm font-semibold">Carga ou região?</h3>
        <p className="mt-1 mb-0 text-xs text-muted">
          Energia e CO₂e de cada serviço no período. Cada reta tracejada é a intensidade de carbono de uma região: pontos
          na mesma reta diferem só pela energia.
        </p>
      </div>

      {points.length === 0 ? (
        <p className="m-0 text-sm text-muted">Nenhum serviço tem energia e CO₂e calculados no período: não há ponto a posicionar.</p>
      ) : (
        <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div
            ref={containerRef}
            className="compare-scatter relative min-w-0 cursor-crosshair rounded-lg select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sky)]"
            tabIndex={0}
            role="group"
            aria-label="Gráfico Carga ou região? As setas percorrem os serviços, da menor para a maior energia; Esc limpa o destaque."
            onKeyDown={handleKeyDown}
            // Só o foco pelo teclado já mostra o primeiro serviço; no clique, quem escolhe é o ponteiro
            onFocus={(event) => event.currentTarget.matches(':focus-visible') && setActiveId(activeId ?? placed[0].id)}
            onBlur={() => setActiveId(null)}
          >
            {width > 0 && (
              // viewBox do mesmo tamanho: na tela nada muda; impresso, o desenho encolhe inteiro até a largura da folha
              // em vez de sair cortado (o print.css põe largura máxima de 100% e altura automática nos gráficos)
              <svg
                className="block touch-pan-y"
                width={width}
                height={HEIGHT}
                viewBox={`0 0 ${width} ${HEIGHT}`}
                role="img"
                aria-label={`Energia por CO₂e de ${placed.length} serviços, com uma reta por região: ${rays.map((ray) => `${ray.region}, ${rayValue(ray.intensity)}`).join('; ')}.`}
                onPointerMove={handlePointer}
                onPointerDown={handlePointer}
                // No toque, o dedo saindo da tela não apaga a conta: ela fica até o próximo toque
                onPointerLeave={(event) => event.pointerType !== 'touch' && setActiveId(null)}
              >
                {domain.yTicks.map((tick) => (
                  <g key={`y${tick}`}>
                    <line className="compare-scatter__grid" x1={left} x2={plotRight} y1={y(tick)} y2={y(tick)} />
                    <text className="compare-scatter__tick" x={left - 6} y={y(tick) + 4} textAnchor="end">{yText(tick)}</text>
                  </g>
                ))}
                {domain.xTicks.map((tick) => (
                  <g key={`x${tick}`}>
                    <line className="compare-scatter__grid" x1={x(tick)} x2={x(tick)} y1={TOP} y2={bottomY} />
                    <text className="compare-scatter__tick" x={x(tick)} y={bottomY + 16} textAnchor="middle">{formatShort(tick * energyScale.factor)}</text>
                  </g>
                ))}
                <text className="compare-scatter__tick" x={0} y={12}>{`CO₂e (${co2eScale.unit})`}</text>
                <text className="compare-scatter__tick" x={plotRight} y={HEIGHT - 4} textAnchor="end">{`Energia (${energyScale.unit})`}</text>

                {rays.map((ray, index) => (
                  <g key={ray.region}>
                    <line
                      className={`compare-scatter__ray${active?.region === ray.region ? ' compare-scatter__ray--active' : ''}`}
                      x1={left}
                      y1={bottomY}
                      x2={plotRight}
                      y2={y(domain.xMax * ray.intensity)}
                    />
                    <text className="compare-scatter__ray-name" x={plotRight + 6} y={rayYs[index]}>
                      {ray.region}
                      <tspan className="compare-scatter__tick" x={plotRight + 6} dy={12}>{rayValue(ray.intensity)}</tspan>
                    </text>
                  </g>
                ))}

                {placed.map((point) => {
                  const spot = spots.get(point.id);
                  const kind = point.highlight?.kind;
                  return (
                    <g key={point.id} className={active && active.id !== point.id ? 'compare-scatter__point--dim' : undefined}>
                      <circle className={`compare-scatter__dot compare-scatter__mark--${kind ?? 'neutral'}`} cx={point.x} cy={point.y} r={active?.id === point.id ? RADIUS + 2 : RADIUS} />
                      {spot && (
                        <text className="compare-scatter__label" x={spot.x} y={spot.y} textAnchor={spot.anchor}>
                          {point.highlight && <tspan className={`compare-scatter__mark--${kind}`}>{`${point.highlight.arrow} `}</tspan>}
                          {point.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
            {/* O mesmo cartão escuro do tooltip único (#274), ao lado do ponto, do lado com mais espaço */}
            <div
              className={active ? 'pointer-events-none absolute flex -translate-y-1/2 flex-col gap-0.5 rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] px-2.5 py-1.5 text-xs text-[var(--tooltip-muted)] shadow-lg' : 'hidden'}
              aria-live="polite"
              style={tooltipStyle || undefined}
            >
              {active && (
                <>
                  <strong className="font-semibold text-[var(--tooltip-text)]">{active.name}</strong>
                  <span>{`${active.region}${active.highlight ? ` · ${active.highlight.arrow} ${active.highlight.label}` : ''}`}</span>
                  <span className="font-data text-[var(--tooltip-text)]">{scatterEquation(active)}</span>
                </>
              )}
            </div>
          </div>

          <div className="text-xs text-muted [&_strong]:text-[var(--text-2)]">
            <h4 className="m-0 mb-1 text-xs font-semibold text-[var(--text-2)]">Como ler</h4>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              <li><strong>Mais à direita:</strong> mais energia, a carga do serviço.</li>
              <li><strong>Mais alto:</strong> mais CO₂e.</li>
              <li><strong>Reta mais inclinada:</strong> rede mais suja; a inclinação é a intensidade em g/kWh.</li>
              <li><strong>Distância vertical entre retas,</strong> na mesma energia: o efeito da troca de região.</li>
            </ul>
          </div>
        </div>
      )}

      <figcaption className="flex flex-col gap-1 text-xs text-muted">
        {legend.length > 0 && (
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {legend.map((highlight) => (
              <span key={highlight.kind}>
                <span className={highlight.kind === 'lowest' ? 'text-primary-hover' : 'text-warning'} aria-hidden="true">● </span>
                {highlight.arrow} {highlight.label}
              </span>
            ))}
          </span>
        )}
        {missing.length > 0 && <span>Sem cálculo no período, fora do gráfico: {missing.join(', ')}.</span>}
        {unlabeled.length > 0 && <span>Sem nome no gráfico, por falta de espaço: {unlabeled.join(', ')}.</span>}
        {points.length > 0 && (
          <span>
            Passe o ponteiro perto de um ponto, ou use Tab e as setas ← →, para ver a conta energia × intensidade = CO₂e; Esc
            limpa. A tabela acima traz os mesmos valores.
          </span>
        )}
      </figcaption>
    </figure>
  );
}
