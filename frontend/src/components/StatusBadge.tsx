import type { ServiceStatus } from '../services/services.types';

/** Único lugar que traduz estado → texto e cor (o estado nunca é mostrado só pela cor). */
const STATUS: Record<ServiceStatus, { label: string; className: string }> = {
  ativo: { label: 'Ativo', className: 'border-primary/50 bg-primary/10 text-primary-hover' },
  indisponivel: { label: 'Indisponível', className: 'border-error/50 bg-error/10 text-danger' },
  sem_metricas: { label: 'Sem métricas', className: 'border-warning/50 bg-warning/10 text-warning' },
  removido: { label: 'Removido', className: 'border-border bg-surface-3 text-muted' },
};

export default function StatusBadge({ status }: { status: ServiceStatus }) {
  const { label, className } = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
