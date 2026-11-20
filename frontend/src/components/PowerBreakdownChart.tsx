import type { ComparedService } from '../services/compare.types';
import { RESOURCES, averagePower, resourceShares } from '../utils/comparison';
import { formatFixed, formatNumber } from '../utils/format';
import './PowerBreakdownChart.css';

/** Definição que acompanha a barra: a potência média é soma de parcelas, não uma medida de carga de trabalho. */
export const POWER_NOTE =
  'Potência média = soma das parcelas de CPU (1 W por ponto percentual), RAM (0,375 W/GB), disco (0,01 W/GB) e rede (0,02 W/GB), sobre as médias do período. Definição em docs/calculos.md.';

/**
 * "62,67 W · 97,8%" — valor e contribuição no mesmo rótulo, nunca só a cor do segmento. A resolução fixa evita que
 * a rede (0,006 W) apareça como "0,00 W": positivo abaixo de 0,01 vira "< 0,01".
 */
function shareText(watts: number, share: number): string {
  return `${formatFixed(watts, 2)} W · ${formatNumber(share * 100, 1)}%`;
}

interface Props {
  /** Serviços na ordem das colunas da tabela, com `avgPowerBreakdown` de GET /api/services/compare. */
  services: ComparedService[];
}

/**
 * Composição da potência média por serviço (RF15, #328): uma barra empilhada em CPU / RAM / disco / rede, na mesma
 * ordem da tabela, com W e % em rótulo direto. A largura de cada barra é proporcional à potência do maior serviço, então
 * a comparação entre serviços aparece no comprimento, e a composição dentro de cada um, nos segmentos.
 *
 * A tabela dos mesmos dados fica em `<details>`: é a alternativa acessível e a leitura em texto de quem prefere
 * números. Sem `avgPowerBreakdown` (serviço sem as quatro médias no período) o serviço mostra "sem dado no período"
 * e não ganha barra.
 */
export default function PowerBreakdownChart({ services }: Props) {
  const rows = services.map((service) => {
    const total = averagePower(service.avgPowerBreakdown);
    return { service, total, shares: resourceShares(service.avgPowerBreakdown) };
  });
  const max = Math.max(0, ...rows.map((row) => row.total ?? 0));

  if (rows.every((row) => row.total === null)) {
    return (
      <figure className="m-0 border-t border-border px-5 py-4">
        <h3 className="m-0 font-display text-sm font-semibold">Potência por recurso</h3>
        <p className="mt-2 mb-0 text-sm text-muted">
          Sem médias de CPU, memória, disco e rede no período: não há como decompor a potência destes serviços.
        </p>
      </figure>
    );
  }

  return (
    <figure className="m-0 flex flex-col gap-3 border-t border-border px-5 py-4">
      <figcaption className="flex cursor-help flex-col gap-1" data-tooltip={POWER_NOTE}>
        <h3 className="m-0 font-display text-sm font-semibold">Potência média por recurso</h3>
        <span className="text-xs text-muted">
          <span className="sr-only">{POWER_NOTE} </span>
          Parcelas sobre as médias do período · largura proporcional ao maior serviço
        </span>
      </figcaption>

      <ul className="power-breakdown m-0 flex list-none flex-col gap-4 p-0">
        {rows.map(({ service, total, shares }) => (
          <li key={service.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm text-text">{service.name}</span>
              <span className="font-data text-sm text-text">
                {total === null ? <span className="text-muted">sem dado no período</span> : `${formatNumber(total, 2)} W`}
              </span>
            </div>
            {total !== null && (
              <div className="power-breakdown__track" aria-hidden="true">
                <div className="power-breakdown__stack" style={{ width: `${max === 0 ? 0 : (total / max) * 100}%` }}>
                  {shares.map((part) => (
                    <span
                      key={part.key}
                      className={`power-breakdown__part power-breakdown__part--${part.key}`}
                      style={{ flexGrow: part.watts }}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Sem as quatro médias não há parcela: zero ali seria um valor inventado */}
            {total !== null && (
              <ul className="power-breakdown__legend m-0 list-none p-0">
                {shares.map((part) => (
                  <li key={part.key} className="power-breakdown__item">
                    <span className={`power-breakdown__key power-breakdown__key--${part.key}`} aria-hidden="true" />
                    <span className="text-muted">{part.label}</span>
                    <span className="font-data text-text">{shareText(part.watts, part.share)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <details>
        <summary className="cursor-pointer font-sans text-xs text-secondary">Ver em tabela</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <caption className="sr-only">
              Potência média por recurso, em W e em % da potência média de cada serviço, no período comparado.
            </caption>
            <thead>
              <tr className="text-muted">
                <th scope="col" className="px-2 py-1 text-left font-medium">Serviço</th>
                {RESOURCES.map((resource) => (
                  <th key={resource.key} scope="col" className="px-2 py-1 text-right font-medium">{resource.label}</th>
                ))}
                <th scope="col" className="px-2 py-1 text-right font-medium">Potência média</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ service, total, shares }) => (
                <tr key={service.id} className="border-t border-border">
                  <th scope="row" className="px-2 py-1 text-left font-medium text-text">{service.name}</th>
                  {shares.map((part) => (
                    <td key={part.key} className="px-2 py-1 text-right font-data">
                      {total === null ? '—' : shareText(part.watts, part.share)}
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right font-data">{total === null ? 'sem dado no período' : `${formatNumber(total, 2)} W`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
