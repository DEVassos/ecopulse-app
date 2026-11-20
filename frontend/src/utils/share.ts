// Partes de um todo arredondadas de forma que a soma exibida feche em 100%.

/**
 * Arredonda as partes a `steps` fatias do todo pelo método do maior resto: cada uma recebe o piso e as fatias que
 * faltam vão para os maiores restos. Assim a coluna exibida soma sempre 100,0%; arredondar cada linha sozinha desviaria
 * até 0,05 por parte (99,9 ou 100,1 com 4 recursos). A ordem entre as partes não se inverte.
 *
 * `total` deve ser positivo; total zero não divide e fica com quem chama.
 */
export function roundedShares(values: number[], total: number, steps: number): number[] {
  const exact = values.map((value) => (value / total) * steps);
  const shares = exact.map((value) => Math.floor(value));
  let missing = steps - shares.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact.map((value, index) => ({ index, remainder: value - shares[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (missing <= 0) break;
    shares[index] += 1;
    missing -= 1;
  }
  return shares.map((value) => value / steps);
}
