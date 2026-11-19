import type { EmissionPoint, EmissionsBucket } from '../services/emissions.types';
import { printTable } from '../utils/print-report';

interface HeaderProps {
  serviceName: string;
  location: string;
  periodLabel: string;
  /** Agrupamento do gráfico, como na tela ("15 min"); null antes de os dados chegarem. */
  bucketLabel: string | null;
  updatedAt: string | null;
}

/**
 * Cabeçalho do relatório impresso (#13): só aparece na impressão, no lugar do título do card (que some no papel), com o
 * serviço, o período, a região, o agrupamento e a hora dos dados.
 */
export function PrintHeader({ serviceName, location, periodLabel, bucketLabel, updatedAt }: HeaderProps) {
  // Hora dos dados, e não da impressão: é a do selo "Última atualização" da tela
  const at = updatedAt === null ? null : new Date(updatedAt);
  return (
    <header className="print-only print-report__header">
      <p className="print-report__brand">EcoPulse — Relatório de emissões</p>
      <h1 className="print-report__title">
        {serviceName} <small>estimativa</small>
      </h1>
      <dl className="print-report__meta">
        <div>
          <dt>Período</dt>
          <dd>{periodLabel}</dd>
        </div>
        {location && (
          <div>
            <dt>Região</dt>
            <dd>{location}</dd>
          </div>
        )}
        {bucketLabel && (
          <div>
            <dt>Agrupamento</dt>
            <dd>{bucketLabel}</dd>
          </div>
        )}
        {at && (
          <div>
            <dt>Dados de</dt>
            <dd>
              {at.toLocaleDateString('pt-BR')} às {at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </dd>
          </div>
        )}
      </dl>
    </header>
  );
}

interface TableProps {
  points: EmissionPoint[];
  bucket: EmissionsBucket;
  /** Nome do agrupamento, como na tela ("15 min", "1 hora"). */
  bucketLabel: string;
  multiDay: boolean;
}

/**
 * Tabela por intervalo do gráfico e nota do método (#13): só na impressão, abaixo do card. O cabeçalho da tabela se
 * repete em cada página e nenhuma linha quebra entre duas páginas (CSS de impressão).
 */
export function PrintTable({ points, bucket, bucketLabel, multiDay }: TableProps) {
  const table = printTable(points, bucket, multiDay);
  return (
    <section className="print-only print-report__body">
      {table === null ? (
        <p className="print-report__note">Agrupamento por coleta: a lista de cada coleta do período está no CSV (Baixar CSV).</p>
      ) : (
        <table className="print-report__table">
          <caption>Emissão por intervalo de {bucketLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Início</th>
              <th scope="col">Coletas</th>
              <th scope="col">Energia ({table.energyUnit})</th>
              <th scope="col">CO₂e ({table.co2eUnit})</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.collections.toLocaleString('pt-BR')}</td>
                <td>{row.energy}</td>
                <td>{row.co2e}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{table.total.collections.toLocaleString('pt-BR')}</td>
              <td>{table.total.energy}</td>
              <td>{table.total.co2e}</td>
            </tr>
          </tfoot>
        </table>
      )}
      <p className="print-report__note">
        Estimativa: potência estimada pelas métricas × intervalo de coleta × intensidade de carbono da região, somada por
        intervalo. Método e fatores em docs/calculos.md. Valores sem cálculo aparecem como "—", nunca como zero.
      </p>
    </section>
  );
}
