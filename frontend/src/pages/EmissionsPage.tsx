import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import AppHeader from '../components/AppHeader';
import EmissionsChart from '../components/EmissionsChart';
import type { EmissionsChartMode } from '../components/EmissionsChart';
import { ZoomBand, ZoomButtons } from '../components/EmissionsZoom';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import EstimateTag from '../components/EstimateTag';
import ExportButtons from '../components/ExportButtons';
import LastUpdated from '../components/LastUpdated';
import LoadingState from '../components/LoadingState';
import PeriodPicker from '../components/PeriodPicker';
import { PrintHeader, PrintTable } from '../components/PrintReport';
import { useEmissions } from '../hooks/useEmissions';
import { useMonitoring } from '../hooks/useMonitoring';
import { usePrintReport } from '../hooks/usePrintReport';
import { useServices } from '../hooks/useServices';
import type { EmissionsBucket } from '../services/emissions.types';
import { isDemoMode } from '../services/services.service';
import type { MonitoredService } from '../services/services.types';
import {
  BUCKET_LABEL,
  MAX_SPAN_DAYS,
  autoBucket,
  describeLateStart,
  fittedAxisStart,
  formatClock,
  formatDurationMilliseconds,
  formatGrams,
  formatInputDate,
  formatKwh,
  formatPeakTime,
  formatRatio,
  formatShort,
  lateStartMs,
  missingSpans,
  peakRatio,
  seriesStats,
  periodMs,
  readPeriodFilter,
  spanDays,
  summarize,
  timeZoneLabel,
  todayInput,
  totalsOf,
} from '../utils/emissions';
import { formatDayTime } from '../utils/format';
import {
  describeWindow,
  gridStepMs,
  minWindowMs,
  panWindow,
  pointsInWindow,
  shareOf,
  snapWindow,
  spansInWindow,
  visibleWindow,
  windowClock,
  zoomStep,
} from '../utils/zoom';
import type { ZoomWindow } from '../utils/zoom';
import './EmissionsPage.css';
import '../styles/print.css';

/** Mensagem de erro do período, ligada aos dois campos de data por aria-describedby (#262). */
const FORM_ERROR_ID = 'emissoes-erro-periodo';

const BUCKETS: EmissionsBucket[] = ['coleta', '15min', '1h'];

function locationOf(service: MonitoredService): string {
  return [service.city, service.region].filter(Boolean).join(' · ');
}

/** Região no relatório impresso: "Tokyo (jp-east)", sem repetir cidade e região quando são iguais ("Tokyo · Tokyo"). */
function printLocation(service: MonitoredService): string {
  const place = service.city ?? service.region ?? '';
  if (!service.regionCode) return place;
  return place ? `${place} (${service.regionCode})` : service.regionCode;
}

/**
 * Página Emissões (#190): emissão estimada de CO₂e de um serviço ao longo do tempo.
 * Serviço, período e tempo real ficam na URL (`?servico=&de=&ate=&tempo=real`): o link abre no mesmo filtro e o
 * "voltar" do navegador desfaz a última troca, desligando o tempo real junto com a volta das datas (#212).
 */
export default function EmissionsPage() {
  const { data: servicesData, loading: servicesLoading, error: servicesError, refresh: refreshServices } = useServices();
  const { refreshIntervalMs } = useMonitoring();
  // Relatório impresso / PDF (#13): as regras de impressão valem só nesta página, e o papel sai sempre no tema claro
  usePrintReport();
  const [params, setParams] = useSearchParams();
  const today = todayInput();
  const services = useMemo(() => servicesData?.services ?? [], [servicesData]);

  // Filtro aplicado (vem da URL; valor inválido ou ausente cai no padrão: hoje e o primeiro serviço)
  const { start, end, live } = readPeriodFilter(params, today);
  const urlService = params.get('servico');
  const service = services.find((item) => item.id === urlService) ?? services[0] ?? null;

  const [bucket, setBucket] = useState<EmissionsBucket | null>(null);
  const [mode, setMode] = useState<EmissionsChartMode>('intervalo');
  const [formError, setFormError] = useState('');
  // Eixo ajustado ao trecho com dados (#332): vale só para o serviço e o período em que foi pedido
  const viewKey = `${service?.id ?? ''}|${start}|${end}`;
  const [fitKey, setFitKey] = useState<string | null>(null);
  // Trecho ampliado (#396), sobre os dados já carregados, com a mesma chave do ajuste: trocar serviço ou período restaura;
  // trocar o agrupamento mantém o trecho, encaixado de novo nos intervalos novos
  const [zoom, setZoom] = useState<{ key: string; window: ZoomWindow } | null>(null);
  const [zoomNote, setZoomNote] = useState({ key: '', text: '' });
  const zoomInRef = useRef<HTMLButtonElement>(null);

  const { data, period, loading, error, updatedAt, refresh } = useEmissions({
    serviceId: service?.id ?? null,
    start,
    end,
    bucket,
    live,
    intervalMs: refreshIntervalMs,
  });

  const allPoints = useMemo(() => data?.points ?? [], [data]);
  const stepMs = data ? gridStepMs(data.points, data.bucket) : null;
  // `snapped`: o trecho encaixado nos intervalos; `shown`: o que aparece na tela, que no período de hoje termina em
  // "agora" (o Tempo real mantém o trecho fixo)
  const zoomView = useMemo(() => {
    if (zoom?.key !== viewKey || !period || stepMs === null) return null;
    const snapped = snapWindow(zoom.window, period, stepMs);
    return snapped ? { snapped, shown: visibleWindow(snapped, period) } : null;
  }, [zoom, viewKey, period, stepMs]);
  const zoomWindow = zoomView?.snapped ?? null;
  const shown = zoomView?.shown ?? null;
  // Pontos e totais do que está na tela: o gráfico recebe só o trecho, e pico, média, dica e teclado valem para ele
  const points = useMemo(() => (shown ? pointsInWindow(allPoints, shown) : allPoints), [allPoints, shown]);
  const periodTotals = data?.totals ?? null;
  const totals = useMemo(
    () => (periodTotals && shown ? totalsOf(points, periodTotals.carbonIntensity) : periodTotals),
    [periodTotals, points, shown],
  );
  const summary = useMemo(() => (totals ? summarize(points, totals) : null), [points, totals]);
  // Trechos sem coleta: o gráfico desenha cada um e o card Coletas mostra a soma, com a mesma regra (#272)
  const allMissing = useMemo(
    () => (data && period ? missingSpans(data.points, data.bucket, period.fromMs, period.toMs) : []),
    [data, period],
  );
  const missing = useMemo(() => (shown ? spansInWindow(allMissing, shown) : allMissing), [allMissing, shown]);
  const missingMs = missing.reduce((sum, span) => sum + span.end - span.start, 0);
  // Média e maior ponto com a mesma conta do gráfico (sem o intervalo ainda aberto): tiles, gráfico e Leitura dizem o mesmo (#271)
  const endMs = shown?.toMs ?? period?.toMs ?? null;
  const stats = useMemo(() => (data && endMs !== null ? seriesStats(points, data.bucket, endMs) : null), [data, points, endMs]);
  const ratio = stats ? peakRatio(points, stats) : null;
  const peakPoint = stats && stats.peakIndex !== null ? points[stats.peakIndex] : null;
  const grouped = data ? data.bucket !== 'coleta' : false;
  // Monitoramento que começou depois de 20% do período (#332): a marca no gráfico e o ajuste do eixo; KPIs e totais
  // continuam sendo do período inteiro. Durante o zoom, o ajuste sai de cena e a marca só aparece dentro do trecho
  const lateStart = data && period ? lateStartMs(data.points, period.fromMs, period.toMs) : null;
  const fitted = lateStart !== null && fitKey === viewKey && shown === null;
  const multiDay = start !== end;
  const axisFromMs =
    data && period && lateStart !== null && fitted ? fittedAxisStart(lateStart, period.fromMs, period.toMs, data.bucket) : period?.fromMs;
  const markInView = lateStart !== null && (shown === null || (lateStart > shown.fromMs && lateStart < shown.toMs));
  const startMark =
    data && lateStart !== null && !fitted && markInView ? { t: lateStart, label: describeLateStart(lateStart, data.bucket, multiDay) } : undefined;
  const range = periodMs(start, end);
  const autoLabel = BUCKET_LABEL[autoBucket(range.fromMs, range.toMs)];

  // O que o gráfico mostra agora, base do Aproximar e do Afastar: o trecho, o eixo ajustado (#332) ou o período inteiro
  const current: ZoomWindow | null = zoomWindow ?? (period ? { fromMs: axisFromMs ?? period.fromMs, toMs: period.toMs } : null);
  const canZoomIn = current !== null && stepMs !== null && current.toMs - current.fromMs > minWindowMs(stepMs);

  /** Aplica o trecho (null volta ao período inteiro) e avisa o leitor de tela; o ajuste do eixo (#332) sai junto. */
  function applyZoom(next: ZoomWindow | null) {
    setFitKey(null);
    setZoom(next ? { key: viewKey, window: next } : null);
    const text = next && period ? `Trecho ampliado: ${describeWindow(visibleWindow(next, period))}.` : 'Período inteiro restaurado.';
    setZoomNote({ key: viewKey, text });
  }

  function zoomBy(direction: 'in' | 'out') {
    if (current && period && stepMs !== null) applyZoom(zoomStep(current, period, stepMs, direction));
  }

  function pan(direction: -1 | 1) {
    if (zoomWindow && period && stepMs !== null) applyZoom(panWindow(zoomWindow, period, stepMs, direction));
  }

  /** Trecho selecionado arrastando o mouse no gráfico (#397): o mesmo encaixe dos botões. */
  function zoomToSpan(span: ZoomWindow) {
    if (period && stepMs !== null) applyZoom(snapWindow(span, period, stepMs));
  }

  /** "Restaurar período" some com a faixa do trecho: o foco do teclado vai para o Aproximar. */
  function resetZoom() {
    applyZoom(null);
    zoomInRef.current?.focus();
  }

  /** Grava as mudanças na URL (uma entrada no histórico do navegador); `null` tira a chave. */
  function updateUrl(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next);
  }

  /** Período escolhido no seletor (#273), que já só deixa escolher períodos válidos; a checagem fica como defesa. */
  function apply(nextStart: string, nextEnd: string) {
    if (nextStart > nextEnd) return setFormError('A data inicial deve ser anterior ou igual à data final.');
    if (nextEnd > today) return setFormError('A data final não pode estar no futuro.');
    if (spanDays(nextStart, nextEnd) > MAX_SPAN_DAYS) return setFormError(`Escolha um período de até ${MAX_SPAN_DAYS} dias.`);
    setFormError('');
    if (nextStart === start && nextEnd === end) return refresh();
    updateUrl({ de: nextStart, ate: nextEnd, tempo: null });
  }

  function toggleLive() {
    setFormError('');
    if (live) return updateUrl({ tempo: null });
    updateUrl({ de: today, ate: today, tempo: 'real' });
  }

  const periodLabel = start === end ? formatInputDate(start) : `${formatInputDate(start)} a ${formatInputDate(end)}`;
  const noCalculation = periodTotals !== null && periodTotals.collections > 0 && periodTotals.co2eGrams === null;
  // Rótulo dos cards: dizem de que recorte é o número (#396)
  const scope = shown ? 'no trecho' : 'no período';
  const inZoom = shown ? ' no trecho' : '';
  // A última busca falhou: o resumo na tela é o da busca anterior e fica apagado, como os cards do dashboard (#202)
  const stale = error !== '' && data !== null;
  const staleTitle = stale && updatedAt ? `Dados de ${formatDayTime(updatedAt)}: a última atualização falhou` : undefined;

  return (
    <div className="page">
      {isDemoMode && (
        <div className="demo-banner" role="note">
          Você está vendo uma demonstração com dados ilustrativos: o frontend ainda não está ligado ao backend.
        </div>
      )}

      <AppHeader updatedAt={updatedAt} />

      <main id="conteudo" tabIndex={-1} className="content">
        <h1 className="sr-only">Emissões de CO₂e por serviço</h1>

        {servicesError && !servicesData && <ErrorState message={servicesError} onRetry={refreshServices} />}
        {servicesLoading && !servicesData && <LoadingState message="Carregando serviços…" />}
        {servicesData && services.length === 0 && (
          <EmptyState
            title="Nenhum serviço monitorado ainda"
            description="Os serviços aparecem aqui assim que o agregador os descobrir na próxima coleta."
          />
        )}

        {service && (
          <section className="emissions" aria-labelledby="emissions-title">
            {/* Barra em grupos (#267): o quê (serviço) · quando (seletor de período, #273) · como agrupar · tempo real.
                Cada controle vale na hora, sem botão de enviar */}
            <div className="emissions__filters panel" role="group" aria-label="Filtros">
              <label className="emissions__field emissions__field--service">
                <span>Serviço</span>
                <select value={service.id} onChange={(event) => updateUrl({ servico: event.target.value })}>
                  {services.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {locationOf(item) ? ` — ${locationOf(item)}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="emissions__period">
                <legend>Período</legend>
                <PeriodPicker
                  start={start}
                  end={end}
                  today={today}
                  maxDays={MAX_SPAN_DAYS}
                  // Com o tempo real ligado, outro período o desliga (como o ◀ da #212); "Hoje" só busca de novo
                  onChange={apply}
                />
              </fieldset>
              <label className="emissions__field">
                <span>Agrupar por</span>
                <select
                  value={bucket ?? 'auto'}
                  onChange={(event) => setBucket(event.target.value === 'auto' ? null : (event.target.value as EmissionsBucket))}
                >
                  <option value="auto">Automático ({autoLabel})</option>
                  {BUCKETS.map((item) => (
                    <option key={item} value={item}>
                      {BUCKET_LABEL[item]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="emissions__live">
                <button
                  type="button"
                  className={live ? 'emissions__btn emissions__btn--live is-on' : 'emissions__btn emissions__btn--live'}
                  onClick={toggleLive}
                  aria-pressed={live}
                >
                  {live && <span className="emissions__live-dot" aria-hidden="true" />}
                  Tempo real
                </button>
              </div>
              {formError && (
                <p id={FORM_ERROR_ID} className="emissions__form-error" role="alert">
                  {formError}
                </p>
              )}
            </div>

            <PrintHeader
              serviceName={service.name}
              location={printLocation(service)}
              periodLabel={`${periodLabel} (${timeZoneLabel(start)})${shown ? ` · trecho ${windowClock(shown, multiDay)}` : ''}`}
              bucketLabel={data ? BUCKET_LABEL[data.bucket] : null}
              updatedAt={updatedAt}
            />
            <div className="emissions__card panel">
              <header className="emissions__header">
                <div>
                  {/* O método da estimativa fica no tooltip da etiqueta, não numa frase sob o gráfico (#272) */}
                  <div className="emissions__heading">
                    <h2 id="emissions-title" className="emissions__title">
                      {service.name}
                    </h2>
                    <EstimateTag />
                  </div>
                  <p className="emissions__subtitle">
                    {/* No Acumulado com zoom, a curva recomeça do zero no início do trecho */}
                    Emissão estimada de CO₂e{' '}
                    {mode === 'acumulado' && (shown ? `acumulada desde o início do trecho (${formatClock(shown.fromMs, multiDay)}) ` : 'acumulada ')}—{' '}
                    {periodLabel} ({timeZoneLabel(start)})
                    {shown && ` · trecho ${windowClock(shown, multiDay)}`}
                    {locationOf(service) && ` · ${locationOf(service)}`}
                    {data && ` · ${BUCKET_LABEL[data.bucket].toLowerCase()}`}
                  </p>
                  {fitted && axisFromMs !== undefined && (
                    <p className="emissions__subtitle emissions__subtitle--fit">
                      Gráfico a partir de {formatClock(axisFromMs, multiDay)}, quando começam os dados; os totais são do
                      período inteiro.
                    </p>
                  )}
                </div>
                <LastUpdated
                  updatedAt={updatedAt}
                  intervalSeconds={live ? refreshIntervalMs / 1000 : undefined}
                  stale={error !== ''}
                >
                  {loading && <span className="emissions__spinner" aria-hidden="true" />}
                </LastUpdated>
              </header>

              {/* Exportação do período (#24, US13 #54): CSV com todas as coletas e PDF pela impressão do navegador */}
              <ExportButtons
                serviceId={service.id}
                serviceName={service.name}
                start={start}
                end={end}
                fromMs={range.fromMs}
                toMs={range.toMs}
                expectedCount={periodTotals?.collections ?? null}
              />

              {error && <ErrorState message={error} onRetry={refresh} />}

              {totals && summary && (
                <dl className={stale ? 'emissions__stats emissions__stats--stale' : 'emissions__stats'} data-tooltip={staleTitle}>
                  <div>
                    <dt>Emissão {scope}</dt>
                    <dd>{totals.co2eGrams !== null ? `${formatGrams(totals.co2eGrams)} CO₂e` : '—'}</dd>
                  </div>
                  <div>
                    <dt>Energia {scope}</dt>
                    <dd>{totals.energyKwh !== null ? formatKwh(totals.energyKwh) : '—'}</dd>
                  </div>
                  {/* Média e pico seguem o agrupamento do gráfico; a maior coleta dentro do intervalo fica no tooltip (#271) */}
                  <div>
                    <dt>
                      {grouped && data ? `Média a cada ${BUCKET_LABEL[data.bucket]}` : 'Média por coleta'}
                      {inZoom}
                    </dt>
                    <dd>{stats?.meanGrams != null ? formatGrams(stats.meanGrams) : '—'}</dd>
                  </div>
                  <div
                    className={peakPoint ? 'emissions__stat--peak' : undefined}
                    data-tooltip={
                      grouped && summary.peak?.co2eMaxGrams != null && data
                        ? `Maior coleta: ${formatGrams(summary.peak.co2eMaxGrams)} CO₂e em ${formatPeakTime(summary.peak, data.bucket)}`
                        : undefined
                    }
                  >
                    <dt>
                      {grouped ? 'Maior intervalo' : 'Pico de uma coleta'}
                      {inZoom}
                    </dt>
                    <dd>
                      {peakPoint?.co2eGrams != null && data ? (
                        <>
                          {formatGrams(peakPoint.co2eGrams)}
                          <small>
                            {formatPeakTime(peakPoint, data.bucket)}
                            {ratio !== null && ` · ${formatRatio(ratio)} a média`}
                          </small>
                        </>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Intensidade da região</dt>
                    <dd>
                      {totals.carbonIntensity !== null ? `${formatShort(totals.carbonIntensity)} g/kWh` : '—'}
                      {/* A média da intensidade vem da API para o período; o trecho não tem a sua (#396) */}
                      {shown && <small>período inteiro</small>}
                    </dd>
                  </div>
                  <div>
                    <dt>Coletas{inZoom}</dt>
                    <dd>
                      {totals.collections.toLocaleString('pt-BR')}
                      {(totals.failed > 0 || totals.notCalculated > 0 || missingMs > 0) && (
                        <small>
                          {[
                            totals.failed > 0 && `${totals.failed.toLocaleString('pt-BR')} com falha`,
                            totals.notCalculated > 0 && `${totals.notCalculated.toLocaleString('pt-BR')} sem cálculo`,
                            missingMs > 0 && `${formatDurationMilliseconds(missingMs)} sem coleta`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </small>
                      )}
                    </dd>
                  </div>
                </dl>
              )}

              {/* Trecho ampliado (#396): qual é, quanto pesa no período e os totais do período inteiro */}
              {shown && period && periodTotals && totals && (
                <ZoomBand
                  label={describeWindow(shown)}
                  timeShare={(shown.toMs - shown.fromMs) / (period.toMs - period.fromMs)}
                  co2eShare={shareOf(totals.co2eGrams, periodTotals.co2eGrams)}
                  periodTotals={periodTotals}
                  onReset={resetZoom}
                />
              )}
              <p className="sr-only" aria-live="polite">
                {zoomNote.key === viewKey ? zoomNote.text : ''}
              </p>

              {/* Forma de exibir o gráfico: fica no card, junto do gráfico em que age (#267) */}
              <div className="emissions__chart-bar">
                {data !== null && allPoints.length > 0 && (
                  <ZoomButtons
                    canZoomIn={canZoomIn}
                    canZoomOut={shown !== null}
                    canPanBack={zoomWindow !== null && period !== null && zoomWindow.fromMs > period.fromMs}
                    canPanForward={shown !== null && period !== null && shown.toMs < period.toMs}
                    onZoom={zoomBy}
                    onPan={pan}
                    zoomInRef={zoomInRef}
                  />
                )}
                {!shown && lateStart !== null && allPoints.length > 0 && (
                  <button type="button" className="emissions__btn emissions__fit" onClick={() => setFitKey(fitted ? null : viewKey)}>
                    {fitted ? 'Mostrar o período inteiro' : 'Ajustar ao trecho com dados'}
                  </button>
                )}
                <div className="emissions__segmented" role="group" aria-label="Forma de exibir o gráfico">
                  <button type="button" className="emissions__btn" aria-pressed={mode === 'intervalo'} onClick={() => setMode('intervalo')}>
                    {data?.bucket === 'coleta' ? 'Por coleta' : 'Por intervalo'}
                  </button>
                  <button type="button" className="emissions__btn" aria-pressed={mode === 'acumulado'} onClick={() => setMode('acumulado')}>
                    Acumulado
                  </button>
                </div>
              </div>
              <div className="emissions__chart">
                {data === null && loading && <p className="emissions__empty">Carregando coletas…</p>}
                {data !== null && points.length === 0 && (
                  <p className="emissions__empty">
                    {shown ? 'Nenhuma coleta deste serviço neste trecho.' : 'Nenhuma coleta deste serviço no período escolhido.'}
                  </p>
                )}
                {data !== null && period !== null && points.length > 0 && (
                  <EmissionsChart
                    points={points}
                    bucket={data.bucket}
                    mode={mode}
                    fromMs={shown?.fromMs ?? axisFromMs ?? period.fromMs}
                    toMs={shown?.toMs ?? period.toMs}
                    missing={missing}
                    stale={stale}
                    startMark={startMark}
                    onZoom={zoomToSpan}
                    // Duplo clique e Esc acontecem no gráfico: o foco fica nele, sem pular para o Aproximar
                    onZoomReset={() => applyZoom(null)}
                    zoomed={shown !== null}
                  />
                )}
                {/* Só aparece com mouse (CSS): no toque, o arrasto percorre os pontos e o zoom fica nos botões (#397) */}
                {data !== null && points.length > 0 && (
                  <p className="emissions__hint">
                    Arraste sobre o gráfico para ampliar um trecho; duplo clique ou Esc volta ao período inteiro.
                  </p>
                )}
              </div>
              {noCalculation && (
                <p className="emissions__notice">
                  Há coletas no período, mas nenhuma com emissão calculada. O cálculo depende da API de intensidade de
                  carbono da região.
                </p>
              )}
              {data !== null && data.discarded > 0 && (
                <p className="emissions__notice">
                  {data.discarded.toLocaleString('pt-BR')} item(ns) chegaram fora do formato combinado em{' '}
                  <code>docs/api.md</code> e ficaram de fora do total.
                </p>
              )}
              {data?.truncated && (
                <p className="emissions__notice">
                  Período com coletas demais para ver uma a uma: o total cobre só as mais recentes. Agrupe por 15 min ou
                  1 hora para ver o período inteiro.
                </p>
              )}
            </div>
            {data !== null && points.length > 0 && (
              <PrintTable
                points={points}
                bucket={data.bucket}
                bucketLabel={BUCKET_LABEL[data.bucket]}
                multiDay={multiDay}
                missing={missing}
              />
            )}
          </section>
        )}
      </main>

      <footer className="page-footer">EcoPulse · DEVassos · Fatec Jacareí 2DSM 2026-2</footer>
    </div>
  );
}
