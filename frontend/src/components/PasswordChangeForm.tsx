import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../services/api';
import { changePassword, passwordErrorField } from '../services/auth.service';
import { PASSWORD_RULE, validateChangedPassword, validateCurrentPassword, validatePasswordConfirmation } from '../utils/validation';
import FormField from './FormField';

interface FieldErrors {
  current: string;
  next: string;
  confirmation: string;
}

const NO_ERRORS: FieldErrors = { current: '', next: '', confirmation: '' };
const FIELD_IDS: Record<keyof FieldErrors, string> = { current: 'password-current', next: 'password-new', confirmation: 'password-confirmation' };
const BUTTON_CLASS =
  'min-h-11 cursor-pointer rounded-lg border-0 bg-primary px-4 font-sans text-sm font-semibold text-[var(--on-accent)] hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50';

/**
 * "Trocar senha" do Perfil (#401): senha atual, nova e confirmação, conferidas aqui com a regra do cadastro antes de
 * chamar PUT /auth/me/password (#400). Senha atual errada volta como 400 e aparece no campo, sem encerrar a sessão
 * (só o 401 encerra). A troca não derruba as sessões já abertas, e a tela diz isso.
 */
export default function PasswordChangeForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [shown, setShown] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS);
  const [submitError, setSubmitError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function showErrors(found: FieldErrors): boolean {
    setErrors(found);
    const firstInvalid = (Object.keys(found) as (keyof FieldErrors)[]).find((field) => found[field]);
    if (firstInvalid) document.getElementById(FIELD_IDS[firstInvalid])?.focus();
    return firstInvalid !== undefined;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitError('');
    setMessage('');
    // Fora da regra, nem chama o backend: leva o foco ao primeiro campo com erro
    const invalid = showErrors({
      current: validateCurrentPassword(current),
      next: validateChangedPassword(current, next),
      confirmation: validatePasswordConfirmation(next, confirmation),
    });
    if (invalid) return;

    setSubmitting(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirmation('');
      setShown(false);
      setMessage('Senha alterada. No próximo login, use a senha nova.');
    } catch (reason) {
      const field = passwordErrorField(reason);
      if (field && reason instanceof ApiError) {
        showErrors({ ...NO_ERRORS, [field === 'currentPassword' ? 'current' : 'next']: reason.message });
      } else {
        setSubmitError(reason instanceof ApiError ? reason.message : 'Não foi possível trocar a senha. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-1">
      <FormField
        id={FIELD_IDS.current}
        label="Senha atual"
        type="password"
        autoComplete="current-password"
        shown={shown}
        value={current}
        onChange={(value) => {
          setCurrent(value);
          if (errors.current) setErrors((old) => ({ ...old, current: validateCurrentPassword(value) }));
        }}
        error={errors.current}
      />
      <FormField
        id={FIELD_IDS.next}
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        hint={PASSWORD_RULE}
        shown={shown}
        value={next}
        onChange={(value) => {
          setNext(value);
          if (errors.next) setErrors((old) => ({ ...old, next: validateChangedPassword(current, value) }));
        }}
        error={errors.next}
      />
      <FormField
        id={FIELD_IDS.confirmation}
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        shown={shown}
        value={confirmation}
        onChange={(value) => {
          setConfirmation(value);
          if (errors.confirmation) setErrors((old) => ({ ...old, confirmation: validatePasswordConfirmation(next, value) }));
        }}
        error={errors.confirmation}
      />

      <label className="mb-4 flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={shown} onChange={(event) => setShown(event.target.checked)} className="size-4 accent-[var(--accent)]" />
        Mostrar as senhas
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={submitting} className={BUTTON_CLASS}>
          {submitting ? 'Trocando…' : 'Trocar senha'}
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
      <p className="m-0 mt-2 text-sm text-muted">
        Trocar a senha não encerra as sessões já abertas: esta continua, e as de outros navegadores valem até o login delas expirar.
      </p>
    </form>
  );
}
