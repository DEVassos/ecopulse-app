import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../hooks/useAuth';
import { useInvitation } from '../hooks/useInvitation';
import { ApiError } from '../services/api';
import { ROLE_LABELS } from '../services/auth.types';
import { registerWithInvitation } from '../services/invitations.service';
import type { InvitationDetails } from '../services/invitations.types';
import { formatDayTime } from '../utils/format';
import type { RegisteredState } from '../utils/login-redirect';
import { PASSWORD_RULE, validateName, validateNewPassword, validatePasswordConfirmation } from '../utils/validation';

interface FieldErrors {
  name: string;
  password: string;
  confirmation: string;
}

const NO_ERRORS: FieldErrors = { name: '', password: '', confirmation: '' };

function RegisterForm({ token, invitation }: { token: string; invitation: InvitationDetails }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitError('');
    const next: FieldErrors = {
      name: validateName(name),
      password: validateNewPassword(password),
      confirmation: validatePasswordConfirmation(password, confirmation),
    };
    setErrors(next);
    // Fora da regra, nem chama o backend: leva o foco ao primeiro campo com erro
    const firstInvalid = (Object.keys(next) as (keyof FieldErrors)[]).find((field) => next[field]);
    if (firstInvalid) {
      document.getElementById(`register-${firstInvalid}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const user = await registerWithInvitation({ token, name: name.trim(), password });
      const state: RegisteredState = { registeredEmail: user.email };
      navigate('/login', { replace: true, state });
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'Não foi possível criar a conta. Tente novamente.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {submitError && (
        <div className="auth-alert" role="alert">
          {submitError}
        </div>
      )}

      {/* E-mail e papel vêm do convite: a pessoa vê, mas não troca (o backend também ignora se vierem no corpo) */}
      <dl className="register-invite">
        <div>
          <dt>E-mail</dt>
          <dd>{invitation.email}</dd>
        </div>
        <div>
          <dt>Papel</dt>
          <dd>{ROLE_LABELS[invitation.role]}</dd>
        </div>
      </dl>
      <p className="register-validity">Convite válido até {formatDayTime(new Date(invitation.expiresAt).toISOString())}.</p>

      <FormField
        id="register-name"
        label="Nome"
        type="text"
        placeholder="Seu nome"
        autoComplete="name"
        value={name}
        onChange={(value) => {
          setName(value);
          if (errors.name) setErrors((current) => ({ ...current, name: validateName(value) }));
        }}
        onBlur={() => name !== '' && setErrors((current) => ({ ...current, name: validateName(name) }))}
        error={errors.name}
      />

      <FormField
        id="register-password"
        label="Senha"
        type="password"
        placeholder="Crie uma senha"
        autoComplete="new-password"
        hint={PASSWORD_RULE}
        value={password}
        onChange={(value) => {
          setPassword(value);
          if (errors.password) setErrors((current) => ({ ...current, password: validateNewPassword(value) }));
        }}
        onBlur={() => password !== '' && setErrors((current) => ({ ...current, password: validateNewPassword(password) }))}
        error={errors.password}
      />

      <FormField
        id="register-confirmation"
        label="Confirmar senha"
        type="password"
        placeholder="Repita a senha"
        autoComplete="new-password"
        value={confirmation}
        onChange={(value) => {
          setConfirmation(value);
          if (errors.confirmation) {
            setErrors((current) => ({ ...current, confirmation: validatePasswordConfirmation(password, value) }));
          }
        }}
        error={errors.confirmation}
      />

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Criando conta…' : 'Criar conta'}
      </button>
    </form>
  );
}

/**
 * Cadastro por convite (#197, US15): `/cadastro?convite=<token>`, aberta sem sessão. Mostra o e-mail e o papel do
 * convite e pede nome e senha; convite inexistente, usado ou expirado mostra o motivo, sem o formulário.
 */
function InvitationFlow({ token }: { token: string | null }) {
  const invitation = useInvitation(token);

  if (invitation.status === 'loading') return <LoadingState message="Conferindo o convite…" />;
  if (invitation.status === 'ready' && token) return <RegisterForm token={token} invitation={invitation.invitation} />;
  return (
    <>
      <div className="auth-alert" role="alert">
        {invitation.status === 'ready' ? '' : invitation.message}
      </div>
      {invitation.status === 'error' && (
        <button type="button" className="btn-primary" onClick={invitation.retry}>
          Tentar novamente
        </button>
      )}
      <p className="register-validity">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('convite');
  const { user, logout } = useAuth();

  // Com sessão aberta, o convite só é lido depois do Sair: o InvitationFlow monta de novo e busca do zero
  if (user) {
    return (
      <AuthLayout title="Criar conta" description="Cadastro pelo convite recebido de um administrador.">
        <div className="auth-notice" role="status">
          Você está conectado como {user.email}. Para criar a conta deste convite, saia primeiro.
        </div>
        <button type="button" className="btn-primary" onClick={logout}>
          Sair e continuar o cadastro
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Criar conta" description="Cadastro pelo convite recebido de um administrador.">
      <InvitationFlow token={token} />
    </AuthLayout>
  );
}
