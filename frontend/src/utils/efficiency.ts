// Eficiência energética e de carbono (#329): quanta energia cada serviço gasta por hora para estar no ar.
// Definições, unidades e exemplos numéricos em docs/calculos.md (§ Eficiência energética e de carbono).

/**
 * Potência média do período, em W: energia (kWh) × 3 600 000 ÷ segundos monitorados, a conta de `docs/calculos.md`.
 * 0,48 kWh em 24 h monitoradas (86 400 s) dão 20 W.
 *
 * O divisor são os segundos das coletas que entraram na energia (mesmo conjunto `calculation_status = 'disponivel'`):
 * potência média é energia gasta por tempo no ar. Sem energia, sem tempo ou com tempo zero devolve `null` — nunca 0,
 * que pareceria um serviço que não gasta nada.
 */
export function averagePowerFromEnergy(energyKwh: number | null, monitoredSeconds: number | null): number | null {
  if (energyKwh === null || monitoredSeconds === null || monitoredSeconds <= 0) return null;
  return (energyKwh * 3_600_000) / monitoredSeconds;
}

/**
 * Id do serviço "mais eficiente" de uma linha (o de menor valor), para o selo da comparação. Exige pelo menos dois
 * serviços com valor e nenhum empate no menor: com empate, nenhum dos dois é "o mais eficiente". `null` quando não há
 * selo a dar — a linha fica sem destaque em vez de eleger quem não se distingue.
 */
export function mostEfficient<T extends { id: string }>(items: readonly T[], valueOf: (item: T) => number | null): string | null {
  const withValue = items.flatMap((item) => {
    const value = valueOf(item);
    return value === null ? [] : [{ id: item.id, value }];
  });
  if (withValue.length < 2) return null;
  const lowest = Math.min(...withValue.map((item) => item.value));
  const winners = withValue.filter((item) => item.value === lowest);
  return winners.length === 1 ? winners[0].id : null;
}
