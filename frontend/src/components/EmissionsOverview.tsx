import { useMemo } from 'react';
import type { EmissionPoint, EmissionsBucket } from '../services/emissions.types';
import { OVERVIEW_WIDTH, overviewBars } from '../utils/emission-overview';
import { gridStepMs } from '../utils/zoom';
import type { ZoomWindow } from '../utils/zoom';
import './EmissionsOverview.css';

interface Props {
  /** Pontos do período inteiro, não só os do trecho. */
  points: EmissionPoint[];
  bucket: EmissionsBucket;
  /** Período inteiro. */
  fromMs: number;
  toMs: number;
  /** Trecho ampliado, o que o gráfico acima mostra. */
  zoom: ZoomWindow;
}

const HEIGHT = 36;

/**
 * Miniatura do período inteiro (#410): aparece embaixo do gráfico só com um trecho ampliado e mostra onde ele fica no
 * período. É contexto, não leitura de valores: sem eixo nem dica. O trecho, em texto, já está na faixa "Trecho
 * ampliado" acima do gráfico, por isso o desenho fica fora da leitura de tela. Não vai para o papel.
 */
export default function EmissionsOverview({ points, bucket, fromMs, toMs, zoom }: Props) {
  const overview = useMemo(() => {
    const stepMs = gridStepMs(points, bucket);
    return overviewBars({
      // Agrupado, `t` é o início do intervalo; por coleta, o instante da coleta, e a barra centra nele
      starts: points.map((point) => (bucket === 'coleta' ? point.t - stepMs / 2 : point.t)),
      stepMs,
      values: points.map((point) => point.co2eGrams),
      fromMs,
      toMs,
      zoom,
      height: HEIGHT - 4,
    });
  }, [points, bucket, fromMs, toMs, zoom]);

  return (
    <div className="emissions-overview print:hidden">
      <svg viewBox={`0 0 ${OVERVIEW_WIDTH} ${HEIGHT}`} height={HEIGHT} preserveAspectRatio="none" aria-hidden="true">
        {overview.bars.map((bar) => (
          <rect
            key={bar.x}
            className={bar.inWindow ? 'emissions-overview__bar emissions-overview__bar--in' : 'emissions-overview__bar'}
            x={bar.x}
            y={HEIGHT - 2 - bar.height}
            width={bar.width}
            height={bar.height}
          />
        ))}
        <rect className="emissions-overview__window" x={overview.window.x} y={1} width={overview.window.width} height={HEIGHT - 2} />
      </svg>
      <p>Período inteiro em miniatura: o trecho ampliado é o destacado.</p>
    </div>
  );
}
