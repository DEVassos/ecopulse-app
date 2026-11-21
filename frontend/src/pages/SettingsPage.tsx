import AppHeader from '../components/AppHeader';
import ErrorState from '../components/ErrorState';
import InviteForm from '../components/InviteForm';
import LoadingState from '../components/LoadingState';
import RefreshIntervalForm from '../components/RefreshIntervalForm';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { ROLE_LABELS } from '../services/auth.types';

/**
 * Área restrita: a sessão e o papel são confirmados no backend (GET /auth/me) antes de mostrar a configuração.
 * Administrador altera o intervalo e convida pessoas; usuário só vê o intervalo (#197). O backend responde 403 a
 * qualquer alteração de conta `usuario`, então esconder o formulário aqui é só para não oferecer o que vai falhar.
 */
export default function SettingsPage() {
  const { user, loading, error, refresh } = useCurrentUser();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="page">
      <AppHeader />

      <main id="conteudo" tabIndex={-1} className="content">
        <section className="panel p-6">
          <h1 className="m-0 font-display text-2xl font-semibold">Configuração</h1>
          <p className="mt-2 mb-0 text-muted">
            {user && !isAdmin
              ? 'Sua conta consulta a configuração; só administradores a alteram.'
              : 'Área restrita: parâmetros do monitoramento e acesso de pessoas.'}
          </p>

          <div className="mt-6">
            {loading && <LoadingState message="Confirmando a sessão…" />}
            {!loading && error && <ErrorState message={error} onRetry={refresh} />}
            {!loading && user && (
              <dl className="m-0 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <dt className="text-sm text-muted">Sessão confirmada pelo backend</dt>
                  <dd className="m-0 mt-1 font-data text-lg">{user.name}</dd>
                  <dd className="m-0 mt-1 break-all text-sm text-muted">{user.email}</dd>
                  <dd className="m-0 mt-2 text-sm">
                    Papel: <strong>{ROLE_LABELS[user.role]}</strong>
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <dt className="text-sm text-muted">Parâmetros do monitoramento</dt>
                  <dd className="m-0 mt-3">
                    <RefreshIntervalForm readOnly={!isAdmin} />
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </section>

        {!loading && isAdmin && (
          <section className="panel p-6" aria-labelledby="convidar-titulo">
            <h2 id="convidar-titulo" className="m-0 font-display text-xl font-semibold">
              Convidar pessoa
            </h2>
            <p className="mt-2 mb-4 text-sm text-muted">
              Só quem recebe um convite cria conta. O link vale para um cadastro e expira; envie pelo canal que preferir.
            </p>
            <InviteForm />
          </section>
        )}
      </main>
    </div>
  );
}
