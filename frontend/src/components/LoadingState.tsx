export default function LoadingState({ message = 'Carregando…' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-surface p-8 text-muted" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
      {message}
    </div>
  );
}
