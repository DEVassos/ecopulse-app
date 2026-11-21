interface Props {
  /** Por que este serviço é o mais eficiente da linha (dito no tooltip e para o leitor de tela). */
  title: string;
  /** Complemento curto lido no tooltip, como o valor da métrica. */
  value?: string;
}

/**
 * Selo "mais eficiente" da linha de eficiência da Comparação (#329, RF15): texto e folha, nunca só a cor. Vem do menor
 * valor da linha entre os serviços com dado; com empate ou menos de dois serviços medidos não há selo.
 */
export default function EfficiencyBadge({ title, value }: Props) {
  return (
    <span
      data-tooltip={title}
      data-tooltip-value={value}
      className="ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 align-middle font-sans text-xs font-medium text-primary"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 13 4 4L19 7" />
      </svg>
      mais eficiente
      <span className="sr-only">: {title}</span>
    </span>
  );
}
