import type { ComparedService } from '../services/compare.types';
import { SORT_LABEL } from '../utils/compare-ranking';
import type { CompareSort, SortKey } from '../utils/compare-ranking';
import { carbonIntensity, scatterEquation } from '../utils/comparison';
import type { CompareHighlight } from './CompareChart';

interface Props {
  /** Serviços já na ordem escolhida: a mesma da matriz, dos gráficos e do CSV. */
  services: ComparedService[];
  sort: CompareSort;
  onSortChange: (sort: CompareSort) => void;
  /** Serviço sob o ponteiro ou o foco em qualquer bloco da comparação (destaque cruzado). */
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
  /** Destaque de CO₂e do serviço, o mesmo da tabela e dos gráficos, ou null. */
  highlightOf: (id: string) => CompareHighlight | null;
}

const KEYS = Object.keys(SORT_LABEL) as SortKey[];

/** "0,084 kWh × 39,29 g/kWh = 3,30 g": a mesma conta da dispersão, com os números de GET /api/services/compare. */
function equation(service: ComparedService): string {
  if (service.energyKwh === null || service.co2eGrams === null) return 'sem cálculo no período';
  return scatterEquation({
    ...service,
    region: service.region ?? 'sem região',
    energyKwh: service.energyKwh,
    co2eGrams: service.co2eGrams,
    intensity: carbonIntensity(service.co2eGrams, service.energyKwh),
  });
}

/**
 * Ranking da comparação (RF15, #431): os serviços na ordem escolhida, por padrão do menor para o maior CO₂e, com a conta
 * energia × intensidade = CO₂e de cada um. O controle daqui e os cabeçalhos da matriz mudam a mesma ordem.
 */
export default function CompareRanking({ services, sort, onSortChange, activeId, onActiveChange, highlightOf }: Props) {
  const ascending = sort.direction === 'asc';
  const directionText = sort.key === 'name' ? (ascending ? 'de A a Z' : 'de Z a A') : ascending ? 'do menor para o maior' : 'do maior para o menor';

  return (
    <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="m-0 font-display text-sm font-semibold">
          Ranking por {SORT_LABEL[sort.key]} <span className="font-sans text-xs font-normal text-muted">{directionText}</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <label className="inline-flex items-center gap-2">
            Ordenar por
            <select
              className="min-h-8 rounded-lg border border-border bg-surface-2 px-2 font-sans text-sm text-text"
              value={sort.key}
              onChange={(event) => onSortChange({ key: event.target.value as SortKey, direction: 'asc' })}
            >
              {KEYS.map((key) => (
                <option key={key} value={key}>{SORT_LABEL[key]}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-outline inline-flex min-h-8 cursor-pointer items-center gap-1.5 px-3 text-sm"
            onClick={() => onSortChange({ key: sort.key, direction: ascending ? 'desc' : 'asc' })}
            aria-label={`Inverter a ordem; agora ${directionText}`}
          >
            <span aria-hidden="true">{ascending ? '↑' : '↓'}</span> Inverter
          </button>
        </div>
      </div>

      {/* Ponteiro ou foco num item destaca o mesmo serviço na matriz e nos gráficos */}
      <ol className="m-0 flex list-none flex-col gap-1 p-0" aria-label={`Serviços por ${SORT_LABEL[sort.key]}, ${directionText}`}>
        {services.map((service, index) => {
          const highlight = highlightOf(service.id);
          const active = activeId === service.id;
          return (
            <li
              key={service.id}
              tabIndex={0}
              className={`grid cursor-default grid-cols-[1.75rem_minmax(0,1fr)] items-baseline gap-x-2 gap-y-0.5 rounded-lg px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sky)] min-[600px]:grid-cols-[1.75rem_minmax(0,1fr)_auto] ${active ? 'bg-secondary/15' : ''}`}
              onPointerEnter={() => onActiveChange(service.id)}
              onPointerLeave={() => onActiveChange(null)}
              onFocus={() => onActiveChange(service.id)}
              onBlur={() => onActiveChange(null)}
            >
              <span className="font-data text-muted">{index + 1}º</span>
              <span className="min-w-0">
                <span className="text-text">{service.name}</span>
                {service.region && <span className="ml-2 text-xs text-muted">{service.region}</span>}
                {highlight && (
                  <span className={`ml-2 text-xs font-semibold ${highlight.kind === 'lowest' ? 'text-primary-hover' : 'text-warning'}`}>
                    <span aria-hidden="true">{highlight.arrow} </span>
                    {highlight.label}
                  </span>
                )}
              </span>
              <span className="col-start-2 font-data text-xs text-text-2 min-[600px]:col-start-3 min-[600px]:text-right">{equation(service)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
