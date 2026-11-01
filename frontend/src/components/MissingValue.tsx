interface Props {
  /** Texto lido pelo leitor de tela no lugar do traço. */
  label?: string;
  /** Dica ao passar o mouse. */
  title?: string;
}

/** Valor ausente: traço na tela e texto para leitor de tela, nunca um zero que pareça medição. */
export default function MissingValue({ label = 'sem métrica', title = 'Sem métrica nesta leitura' }: Props) {
  return (
    <span className="text-muted" title={title}>
      —<span className="sr-only">{label}</span>
    </span>
  );
}
