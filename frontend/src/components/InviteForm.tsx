import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../services/api';
import { ROLE_LABELS } from '../services/auth.types';
import type { UserRole } from '../services/auth.types';
import { createInvitation } from '../services/invitations.service';
import type { CreatedInvitation } from '../services/invitations.types';
import { formatDayTime } from '../utils/format';
import { validateEmail } from '../utils/validation';
import FormField from './FormField';

const ROLES: UserRole[] = ['usuario', 'admin'];

const ROLE_HINTS: Record<UserRole, string> = {
  usuario: 'consulta o dashboard, as emissões e a comparação',
  admin: 'também altera a configuração e convida pessoas',
};

const BUTTON_CLASS =
  'h-9 cursor-pointer rounded-lg border-0 bg-primary px-4 font-sans text-sm font-semibold text-[var(--on-accent)] hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Convidar pessoa (#197, US15): o administrador informa e-mail e papel, e o backend devolve o link de uso único.
 * Não há envio de e-mail: o link aparece aqui, com Copiar e a validade, para ser enviado pelo canal que a pessoa quiser.
 * Aparece só para administrador; o backend responde 403 a qualquer outra conta.
 */
export default function InviteForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('usuario');
  const [emailError, setEmailError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [invitation, setInvitation] = useState<(CreatedInvitation & { email: string; role: UserRole }) | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const linkRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const error = validateEmail(email);
    setEmailError(error);
    setSubmitError('');
    if (error) {
      document.getElementById('invite-email')?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const created = await createInvitation({ email: email.trim(), role });
      setInvitation({ ...created, email: email.trim().toLowerCase(), role });
      setCopyMessage('');
      setEmail('');
    } catch (reason) {
      setSubmitError(reason instanceof ApiError ? reason.message : 'Não foi possível gerar o convite.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.inviteUrl);
      setCopyMessage('Link copiado.');
    } catch {
      // Sem permissão de área de transferência (ou http fora do localhost): deixa o link selecionado para Ctrl+C
      linkRef.current?.select();
      setCopyMessage('Não foi possível copiar sozinho: o link está selecionado, use Ctrl+C.');
    }
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={handleSubmit} noValidate className="grid gap-3">
        <FormField
          id="invite-email"
          label="E-mail da pessoa"
          type="email"
          placeholder="nome@empresa.com"
          autoComplete="off"
          value={email}
          onChange={(value) => {
            setEmail(value);
            if (emailError) setEmailError(validateEmail(value));
          }}
          onBlur={() => email !== '' && setEmailError(validateEmail(email))}
          error={emailError}
        />

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 p-0 text-sm text-muted">Papel da conta</legend>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/15 has-focus-visible:outline-2 has-focus-visible:outline-primary"
              >
                <input
                  type="radio"
                  name="invite-role"
                  value={option}
                  checked={role === option}
                  onChange={() => setRole(option)}
                  className="accent-[var(--accent)]"
                />
                {ROLE_LABELS[option]}
              </label>
            ))}
          </div>
          <p className="m-0 mt-2 text-xs text-muted">
            {ROLE_LABELS[role]}: {ROLE_HINTS[role]}.
          </p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={submitting} className={BUTTON_CLASS}>
            {submitting ? 'Gerando…' : 'Gerar convite'}
          </button>
          {submitError && (
            <p role="alert" className="m-0 text-sm text-danger">
              {submitError}
            </p>
          )}
        </div>
      </form>

      {invitation && (
        <div className="grid gap-2 rounded-lg border border-border bg-surface-2 p-4" role="status">
          <p className="m-0 text-sm">
            Convite para <strong className="break-all">{invitation.email}</strong> como {ROLE_LABELS[invitation.role].toLowerCase()}.
            Envie o link para a pessoa: ele vale para um cadastro só.
          </p>
          <label htmlFor="invite-link" className="text-sm text-muted">
            Link do convite
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              ref={linkRef}
              id="invite-link"
              readOnly
              value={invitation.inviteUrl}
              onFocus={(event) => event.target.select()}
              className="field-focus min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-data text-sm text-text"
            />
            <button type="button" onClick={copyLink} className="btn-outline min-h-10 px-4 text-sm">
              Copiar
            </button>
          </div>
          <p className="m-0 text-xs text-muted">
            Válido até {formatDayTime(new Date(invitation.expiresAt).toISOString())}.{copyMessage && ` ${copyMessage}`}
          </p>
        </div>
      )}
    </div>
  );
}
