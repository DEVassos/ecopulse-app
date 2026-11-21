import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import { updateProfile } from '../services/auth.service';
import { ROLE_LABELS, type CurrentUser } from '../services/auth.types';
import { validateName } from '../utils/validation';
import FormField from './FormField';

const BUTTON_CLASS =
  'min-h-11 cursor-pointer rounded-lg border-0 bg-primary px-4 font-sans text-sm font-semibold text-[var(--on-accent)] hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50';

/**
 * "Seus dados" do Perfil (#401): a pessoa troca o próprio nome (PATCH /auth/me, #400). E-mail e papel aparecem só
 * para leitura, com o motivo; o backend também ignora os dois se vierem no corpo. O nome salvo vai ao cabeçalho pela
 * sessão (`updateUser`), sem novo login.
 */
export default function ProfileDetailsForm({ user }: { user: CurrentUser }) {
  const { updateUser } = useAuth();
  const [savedName, setSavedName] = useState(user.name);
  const [name, setName] = useState(user.name);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const unchanged = name.trim() === savedName;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitError('');
    setMessage('');
    const invalid = validateName(name);
    setError(invalid);
    if (invalid) {
      document.getElementById('profile-name')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateProfile({ name: name.trim() });
      updateUser({ email: updated.email, name: updated.name, role: updated.role });
      setSavedName(updated.name);
      setName(updated.name);
      setMessage(`Nome salvo: ${updated.name}. O cabeçalho já mostra o nome novo.`);
    } catch (reason) {
      // 400 é do nome (vazio ou longo); o resto (rede, 500) fica no aviso do formulário. Um 401 já encerrou a sessão
      if (reason instanceof ApiError && reason.status === 400) setError(reason.message);
      else setSubmitError(reason instanceof ApiError ? reason.message : 'Não foi possível salvar o nome. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-1">
      <FormField
        id="profile-name"
        label="Nome"
        type="text"
        autoComplete="name"
        hint="Aparece no cabeçalho. Até 100 caracteres."
        value={name}
        onChange={(value) => {
          setName(value);
          setMessage('');
          if (error) setError(validateName(value));
        }}
        onBlur={() => setError(validateName(name))}
        error={error}
      />

      <dl className="m-0 mb-4 grid gap-4">
        <div>
          <dt className="text-sm font-medium">E-mail</dt>
          <dd className="m-0 mt-1 break-all font-data">{user.email}</dd>
          <dd className="m-0 mt-1 text-sm text-muted">O e-mail identifica a conta no login e não muda por aqui.</dd>
        </div>
        <div>
          <dt className="text-sm font-medium">Papel</dt>
          <dd className="m-0 mt-1 font-semibold">{ROLE_LABELS[user.role]}</dd>
          <dd className="m-0 mt-1 text-sm text-muted">O papel é definido quando a conta é criada e não muda por aqui.</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={submitting || unchanged} className={BUTTON_CLASS}>
          {submitting ? 'Salvando…' : 'Salvar nome'}
        </button>
        {submitError && (
          <p role="alert" className="m-0 text-sm text-danger">
            {submitError}
          </p>
        )}
      </div>
      <p role="status" className="m-0 mt-2 text-sm text-muted">
        {message}
      </p>
    </form>
  );
}
