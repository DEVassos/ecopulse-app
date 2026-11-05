import type { ReactNode } from 'react';
import type { ServicesSummaryResponse } from '../services/services.types';
import { formatNumber } from '../utils/format';
import { formatInScale, scaleFor } from '../utils/units';
import MetricTile, { metricIconProps } from './MetricTile';
import MissingValue from './MissingValue';
import './KpiPanel.css';

interface Props {
  summary: ServicesSummaryResponse;
  previousSummary: ServicesSummaryResponse | null;
  comparisonLoading: boolean;
  stale: boolean;
}

/** Base da comparação, em poucas palavras; o detalhe fica no tooltip. */
const BASELINE = 'vs 24 h anteriores';

/**
 * Variação contra as 24 h anteriores (#271). Energia e CO₂e são métricas em que menos é melhor: ▲ em alerta, ▼ em
 * verde, ±0% em cinza abaixo de 0,5%. Sem base, "—" com o motivo no tooltip, nunca um zero ou um 100% enganoso.
 */
function variation(current: number | null, previous: number | null, hasPreviousPeriod: boolean, loading: boolean): ReactNode {
  // Só mostra "Comparando…" na primeira busca: nos ciclos seguintes a variação anterior fica até chegar a nova
  if (loading && !hasPreviousPeriod) return 'Comparando…';
  const noBase = (reason: string) => (
    <span title={reason}>
      — {BASELINE}
    </span>
  );
  if (current === null) return noBase('Sem cálculo neste período');
  if (!hasPreviousPeriod) return noBase('A comparação com as 24 h anteriores não foi carregada');
  if (previous === null) return noBase('Sem cálculo nas 24 h anteriores: não há base para a variação');
  if (previous === 0) return noBase('O total das 24 h anteriores foi zero: não há base para a variação');
  const percent = ((current - previous) / previous) * 100;
  const exact = `${percent > 0 ? '+' : ''}${formatNumber(percent, 1)}% ${BASELINE}`;
  if (Math.abs(percent) < 0.5) {
    return (
      <span title={exact}>
        <span className="metric-delta">±0%</span> {BASELINE}
      </span>
    );
  }
  const up = percent > 0;
  // Uma casa só abaixo de 100%: "▲ 880%" basta para decidir; o valor exato fica no tooltip
  const magnitude = Math.abs(percent);
  const size = up && percent > 999 ? '10×+' : `${formatNumber(magnitude, magnitude >= 100 ? 0 : 1)}%`;
  return (
    <span title={exact}>
      <span className={`metric-delta ${up ? 'metric-delta--worse' : 'metric-delta--better'}`}>
        <span aria-hidden="true">{up ? '▲' : '▼'} </span>
        <span className="sr-only">{up ? 'subiu ' : 'caiu '}</span>
        {size}
      </span>{' '}
      {BASELINE}
    </span>
  );
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
  // Escala única (#271): "841 Wh" em vez de "0,8413 kWh"
  const energyScale = scaleFor('energy', [summary.energyKwh]);
  const co2eScale = scaleFor('co2e', [summary.co2eGrams]);
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
      <div className="kpis kpis--wide">
        <MetricTile
          label="Energia no período"
          value={summary.energyKwh === null ? missing : formatInScale(summary.energyKwh, energyScale)}
          unit={summary.energyKwh === null ? undefined : energyScale.unit}
          note={energyChange}
          stale={stale}
          icon={
            <svg {...metricIconProps}>
              <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
            </svg>
          }
        />
        <MetricTile
          label="Emissões no período"
          value={summary.co2eGrams === null ? missing : formatInScale(summary.co2eGrams, co2eScale)}
          unit={summary.co2eGrams === null ? undefined : `${co2eScale.unit} CO₂e`}
          note={emissionsChange}
          stale={stale}
          icon={
            <svg {...metricIconProps}>
              <path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z" />
            </svg>
          }
        />
      </div>
    </section>
  );
}
