import AppHeader from '../components/AppHeader';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import RefreshIntervalForm from '../components/RefreshIntervalForm';
import { useCurrentUser } from '../hooks/useCurrentUser';

/** Área restrita: a sessão é confirmada no backend (GET /auth/me) antes de mostrar a configuração. */
export default function SettingsPage() {
  const { user, loading, error, refresh } = useCurrentUser();

  return (
    <div className="page">
      <AppHeader />

      <main id="conteudo" tabIndex={-1} className="content">
        <section className="panel p-6">
          <h1 className="m-0 font-display text-2xl font-semibold">Configuração</h1>
          <p className="mt-2 mb-0 text-muted">Área restrita do administrador.</p>

          <div className="mt-6">
            {loading && <LoadingState message="Confirmando a sessão…" />}
            {!loading && error && <ErrorState message={error} onRetry={refresh} />}
            {!loading && user && (
              <dl className="m-0 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <dt className="text-sm text-muted">Sessão confirmada pelo backend</dt>
                  <dd className="m-0 mt-1 break-all font-data text-lg">{user.email}</dd>
                </div>
                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <dt className="text-sm text-muted">Parâmetros do monitoramento</dt>
                  <dd className="m-0 mt-3">
                    <RefreshIntervalForm />
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
