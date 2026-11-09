import { useEffect, useRef } from 'react';
import './Brand.css';

interface Props {
  /**
   * Horário da última atualização dos dados. A cada valor novo o logo pulsa uma vez (sinal de "ao vivo").
   * Sem a prop (páginas sem polling) o logo fica parado; atualização que falha não muda o valor, então não pulsa.
   */
  pulseKey?: string | null;
}

// Mesma curva nas três fases do pulso: desfaz a folha, segura a linha de batimento, volta.
// restart="whenNotActive": uma busca nova no meio do pulso não reinicia a animação (o logo não salta).
const TIMING = { dur: '2.4s', begin: 'indefinite', restart: 'whenNotActive', fill: 'freeze', calcMode: 'spline', keyTimes: '0;.28;.72;1', keySplines: '.5 0 .2 1;0 0 1 1;.5 0 .2 1' };
// O cabinho e a linha de batimento têm os mesmos 8 pontos, para o SMIL interpolar uma forma na outra
const STEM = 'M2 21 L2.4 19.2 L3.6 17.4 L5.2 16 L7.1 15 L9 14.4 L11 13.4 L13 12';
const HEARTBEAT = 'M1 13 L6 13 L8 11.5 L9.5 13 L11.5 5 L13.5 19 L15.5 13 L23 13';

/** Logo + nome do EcoPulse, usado no cabeçalho e nas telas de acesso. */
export default function Brand({ pulseKey }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!pulseKey || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    svgRef.current?.querySelectorAll('animate').forEach((animation) => animation.beginElement());
  }, [pulseKey]);

  return (
    <div className="brand">
      <svg
        ref={svgRef}
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Folha: se desenha ao contrário e volta. O vão (2) e o deslocamento (1.05) passam do fim do path,
            para nenhum traço de comprimento zero desenhar um ponto (ponta redonda) com a folha desfeita. */}
        <path pathLength={1} strokeDasharray="1 2" strokeDashoffset={0} d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z">
          <animate attributeName="stroke-dashoffset" values="0;1.05;1.05;0" {...TIMING} />
        </path>
        {/* Cabinho: vira a linha de batimento e volta */}
        <path d={STEM}>
          <animate attributeName="d" values={`${STEM};${HEARTBEAT};${HEARTBEAT};${STEM}`} {...TIMING} />
        </path>
        {/* Brilho neon que corre pela linha de batimento */}
        <path className="brand-pulse" pathLength={1} strokeDasharray="0.28 1.2" strokeDashoffset={0.28} opacity={0} d={HEARTBEAT}>
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;.28;.32;.66;.72;1" dur="2.4s" begin="indefinite" restart="whenNotActive" fill="freeze" />
          <animate attributeName="stroke-dashoffset" values="0.28;0.28;-1;-1" keyTimes="0;.3;.7;1" dur="2.4s" begin="indefinite" restart="whenNotActive" fill="freeze" />
        </path>
      </svg>
      <span className="brand-name">
        Eco<span>Pulse</span>
      </span>
    </div>
  );
}
