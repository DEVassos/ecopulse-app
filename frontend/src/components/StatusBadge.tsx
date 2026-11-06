import type { ServiceStatus } from '../services/services.types';

/**
 * Único lugar que traduz estado → texto e cor (o estado nunca é mostrado só pela cor). Só problema ganha cor no selo
 * inteiro (#272): "Ativo" é o estado saudável e fica com o texto neutro, com o ponto verde como única marca.
 */
const STATUS: Record<ServiceStatus, { label: string; className: string; dot: string }> = {
  ativo: { label: 'Ativo', className: 'border-border text-muted', dot: 'bg-primary' },
  indisponivel: { label: 'Indisponível', className: 'border-error/50 bg-error/10 text-danger', dot: 'bg-current' },
  sem_metricas: { label: 'Sem métricas', className: 'border-warning/50 bg-warning/10 text-warning', dot: 'bg-current' },
  removido: { label: 'Removido', className: 'border-border bg-surface-3 text-muted', dot: 'bg-current' },
};

export default function StatusBadge({ status }: { status: ServiceStatus }) {
  const { label, className, dot } = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
