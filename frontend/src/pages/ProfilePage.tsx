import AppHeader from '../components/AppHeader';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PasswordChangeForm from '../components/PasswordChangeForm';
import ProfileDetailsForm from '../components/ProfileDetailsForm';
import { useCurrentUser } from '../hooks/useCurrentUser';

/**
 * Perfil (#401): a própria conta, de qualquer papel, troca o nome e a senha. Os dados vêm de GET /auth/me (o banco,
 * não a sessão salva na aba) antes de mostrar os formulários; sem resposta, o erro fica na tela com Tentar novamente.
 * Quem garante que cada um só altera a própria conta é o backend: as rotas da #400 usam a conta do JWT.
 */
export default function ProfilePage() {
  const { user, loading, error, refresh } = useCurrentUser();

  return (
    <div className="page">
      <AppHeader />

      <main id="conteudo" tabIndex={-1} className="content">
        <section className="panel p-6">
          <h1 className="m-0 font-display text-2xl font-semibold">Perfil</h1>
          <p className="mt-2 mb-0 text-muted">Cada pessoa altera só os próprios dados, seja administradora ou usuária.</p>
          {loading && (
            <div className="mt-6">
              <LoadingState message="Confirmando a sessão…" />
            </div>
          )}
          {!loading && error && (
            <div className="mt-6">
              <ErrorState message={error} onRetry={refresh} />
            </div>
          )}
        </section>

        {!loading && user && (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <section className="panel p-6" aria-labelledby="perfil-dados-titulo">
              <h2 id="perfil-dados-titulo" className="m-0 mb-4 font-display text-xl font-semibold">
                Seus dados
              </h2>
              <ProfileDetailsForm user={user} />
            </section>
            <section className="panel p-6" aria-labelledby="perfil-senha-titulo">
              <h2 id="perfil-senha-titulo" className="m-0 mb-4 font-display text-xl font-semibold">
                Trocar senha
              </h2>
              <PasswordChangeForm />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
