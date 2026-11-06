/** Como energia e CO₂e são calculados (ADR 0006): o método fica no tooltip, não numa frase sob os números (#272). */
const METHOD =
  'Estimativa, não medição: potência calculada a partir de CPU, memória, disco e rede × intervalo da coleta × intensidade de carbono da região (ADR 0006).';

interface Props {
  /** Complemento do método nesta tela (ex.: o que entra na soma). */
  note?: string;
}

/** Etiqueta "estimado" ao lado do título de uma tela com energia e CO₂e. O leitor de tela ouve o método inteiro. */
export default function EstimateTag({ note }: Props) {
  const text = note ? `${METHOD} ${note}` : METHOD;
  return (
    <span
      className="inline-flex cursor-help items-center gap-1 whitespace-nowrap rounded-full border border-border px-2 py-0.5 font-sans text-xs font-medium text-muted"
      title={text}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      estimado
      <span className="sr-only">: {text}</span>
    </span>
  );
}
