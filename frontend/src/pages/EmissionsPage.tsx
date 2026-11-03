import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import AppHeader from '../components/AppHeader';
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
  autoBucket,
  describePeriod,
  formatDuration,
  formatGrams,
  formatInputDate,
  formatKwh,
  formatPeakTime,
  formatRatio,
  formatShort,
  isInputDate,
  missingTimeMs,
  peakRatio,
  periodMs,
  shiftInputDate,
  spanDays,
  summarize,
  timeZoneLabel,
  todayInput,
} from '../utils/emissions';
import { formatDayTime } from '../utils/format';
import './EmissionsPage.css';

/** Maior período aceito de uma vez (o mesmo limite da série da #189). */
const MAX_SPAN_DAYS = 31;

const BUCKETS: EmissionsBucket[] = ['coleta', '15min', '1h'];

function locationOf(service: MonitoredService): string {
  return [service.city, service.region].filter(Boolean).join(' · ');
}

/**
 * Página Emissões (#190): emissão estimada de CO₂e de uma estação ao longo do tempo.
 * Estação e período ficam na URL (`?servico=&de=&ate=`): o link abre no mesmo filtro e o "voltar" do navegador
 * desfaz a última troca.
 */
export default function EmissionsPage() {
  const { data: servicesData, loading: servicesLoading, error: servicesError, refresh: refreshServices } = useServices();
  const { refreshIntervalMs } = useMonitoring();
  const [params, setParams] = useSearchParams();
  const today = todayInput();
  const services = useMemo(() => servicesData?.services ?? [], [servicesData]);

  // Filtro aplicado (vem da URL; valor inválido ou ausente cai no padrão: hoje e a primeira estação).
  // `ate` fora do que o formulário aceita (antes de `de`, no futuro ou a mais de 31 dias) vale como inválida.
  const urlStart = params.get('de');
  const urlEnd = params.get('ate');
  const start = isInputDate(urlStart) && urlStart <= today ? urlStart : today;
  const end =
    isInputDate(urlEnd) && urlEnd >= start && urlEnd <= today && spanDays(start, urlEnd) <= MAX_SPAN_DAYS ? urlEnd : start;
  const urlService = params.get('servico');
  const service = services.find((item) => item.id === urlService) ?? services[0] ?? null;

  // Datas digitadas: a busca só sai com "Atualizar"
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const [bucket, setBucket] = useState<EmissionsBucket | null>(null);
  const [live, setLive] = useState(false);
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
    end: live ? today : end,
    bucket,
    live,
    intervalMs: refreshIntervalMs,
  });

  const points = useMemo(() => data?.points ?? [], [data]);
  const summary = useMemo(() => (data ? summarize(data.points, data.totals) : null), [data]);
  const missingMs = data && period ? missingTimeMs(data.points, data.bucket, period.fromMs, period.toMs) : 0;
  const reading = summary && data ? describePeriod(summary, data.bucket, missingMs) : [];
  const ratio = summary ? peakRatio(summary) : null;
  const totals = data?.totals ?? null;
  const range = periodMs(start, live ? today : end);
  const autoLabel = BUCKET_LABEL[autoBucket(range.fromMs, range.toMs)];

  function updateUrl(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) next.set(key, value);
    setParams(next);
  }

  function apply(nextStart: string, nextEnd: string) {
    if (nextStart === '' || nextEnd === '') return setFormError('Preencha as duas datas.');
    if (nextStart > nextEnd) return setFormError('A data inicial deve ser anterior ou igual à data final.');
    if (nextEnd > today) return setFormError('A data final não pode estar no futuro.');
    if (spanDays(nextStart, nextEnd) > MAX_SPAN_DAYS) return setFormError(`Escolha um período de até ${MAX_SPAN_DAYS} dias.`);
    setFormError('');
    if (nextStart === start && nextEnd === end) return refresh();
    updateUrl({ de: nextStart, ate: nextEnd });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // No tempo real o período é sempre hoje: "Atualizar" só busca de novo, sem esperar o intervalo
    if (live) return refresh();
    apply(draftStart, draftEnd);
  }

  /** ◀ ▶: desloca o período inteiro pelo seu próprio tamanho (um dia, por padrão). */
  function shift(direction: -1 | 1) {
    const days = spanDays(start, end) * direction;
    setLive(false);
    apply(shiftInputDate(start, days), shiftInputDate(end, days));
  }

  function toggleLive() {
    if (live) return setLive(false);
    setFormError('');
    updateUrl({ de: today, ate: today });
    setLive(true);
  }

  const canGoForward = !live && shiftInputDate(end, spanDays(start, end)) <= today;
  const shownEnd = live ? today : end;
  const periodLabel = start === shownEnd ? formatInputDate(start) : `${formatInputDate(start)} a ${formatInputDate(shownEnd)}`;
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

      <main className="content">
        <h1 className="sr-only">Emissões de CO₂e por estação</h1>

        {servicesError && !servicesData && <ErrorState message={servicesError} onRetry={refreshServices} />}
        {servicesLoading && !servicesData && <LoadingState message="Carregando estações…" />}
        {servicesData && services.length === 0 && (
          <EmptyState
            title="Nenhum serviço monitorado ainda"
            description="As estações aparecem aqui assim que o agregador descobrir os serviços na próxima coleta."
          />
        )}

        {service && (
          <section className="emissions" aria-labelledby="emissions-title">
            <form className="emissions__filters panel" onSubmit={handleSubmit}>
              <label className="emissions__field emissions__field--station">
                <span>Estação</span>
                <select value={service.id} onChange={(event) => updateUrl({ servico: event.target.value })}>
                  {services.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {locationOf(item) ? ` — ${locationOf(item)}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="emissions__field">
                <span>Data inicial</span>
                <input type="date" value={draftStart} max={today} disabled={live} onChange={(e) => setDraftStart(e.target.value)} />
              </label>
              <label className="emissions__field">
                <span>Data final</span>
                <input type="date" value={draftEnd} max={today} disabled={live} onChange={(e) => setDraftEnd(e.target.value)} />
              </label>
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

              <div className="emissions__actions">
                <div className="emissions__group">
                  <button type="button" className="emissions__btn emissions__btn--icon" onClick={() => shift(-1)} aria-label="Período anterior" title="Período anterior">
                    ◀
                  </button>
                  <button
                    type="button"
                    className="emissions__btn emissions__btn--icon"
                    onClick={() => shift(1)}
                    disabled={!canGoForward}
                    aria-label="Próximo período"
                    title="Próximo período"
                  >
                    ▶
                  </button>
                </div>
                <div className="emissions__group">
                  <button type="submit" className="emissions__btn emissions__btn--primary" aria-disabled={loading}>
                    Atualizar
                  </button>
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
                <div className="emissions__group emissions__segmented" role="group" aria-label="Forma de exibir">
                  <button type="button" className="emissions__btn" aria-pressed={mode === 'intervalo'} onClick={() => setMode('intervalo')}>
                    {data?.bucket === 'coleta' ? 'Por coleta' : 'Por intervalo'}
                  </button>
                  <button type="button" className="emissions__btn" aria-pressed={mode === 'acumulado'} onClick={() => setMode('acumulado')}>
                    Acumulado
                  </button>
                </div>
              </div>
              {formError && (
                <p className="emissions__form-error" role="alert">
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
                  aria-live="polite"
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
                  <div>
                    <dt>Média por coleta</dt>
                    <dd>{summary.meanGrams !== null ? formatGrams(summary.meanGrams) : '—'}</dd>
                  </div>
                  <div className={summary.peak ? 'emissions__stat--peak' : undefined}>
                    <dt>Pico de uma coleta</dt>
                    <dd>
                      {summary.peak?.co2eMaxGrams != null && data ? (
                        <>
                          {formatGrams(summary.peak.co2eMaxGrams)}
                          <small>
                            {formatPeakTime(summary.peak, data.bucket)}
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
                            missingMs > 0 && `${formatDuration(missingMs)} sem coleta`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </small>
                      )}
                    </dd>
                  </div>
                </dl>
              )}

              <div className="emissions__chart">
                {data === null && loading && <p className="emissions__empty">Carregando coletas…</p>}
                {data !== null && points.length === 0 && (
                  <p className="emissions__empty">Nenhuma coleta desta estação no período escolhido.</p>
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
