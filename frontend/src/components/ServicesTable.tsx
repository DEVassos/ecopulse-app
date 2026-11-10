import { useMemo, useState } from 'react';
import type { MonitoredService, ServiceStatus } from '../services/services.types';
import { formatNumber, formatTimeOrDayTime } from '../utils/format';
import { formatShare } from '../utils/ranking';
import type { RankingShare } from '../utils/ranking';
import { statusReasonText } from '../utils/status';
import { factorMissing, factorTooltip, intervalText, powerText, resourcesText } from '../utils/service-reading';
import { formatInScale, scaleFor } from '../utils/units';
import type { Quantity } from '../utils/units';
import { useHorizontalOverflow } from '../hooks/useHorizontalOverflow';
import CompactValue from './CompactValue';
import MissingValue from './MissingValue';
import StatusBadge from './StatusBadge';

type SortKey = 'name' | 'cpuPercent' | 'energyKwh' | 'emissionsG' | 'carbonIntensityGco2ePerKwh' | 'share' | 'lastReadingAt' | 'location' | 'status';

interface Column {
  key: SortKey;
  label: string;
  numeric?: boolean;
  /** Energia ou CO₂e: a unidade da escala da coluna entra no cabeçalho (#271). */
  quantity?: Quantity;
}

/** Estados que pedem investigação: a linha ganha o botão de ver o histórico ao lado do selo (#272). */
const NEEDS_ACTION: ReadonlySet<ServiceStatus> = new Set<ServiceStatus>(['indisponivel', 'sem_metricas']);

// Status logo depois do nome: em notebook, a última coluna fica longe demais do serviço
const COLUMNS: Column[] = [
  { key: 'name', label: 'Serviço' },
  { key: 'status', label: 'Status' },
  { key: 'cpuPercent', label: 'CPU', numeric: true },
  // "na última leitura": a tabela fica logo abaixo dos totais de 24 h e não pode parecer um total do período (#259)
  { key: 'energyKwh', label: 'Energia na última leitura', numeric: true, quantity: 'energy' },
  { key: 'emissionsG', label: 'Emissão na última leitura', numeric: true, quantity: 'co2e' },
  // O fator que liga energia a emissão (#298): logo depois da emissão que ele explica, antes da parte no período
  { key: 'carbonIntensityGco2ePerKwh', label: 'Fator da região (gCO₂e/kWh)', numeric: true },
  { key: 'share', label: 'Parte do CO₂e (24 h)', numeric: true },
  { key: 'lastReadingAt', label: 'Última leitura', numeric: true },
  { key: 'location', label: 'Localização' },
];

/** Ordem crescente do status: o que precisa de atenção vem primeiro. */
const STATUS_ORDER: Record<ServiceStatus, number> = {
  indisponivel: 0,
  sem_metricas: 1,
  ativo: 2,
  removido: 3,
};

interface Props {
  /** Energia e emissão são da última leitura de cada serviço, cujo horário está na coluna "Última leitura". */
  services: MonitoredService[];
  /** Clique na linha (ou Enter no nome): abre os detalhes e o histórico do serviço. */
  onSelect: (service: MonitoredService) => void;
  /** A última busca falhou: os números são da atualização anterior e ficam apagados, como nos cards (#261). */
  stale?: boolean;
  /**
   * Parte de cada serviço no CO₂e das últimas 24 h, pelo id (GET /services/ranking, #260). Também dá a ordem inicial,
   * que segue o período e não a leitura instantânea. null enquanto o ranking não chegou: a coluna diz o motivo.
   */
  shares?: Map<string, RankingShare> | null;
  /** A última busca do ranking falhou (#261): a coluna fica em --muted, como os cards. */
  sharesStale?: boolean;
}

type Shares = Map<string, RankingShare> | null | undefined;

/** Valor de ordenação da coluna: localização por região, país e cidade; status pela gravidade; parte pelo CO₂e do período. */
function sortValue(service: MonitoredService, key: SortKey, shares: Shares): string | number | null {
  if (key === 'share') return shares?.get(service.id)?.co2eGrams ?? null;
  if (key === 'location') return [service.regionCode, service.region, service.country, service.city].filter(Boolean).join(' ') || null;
  if (key === 'status') return STATUS_ORDER[service.status];
  return service[key];
}

/** Compara dois serviços pela coluna; valores ausentes (sem métrica) vão sempre para o fim. */
function compare(a: MonitoredService, b: MonitoredService, key: SortKey, direction: 1 | -1, shares: Shares): number {
  const left = sortValue(a, key, shares);
  const right = sortValue(b, key, shares);
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  if (typeof left === 'string' && typeof right === 'string') return left.localeCompare(right, 'pt-BR') * direction;
  return ((left as number) - (right as number)) * direction;
}

/** Localização em texto discreto: "Ashburn, United States · Virginia" (cidade, país · região), só com as partes informadas. */
function locationText(service: MonitoredService): string {
  const place = [service.city, service.country].filter(Boolean).join(', ');
  return [place, service.region].filter(Boolean).join(' · ');
}

/**
 * Barra da parte no período (docs/identidade-visual.md § Barras de ranking): o 1º em neon e com o rótulo "1º", nunca só
 * a cor. A barra é proporcional ao 1º (`leaderShare`, que fica cheio); a porcentagem ao lado é a parte no total.
 * Três ausências diferentes, cada uma com seu texto (#260): ranking não carregado, serviço fora do ranking e serviço no
 * ranking sem CO₂e calculado no período — nenhuma delas pode aparecer como "0%", que pareceria medição.
 */
function ShareCell({
  share,
  ranked,
  leaderShare,
  stale,
}: {
  share: RankingShare | undefined;
  /** Chegou alguma resposta do ranking: sem ela, "—" é falta de dado da página, não do serviço. */
  ranked: boolean;
  leaderShare: number;
  stale: boolean;
}) {
  if (!ranked) {
    return <MissingValue label="ranking do período indisponível" title="Ranking de CO₂e das últimas 24 h indisponível: a coluna volta na próxima atualização" />;
  }
  if (!share) {
    return <MissingValue label="serviço fora do ranking" title="Fora do ranking: sem CO₂e calculado nas últimas 24 h" />;
  }
  if (share.share === null) {
    return <MissingValue label="sem cálculo no período" title="No ranking, mas sem CO₂e calculado nas últimas 24 h" />;
  }
  // Com total zero não há quem pese mais: sem "1º" nem neon numa barra vazia, como a frase acima da tabela, que some
  const leader = share.position === 1 && leaderShare > 0;
  const first = leader && !stale;
  const bar = stale ? 'bg-muted' : first ? 'bg-[var(--neon)] shadow-[0_0_6px_var(--neon-glow)]' : 'bg-primary-hover';
  // Total do período zero: todas as partes são 0, e dividir por zero deixaria a barra sem largura calculável
  const width = leaderShare > 0 ? Math.max((share.share / leaderShare) * 100, 1) : 0;
  return (
    <span className={`inline-flex items-center justify-end gap-2 ${stale ? 'text-muted' : ''}`}>
      {leader && <span className={`font-sans text-xs font-semibold ${stale ? '' : 'text-[var(--neon)]'}`}>1º</span>}
      <span className="block h-1.5 w-16 overflow-hidden rounded-full bg-border" aria-hidden="true">
        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${width}%` }} />
      </span>
      <span className={`w-12 ${first ? 'text-text' : ''}`}>{formatShare(share.share)}</span>
    </span>
  );
}

/** Tabela operacional dos serviços monitorados (RF09, RF12): busca por nome, ordenação por coluna e clique para os detalhes. */
export default function ServicesTable({ services, onSelect, stale = false, shares = null, sharesStale = false }: Props) {
  const [search, setSearch] = useState('');
  // Ordem inicial por gravidade (Status crescente): indisponíveis e sem métricas no topo, acima da dobra
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [scrollRef, hasMoreColumns] = useHorizontalOverflow<HTMLDivElement>();
  // Barra proporcional ao 1º do período: quem lidera fica com a barra cheia e os demais com a fração dele
  const leaderShare = useMemo(() => Math.max(0, ...[...(shares?.values() ?? [])].map((item) => item.share ?? 0)), [shares]);
  // Uma unidade por coluna, escolhida pelo maior valor de todos os serviços (e não só dos filtrados pela busca, para a
  // unidade não pular enquanto se digita): números comparáveis e alinhados, com a unidade no cabeçalho (#271)
  const scales = useMemo(
    () => ({
      energy: scaleFor('energy', services.map((service) => service.energyKwh)),
      co2e: scaleFor('co2e', services.map((service) => service.emissionsG)),
    }),
    [services],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return services
      .filter((service) => service.name.toLocaleLowerCase('pt-BR').includes(term))
      .sort(
        (a, b) =>
          // Removido sempre no fim, em qualquer ordenação: o último dado dele não pode liderar uma coluna (#261)
          Number(a.status === 'removido') - Number(b.status === 'removido') ||
          compare(a, b, sortKey, direction, shares) ||
          // Mesmo status: maior CO₂e das 24 h primeiro, nos dois sentidos (#260). Pela leitura instantânea, a ordem
          // mudaria a cada ciclo; ela só serve enquanto o ranking não chegou. O nome desempata, para a ordem ficar estável.
          (sortKey === 'status' ? compare(a, b, shares ? 'share' : 'emissionsG', -1, shares) : 0) ||
          a.name.localeCompare(b.name, 'pt-BR'),
      );
  }, [services, search, sortKey, direction, shares]);

  function sortBy(column: Column) {
    if (column.key === sortKey) {
      setDirection((current) => (current === 1 ? -1 : 1));
    } else {
      setSortKey(column.key);
      // Texto começa em A→Z (status: mais grave primeiro); números começam do maior para o menor
      setDirection(column.numeric ? -1 : 1);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface" aria-labelledby="services-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-2.5">
        <h2 id="services-title" className="m-0 font-display text-lg font-semibold">
          Serviços monitorados
        </h2>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="sr-only">Buscar serviço por nome</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome…"
            className="field-focus h-9 w-60 max-w-full rounded-lg border border-border bg-surface-2 px-3 font-sans text-sm text-text outline-none placeholder:text-muted focus:border-primary"
          />
        </label>
      </div>

      {/* Rolagem horizontal em telas estreitas: a tabela nunca quebra o layout (RNF01) */}
      {/* relative: os textos sr-only (position: absolute) das células ficam dentro da rolagem, sem alargar a página */}
      {/* scroll-edge: sombra na borda direita enquanto há colunas escondidas (#263) */}
      <div className={hasMoreColumns ? 'scroll-edge scroll-edge--more' : 'scroll-edge'}>
      <div ref={scrollRef} className="relative overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            {/* Cabeçalhos quebram em duas linhas (#298): com nove colunas, títulos numa linha só não cabem em 1366 px */}
            <tr className="align-bottom text-left text-xs leading-tight text-muted">
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-5 py-1 font-medium ${column.numeric ? 'text-right' : ''}`}
                  aria-sort={sortKey === column.key ? (direction === 1 ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => sortBy(column)}
                    // 24 px de altura (#262): alvo mínimo de toque; o cabeçalho tira 4 px de cada lado para não crescer
                    className={`min-h-6 cursor-pointer border-0 bg-transparent p-0 font-sans text-xs font-medium hover:text-text ${sortKey === column.key ? 'text-text' : 'text-muted'}`}
                  >
                    {column.quantity ? `${column.label} (${scales[column.quantity].unit}${column.quantity === 'co2e' ? ' CO₂e' : ''})` : column.label}
                    <span aria-hidden="true">{'\u00a0'}{sortKey === column.key ? (direction === 1 ? '↑' : '↓') : '↕'}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((service) => {
              // Número que não é atual fica apagado: a busca falhou ou o serviço saiu do agregador (#261)
              const dim = stale || service.status === 'removido' ? ' text-muted' : '';
              return (
                // O clique vale para a linha toda; o botão do nome dá o mesmo acesso pelo teclado (o clique dele sobe até aqui).
                // Focar o botão antes de abrir faz o foco voltar para ele ao fechar, mesmo com clique fora do nome.
                <tr
                  key={service.id}
                  onClick={(event) => {
                    // O foco volta, ao fechar, para o botão clicado (nome ou "Ver histórico"); fora deles, para o nome
                    const clicked = event.target instanceof Element ? event.target.closest('button') : null;
                    (clicked ?? event.currentTarget.querySelector('button'))?.focus();
                    onSelect(service);
                  }}
                  className="cursor-pointer border-t border-border hover:bg-surface-2"
                >
                  <th scope="row" className="px-5 py-2 text-left font-medium">
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      data-tooltip="Ver detalhes e histórico de coletas"
                      className="cursor-pointer border-0 bg-transparent p-0 text-left font-sans text-sm font-medium text-text underline decoration-border underline-offset-4 hover:decoration-primary"
                    >
                      {service.name}
                    </button>
                    {/* Celular (#263): a emissão fica a uma rolagem de distância; ela aparece também sob o nome, abaixo de 600 px */}
                    <span className="mt-0.5 block font-data text-xs font-normal text-muted min-[600px]:hidden">
                      {service.emissionsG === null ? 'sem emissão calculada' : `${formatInScale(service.emissionsG, scales.co2e)} ${scales.co2e.unit} CO₂e`}
                    </span>
                  </th>
                  {/* O badge é o único elemento colorido da linha; com problema, a ação de investigar fica ao lado dele (#272) */}
                  <td className="px-5 py-2">
                    <span className="inline-flex items-center gap-2">
                      <StatusBadge status={service.status} />
                      {NEEDS_ACTION.has(service.status) && (
                        <button
                          type="button"
                          aria-haspopup="dialog"
                          aria-label={`Ver histórico de ${service.name}`}
                          data-tooltip="Ver histórico"
                          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent p-0 text-muted hover:border-primary hover:text-text"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                            <path d="M3 3v5h5" />
                            <path d="M12 7v5l3 2" />
                          </svg>
                        </button>
                      )}
                    </span>
                    {/* Motivo do estado em texto, embaixo do selo e da ação (#176) */}
                    {statusReasonText(service) && (
                      <span className="mt-1 block max-w-56 text-xs leading-snug text-muted">{statusReasonText(service)}</span>
                    )}
                  </td>
                  {/* Potência em destaque e recursos no tooltip (#298); o atributo fica antes de className porque os testes
                      casam a classe colada ao valor. Quem usa teclado vê os mesmos dados na janela de detalhes */}
                  <td data-tooltip={resourcesText(service) ?? undefined} data-tooltip-value={powerText(service) ?? undefined} className={`px-5 py-2 text-right font-data${dim}`}>
                    {service.cpuPercent === null ? <MissingValue /> : `${formatNumber(service.cpuPercent, 0)}%`}
                  </td>
                  {/* Mesma unidade e casas na coluna inteira (escala única, #271): vírgulas alinhadas e nenhum "0,000…" */}
                  <td className={`px-5 py-2 text-right font-data${dim}`}>
                    {service.energyKwh === null ? (
                      <MissingValue />
                    ) : (
                      <CompactValue quantity="energy" value={service.energyKwh} scale={scales.energy} label="Energia na última leitura" />
                    )}
                  </td>
                  <td className={`px-5 py-2 text-right font-data${dim}`}>
                    {service.emissionsG === null ? (
                      <MissingValue />
                    ) : (
                      <CompactValue quantity="co2e" value={service.emissionsG} scale={scales.co2e} label="CO₂e na última leitura" />
                    )}
                  </td>
                  <td className={`px-5 py-2 text-right font-data${dim}`}>
                    {service.carbonIntensityGco2ePerKwh === null ? (
                      <MissingValue {...factorMissing(service)} />
                    ) : (
                      <span data-tooltip={factorTooltip(service)}>{formatNumber(service.carbonIntensityGco2ePerKwh, 0)}</span>
                    )}
                  </td>
                  <td className="px-5 py-2 text-right font-data">
                    <ShareCell share={shares?.get(service.id)} ranked={shares !== null} leaderShare={leaderShare} stale={sharesStale} />
                  </td>
                  <td data-tooltip={intervalText(service) ?? undefined} className="px-5 py-2 text-right font-data text-muted">
                    {service.lastReadingAt === null ? 'nunca' : formatTimeOrDayTime(service.lastReadingAt)}
                  </td>
                  {/* Código da região na célula e cidade, país e nome no tooltip (#298): a coluna fica estreita para caber o fator */}
                  <td className="whitespace-nowrap px-5 py-2 text-muted">
                    {service.regionCode !== null ? (
                      <span data-tooltip={locationText(service) || 'Cidade e país não informados pelo agregador'} className="font-data">
                        {service.regionCode}
                        {locationText(service) && <span className="sr-only"> ({locationText(service)})</span>}
                      </span>
                    ) : (
                      locationText(service) || (
                        <span data-tooltip="Localização não informada pelo agregador">
                          —<span className="sr-only">sem localização</span>
                        </span>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr className="border-t border-border">
                <td colSpan={COLUMNS.length} className="px-5 py-8 text-center text-muted">
                  Nenhum serviço com “{search.trim()}” no nome.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </section>
  );
}
