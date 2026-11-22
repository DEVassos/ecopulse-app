import { Fragment, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import AppHeader from '../components/AppHeader';
import CompareChart from '../components/CompareChart';
import CompareRanking from '../components/CompareRanking';
import CompareScatter from '../components/CompareScatter';
import CompareSeriesChart from '../components/CompareSeriesChart';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import EstimateTag from '../components/EstimateTag';
import LoadingState from '../components/LoadingState';
import CompactValue from '../components/CompactValue';
import EfficiencyBadge from '../components/EfficiencyBadge';
import MissingValue from '../components/MissingValue';
import PeriodPicker from '../components/PeriodPicker';
import PowerBreakdownChart from '../components/PowerBreakdownChart';
import PrintButton from '../components/PrintButton';
import { PrintPageHeader } from '../components/PrintReport';
import { useCompareSeries } from '../hooks/useCompareSeries';
import { useComparison } from '../hooks/useComparison';
import { useHorizontalOverflow } from '../hooks/useHorizontalOverflow';
import { usePrintReport } from '../hooks/usePrintReport';
import { useServices } from '../hooks/useServices';
import type { ComparedService } from '../services/compare.types';
import { isDemoMode } from '../services/services.service';
import { DEFAULT_SORT, SORT_LABEL, collectionIssues, comparisonCsv, comparisonFileName, nextSort, sortServices } from '../utils/compare-ranking';
import type { CompareSort, SortKey } from '../utils/compare-ranking';
import { CAUSE_LABEL, carbonIntensity, lowestCo2eCause } from '../utils/comparison';
import { downloadText } from '../utils/download';
import type { ResourceKey } from '../utils/comparison';
import { averagePowerFromEnergy, mostEfficient } from '../utils/efficiency';
import { BUCKET_LABEL, isInputDate, spanDays, timeZoneLabel, todayInput } from '../utils/emissions';
import { formatDurationSeconds, formatFixed, formatNumber } from '../utils/format';
import { scaleFor } from '../utils/units';

/**
 * Tooltip das linhas de eficiência (#329): a definição e o aviso de que não há dado de carga de trabalho — a potência
 * média diz quanto o serviço gasta por hora para estar no ar, não quanto ele gasta por tarefa.
 */
const POWER_NOTE =
  'Eficiência energética: energia do período ÷ tempo monitorado (soma dos intervalos das coletas calculadas), em W. '
  + 'Sem dado de carga de trabalho: compara quanto cada serviço gasta por hora para estar no ar, e não por tarefa. '
  + 'Definição em docs/calculos.md.';
const INTENSITY_NOTE =
  'Eficiência de carbono: CO₂e do período ÷ energia do mesmo período, em g CO₂e/kWh; menor é melhor porque a energia '
  + 'saiu de uma matriz mais limpa. Definição em docs/calculos.md.';

/** Limites de GET /api/services/compare (docs/api.md). */
const MIN_SERVICES = 2;
const MAX_SERVICES = 10;
const MAX_SPAN_DAYS = 31;

/** Mensagem de erro do formulário, ligada ao grupo de serviços ou aos campos de data por aria-describedby (#262). */
const FORM_ERROR_ID = 'comparacao-erro';
const SERVICES_ERROR = 'Escolha pelo menos dois serviços para comparar.';

/** ISO 8601 → "27/10/2026, 14:05", no fuso do navegador. */
function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Valor formatado, ou "—" quando não há dado no período (nunca um zero inventado). */
function amount(value: number | null, format: (value: number) => ReactNode): ReactNode {
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
interface Row {
  label: string;
  cell: (service: ComparedService) => ReactNode;
  /** Valor da linha para o selo "mais eficiente" (menor é melhor); sem ele, a linha não elege ninguém. */
  efficiency?: (service: ComparedService) => number | null;
  /** Definição no tooltip do rótulo: o que é a métrica e o que ela não diz. */
  note?: string;
  /** Texto do selo "mais eficiente" da linha; sem ele, a linha não elege ninguém mesmo com `efficiency`. */
  badge?: string;
  /** Com ela, o rótulo da linha vira o botão que ordena a comparação por esta métrica (#431). */
  sortKey?: SortKey;
}

/** Bloco de linhas da matriz: "Impacto" abre a leitura, "Detalhe das métricas" aprofunda (#328). */
interface RowGroup {
  title: string;
  rows: Row[];
}

/** Parcela de potência do recurso, ou `null` quando o backend não trouxe as quatro médias do serviço. */
function wattsOf(service: ComparedService, key: ResourceKey): number | null {
  return service.avgPowerBreakdown === null ? null : service.avgPowerBreakdown[key];
}

/**
 * Recurso do detalhe: o valor medido e a contribuição dele na potência média, "10,39 GB · 3,90 W" (#328). Sem a
 * parcela, o valor aparece sozinho — não há zero a exibir no lugar dela.
 */
function resourceCell(value: number | null, watts: number | null, decimals: number, unit: string): ReactNode {
  if (value === null) return <MissingValue label="sem dado no período" title="Sem dado no período" />;
  // O % acompanha o número sem espaço, como em toda a interface; as demais unidades vêm depois de um espaço
  const amount = `${formatNumber(value, decimals)}${unit === '%' ? '' : ' '}${unit}`;
  return (
    <>
      {amount}
      {watts !== null && <span className="text-muted"> · {formatFixed(watts, 2)} W</span>}
    </>
  );
}

/**
 * Linhas da matriz, na ordem de leitura de quem decide (#328): Energia, Intensidade e CO₂e no bloco de impacto — com
 * as energias e os CO₂e na escala única dos serviços comparados (#271) e a unidade no rótulo —, e as métricas
 * coletadas depois, no detalhe. A intensidade vem de CO₂e ÷ energia do período (`docs/calculos.md`).
 */
function rowsFor(services: ComparedService[]): RowGroup[] {
  const energy = scaleFor('energy', services.map((service) => service.energyKwh));
  const co2e = scaleFor('co2e', services.map((service) => service.co2eGrams));
  return [
    {
      title: 'Impacto',
      rows: [
        {
          label: `Energia (${energy.unit})`,
          sortKey: 'energy',
          cell: (service) =>
            amount(service.energyKwh, (value) => <CompactValue quantity="energy" value={value} scale={energy} label="Energia somada no período" />),
        },
        {
          label: 'Potência média (W)',
          sortKey: 'power',
          // Eficiência energética (#329): energia do período ÷ tempo monitorado, a conta de docs/calculos.md
          cell: (service) =>
            amount(averagePowerFromEnergy(service.energyKwh, service.monitoredSeconds), (value) => formatNumber(value, 2)),
          efficiency: (service) => averagePowerFromEnergy(service.energyKwh, service.monitoredSeconds),
          note: POWER_NOTE,
          badge: 'Menor potência média entre os serviços comparados: gasta menos energia por hora para estar no ar, sem dado de carga de trabalho.',
        },
        {
          label: 'Intensidade (g CO₂e/kWh)',
          sortKey: 'intensity',
          cell: (service) =>
            amount(carbonIntensity(service.co2eGrams, service.energyKwh), (value) => formatNumber(value, 2)),
          // Eficiência de carbono (#329): quanto CO₂e sai por kWh; menor é melhor
          efficiency: (service) => carbonIntensity(service.co2eGrams, service.energyKwh),
          note: INTENSITY_NOTE,
          badge: 'Menor intensidade de carbono entre os serviços comparados: cada kWh do período saiu de uma matriz mais limpa.',
        },
        {
          label: `CO₂e (${co2e.unit})`,
          sortKey: 'co2e',
          cell: (service) =>
            amount(service.co2eGrams, (value) => <CompactValue quantity="co2e" value={value} scale={co2e} label="CO₂e somado no período" />),
        },
      ],
    },
    {
      title: 'Detalhe das métricas',
      rows: [
        {
          // Base da potência média (#329): sem este número na tela, a conta energia ÷ tempo não é reproduzível
          label: 'Tempo monitorado',
          cell: (service) =>
            service.monitoredSeconds === null ? (
              <MissingValue label="sem coleta calculada" title="Nenhuma coleta do período foi calculada" />
            ) : (
              // Os segundos exatos no tooltip (#329): é a duração que entra na conta da potência média, e a linha
              // mostra a duração arredondada, que não fecha a conta de cabeça
              <span
                data-tooltip="Soma dos intervalos das coletas calculadas no período: é o divisor da potência média"
                data-tooltip-value={`${formatNumber(service.monitoredSeconds, 0)} s`}
              >
                {formatDurationSeconds(service.monitoredSeconds)}
              </span>
            ),
        },
        { label: 'Coletas', cell: collectionsCell },
        {
          label: 'CPU média',
          cell: (service) => resourceCell(service.avgCpuPercent, wattsOf(service, 'cpuW'), 1, '%'),
        },
        {
          label: 'Memória média',
          cell: (service) => resourceCell(service.avgMemoryGb, wattsOf(service, 'memoryW'), 2, 'GB'),
        },
        {
          label: 'Disco médio',
          cell: (service) => resourceCell(service.avgDiskGb, wattsOf(service, 'diskW'), 2, 'GB'),
        },
        {
          label: 'Rede na coleta',
          cell: (service) => resourceCell(service.avgNetworkGb, wattsOf(service, 'networkW'), 3, 'GB'),
        },
      ],
    },
  ];
}

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
 * Rótulo da matriz que ordena a comparação (#431): clicar na métrica ordena do menor para o maior, e clicar de novo
 * inverte. A seta mostra a ordem vigente; o `aria-sort` fica na célula de cabeçalho.
 */
function SortButton({ label, sortKey, sort, onSort }: { label: string; sortKey: SortKey; sort: CompareSort; onSort: (key: SortKey) => void }) {
  const current = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      title={`Ordenar por ${SORT_LABEL[sortKey]}`}
      className={`inline-flex min-h-6 cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-sans text-sm font-medium underline-offset-2 hover:underline ${current ? 'text-text' : 'text-muted'}`}
    >
      {label}
      <span aria-hidden="true" className={current ? 'text-secondary' : 'text-faint'}>
        {current ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );
}

const ariaSort = (sort: CompareSort, key: SortKey | undefined) =>
  key !== undefined && sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined;

/** Destaque da coluna e da barra de CO₂e: sempre com o texto, nunca só a cor. */
interface Extreme {
  kind: 'lowest' | 'highest';
  label: string;
  arrow: string;
  text: string;
  tint: string;
}

/**
 * Verde (primária) no menor CO₂e, laranja (alerta) no maior; a coluna e a barra usam o mesmo objeto, então o texto do
 * destaque nunca diverge entre a tabela e o gráfico. No menor CO₂e o rótulo ganha a causa da diferença (#328).
 */
const EXTREME: Record<Extreme['kind'], Extreme> = {
  lowest: { kind: 'lowest', label: 'menor CO₂e', arrow: '↓', text: 'text-primary-hover', tint: 'bg-primary/10' },
  highest: { kind: 'highest', label: 'maior CO₂e', arrow: '↑', text: 'text-warning', tint: 'bg-warning/10' },
};

/**
 * Comparação entre serviços (RF15, #194): de 2 a 10 serviços no mesmo período, por GET /api/services/compare.
 * Serviços e período ficam na URL (`?servicos=&de=&ate=`): o link abre na mesma comparação e o "voltar" do navegador
 * desfaz a última troca.
 */
export default function ComparePage() {
  const { data: servicesData, loading: servicesLoading, error: servicesError, refresh: refreshServices } = useServices();
  // Relatório impresso / PDF (#408): a folha A4 com o rodapé da comparação, sempre no tema claro
  usePrintReport('compare');
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
  const [matrixScrollRef, matrixHasMore] = useHorizontalOverflow<HTMLDivElement>();
  // Ordem da comparação (#431): estado de tela, não muda a consulta; ranking, matriz, gráficos e CSV seguem a mesma
  const [sort, setSort] = useState<CompareSort>(DEFAULT_SORT);
  // Serviço sob o ponteiro ou o foco em qualquer bloco: o mesmo fica destacado nos outros (#431)
  const [activeId, setActiveId] = useState<string | null>(null);

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

  // Séries de CO₂e dos serviços comparados (#406): a lista só troca de identidade quando a composição muda, senão o
  // gráfico refaria as buscas a cada resposta nova da comparação
  const seriesKey = data?.services.map((service) => service.id).join(',') ?? '';
  const seriesServices = useMemo(
    () => (data?.services ?? []).map((service) => ({ id: service.id, name: service.name, region: service.region })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- derivado de `data`: a chave basta e evita busca a cada refetch
    [seriesKey],
  );
  const compareSeries = useCompareSeries(seriesServices, start, end);
  // Só há linha a desenhar quando ao menos um serviço tem cálculo no período (intervalo sem cálculo não vale zero)
  const seriesHasValues = compareSeries.data?.rows.some((row) => row.total !== null) ?? false;
  const seriesNames = new Map((data?.services ?? []).map((service) => [service.id, service.name]));
  const ranked = useMemo(() => (data ? sortServices(data.services, sort) : []), [data, sort]);
  const issues = collectionIssues(ranked);
  const extremes = data ? co2eExtremes(data.services) : null;
  // Por que o serviço de menor CO₂e emite menos; null quando os dados não sustentam uma causa
  const cause = data ? lowestCo2eCause(data.services) : null;
  const extremeOf = (id: string): Extreme | null => {
    if (extremes?.lowest.has(id)) {
      return cause?.id === id ? { ...EXTREME.lowest, label: `${EXTREME.lowest.label}: ${CAUSE_LABEL[cause.kind]}` } : EXTREME.lowest;
    }
    return extremes?.highest.has(id) ? EXTREME.highest : null;
  };
  // Coluna do serviço apontado: o destaque cruzado tem prioridade sobre a cor do menor e do maior CO₂e
  const columnTint = (id: string) => (activeId === id ? 'bg-secondary/15' : extremeOf(id)?.tint ?? '');
  const pointAt = (id: string) => ({ onPointerEnter: () => setActiveId(id), onPointerLeave: () => setActiveId(null) });
  const sortBy = (key: SortKey) => setSort((current) => nextSort(current, key));

  function toggle(id: string) {
    setDraftIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  /** Serviços marcados, na ordem da lista. */
  const chosenIds = () => services.filter((service) => draftIds.includes(service.id)).map((service) => service.id);

  /** Período do seletor (#273): com dois ou mais serviços marcados, a comparação já sai com ele, como em "Comparar". */
  function choosePeriod(nextStart: string, nextEnd: string) {
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    const chosen = chosenIds();
    if (chosen.length < MIN_SERVICES) return;
    setFormError('');
    if (chosen.join(',') === idsKey && nextStart === start && nextEnd === end) return refresh();
    setParams({ servicos: chosen.join(','), de: nextStart, ate: nextEnd });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const chosen = chosenIds();
    if (chosen.length < MIN_SERVICES) return setFormError(SERVICES_ERROR);
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

      <main id="conteudo" tabIndex={-1} className="content">
        <h1 className="sr-only">Comparação entre serviços</h1>

        {servicesError && !servicesData && <ErrorState message={servicesError} onRetry={refreshServices} />}
        {servicesLoading && !servicesData && <LoadingState message="Carregando serviços…" />}
        {servicesData && services.length === 0 && (
          <EmptyState
            title="Nenhum serviço monitorado ainda"
            description="Os serviços aparecem aqui assim que o agregador os descobrir na próxima coleta."
          />
        )}

        {/* Chips com região (#267): marcar um serviço é um clique, e a região ao lado lembra o efeito da matriz elétrica */}
        {services.length > 0 && (
          <form className="compare-form panel flex flex-col gap-4 p-4" onSubmit={handleSubmit}>
            <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={formError === SERVICES_ERROR ? FORM_ERROR_ID : undefined}>
              <legend className="float-left mb-2 p-0 text-xs text-muted">
                Serviços <span className="text-text">· {draftIds.length} de {MAX_SERVICES} selecionados</span>
              </legend>
              <button
                type="button"
                onClick={() => setDraftIds([])}
                disabled={draftIds.length === 0}
                className="float-right -mt-1 mb-2 min-h-6 cursor-pointer border-0 bg-transparent p-0 font-sans text-xs text-secondary underline underline-offset-2 hover:text-[var(--sky-hover)] disabled:cursor-default disabled:text-muted disabled:no-underline"
              >
                Limpar
              </button>
              <div className="clear-both flex flex-wrap gap-2">
                {services.map((service) => {
                  const checked = draftIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      aria-pressed={checked}
                      disabled={!checked && draftIds.length >= MAX_SERVICES}
                      onClick={() => toggle(service.id)}
                      className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 font-sans text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        checked ? 'border-primary bg-primary/10 text-text' : 'border-border bg-surface-2 text-text hover:border-muted'
                      }`}
                    >
                      {/* Lugar fixo do ✓: o chip não muda de largura ao marcar */}
                      <span className={`grid size-3.5 place-items-center rounded-full ${checked ? 'text-primary-hover' : 'border border-faint'}`} aria-hidden="true">
                        {checked && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                            <path d="m5 12 5 5 9-10" />
                          </svg>
                        )}
                      </span>
                      {service.name}
                      {service.region && <span className="text-xs text-muted">{service.region}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
              <fieldset className="m-0 w-full min-w-0 border-0 p-0 min-[600px]:w-auto [&_.period-picker]:w-full min-[600px]:[&_.period-picker]:w-auto">
                <legend className="mb-1 p-0 text-xs text-muted">Período</legend>
                <PeriodPicker start={draftStart} end={draftEnd} today={today} maxDays={MAX_SPAN_DAYS} onChange={choosePeriod} />
              </fieldset>
              <button
                type="submit"
                aria-disabled={loading}
                className="h-9 w-full cursor-pointer min-[600px]:w-auto rounded-lg border-0 bg-primary px-4 font-sans text-sm font-semibold text-[var(--on-accent)] hover:bg-primary-hover"
              >
                Comparar
              </button>
            </div>
            {formError && (
              <p id={FORM_ERROR_ID} className="m-0 text-sm text-danger" role="alert">
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

        {/* Cabeçalho do relatório impresso (#408): logo, título e período, no lugar do cabeçalho da tela, que some no papel */}
        {data && (
          <PrintPageHeader
            label="Relatório de comparação · DEVassos"
            title={`Comparação de ${data.services.length} serviços`}
            items={[
              { label: 'Período', value: `${formatMoment(data.from)} a ${formatMoment(data.to)}` },
              { label: 'Fuso', value: timeZoneLabel(start) },
            ]}
          />
        )}

        {data && (
          <section className="panel" aria-labelledby="compare-title">
            <header className="compare__header border-b border-border px-5 py-3">
              {/* O método da estimativa fica no tooltip da etiqueta, não numa frase no rodapé (#272) */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h2 id="compare-title" className="m-0 font-display text-lg font-semibold">
                  Comparação de {data.services.length} serviços
                </h2>
                <EstimateTag note="Energia e CO₂e somam só as coletas calculadas." />
                {/* Impressão / PDF da comparação (#408): o papel sai pelo print.css, sem os filtros acima */}
                <div className="print-toolbar ml-auto flex flex-wrap gap-2">
                  {/* CSV da comparação (#431): as linhas da matriz, um serviço por linha, na ordem da tela */}
                  <button
                    type="button"
                    className="btn-outline inline-flex min-h-8 cursor-pointer items-center gap-2 px-3 text-sm"
                    title="Baixa as linhas da matriz em CSV, um serviço por linha, na ordem da tela"
                    onClick={() => downloadText(comparisonCsv(ranked), comparisonFileName(start, end))}
                  >
                    Baixar CSV
                  </button>
                  <PrintButton />
                </div>
              </div>
              <p className="mt-1 mb-0 text-sm text-muted">
                Período: {formatMoment(data.from)} a {formatMoment(data.to)} ({timeZoneLabel(start)})
              </p>
            </header>

            {/* Alerta agregado (#431): quem teve coleta com falha ou sem cálculo, antes de qualquer número do período */}
            {issues.length > 0 && (
              <p className="m-0 border-b border-border bg-warning/10 px-5 py-2.5 text-sm text-text" role="status">
                <span className="font-semibold text-warning">Coletas com falha ou sem cálculo no período: </span>
                {issues
                  .map((issue) => {
                    const parts = [
                      issue.failed > 0 && `${issue.failed.toLocaleString('pt-BR')} com falha`,
                      issue.notCalculated > 0 && `${issue.notCalculated.toLocaleString('pt-BR')} sem cálculo`,
                    ].filter(Boolean);
                    return `${issue.name} (${parts.join(' · ')})`;
                  })
                  .join(', ')}
                . Energia e CO₂e somam só as coletas calculadas.
              </p>
            )}

            <CompareRanking
              services={ranked}
              sort={sort}
              onSortChange={setSort}
              activeId={activeId}
              onActiveChange={setActiveId}
              highlightOf={extremeOf}
            />

            {/* Rolagem horizontal só na tabela: com até 10 serviços, a página nunca ganha rolagem lateral (RNF01) */}
            {/* scroll-edge: sombra na borda direita enquanto há serviços escondidos (#263) */}
            <div className={matrixHasMore ? 'scroll-edge scroll-edge--more' : 'scroll-edge'}>
            <div ref={matrixScrollRef} className="relative overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-xs text-muted">
                    <th scope="col" aria-sort={ariaSort(sort, 'name')} className="px-5 py-2 text-left align-bottom font-medium">
                      <SortButton label="Serviço" sortKey="name" sort={sort} onSort={sortBy} />
                    </th>
                    {ranked.map((service) => {
                      const extreme = extremeOf(service.id);
                      return (
                        <th
                          key={service.id}
                          scope="col"
                          className={`px-5 py-2 text-right align-bottom font-medium ${columnTint(service.id)}`}
                          {...pointAt(service.id)}
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
                  {rowsFor(ranked).map((group) => (
                    <Fragment key={group.title}>
                      {/* Título do bloco: "Impacto" antes do detalhe, na leitura de quem decide (#328) */}
                      <tr className="border-t border-border">
                        <th
                          scope="colgroup"
                          colSpan={data.services.length + 1}
                          className="px-5 pt-3 pb-1 text-left text-xs font-semibold text-text-2"
                        >
                          {group.title}
                        </th>
                      </tr>
                      {/* Linhas alternadas; a cor da coluna em destaque é translúcida e deixa a alternância aparecer */}
                      {group.rows.map((row) => {
                        // Selo "mais eficiente" da linha (#329): o menor valor entre os serviços com dado no período
                        const best = row.efficiency ? mostEfficient(ranked, row.efficiency) : null;
                        return (
                          <tr key={row.label} className="even:bg-surface-3">
                            <th
                              scope="row"
                              data-tooltip={row.note}
                              aria-sort={ariaSort(sort, row.sortKey)}
                              className={`whitespace-nowrap px-5 py-2 text-left font-medium text-muted${row.note ? ' cursor-help' : ''}`}
                            >
                              {row.sortKey ? <SortButton label={row.label} sortKey={row.sortKey} sort={sort} onSort={sortBy} /> : row.label}
                            </th>
                            {ranked.map((service) => (
                              <td key={service.id} className={`px-5 py-2 text-right font-data ${columnTint(service.id)}`} {...pointAt(service.id)}>
                                {row.cell(service)}
                                {best === service.id && row.badge && <EfficiencyBadge title={row.badge} />}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            </div>

            {/* CO₂e no tempo (#406): a matriz e as barras comparam o período inteiro, a linha mostra quando */}
            <figure className="m-0 flex flex-col gap-3 border-t border-border px-5 py-4">
              <figcaption className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-display text-sm font-semibold text-text">CO₂e ao longo do período</span>
                <span className="text-xs text-muted">
                  uma linha por serviço, a cada {BUCKET_LABEL[compareSeries.bucket]}
                </span>
              </figcaption>

              {compareSeries.loading && <LoadingState message="Carregando as linhas de CO₂e…" />}
              {!compareSeries.loading && compareSeries.error !== '' && (
                <ErrorState message={compareSeries.error} onRetry={compareSeries.refresh} />
              )}
              {!compareSeries.loading && compareSeries.data && !seriesHasValues && (
                <EmptyState
                  title="Sem cálculo de CO₂e no período"
                  description="As linhas aparecem quando as coletas dos serviços escolhidos têm CO₂e calculado neste período; intervalo sem cálculo não vira zero."
                />
              )}
              {!compareSeries.loading && compareSeries.data && seriesHasValues && (
                <CompareSeriesChart
                  series={compareSeries.data}
                  bucket={compareSeries.bucket}
                  fromMs={compareSeries.fromMs}
                  toMs={compareSeries.toMs}
                  highlightOf={extremeOf}
                />
              )}

              {/* Falha isolada: a linha do serviço sai e a tela diz qual, sem esconder as demais */}
              {compareSeries.failed.length > 0 && (
                <p className="m-0 text-xs text-warning" role="status">
                  Sem série de CO₂e no período para{' '}
                  {compareSeries.failed.map((id) => seriesNames.get(id) ?? id).join(', ')}. As demais linhas continuam no gráfico.
                </p>
              )}
            </figure>

            <CompareChart services={ranked} highlightOf={extremeOf} activeId={activeId} onActiveChange={setActiveId} />
            <CompareScatter services={ranked} highlightOf={extremeOf} activeId={activeId} onActiveChange={setActiveId} />

            {/* Composição da potência média: mesma ordem de colunas da tabela (#328) */}
            <PowerBreakdownChart services={ranked} activeId={activeId} onActiveChange={setActiveId} />

          </section>
        )}
      </main>

      <footer className="page-footer">EcoPulse · DEVassos · Fatec Jacareí 2DSM 2026-2</footer>
    </div>
  );
}
