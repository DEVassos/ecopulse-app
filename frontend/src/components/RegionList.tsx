import { REGION_STATUSES } from '../services/regions.types';
import type { RegionStatus } from '../services/regions.types';
import { formatNumber } from '../utils/format';
import { formatQuantity } from '../utils/units';
import type { ListedRegion, RegionOverview } from '../utils/region-map';
import './RegionList.css';

/** Os mesmos nomes do selo da tabela (StatusBadge): um estado, um nome em toda a página. */
const STATE_LABEL: Record<RegionStatus, [string, string]> = {
  ativo: ['Ativo', 'Ativos'],
  indisponivel: ['Indisponível', 'Indisponíveis'],
  sem_metricas: ['Sem métricas', 'Sem métricas'],
};

interface Props {
  overview: RegionOverview;
  /** Região selecionada, a mesma da tabela de serviços (e do mapa, na #322); null sem seleção. */
  selectedCode: string | null;
  /** Clique numa região: o Dashboard decide se seleciona ou desfaz a seleção. */
  onSelect: (code: string) => void;
  /** A que período os números se referem, como aparece na tela (ex.: "últimas 24 h"). */
  periodLabel: string;
  /** A última busca falhou: os números são da atualização anterior e ficam apagados (#261). */
  stale?: boolean;
}

/** "377 gCO₂e/kWh · 22% renovável": a rede da região, sem inventar o que a Carbon API não mandou. */
function gridText(region: ListedRegion): string {
  const parts = [
    region.carbonIntensityGco2ePerKwh === null ? null : `${formatNumber(region.carbonIntensityGco2ePerKwh, 0)} gCO₂e/kWh`,
    region.renewableSharePercent === null ? null : `${formatNumber(region.renewableSharePercent, 0)}% renovável`,
  ].filter((part) => part !== null);
  return parts.length === 0 ? 'rede sem dados da Carbon API' : parts.join(' · ');
}

/** "2 Ativos · 1 Indisponível": serviços por estado, só os estados presentes. */
function countsText(region: ListedRegion): string {
  const parts = REGION_STATUSES.filter((state) => region.services[state] > 0).map((state) => {
    const count = region.services[state];
    return `${count} ${STATE_LABEL[state][count === 1 ? 0 : 1]}`;
  });
  return parts.length === 0 ? 'só serviços removidos' : parts.join(' · ');
}

/**
 * Lista de regiões do Dashboard (#342, RF13): uma linha por região, do maior para o menor CO₂e do período, com a rede e
 * os serviços por estado. Funciona sozinha, sem WebGL, e é a alternativa acessível ao mapa da #322. Cada região é um
 * botão que seleciona a mesma região na tabela de serviços.
 */
export default function RegionList({ overview, selectedCode, onSelect, periodLabel, stale = false }: Props) {
  const { monitored, idle, outside, unplacedServices } = overview;
  const maxCo2e = Math.max(0, ...monitored.map((region) => region.co2eGrams ?? 0));

  function item(region: ListedRegion) {
    const state = region.worstStatus;
    const share = region.co2eGrams === null || maxCo2e <= 0 ? 0 : Math.max(3, Math.round((region.co2eGrams / maxCo2e) * 100));
    return (
      <li key={region.code}>
        <button type="button" className="region-list__item" aria-pressed={region.code === selectedCode} onClick={() => onSelect(region.code)}>
          <span className="region-list__top">
            <span className="region-list__name">
              <i className={`region-list__key region-list__key--${state ?? 'idle'}`} aria-hidden="true" />
              {region.name}
              <small>{region.code}</small>
            </span>
            <span className="region-list__value font-data">
              {region.co2eGrams !== null ? formatQuantity('co2e', region.co2eGrams) : state === null ? 'sem serviço hoje' : 'sem cálculo'}
            </span>
          </span>
          {state !== null || region.co2eGrams !== null ? (
            <>
              <span className="region-list__bar" aria-hidden="true">
                <i className={`region-list__fill region-list__fill--${state ?? 'idle'}`} style={{ width: `${share}%` }} />
              </span>
              <span className="region-list__meta">{countsText(region)}</span>
            </>
          ) : null}
          <span className="region-list__meta">{gridText(region)}</span>
        </button>
      </li>
    );
  }

  return (
    <section className={stale ? 'region-list region-list--stale' : 'region-list'} aria-labelledby="region-list-title">
      <div className="region-list__head">
        <h2 id="region-list-title" className="region-list__title">Regiões por CO₂e</h2>
        <span className="region-list__period">{periodLabel}</span>
      </div>

      {monitored.length > 0 ? (
        <ul className="region-list__list">{monitored.map(item)}</ul>
      ) : (
        <p className="region-list__note">Nenhum serviço com região conhecida pela Carbon API.</p>
      )}

      {/* Fora do mapa sem sumir do total: o CO₂e dos serviços sem região conhecida fecha a soma com o card do período */}
      {unplacedServices > 0 && (
        <p className="region-list__note">
          {unplacedServices === 1 ? '1 serviço sem região ou sem coordenada fica' : `${unplacedServices} serviços sem região ou sem coordenada ficam`}{' '}
          fora do mapa e continua{unplacedServices === 1 ? '' : 'm'} na tabela.
          {outside.co2eGrams !== null && ` Os sem região conhecida somam ${formatQuantity('co2e', outside.co2eGrams)} no período.`}
        </p>
      )}

      {idle.length > 0 && (
        <details className="region-list__idle">
          <summary>Sem serviço hoje ({idle.length})</summary>
          <ul className="region-list__list">{idle.map(item)}</ul>
        </details>
      )}
    </section>
  );
}
