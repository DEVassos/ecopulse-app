import type { StatusChange, StatusChangeKind } from '../hooks/useStatusChanges';

/** O ponto repete a cor do selo do estado (StatusBadge); a frase diz o que mudou, nunca só a cor. */
const DOT: Record<StatusChangeKind, string> = {
  indisponivel: 'bg-danger',
  sem_metricas: 'bg-warning',
  removido: 'bg-muted',
  novo: 'bg-primary',
  ativo: 'bg-primary',
};

/** Uma mudança de estado, com o horário na frase: no aviso e em "Últimas mudanças". */
export function ChangeLine({ change }: { change: StatusChange }) {
  return (
    <li className="flex break-inside-avoid items-baseline gap-2 py-0.5">
      <span className={`size-1.5 shrink-0 -translate-y-px rounded-full ${DOT[change.kind]}`} aria-hidden="true" />
      {change.message}
    </li>
  );
}

/**
 * Histórico curto das mudanças de estado desde que a página abriu (#331, RF02, RF05, RF06): novo serviço, removido,
 * indisponível, sem métricas e retorno a ativo, da mais nova para a mais antiga (até 10).
 */
export default function RecentChanges({ changes }: { changes: StatusChange[] }) {
  return (
    <section className="rounded-r-lg border-l-2 border-border bg-surface-2 px-3.5 py-2.5 text-sm text-[var(--text-2)]" aria-labelledby="recent-changes-title">
      <h2 id="recent-changes-title" className="m-0 mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
        Últimas mudanças
      </h2>
      {changes.length === 0 ? (
        <p className="m-0 text-muted">Nenhuma mudança de estado desde que a página abriu.</p>
      ) : (
        // A partir de 6 linhas, duas colunas na tela larga: dez linhas não empurram o resto do Dashboard
        <ol className={`m-0 list-none gap-x-8 p-0 ${changes.length > 5 ? '[columns:2_24rem]' : ''}`}>
          {changes.map((change) => (
            <ChangeLine key={change.key} change={change} />
          ))}
        </ol>
      )}
    </section>
  );
}
