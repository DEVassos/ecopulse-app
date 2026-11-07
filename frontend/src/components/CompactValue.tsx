import { formatInScale, formatPrecise } from '../utils/units';
import type { Quantity, Scale } from '../utils/units';

interface Props {
  quantity: Quantity;
  value: number;
  /** Escala do conjunto (coluna, linha, card): a tela mostra o número nela, com as casas dela. */
  scale: Scale;
  /** O que o número é, no tooltip (ex.: "Energia na última leitura"). */
  label: string;
}

/** Número compacto de energia ou CO₂e com o valor exato no tooltip único (#274): "1,44" na tela, "1,438 Wh" no tooltip. */
export default function CompactValue({ quantity, value, scale, label }: Props) {
  return (
    <span data-tooltip={label} data-tooltip-value={formatPrecise(quantity, value)}>
      {formatInScale(value, scale)}
    </span>
  );
}
