import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import { validateEmail, validatePassword } from '../utils/validation';

interface FieldErrors {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({ email: '', password: '' });
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Depois do login volta para a página que pediu a sessão (ProtectedRoute), ou para o dashboard
  const destination = (location.state as { from?: string } | null)?.from ?? '/';

  if (user) return <Navigate to={destination} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');

    const nextErrors: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);

    // Leva o foco ao primeiro campo com erro
    const firstInvalid = (Object.keys(nextErrors) as (keyof FieldErrors)[]).find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'Não foi possível entrar. Tente novamente.');
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Entrar" description="Acesse a área de configuração do monitoramento.">
      <form onSubmit={handleSubmit} noValidate>
        {submitError && (
          <div className="auth-alert" role="alert">
            {submitError}
          </div>
        )}

        <FormField
          id="email"
          label="E-mail"
          type="email"
          placeholder="voce@empresa.com"
          autoComplete="username"
          value={email}
          onChange={(value) => {
            setEmail(value);
            // Atualiza o erro enquanto a pessoa corrige
            if (errors.email) setErrors((current) => ({ ...current, email: validateEmail(value) }));
          }}
          onBlur={() => setErrors((current) => ({ ...current, email: validateEmail(email) }))}
          error={errors.email}
        />

        <FormField
          id="password"
          label="Senha"
          type="password"
          placeholder="Sua senha"
          autoComplete="current-password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (errors.password) setErrors((current) => ({ ...current, password: validatePassword(value) }));
          }}
          onBlur={() => setErrors((current) => ({ ...current, password: validatePassword(password) }))}
          error={errors.password}
        />

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </AuthLayout>
  );
}
