import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import AppHeader from '../components/AppHeader';
import DateField from '../components/DateField';
import EmissionsChart from '../components/EmissionsChart';
import type { EmissionsChartMode } from '../components/EmissionsChart';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LastUpdated from '../components/LastUpdated';
import LoadingState from '../components/LoadingState';
import { useEmissions } from '../hooks/useEmissions';
import { useMonitoring } from '../hooks/useMonitoring';
import { useServices } from '../hooks/useServices';
import type { EmissionsBucket } from '../services/emissions.types';
import { isDemoMode } from '../services/services.service';
import type { MonitoredService } from '../services/services.types';
import {
  BUCKET_LABEL,
  MAX_SPAN_DAYS,
  autoBucket,
  describePeriod,
  formatDurationMilliseconds,
  formatGrams,
  formatInputDate,
  formatKwh,
  formatPeakTime,
  formatRatio,
  formatShort,
  missingTimeMs,
  peakRatio,
  seriesStats,
  periodMs,
  readPeriodFilter,
  shiftInputDate,
  spanDays,
  summarize,
  timeZoneLabel,
  todayInput,
} from '../utils/emissions';
import { formatDayTime } from '../utils/format';
import './EmissionsPage.css';

/** Mensagem de erro do período, ligada aos dois campos de data por aria-describedby (#262). */
const FORM_ERROR_ID = 'emissoes-erro-periodo';

const BUCKETS: EmissionsBucket[] = ['coleta', '15min', '1h'];

function locationOf(service: MonitoredService): string {
  return [service.city, service.region].filter(Boolean).join(' · ');
}

/**
 * Página Emissões (#190): emissão estimada de CO₂e de um serviço ao longo do tempo.
 * Serviço, período e tempo real ficam na URL (`?servico=&de=&ate=&tempo=real`): o link abre no mesmo filtro e o
 * "voltar" do navegador desfaz a última troca, desligando o tempo real junto com a volta das datas (#212).
 */
export default function EmissionsPage() {
  const { data: servicesData, loading: servicesLoading, error: servicesError, refresh: refreshServices } = useServices();
  const { refreshIntervalMs } = useMonitoring();
  const [params, setParams] = useSearchParams();
  const today = todayInput();
  const services = useMemo(() => servicesData?.services ?? [], [servicesData]);

  // Filtro aplicado (vem da URL; valor inválido ou ausente cai no padrão: hoje e o primeiro serviço)
  const { start, end, live } = readPeriodFilter(params, today);
  const urlService = params.get('servico');
  const service = services.find((item) => item.id === urlService) ?? services[0] ?? null;

  // Datas digitadas: a busca só sai com "Aplicar"
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const [bucket, setBucket] = useState<EmissionsBucket | null>(null);
  const [mode, setMode] = useState<EmissionsChartMode>('intervalo');
  const [formError, setFormError] = useState('');

  // A URL também muda pelo "voltar" do navegador: os campos acompanham (ajuste na renderização, sem efeito)
  const urlPeriod = `${start}|${end}`;
  const [formPeriod, setFormPeriod] = useState(urlPeriod);
  if (formPeriod !== urlPeriod) {
    setFormPeriod(urlPeriod);
    setDraftStart(start);
    setDraftEnd(end);
  }

  const { data, period, loading, error, updatedAt, refresh } = useEmissions({
    serviceId: service?.id ?? null,
    start,
    end,
    bucket,
    live,
    intervalMs: refreshIntervalMs,
  });

  const points = useMemo(() => data?.points ?? [], [data]);
  const summary = useMemo(() => (data ? summarize(data.points, data.totals) : null), [data]);
  const missingMs = data && period ? missingTimeMs(data.points, data.bucket, period.fromMs, period.toMs) : 0;
  // Média e maior ponto com a mesma conta do gráfico (sem o intervalo ainda aberto): tiles, gráfico e Leitura dizem o mesmo (#271)
  const stats = useMemo(() => (data && period ? seriesStats(data.points, data.bucket, period.toMs) : null), [data, period]);
  const reading = stats && data ? describePeriod(data.points, stats, data.bucket, missingMs) : [];
  const ratio = stats && data ? peakRatio(data.points, stats) : null;
  const peakPoint = stats && stats.peakIndex !== null && data ? data.points[stats.peakIndex] : null;
  const grouped = data ? data.bucket !== 'coleta' : false;
  const totals = data?.totals ?? null;
  const range = periodMs(start, end);
  const autoLabel = BUCKET_LABEL[autoBucket(range.fromMs, range.toMs)];

  /** Grava as mudanças na URL (uma entrada no histórico do navegador); `null` tira a chave. */
  function updateUrl(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next);
  }

  function apply(nextStart: string, nextEnd: string) {
    if (nextStart === '' || nextEnd === '') return setFormError('Preencha as duas datas no formato DD/MM/AAAA.');
    if (nextStart > nextEnd) return setFormError('A data inicial deve ser anterior ou igual à data final.');
    if (nextEnd > today) return setFormError('A data final não pode estar no futuro.');
    if (spanDays(nextStart, nextEnd) > MAX_SPAN_DAYS) return setFormError(`Escolha um período de até ${MAX_SPAN_DAYS} dias.`);
    setFormError('');
    if (nextStart === start && nextEnd === end) return refresh();
    updateUrl({ de: nextStart, ate: nextEnd, tempo: null });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // No tempo real o período é sempre hoje: "Aplicar" só busca de novo, sem esperar o intervalo
    if (live) return refresh();
    apply(draftStart, draftEnd);
  }

  /** ◀ ▶: desloca o período inteiro pelo seu próprio tamanho (um dia, por padrão). */
  function shift(direction: -1 | 1) {
    const days = spanDays(start, end) * direction;
    apply(shiftInputDate(start, days), shiftInputDate(end, days));
  }

  function toggleLive() {
    setFormError('');
    if (live) return updateUrl({ tempo: null });
    updateUrl({ de: today, ate: today, tempo: 'real' });
  }

  const canGoForward = !live && shiftInputDate(end, spanDays(start, end)) <= today;
  const periodLabel = start === end ? formatInputDate(start) : `${formatInputDate(start)} a ${formatInputDate(end)}`;
  const noCalculation = totals !== null && totals.collections > 0 && totals.co2eGrams === null;
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
            {/* Barra em grupos (#267): o quê (serviço) · quando (período, com ◀ ▶ e Aplicar juntos) · como agrupar · tempo real */}
            <form className="emissions__filters panel" onSubmit={handleSubmit}>
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
                <div className="emissions__period-row">
                  <button type="button" className="emissions__btn emissions__btn--icon" onClick={() => shift(-1)} aria-label="Período anterior" title="Período anterior">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4"><path d="m15 18-6-6 6-6" /></svg>
                  </button>
                  <div className="emissions__dates">
                    <div className="emissions__field">
                      <DateField value={draftStart} onChange={setDraftStart} label="Data inicial" max={today} disabled={live} invalid={formError !== ''} describedBy={formError ? FORM_ERROR_ID : undefined} />
                    </div>
                    <span className="emissions__until" aria-hidden="true">
                      até
                    </span>
                    <div className="emissions__field">
                      <DateField value={draftEnd} onChange={setDraftEnd} label="Data final" max={today} disabled={live} invalid={formError !== ''} describedBy={formError ? FORM_ERROR_ID : undefined} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="emissions__btn emissions__btn--icon"
                    onClick={() => shift(1)}
                    disabled={!canGoForward}
                    aria-label="Próximo período"
                    title="Próximo período"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                  <button type="submit" className="emissions__btn emissions__btn--primary" aria-disabled={loading}>
                    Aplicar
                  </button>
                </div>
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
            </form>

            <div className="emissions__card panel">
              <header className="emissions__header">
                <div>
                  <h2 id="emissions-title" className="emissions__title">
                    {service.name}
                  </h2>
                  <p className="emissions__subtitle">
                    Emissão estimada de CO₂e {mode === 'acumulado' ? 'acumulada ' : ''}— {periodLabel} ({timeZoneLabel(start)})
                    {locationOf(service) && ` · ${locationOf(service)}`}
                    {data && ` · ${BUCKET_LABEL[data.bucket].toLowerCase()}`}
                  </p>
                </div>
                <LastUpdated
                  updatedAt={updatedAt}
                  intervalSeconds={live ? refreshIntervalMs / 1000 : undefined}
                  stale={error !== ''}
                >
                  {loading && <span className="emissions__spinner" aria-hidden="true" />}
                </LastUpdated>
              </header>

              {error && <ErrorState message={error} onRetry={refresh} />}

              {reading.length > 0 && (
                <div
                  className={stale ? 'emissions__reading emissions__reading--stale' : 'emissions__reading'}
                  title={staleTitle}
                  // Sem aria-live (#262): no Tempo real a frase muda a cada ciclo e seria anunciada a cada 30 s;
                  // a falha já é anunciada uma vez pelo ErrorState
                >
                  <h3>Leitura do período</h3>
                  <ul>
                    {reading.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              {totals && summary && (
                <dl className={stale ? 'emissions__stats emissions__stats--stale' : 'emissions__stats'} title={staleTitle}>
                  <div>
                    <dt>Emissão no período</dt>
                    <dd>{totals.co2eGrams !== null ? `${formatGrams(totals.co2eGrams)} CO₂e` : '—'}</dd>
                  </div>
                  <div>
                    <dt>Energia no período</dt>
                    <dd>{totals.energyKwh !== null ? formatKwh(totals.energyKwh) : '—'}</dd>
                  </div>
                  {/* Média e pico seguem o agrupamento do gráfico; a maior coleta dentro do intervalo fica no tooltip (#271) */}
                  <div>
                    <dt>{grouped && data ? `Média a cada ${BUCKET_LABEL[data.bucket]}` : 'Média por coleta'}</dt>
                    <dd>{stats?.meanGrams != null ? formatGrams(stats.meanGrams) : '—'}</dd>
                  </div>
                  <div
                    className={peakPoint ? 'emissions__stat--peak' : undefined}
                    title={
                      grouped && summary.peak?.co2eMaxGrams != null && data
                        ? `Maior coleta: ${formatGrams(summary.peak.co2eMaxGrams)} CO₂e em ${formatPeakTime(summary.peak, data.bucket)}`
                        : undefined
                    }
                  >
                    <dt>{grouped ? 'Maior intervalo' : 'Pico de uma coleta'}</dt>
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
                    <dd>{totals.carbonIntensity !== null ? `${formatShort(totals.carbonIntensity)} g/kWh` : '—'}</dd>
                  </div>
                  <div>
                    <dt>Coletas</dt>
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

              {/* Forma de exibir o gráfico: fica no card, junto do gráfico em que age (#267) */}
              <div className="emissions__chart-bar">
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
                  <p className="emissions__empty">Nenhuma coleta deste serviço no período escolhido.</p>
                )}
                {data !== null && period !== null && points.length > 0 && (
                  <EmissionsChart
                    points={points}
                    bucket={data.bucket}
                    mode={mode}
                    fromMs={period.fromMs}
                    toMs={period.toMs}
                    stale={stale}
                  />
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

              <p className="emissions__footnote">
                Estimativa, não medição: potência calculada a partir de CPU, memória, disco e rede × intervalo da coleta ×
                intensidade de carbono da região (ADR 0006).
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="page-footer">EcoPulse · DEVassos · Fatec Jacareí 2DSM 2026-2</footer>
    </div>
  );
}
