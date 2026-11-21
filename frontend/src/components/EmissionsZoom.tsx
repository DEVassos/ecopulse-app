import type { Ref } from 'react';
import type { EmissionsTotals } from '../services/emissions.types';
import { formatGrams, formatKwh } from '../utils/emissions';
import { formatShare } from '../utils/zoom';

interface ButtonsProps {
  canZoomIn: boolean;
  canZoomOut: boolean;
  canPanBack: boolean;
  canPanForward: boolean;
  onZoom: (direction: 'in' | 'out') => void;
  onPan: (direction: -1 | 1) => void;
  /** Para a página devolver o foco ao Aproximar quando a faixa do trecho (com o Restaurar) some. */
  zoomInRef?: Ref<HTMLButtonElement>;
}

/**
 * Botões do zoom do gráfico de Emissões (#396). aria-disabled em vez de disabled: o botão que chega ao limite (Afastar
 * até o período inteiro, ◀ na borda) não perde o foco do teclado.
 */
export function ZoomButtons({ canZoomIn, canZoomOut, canPanBack, canPanForward, onZoom, onPan, zoomInRef }: ButtonsProps) {
  return (
    <div className="emissions__zoom" role="group" aria-label="Zoom do gráfico">
      <button type="button" ref={zoomInRef} className="emissions__btn" aria-disabled={!canZoomIn} onClick={() => canZoomIn && onZoom('in')}>
        Aproximar
      </button>
      <button type="button" className="emissions__btn" aria-disabled={!canZoomOut} onClick={() => canZoomOut && onZoom('out')}>
        Afastar
      </button>
      <button
        type="button"
        className="emissions__btn"
        aria-label="Trecho anterior"
        data-tooltip="Trecho anterior"
        aria-disabled={!canPanBack}
        onClick={() => canPanBack && onPan(-1)}
      >
        ◀
      </button>
      <button
        type="button"
        className="emissions__btn"
        aria-label="Trecho seguinte"
        data-tooltip="Trecho seguinte"
        aria-disabled={!canPanForward}
        onClick={() => canPanForward && onPan(1)}
      >
        ▶
      </button>
    </div>
  );
}

interface BandProps {
  /** O trecho, como `describeWindow` ("21/11 05:45 → 17:30 (11 h 45 min)"). */
  label: string;
  /** Parte do tempo do período coberta pelo trecho (0 a 1). */
  timeShare: number;
  /** Parte do CO₂e do período que caiu no trecho; null sem cálculo. */
  co2eShare: number | null;
  /** Totais do período inteiro, que os cards deixam de mostrar durante o zoom. */
  periodTotals: EmissionsTotals;
  onReset: () => void;
}

/** Faixa do trecho ampliado (#396): qual é o trecho, quanto ele pesa no período e os totais do período inteiro. */
export function ZoomBand({ label, timeShare, co2eShare, periodTotals, onReset }: BandProps) {
  return (
    <div className="emissions__zoom-band">
      <div>
        <p>
          <strong>Trecho ampliado:</strong> {label}, {formatShare(timeShare)} do período. Os cards, o gráfico e a impressão
          mostram só o trecho.
        </p>
        <p className="emissions__zoom-total">
          Período inteiro: {periodTotals.co2eGrams !== null ? `${formatGrams(periodTotals.co2eGrams)} CO₂e` : 'CO₂e sem cálculo'}
          {' · '}
          {periodTotals.energyKwh !== null ? formatKwh(periodTotals.energyKwh) : 'energia sem cálculo'}
          {' · '}
          {periodTotals.collections.toLocaleString('pt-BR')} coletas
          {co2eShare !== null && `; o trecho tem ${formatShare(co2eShare)} do CO₂e`}. O CSV continua com o período inteiro.
        </p>
      </div>
      <button type="button" className="emissions__btn" onClick={onReset}>
        Restaurar período
      </button>
    </div>
  );
}
