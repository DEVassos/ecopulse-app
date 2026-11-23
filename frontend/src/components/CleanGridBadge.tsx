import { formatNumber } from '../utils/format';
import { CLEAN_GRID_MAX_GCO2E_PER_KWH, isCleanGrid } from '../utils/regions';
import type { RegionGrid } from '../utils/regions';

interface Props {
  /** Rede da região, de GET /api/regions: a intensidade de agora (caso região de docs/calculos.md). */
  grid: RegionGrid;
  /** A última busca das regiões falhou: o selo fica em cinza, como os outros números da atualização anterior (#261). */
  stale?: boolean;
  /**
   * Repete a intensidade e o % renovável em texto para o leitor de tela. Desligado onde esses números já aparecem ao
   * lado do selo (lista de regiões), para não serem lidos duas vezes.
   */
  describe?: boolean;
  /** Classes de posição de quem usa o selo (margem, alinhamento). */
  className?: string;
}

/** "85 g CO₂e/kWh · 83% renovável": só as partes que a Carbon API mandou. */
function cleanGridText(grid: RegionGrid): string {
  return [
    grid.carbonIntensityGco2ePerKwh === null ? null : `${formatNumber(grid.carbonIntensityGco2ePerKwh, 0)} g CO₂e/kWh`,
    grid.renewableSharePercent === null ? null : `${formatNumber(grid.renewableSharePercent, 0)}% renovável`,
  ]
    .filter((part) => part !== null)
    .join(' · ');
}

/**
 * Selo "Rede limpa" (#324, RF12/RF13): a região do serviço tem intensidade de agora em até 100 gCO₂e/kWh
 * (docs/calculos.md § Limite de "rede limpa"). Folha e texto, nunca só a cor; o tooltip traz a intensidade e o %
 * renovável. Fora do limite, ou sem intensidade conhecida, não desenha nada.
 */
export default function CleanGridBadge({ grid, stale = false, describe = true, className = '' }: Props) {
  if (!isCleanGrid(grid.carbonIntensityGco2ePerKwh)) return null;
  const detail = cleanGridText(grid);
  const tone = stale ? 'border-border text-muted' : 'border-primary/50 bg-primary/10 text-primary';
  return (
    <span
      data-tooltip={`Rede limpa: intensidade de agora até ${CLEAN_GRID_MAX_GCO2E_PER_KWH} g CO₂e/kWh${stale ? ' (dado da atualização anterior)' : ''}`}
      data-tooltip-value={detail}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 font-sans text-xs font-medium ${tone}${className ? ` ${className}` : ''}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
      Rede limpa
      {describe && <span className="sr-only"> ({detail})</span>}
    </span>
  );
}
