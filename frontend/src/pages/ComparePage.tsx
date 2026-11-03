import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import AppHeader from '../components/AppHeader';
import CompareChart from '../components/CompareChart';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import MissingValue from '../components/MissingValue';
import { useComparison } from '../hooks/useComparison';
import { useServices } from '../hooks/useServices';
import type { ComparedService } from '../services/compare.types';
import { isDemoMode } from '../services/services.service';
import { isInputDate, spanDays, timeZoneLabel, todayInput } from '../utils/emissions';
import { formatNumber } from '../utils/format';

/** Limites de GET /api/services/compare (docs/api.md). */
const MIN_SERVICES = 2;
const MAX_SERVICES = 10;
const MAX_SPAN_DAYS = 31;

const DATE_FIELD = 'h-9 rounded-lg border border-border bg-surface-2 px-3 font-sans text-sm text-text [color-scheme:dark]';

/** ISO 8601 → "27/10/2026, 14:05", no fuso do navegador. */
function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Valor formatado, ou "—" quando não há dado no período (nunca um zero inventado). */
function amount(value: number | null, format: (value: number) => string): ReactNode {
  return value === null ? <MissingValue label="sem dado no período" title="Sem dado no período" /> : format(value);
}

function collectionsCell(service: ComparedService): ReactNode {
  if (service.collections === 0) return <span className="font-sans text-muted">sem coletas</span>;
  const details = [
    service.failed > 0 && `${service.failed.toLocaleString('pt-BR')} com falha`,
    service.notCalculated > 0 && `${service.notCalculated.toLocaleString('pt-BR')} sem cálculo`,
  ].filter(Boolean);
  return (
    <>
      {service.collections.toLocaleString('pt-BR')}
      {details.length > 0 && <span className="block font-sans text-xs text-muted">{details.join(' · ')}</span>}
    </>
  );
}

/** Uma métrica por linha e um serviço por coluna: os serviços ficam lado a lado. */
const ROWS: { label: string; cell: (service: ComparedService) => ReactNode }[] = [
  { label: 'Coletas', cell: collectionsCell },
  { label: 'CPU média', cell: (service) => amount(service.avgCpuPercent, (value) => `${formatNumber(value, 1)}%`) },
  { label: 'Memória média (GB)', cell: (service) => amount(service.avgMemoryGb, (value) => formatNumber(value, 2)) },
  { label: 'Disco médio (GB)', cell: (service) => amount(service.avgDiskGb, (value) => formatNumber(value, 2)) },
  { label: 'Rede média (GB)', cell: (service) => amount(service.avgNetworkGb, (value) => formatNumber(value, 3)) },
  { label: 'Energia (kWh)', cell: (service) => amount(service.energyKwh, (value) => formatNumber(value, 4)) },
  { label: 'CO₂e (g)', cell: (service) => amount(service.co2eGrams, (value) => formatNumber(value, 2)) },
];

/**
 * Serviços com o menor e o maior CO₂e do período (empate marca todos). Nenhum destaque quando menos de dois serviços
 * têm cálculo ou quando todos empatam.
 */
function co2eExtremes(services: ComparedService[]): { lowest: Set<string>; highest: Set<string> } {
  const calculated = services.filter((service) => service.co2eGrams !== null);
  const values = calculated.map((service) => service.co2eGrams ?? 0);
  const [min, max] = [Math.min(...values), Math.max(...values)];
  if (calculated.length < 2 || min === max) return { lowest: new Set(), highest: new Set() };
  const withValue = (target: number) =>
    new Set(calculated.filter((service) => service.co2eGrams === target).map((service) => service.id));
  return { lowest: withValue(min), highest: withValue(max) };
}

/**
 * Destaque da coluna e da barra de CO₂e: verde no menor CO₂e, laranja (alerta) no maior; sempre com o texto, nunca só
 * a cor.
 */
const EXTREME = {
  lowest: { kind: 'lowest', label: 'menor CO₂e', arrow: '↓', text: 'text-primary-hover', tint: 'bg-primary/10' },
  highest: { kind: 'highest', label: 'maior CO₂e', arrow: '↑', text: 'text-warning', tint: 'bg-warning/10' },
} as const;

/**
 * Comparação entre serviços (RF15, #194): de 2 a 10 serviços no mesmo período, por GET /api/services/compare.
 * Serviços e período ficam na URL (`?servicos=&de=&ate=`): o link abre na mesma comparação e o "voltar" do navegador
 * desfaz a última troca.
 */
export default function ComparePage() {
  const { data: servicesData, loading: servicesLoading, error: servicesError, refresh: refreshServices } = useServices();
  const [params, setParams] = useSearchParams();
  const today = todayInput();
  const services = useMemo(() => servicesData?.services ?? [], [servicesData]);

  // Filtro aplicado, vindo da URL; datas inválidas caem em hoje, como na página Emissões
  const urlStart = params.get('de');
  const urlEnd = params.get('ate');
  const start = isInputDate(urlStart) && urlStart <= today ? urlStart : today;
  const end =
    isInputDate(urlEnd) && urlEnd >= start && urlEnd <= today && spanDays(start, urlEnd) <= MAX_SPAN_DAYS ? urlEnd : start;
  // Só ids da lista de serviços (o link pode vir digitado à mão), na ordem da lista e até 10
  const urlIds = params.get('servicos') ?? '';
  const ids = useMemo(() => {
    const wanted = new Set(urlIds.split(','));
    return services.filter((service) => wanted.has(service.id)).map((service) => service.id).slice(0, MAX_SERVICES);
  }, [services, urlIds]);
  const idsKey = ids.join(',');

  // Escolhas do formulário: a busca só sai com "Comparar"
  const [draftIds, setDraftIds] = useState<string[]>(ids);
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const [formError, setFormError] = useState('');

  // A URL também muda pelo "voltar" do navegador: o formulário acompanha (ajuste na renderização, sem efeito)
  const urlFilter = `${idsKey}|${start}|${end}`;
  const [formFilter, setFormFilter] = useState(urlFilter);
  if (formFilter !== urlFilter) {
    setFormFilter(urlFilter);
    setDraftIds(idsKey === '' ? [] : idsKey.split(','));
    setDraftStart(start);
    setDraftEnd(end);
  }

  const { data, loading, error, refresh } = useComparison(ids, start, end);
  const extremes = data ? co2eExtremes(data.services) : null;
  const extremeOf = (id: string) =>
    extremes?.lowest.has(id) ? EXTREME.lowest : extremes?.highest.has(id) ? EXTREME.highest : null;

  function toggle(id: string) {
    setDraftIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const chosen = services.filter((service) => draftIds.includes(service.id)).map((service) => service.id);
    if (chosen.length < MIN_SERVICES) return setFormError('Escolha pelo menos dois serviços para comparar.');
    if (draftStart === '' || draftEnd === '') return setFormError('Preencha as duas datas.');
    if (draftStart > draftEnd) return setFormError('A data inicial deve ser anterior ou igual à data final.');
    if (draftEnd > today) return setFormError('A data final não pode estar no futuro.');
    if (spanDays(draftStart, draftEnd) > MAX_SPAN_DAYS) return setFormError(`Escolha um período de até ${MAX_SPAN_DAYS} dias.`);
    setFormError('');
    if (chosen.join(',') === idsKey && draftStart === start && draftEnd === end) return refresh();
    setParams({ servicos: chosen.join(','), de: draftStart, ate: draftEnd });
  }

  return (
    <div className="page">
      {isDemoMode && (
        <div className="demo-banner" role="note">
          Você está vendo uma demonstração com dados ilustrativos: o frontend ainda não está ligado ao backend.
        </div>
      )}

      <AppHeader />

      <main className="content">
        <h1 className="sr-only">Comparação entre serviços</h1>

        {servicesError && !servicesData && <ErrorState message={servicesError} onRetry={refreshServices} />}
        {servicesLoading && !servicesData && <LoadingState message="Carregando serviços…" />}
        {servicesData && services.length === 0 && (
          <EmptyState
            title="Nenhum serviço monitorado ainda"
            description="Os serviços aparecem aqui assim que o agregador os descobrir na próxima coleta."
          />
        )}

        {services.length > 0 && (
          <form className="panel flex flex-col gap-4 p-4" onSubmit={handleSubmit}>
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 p-0 text-sm text-muted">Serviços (de 2 a 10)</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {services.map((service) => {
                  const checked = draftIds.includes(service.id);
                  return (
                    <label key={service.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && draftIds.length >= MAX_SERVICES}
                        onChange={() => toggle(service.id)}
                        className="size-4 accent-primary"
                      />
                      {service.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm text-muted">
                Data inicial
                <input type="date" value={draftStart} max={today} onChange={(e) => setDraftStart(e.target.value)} className={DATE_FIELD} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                Data final
                <input type="date" value={draftEnd} max={today} onChange={(e) => setDraftEnd(e.target.value)} className={DATE_FIELD} />
              </label>
              <button
                type="submit"
                aria-disabled={loading}
                className="h-9 cursor-pointer rounded-lg border-0 bg-primary px-4 font-sans text-sm font-semibold text-[var(--on-accent)] hover:bg-primary-hover"
              >
                Comparar
              </button>
            </div>
            {formError && (
              <p className="m-0 text-sm text-danger" role="alert">
                {formError}
              </p>
            )}
          </form>
        )}

        {services.length > 0 && ids.length < MIN_SERVICES && (
          <EmptyState
            title="Escolha pelo menos dois serviços"
            description="Marque de 2 a 10 serviços, escolha o período (até 31 dias) e clique em Comparar."
          />
        )}

        {/* Falha: só o erro, sem a comparação anterior apresentada como atual */}
        {error && <ErrorState message={error} onRetry={refresh} />}
        {loading && <LoadingState message="Comparando os serviços…" />}

        {data && (
          <section className="panel" aria-labelledby="compare-title">
            <header className="border-b border-border px-5 py-3">
              <h2 id="compare-title" className="m-0 font-display text-lg font-semibold">
                Comparação de {data.services.length} serviços
              </h2>
              <p className="mt-1 mb-0 text-sm text-muted">
                Período: {formatMoment(data.from)} a {formatMoment(data.to)} ({timeZoneLabel(start)})
              </p>
            </header>

            {/* Rolagem horizontal só na tabela: com até 10 serviços, a página nunca ganha rolagem lateral (RNF01) */}
            <div className="relative overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-xs text-muted">
                    <td className="px-5 py-2" />
                    {data.services.map((service) => {
                      const extreme = extremeOf(service.id);
                      return (
                        <th
                          key={service.id}
                          scope="col"
                          className={`px-5 py-2 text-right align-bottom font-medium ${extreme?.tint ?? ''}`}
                        >
                          {/* Acima do nome: o destaque é a primeira coisa lida na coluna */}
                          {extreme && (
                            <span className={`mb-1 block font-semibold ${extreme.text}`}>
                              <span aria-hidden="true">{extreme.arrow} </span>
                              {extreme.label}
                            </span>
                          )}
                          <span className="block text-sm text-text">{service.name}</span>
                          {service.region}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Linhas alternadas; a cor da coluna em destaque é translúcida e deixa a alternância aparecer */}
                  {ROWS.map((row) => (
                    <tr key={row.label} className="border-t border-border even:bg-surface-3">
                      <th scope="row" className="whitespace-nowrap px-5 py-2 text-left font-medium text-muted">
                        {row.label}
                      </th>
                      {data.services.map((service) => (
                        <td key={service.id} className={`px-5 py-2 text-right font-mono ${extremeOf(service.id)?.tint ?? ''}`}>
                          {row.cell(service)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <CompareChart services={data.services} highlightOf={extremeOf} />

            <p className="m-0 border-t border-border px-5 py-3 text-xs text-muted">
              Estimativa, não medição: potência calculada a partir de CPU, memória, disco e rede × intervalo da coleta ×
              intensidade de carbono da região (ADR 0006). Energia e CO₂e somam só as coletas calculadas.
            </p>
          </section>
        )}
      </main>

      <footer className="page-footer">EcoPulse · DEVassos · Fatec Jacareí 2DSM 2026-2</footer>
    </div>
  );
}
