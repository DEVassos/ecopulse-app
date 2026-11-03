import { useState } from 'react';
import './FormField.css';

interface Props {
  id: string;
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  /** Chamado quando o usuário sai do campo (momento de validar). */
  onBlur?: () => void;
  /** Mensagem de erro; vazio quando o campo está correto. */
  error?: string;
  /** Texto de ajuda mostrado enquanto não há erro. */
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
}

/** Campo de formulário com rótulo, erro e, nas senhas, o botão de mostrar/ocultar. */
export default function FormField({ id, label, type, value, onChange, onBlur, error = '', hint, placeholder, autoComplete }: Props) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `error-${id}` : hint ? `hint-${id}` : undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={isPassword ? 'input-wrap input-wrap--password' : 'input-wrap'}>
        <input
          type={isPassword && passwordVisible ? 'text' : type}
          id={id}
          name={id}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={error !== ''}
          aria-describedby={describedBy}
        />
        {isPassword && (
          <button
            type="button"
            className="toggle-password"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={passwordVisible}
            aria-controls={id}
          >
            {passwordVisible ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 3l18 18" />
                <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.3 4.2M6.5 6.6C3.6 8.5 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1.1" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error ? (
        <div className="field-error" id={`error-${id}`} role="alert">
          {error}
        </div>
      ) : (
        hint && (
          <div className="field-hint" id={`hint-${id}`}>
            {hint}
          </div>
        )
      )}
    </div>
  );
}
