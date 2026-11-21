import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import AppHeader from '../components/AppHeader';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import EstimateTag from '../components/EstimateTag';
import InsightCard from '../components/InsightCard';
import LoadingState from '../components/LoadingState';
import MetricTile, { metricIconProps } from '../components/MetricTile';
import MissingValue from '../components/MissingValue';
import PeriodPicker from '../components/PeriodPicker';
import { PrintHeader } from '../components/PrintReport';
import { usePrintReport } from '../hooks/usePrintReport';
import { useReport } from '../hooks/useReport';
import { isDemoMode } from '../services/services.service';
import { MAX_SPAN_DAYS, formatGrams, formatInputDate, formatKwh, readPeriodFilter, timeZoneLabel, todayInput } from '../utils/emissions';
import { formatNumber } from '../utils/format';
import { formatInScale, scaleFor } from '../utils/units';
import type { Quantity } from '../utils/units';
import {
  COMPARABLE_RATIO,
  COVERAGE_ALERT,
  COVERAGE_CAVEAT,
  DOMINANT_EFFECT,
  LEADER_SHARE,
  MIN_CONCENTRATION_SERVICES,
  MIN_SAMPLE,
  PARETO_SHARE,
  RELEVANT_CHANGE,
  SERVICE_CHANGE,
  SERVICE_MATERIALITY,
  STABLE_CHANGE,
  buildReport,
  coverage,
  decompositionBars,
  formatIntensity,
  headline,
  previousWindow,
  relativeChange,
  signedGrams,
  targetLink,
} from '../utils/insights';
import '../styles/print.css';

const CALCULOS_URL = 'https://github.com/DEVassos/ecopulse-app/blob/develop/docs/calculos.md#relatório-do-período';

/** Rótulo de cada barra de "De onde veio a variação". */
const EFFECT_LABEL = { energia: 'Energia consumida', intensidade: 'Intensidade média', total: 'Variação do CO₂e' } as const;

const moment = (ms: number) => new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
/** Parte medida, com uma casa, como nas frases dos achados ("80,9%"). */
const pct = (ratio: number) => `${formatNumber(ratio * 100, 1)}%`;
/** Limite de regra, sem casas à toa ("0,5%", "10%"). */
const limit = (ratio: number) => `${(ratio * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Número e unidade separados para o card, na escala única (#271): "469" e "g CO₂e". */
function parts(quantity: Quantity, value: number | null): { value: ReactNode; unit?: string } {
  if (value === null) return { value: <MissingValue label="sem cálculo" title="Sem cálculo no período" /> };
  const scale = scaleFor(quantity, [value]);
  return { value: formatInScale(value, scale), unit: quantity === 'co2e' ? `${scale.unit} CO₂e` : scale.unit };
}

/** Nota do card: variação contra o período anterior (menos é melhor: ▲ em alerta, ▼ em verde) e o valor de antes. */
function changeNote(current: number | null, previous: number | null | undefined, format: (value: number) => string): ReactNode {
  if (previous === undefined) return 'sem comparação';
  if (previous === null) return 'sem cálculo antes';
  const change = relativeChange(current, previous);
  const before = `antes ${format(previous)}`;
  if (change === null) return before;
  if (Math.abs(change) < STABLE_CHANGE) return <><span className="metric-delta">±0%</span> · {before}</>;
  const up = change > 0;
  return (
    <>
      <span className={`metric-delta ${up ? 'metric-delta--worse' : 'metric-delta--better'}`}>
        <span aria-hidden="true">{up ? '▲' : '▼'} </span>
        <span className="sr-only">{up ? 'subiu ' : 'caiu '}</span>
        {formatNumber(Math.abs(change) * 100, 1)}%
      </span>{' '}
      · {before}
    </>
  );
}

/**
 * Relatório do período (#403, US13 #54): frase-resumo, quatro cards contra o período anterior de mesma duração, de onde
 * veio a variação e os achados das regras fixas de `utils/insights.ts`, em ordem de impacto. O período fica na URL
 * (`?de=&ate=`), como em Emissões e na Comparação, e o relatório imprime em A4 pelo mesmo mecanismo de Emissões.
 */
export default function ReportPage() {
  usePrintReport('report');
  const [params, setParams] = useSearchParams();
  const today = todayInput();
  const { start, end } = readPeriodFilter(params, today);
  const { data, loading, error, previousError, refresh } = useReport(start, end);

  function choose(nextStart: string, nextEnd: string) {
    if (nextStart === start && nextEnd === end) return refresh();
    setParams({ de: nextStart, ate: nextEnd });
  }

  const report = data ? buildReport(data.current.services, data.previous?.services ?? null) : null;
  const zone = timeZoneLabel(start);
  const fromMs = data ? Date.parse(data.current.from) : null;
  const toMs = data ? Date.parse(data.current.to) : null;
  const before = fromMs !== null && toMs !== null ? previousWindow(fromMs, toMs) : null;
  const windows =
    fromMs !== null && toMs !== null && before
      ? `${moment(fromMs)} a ${moment(toMs)}, comparado com ${moment(before.fromMs)} a ${moment(before.toMs)} (${zone})`
      : `${formatInputDate(start)} a ${formatInputDate(end)} (${zone})`;
  const empty = report !== null && report.totals.collections === 0;
  const link = (target: Parameters<typeof targetLink>[0]) => targetLink(target, start, end);

  const totals = report?.totals;
  const prev = report ? (report.previousTotals ?? undefined) : undefined;
  const d = report?.decomposition ?? null;
  const change = report && prev ? relativeChange(report.totals.co2eGrams, prev.co2eGrams) : null;
  // A barra só explica variação real entre períodos comparáveis: a tendência traz impacto só nesse caso
  const decomposed = d !== null && report?.trend?.impactGrams != null && change !== null && Math.abs(change) >= STABLE_CHANGE;
  const bars = d && decomposed ? decompositionBars(d) : [];
  const trendLink = report?.trend ? link(report.trend.target) : null;

  return (
    <div className="page">
      {isDemoMode && (
        <div className="demo-banner" role="note">
          Você está vendo uma demonstração com dados ilustrativos: o frontend ainda não está ligado ao backend.
        </div>
      )}
      <AppHeader />

      <main id="conteudo" tabIndex={-1} className="content">
        <div className="report__filters panel flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="min-w-0 flex-1 basis-80">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="m-0 font-display text-xl font-semibold">Relatório do período</h1>
              <EstimateTag note="Os achados saem de regras fixas, sem IA, sobre o CO₂e somado das coletas com cálculo." />
            </div>
            <p className="mt-1 mb-0 text-sm text-muted">
              Período: {windows}
              {data && ` · gerado em ${moment(Date.parse(data.generatedAt))}`}
            </p>
          </div>
          <fieldset className="m-0 w-full min-w-0 border-0 p-0 min-[600px]:w-auto [&_.period-picker]:w-full min-[600px]:[&_.period-picker]:w-auto">
            <legend className="mb-1 p-0 text-xs text-muted">Período</legend>
            <PeriodPicker start={start} end={end} today={today} maxDays={MAX_SPAN_DAYS} onChange={choose} />
          </fieldset>
          {report && !empty && (
            <button type="button" className="btn-outline h-9 w-full px-4 text-sm min-[600px]:w-auto" onClick={() => window.print()}>
              Imprimir / PDF
            </button>
          )}
        </div>
        <PrintHeader
          serviceName="Relatório do período"
          location=""
          periodLabel={windows}
          bucketLabel={null}
          updatedAt={data?.generatedAt ?? null}
        />

        {error && <ErrorState message={error} onRetry={refresh} />}
        {loading && <LoadingState message="Gerando o relatório…" />}
        {empty && (
          <EmptyState
            title="Nenhuma coleta no período"
            description="O relatório precisa de coletas no período escolhido. Escolha outro período ou aguarde a próxima coleta."
          />
        )}

        {report && totals && !empty && (
          <>
            {previousError && (
              <p className="m-0 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm" role="status">
                O período anterior não pôde ser buscado ({previousError}): o relatório saiu sem comparação.
              </p>
            )}
            <section className="panel flex flex-col gap-3 p-5" aria-labelledby="relatorio-resumo">
              <h2 id="relatorio-resumo" className="sr-only">
                Resumo do período
              </h2>
              <p className="m-0 font-display text-xl font-bold leading-tight text-balance min-[600px]:text-2xl">{headline(report)}</p>
              {report.trend && <p className="m-0 text-sm text-[var(--text-2)]">{report.trend.cause}</p>}
              {report.trend?.caveats.map((caveat) => (
                <p key={caveat} className="m-0 text-sm text-muted">
                  Ressalva: {caveat}
                </p>
              ))}
              <div className="kpis mt-1">
                <MetricTile
                  label="CO₂e"
                  {...parts('co2e', totals.co2eGrams)}
                  note={changeNote(totals.co2eGrams, prev?.co2eGrams, formatGrams)}
                  icon={<svg {...metricIconProps}><path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z" /></svg>}
                />
                <MetricTile
                  label="Energia"
                  {...parts('energy', totals.energyKwh)}
                  note={changeNote(totals.energyKwh, prev?.energyKwh, formatKwh)}
                  icon={<svg {...metricIconProps}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg>}
                />
                <MetricTile
                  label="Intensidade média"
                  value={totals.intensity === null ? parts('co2e', null).value : totals.intensity.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                  unit={totals.intensity === null ? undefined : 'g/kWh'}
                  note={changeNote(totals.intensity, prev?.intensity, formatIntensity)}
                  icon={<svg {...metricIconProps}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>}
                />
                <MetricTile
                  label="Coletas com cálculo"
                  value={pct(coverage(totals) ?? 0)}
                  note={`${totals.calculated.toLocaleString('pt-BR')} de ${totals.collections.toLocaleString('pt-BR')}${prev ? ` · antes ${pct(coverage(prev) ?? 0)}` : ''}`}
                  tone={(coverage(totals) ?? 1) < COVERAGE_ALERT ? 'warning' : 'neutral'}
                  icon={<svg {...metricIconProps}><path d="M20 6 9 17l-5-5" /></svg>}
                />
              </div>
            </section>

            <section className="panel flex flex-col gap-3 p-5" aria-labelledby="relatorio-variacao">
              <h2 id="relatorio-variacao" className="m-0 font-display text-lg font-semibold">
                De onde veio a variação{d && decomposed ? `: ${signedGrams(d.deltaGrams)} de CO₂e` : ''}
              </h2>
              {d && decomposed && prev && prev.energyKwh !== null && prev.intensity !== null && totals.energyKwh !== null && totals.intensity !== null ? (
                <>
                  <p className="m-0 text-sm text-muted">
                    CO₂e = energia × intensidade. A variação se divide em quanto mudou a energia (com a intensidade de antes) e
                    quanto mudou a intensidade média (com a energia de agora); as duas partes somam a variação. À direita da linha
                    do zero fica o que aumentou o CO₂e; à esquerda, o que reduziu.
                  </p>
                  <div
                    className="report__effects grid gap-2"
                    role="img"
                    aria-label={bars.map((bar) => `${EFFECT_LABEL[bar.key]}: ${signedGrams(bar.grams)}`).join('; ') + '.'}
                  >
                    {bars.map((bar) => (
                      <div
                        key={bar.key}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 text-sm min-[600px]:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] ${bar.key === 'total' ? 'border-t border-border pt-2 font-semibold' : ''}`}
                      >
                        {/* No celular o rótulo sobe para cima da barra, para ela ter a largura toda */}
                        <span className="col-span-2 text-[var(--text-2)] min-[600px]:col-span-1">{EFFECT_LABEL[bar.key]}</span>
                        <span className="grid h-3 grid-cols-2" aria-hidden="true">
                          <span className="flex justify-end border-r-2 border-[var(--text-2)]">
                            {bar.direction === 'queda' && (
                              <span className="block h-full rounded-l-sm bg-primary" style={{ width: `${bar.widthPercent}%` }} />
                            )}
                          </span>
                          <span className="flex justify-start">
                            {bar.direction === 'alta' && (
                              <span className="block h-full rounded-r-sm bg-warning" style={{ width: `${bar.widthPercent}%` }} />
                            )}
                          </span>
                        </span>
                        <strong className="font-data text-right">
                          {signedGrams(bar.grams)}
                          <span className="sr-only"> ({bar.direction === 'alta' ? 'aumentou' : bar.direction === 'queda' ? 'reduziu' : 'sem efeito'})</span>
                        </strong>
                      </div>
                    ))}
                  </div>
                  <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-sm">
                    <li>
                      <strong>Energia consumida, {signedGrams(d.energyGrams)}:</strong> de {formatKwh(prev.energyKwh)} para{' '}
                      {formatKwh(totals.energyKwh)}, com a intensidade de antes ({formatIntensity(prev.intensity)}).
                    </li>
                    <li>
                      <strong>Intensidade média, {signedGrams(d.intensityGrams)}:</strong> de {formatIntensity(prev.intensity)} para{' '}
                      {formatIntensity(totals.intensity)}, com a energia de agora ({formatKwh(totals.energyKwh)}). A média mistura o
                      fator de cada região com a parte da energia gasta em cada uma.
                    </li>
                  </ul>
                  {report.trend && (
                    <p className="m-0 border-t border-border pt-2 text-sm">
                      <strong>O que fazer:</strong> {report.trend.action}{' '}
                      {trendLink && (
                        <Link to={trendLink.to} className="report__no-print">
                          {trendLink.label}
                        </Link>
                      )}
                    </p>
                  )}
                </>
              ) : (
                <p className="m-0 text-sm text-muted">
                  {!report.previousTotals
                    ? 'Sem o período anterior, não há variação a explicar.'
                    : change !== null && Math.abs(change) < STABLE_CHANGE
                      ? 'Sem variação a explicar: o CO₂e ficou a menos de 0,5% do período anterior.'
                      : 'A variação não foi dividida: falta cálculo num dos períodos, ou eles não são comparáveis (veja a ressalva acima).'}
                </p>
              )}
            </section>

            <section className="flex flex-col gap-3" aria-labelledby="relatorio-achados">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 id="relatorio-achados" className="m-0 font-display text-lg font-semibold">
                  Achados, do maior para o menor impacto em CO₂e
                </h2>
                <span className="text-sm text-muted">
                  {report.insights.length} {report.insights.length === 1 ? 'achado' : 'achados'} · regras fixas, sem IA
                </span>
              </div>
              {report.insights.length === 0 && (
                <p className="m-0 text-sm text-muted">Nenhuma regra além da tendência passou do limite neste período.</p>
              )}
              {report.insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} link={link(insight.target)} />
              ))}
            </section>

            <section className="panel flex flex-col gap-2 p-5 text-sm" aria-labelledby="relatorio-como">
              <h2 id="relatorio-como" className="m-0 font-display text-lg font-semibold">
                Como este relatório é gerado
              </h2>
              <p className="m-0">
                Cada achado é uma regra fixa, sem IA, aplicada ao CO₂e e à energia somados das coletas com cálculo no período
                e no período anterior de mesma duração, logo antes dele. Um achado só aparece quando passa do limite da regra:
              </p>
              <ul className="m-0 flex flex-col gap-1 pl-5 text-[var(--text-2)]">
                <li>
                  Tendência: estável abaixo de {limit(STABLE_CHANGE)}; alta ou queda a partir de {limit(RELEVANT_CHANGE)}; um
                  efeito é a causa principal com {limit(DOMINANT_EFFECT)} ou mais da soma dos dois efeitos. Quando os dois têm
                  sentidos opostos, a variação é o saldo, e o relatório cita os dois em gramas.
                </li>
                <li>
                  Períodos comparáveis: pelo menos {MIN_SAMPLE} coletas com cálculo em cada um, e o menor número de coletas com
                  cálculo é ao menos {formatNumber(COMPARABLE_RATIO, 1)} do maior.
                </li>
                <li>
                  Serviço: variação de {limit(SERVICE_CHANGE)} do próprio CO₂e e de {limit(SERVICE_MATERIALITY)} do total
                  anterior.
                </li>
                <li>
                  Concentração: o primeiro serviço com {limit(LEADER_SHARE)} ou mais; senão, quantos somam {limit(PARETO_SHARE)}{' '}
                  (com {MIN_CONCENTRATION_SERVICES} ou mais serviços com cálculo).
                </li>
                <li>
                  Confiança dos dados: ressalva com menos de {limit(COVERAGE_CAVEAT)} das coletas com cálculo; alerta com menos
                  de {limit(COVERAGE_ALERT)}.
                </li>
              </ul>
              <p className="m-0 text-muted">
                Todos os valores são estimativas. Coleta com falha ou sem fator de intensidade não entra na soma.{' '}
                <a href={CALCULOS_URL} target="_blank" rel="noreferrer">
                  Fórmulas, limites e um exemplo conferível
                </a>
                .
              </p>
            </section>
          </>
        )}
      </main>

      <footer className="page-footer">EcoPulse · DEVassos · Fatec Jacareí 2DSM 2026-2</footer>
    </div>
  );
}
