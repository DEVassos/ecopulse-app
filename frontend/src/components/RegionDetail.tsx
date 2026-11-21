import { formatNumber } from '../utils/format';
import {
  formatMigrationPercent,
  intensityRatioText,
  intensityTime,
  migrationBars,
  migrationMath,
  migrationVerdict,
  periodIntensity,
  serviceCount,
} from '../utils/region-map';
import type { ListedRegion, RegionOverview } from '../utils/region-map';
import { isCleanestOrigin, migrationChange, migrationRows } from '../utils/regions';
import type { MigrationEstimate, MigrationRow } from '../utils/regions';
import { formatQuantity } from '../utils/units';
import CleanGridBadge from './CleanGridBadge';
import './RegionDetail.css';

/** Seção da fórmula e das ressalvas, no GitHub: a tela não repete a conta, aponta para ela. */
export const CALCULOS_URL = 'https://github.com/DEVassos/ecopulse-app/blob/develop/docs/calculos.md#simulação-de-migração-regional';

interface Props {
  overview: RegionOverview;
  /** Região selecionada no mapa, na lista ou na tabela: a origem da simulação. */
  originCode: string;
  /** Destino escolhido na tabela; null mostra a mais limpa sem escolher. */
  destinationCode: string | null;
  /**
   * Escolher um destino (linha da tabela ou "Ver alternativa mais limpa") ou voltar para a origem (null). `reveal` vem dos
   * botões: o Dashboard traz o mapa à vista para a câmera andar à vista (#326).
   */
  onDestination: (code: string | null, reveal?: boolean) => void;
  /** A que período os números se referem, como aparece na tela (ex.: "últimas 24 h"). */
  periodLabel: string;
  /** A última busca falhou: os números são da atualização anterior e ficam apagados (#261). */
  stale?: boolean;
  /** Relógio da tela, para saber se a intensidade passou de 1 h; nos testes, fixo. */
  now?: Date;
}

/** O destino não tem serviço monitorado hoje: a tela diz isso, para não parecer que já há algo rodando lá. */
function isIdle(region: ListedRegion): boolean {
  return region.worstStatus === null && region.co2eGrams === null;
}

/** "Montreal" ou "Montreal (sem serviço hoje)" na tabela de destinos. */
function destinationName(region: ListedRegion): string {
  return isIdle(region) ? `${region.name} (sem serviço hoje)` : region.name;
}

/** "39,9 g a menos de CO₂e nas últimas 24 h": a diferença em palavras, nunca só pelo sinal ou pela cor. */
function deltaText(estimate: MigrationEstimate, periodLabel: string): string {
  const change = migrationChange(estimate);
  if (change.kind === 'igual') return `A mesma emissão nas ${periodLabel}`;
  return `${formatQuantity('co2e', change.grams)} a ${change.kind === 'reducao' ? 'menos' : 'mais'} de CO₂e nas ${periodLabel}`;
}

/** Coluna "Diferença" da tabela: "▼ 89,42%" ou "▲ 23,02%", com a palavra para o leitor de tela. */
function differenceCell(row: MigrationRow<ListedRegion>) {
  if (!row.available) return 'indisponível';
  if (row.estimate === null) return '—';
  const change = migrationChange(row.estimate);
  if (change.kind === 'igual') return 'igual';
  const arrow = change.kind === 'reducao' ? '▼' : '▲';
  const value = change.percent === null ? formatQuantity('co2e', change.grams) : formatMigrationPercent(change.percent);
  return (
    <>
      <span className={`region-detail__diff region-detail__diff--${change.kind}`} aria-hidden="true">
        {arrow} {value}
      </span>
      <span className="sr-only">{change.kind === 'reducao' ? 'redução de' : 'aumento de'} {value}</span>
    </>
  );
}

interface RecommendationProps {
  origin: ListedRegion;
  destination: ListedRegion;
  estimate: MigrationEstimate;
  periodLabel: string;
  stale: boolean;
}

/**
 * Cartão da simulação (#395): o veredito numa frase, o antes e o depois no mesmo eixo, a diferença em palavras e a conta;
 * logo abaixo, por que a diferença existe. A energia da origem é a mesma nos dois lados: só a rede muda.
 */
function Recommendation({ origin, destination, estimate, periodLabel, stale }: RecommendationProps) {
  const change = migrationChange(estimate);
  const originGrams = origin.co2eGrams ?? 0;
  const energyKwh = origin.energyKwh ?? 0;
  const bars = migrationBars(originGrams, estimate.grams);
  const destinationIntensity = destination.carbonIntensityGco2ePerKwh;
  const originIntensity = periodIntensity(origin.energyKwh, origin.co2eGrams);
  const ratio = intensityRatioText(originIntensity, destinationIntensity);
  const services = serviceCount(origin.services);
  const originValue = formatQuantity('co2e', originGrams);
  const simulatedValue = formatQuantity('co2e', estimate.grams);

  return (
    <>
      <div className={`region-detail__reco region-detail__reco--${change.kind}`}>
        <p className="region-detail__verdict">
          {migrationVerdict(change, destination.name)}
          <CleanGridBadge grid={destination} stale={stale} className="region-detail__badge" />
        </p>
        <div
          className="region-detail__bars"
          role="img"
          aria-label={`CO₂e nas ${periodLabel}: hoje em ${origin.name}, ${originValue}; simulado em ${destination.name}, ${simulatedValue}.`}
        >
          <span className="region-detail__bar-label">Hoje em {origin.name}</span>
          <span className="region-detail__track" aria-hidden="true">
            <span className="region-detail__fill region-detail__fill--origin" style={{ width: `${bars.origin}%` }} />
          </span>
          <span className="region-detail__bar-value font-data">{originValue}</span>
          <span className="region-detail__bar-label">Simulado em {destination.name}</span>
          <span className="region-detail__track" aria-hidden="true">
            <span className={`region-detail__fill region-detail__fill--${change.kind}`} style={{ width: `${bars.simulated}%` }} />
          </span>
          <span className="region-detail__bar-value font-data">{simulatedValue}</span>
        </div>
        <p className="region-detail__delta font-data">{deltaText(estimate, periodLabel)}</p>
        <p className="region-detail__math font-data">Conta: {migrationMath(energyKwh, destinationIntensity ?? 0, estimate.grams)}</p>
      </div>

      <div className="region-detail__why">
        <h4 className="region-detail__why-title">Por que a diferença</h4>
        <ul className="region-detail__why-list">
          <li>
            <strong>Intensidade de carbono:</strong>{' '}
            {originIntensity === null ? 'sem cálculo' : `${formatNumber(originIntensity, 0)} g/kWh`} em {origin.name} no período
            (CO₂e ÷ energia) contra {destinationIntensity === null ? 'sem dado' : `${formatNumber(destinationIntensity, 0)} g/kWh`} em{' '}
            {destination.name} agora{ratio ? `: ${ratio}` : ''}.
          </li>
          <li>
            <strong>Energia considerada:</strong> {formatQuantity('energy', energyKwh)}, a mesma que{' '}
            {services === 1 ? 'o serviço' : `os ${services} serviços`} de {origin.name} {services === 1 ? 'consumiu' : 'consumiram'} nas{' '}
            {periodLabel}. A simulação troca só a rede.
          </li>
          {isIdle(destination) && (
            <li>
              <strong>Destino:</strong> {destination.name} não tem serviço monitorado hoje.
            </li>
          )}
        </ul>
      </div>
    </>
  );
}

/**
 * Painel da região selecionada com a simulação de migração (#326, RF15, US12): a mesma energia do período na região mais
 * limpa da Carbon API, ou na região escolhida na tabela de fatores. Toda conta vem de `utils/regions.ts`; aqui só o texto.
 * Região sem serviço não tem o que migrar e não abre o painel.
 */
export default function RegionDetail({ overview, originCode, destinationCode, onDestination, periodLabel, stale = false, now }: Props) {
  const origin = overview.monitored.find((region) => region.code === originCode);
  if (!origin) return null;

  const all = [...overview.monitored, ...overview.idle];
  const rows = migrationRows(all, origin.code, origin.energyKwh, origin.co2eGrams);
  const cleanest = rows.find((row) => row.cleanest) ?? null;
  const chosen = rows.find((row) => row.available && row.region.code === destinationCode) ?? null;
  const alreadyCleanest = isCleanestOrigin(all, origin.code);
  // Sem escolha, a frase fala da mais limpa; se a origem já é a mais limpa, só com escolha
  const shown = chosen ?? (alreadyCleanest ? null : cleanest);
  const noData = origin.energyKwh === null || origin.co2eGrams === null;
  const intensity = intensityTime(overview.fetchedAt, now);

  return (
    <section className={stale ? 'region-detail region-detail--stale' : 'region-detail'} aria-labelledby="region-detail-title">
      <div className="region-detail__head">
        <h2 id="region-detail-title" className="region-detail__title">
          {origin.name} <small>{origin.code}</small>
        </h2>
        <span className="region-detail__period">{periodLabel}</span>
      </div>
      <p className="region-detail__totals">
        {origin.co2eGrams === null ? 'CO₂e sem cálculo' : `${formatQuantity('co2e', origin.co2eGrams)} de CO₂e`} ·{' '}
        {origin.energyKwh === null ? 'energia sem cálculo' : `${formatQuantity('energy', origin.energyKwh)} de energia`} nas {periodLabel}
      </p>

      <h3 className="region-detail__subtitle">
        {chosen ? 'Destino escolhido' : 'Alternativa mais limpa'} nas {periodLabel}
      </h3>
      {noData ? (
        <p className="region-detail__sentence">Sem dado no período para estimar.</p>
      ) : shown?.estimate ? (
        <Recommendation origin={origin} destination={shown.region} estimate={shown.estimate} periodLabel={periodLabel} stale={stale} />
      ) : alreadyCleanest ? (
        <p className="region-detail__sentence">Esta já é a região de menor intensidade de carbono.</p>
      ) : (
        <p className="region-detail__sentence">Nenhuma outra região tem intensidade da Carbon API agora.</p>
      )}

      <div className="region-detail__actions">
        {cleanest && !alreadyCleanest && chosen?.region.code !== cleanest.region.code && (
          <button type="button" className="region-detail__button" onClick={() => onDestination(cleanest.region.code, true)}>
            Ver alternativa mais limpa
          </button>
        )}
        {chosen && (
          <button type="button" className="region-detail__button" onClick={() => onDestination(null, true)}>
            Voltar para {origin.name}
          </button>
        )}
      </div>

      <div className="region-detail__scroll">
        <table className="region-detail__table">
          <caption>
            Simular outra região: da menor para a maior intensidade, com a energia de {origin.name} nas {periodLabel}
          </caption>
          <thead>
            <tr>
              <th scope="col">Região</th>
              {/* Cabeçalhos curtos para a tabela caber em 390 px; a legenda e o title dizem a unidade inteira */}
              <th scope="col" title="Intensidade de carbono, em g CO₂e/kWh">g/kWh</th>
              <th scope="col" title="CO₂e simulado com a energia da origem">Simulado</th>
              <th scope="col">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.region.code} className={row.cleanest ? 'region-detail__row--cleanest' : undefined}>
                <th scope="row">
                  <button
                    type="button"
                    className="region-detail__pick"
                    aria-pressed={chosen?.region.code === row.region.code}
                    disabled={!row.available}
                    onClick={() => onDestination(row.region.code)}
                  >
                    {destinationName(row.region)}
                    {row.cleanest && <span className="region-detail__tag">mais limpa</span>}
                  </button>
                </th>
                <td className="font-data">
                  {row.region.carbonIntensityGco2ePerKwh === null ? 'indisponível' : formatNumber(row.region.carbonIntensityGco2ePerKwh, 0)}
                </td>
                <td className="font-data">{row.estimate ? formatQuantity('co2e', row.estimate.grams) : '—'}</td>
                <td className="font-data">{differenceCell(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="region-detail__note">
        Intensidade de {intensity.time}
        {intensity.stale && ': a Carbon API não respondeu desde então, os fatores podem estar desatualizados'}.
      </p>
      <p className="region-detail__note">
        Estimativa, ordem de grandeza e não medição: troca só o fator da região e não considera latência, custo de nuvem,
        disponibilidade, mudança de hardware ou de arquitetura, nem a energia para mover os dados.{' '}
        <a href={CALCULOS_URL} target="_blank" rel="noreferrer">
          Como a conta é feita
        </a>
      </p>
    </section>
  );
}
