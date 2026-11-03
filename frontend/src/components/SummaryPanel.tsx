import type { ServicesSummaryResponse } from '../services/services.types';
import { formatNumber } from '../utils/format';
import MetricTile from './MetricTile';
import MissingValue from './MissingValue';
import './KpiPanel.css';

interface Props {
  summary: ServicesSummaryResponse;
  previousSummary: ServicesSummaryResponse | null;
  comparisonLoading: boolean;
  stale: boolean;
}

function variation(current: number | null, previous: number | null, hasPreviousPeriod: boolean, loading: boolean): string {
  // Só mostra "Comparando…" na primeira busca: nos ciclos seguintes a variação anterior fica até chegar a nova
  if (loading && !hasPreviousPeriod) return 'Comparando período anterior…';
  if (current === null) return 'Sem cálculo disponível neste período';
  if (!hasPreviousPeriod) return 'Comparação indisponível';
  if (previous === null) return 'Sem cálculo no período anterior';
  if (previous === 0) return 'Sem base para comparação';
  const percent = ((current - previous) / previous) * 100;
  const sign = percent > 0 ? '+' : '';
  return `${sign}${formatNumber(percent, 1)}% vs. 24 h anteriores`;
}

/** ISO 8601 → "27/10, 19:30" no horário de Brasília, qualquer que seja o fuso do navegador. */
function formatBrasilia(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Energia e CO₂e das últimas 24 h (RF08, #175), com a variação contra as 24 h anteriores. O estado dos serviços fica
 * nos cards da #21 (KpiPanel); sem cálculo no período, o valor é o traço do MissingValue, nunca zero.
 */
export default function SummaryPanel({ summary, previousSummary, comparisonLoading, stale }: Props) {
  const energyChange = variation(summary.energyKwh, previousSummary?.energyKwh ?? null, previousSummary !== null, comparisonLoading);
  const emissionsChange = variation(summary.co2eGrams, previousSummary?.co2eGrams ?? null, previousSummary !== null, comparisonLoading);
  const missing = <MissingValue label="sem cálculo" title="Sem cálculo no período" />;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="summary-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="summary-title" className="m-0 font-display text-lg font-semibold">
          Energia e emissões nas últimas 24 h
        </h2>
        {/* Período sempre na tela, com o fuso: os números valem para esta janela */}
        <p className="m-0 text-sm text-muted">
          {formatBrasilia(summary.period.from)} a {formatBrasilia(summary.period.to)} (horário de Brasília)
        </p>
      </div>
      <div className="kpis">
        <MetricTile
          label="Energia no período"
          value={summary.energyKwh === null ? missing : formatNumber(summary.energyKwh, 4)}
          unit={summary.energyKwh === null ? undefined : 'kWh'}
          note={energyChange}
          stale={stale}
          icon={<span>⚡</span>}
        />
        <MetricTile
          label="Emissões no período"
          value={summary.co2eGrams === null ? missing : formatNumber(summary.co2eGrams, 2)}
          unit={summary.co2eGrams === null ? undefined : 'g CO₂e'}
          note={emissionsChange}
          stale={stale}
          icon={<span>◌</span>}
        />
      </div>
    </section>
  );
}
