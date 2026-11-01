interface Props {
  title: string;
  /** Explica por que está vazio e o que esperar. */
  description: string;
}

export default function EmptyState({ title, description }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
      <p className="m-0 font-display text-lg font-semibold">{title}</p>
      <p className="mt-2 mb-0 text-sm text-muted">{description}</p>
    </div>
  );
}
