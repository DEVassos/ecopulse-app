import { formatNumber } from '../utils/format';
import { formatMigrationPercent, intensityTime, migrationMath } from '../utils/region-map';
import type { ListedRegion, RegionOverview } from '../utils/region-map';
import { isCleanestOrigin, migrationChange, migrationRows } from '../utils/regions';
import type { MigrationEstimate, MigrationRow } from '../utils/regions';
import { formatQuantity } from '../utils/units';
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

/** "Montreal" ou "Montreal (sem serviço hoje)": o destino pode não ter serviço, e a tela diz isso. */
function destinationName(region: ListedRegion): string {
  return region.worstStatus === null && region.co2eGrams === null ? `${region.name} (sem serviço hoje)` : region.name;
}

/** O fim da frase da simulação, sempre com números positivos: "89,42% menos", "aumento de 4,35 g (23,02%)". */
function changeText(estimate: MigrationEstimate): string {
  const change = migrationChange(estimate);
  if (change.kind === 'igual') return 'a mesma emissão';
  const grams = formatQuantity('co2e', change.grams);
  if (change.percent === null) return `${change.kind === 'reducao' ? 'redução' : 'aumento'} de ${grams} (percentual não calculável)`;
  const percent = formatMigrationPercent(change.percent);
  return change.kind === 'reducao' ? `${percent} menos` : `aumento de ${grams} (${percent})`;
}

/** Coluna "Diferença" da tabela: "−89,42%" ou "+23,02%", com a palavra para o leitor de tela. */
function differenceCell(row: MigrationRow<ListedRegion>) {
  if (!row.available) return 'indisponível';
  if (row.estimate === null) return '—';
  const change = migrationChange(row.estimate);
  if (change.kind === 'igual') return 'igual';
  const sign = change.kind === 'reducao' ? '−' : '+';
  const value = change.percent === null ? formatQuantity('co2e', change.grams) : formatMigrationPercent(change.percent);
  return (
    <>
      <span aria-hidden="true">{sign}{value}</span>
      <span className="sr-only">{change.kind === 'reducao' ? 'redução de' : 'aumento de'} {value}</span>
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

      <h3 className="region-detail__subtitle">Alternativa mais limpa nas {periodLabel}</h3>
      {noData ? (
        <p className="region-detail__sentence">Sem dado no período para estimar.</p>
      ) : shown?.estimate ? (
        <>
          <p className="region-detail__sentence">
            A mesma energia das {periodLabel} emitiria cerca de <strong>{formatQuantity('co2e', shown.estimate.grams)}</strong> de CO₂e em{' '}
            <strong>{destinationName(shown.region)}</strong>: <strong>{changeText(shown.estimate)}</strong>.
          </p>
          <p className="region-detail__math font-data">
            Conta: {migrationMath(origin.energyKwh ?? 0, shown.region.carbonIntensityGco2ePerKwh ?? 0, shown.estimate.grams)}
          </p>
        </>
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
