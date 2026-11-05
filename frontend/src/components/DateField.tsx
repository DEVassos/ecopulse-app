import { useRef, useState } from 'react';
import { displayToIso, isoToDisplay, maskDate } from '../utils/date-input';

interface Props {
  /** Data em AAAA-MM-DD, ou '' quando vazia ou inválida. */
  value: string;
  /** Recebe AAAA-MM-DD quando o texto forma uma data que existe; '' enquanto incompleto ou inválido. */
  onChange: (iso: string) => void;
  /** Nome do campo para o leitor de tela (ex.: "Data inicial"). */
  label: string;
  /** Data máxima do calendário, em AAAA-MM-DD. */
  max?: string;
  disabled?: boolean;
  /** A página marcou o período como inválido (a mensagem fica em describedBy). */
  invalid?: boolean;
  describedBy?: string;
  /** Classes extras do campo de texto (ex.: utilities do Tailwind na Comparação). */
  inputClassName?: string;
}

/**
 * Data em DD/MM/AAAA em qualquer navegador (#267). O texto aceita só dígitos e põe as barras sozinho; o botão abre o
 * calendário nativo (showPicker), que fica escondido e só serve de seletor. O <input type="date"> visível mostraria
 * MM/DD/AAAA num navegador em inglês, mesmo com a página em pt-BR.
 */
export default function DateField({ value, onChange, label, max, disabled = false, invalid = false, describedBy, inputClassName }: Props) {
  const pickerRef = useRef<HTMLInputElement>(null);
  // Texto em edição; null mostra o valor recebido (que também muda por ◀ ▶, pela URL ou pelo calendário)
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? isoToDisplay(value);
  const malformed = draft !== null && draft !== '' && displayToIso(draft) === '';

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      // navegador sem showPicker: o texto continua sendo o caminho para digitar a data
      picker.focus();
    }
  }

  return (
    <span className="date-field">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/AAAA"
        maxLength={10}
        aria-label={label}
        value={text}
        disabled={disabled}
        aria-invalid={invalid || malformed || undefined}
        aria-describedby={describedBy}
        className={inputClassName}
        onChange={(event) => {
          const masked = maskDate(event.target.value);
          setDraft(masked);
          onChange(displayToIso(masked));
        }}
        // Ao sair do campo, uma data válida volta a ser mostrada a partir do valor; o texto inválido fica para corrigir
        onBlur={() => setDraft((current) => (current !== null && displayToIso(current) === '' && current !== '' ? current : null))}
      />
      <button
        type="button"
        className="date-field__picker"
        onClick={openPicker}
        disabled={disabled}
        aria-label={`Escolher ${label.toLocaleLowerCase('pt-BR')} no calendário`}
        title="Abrir o calendário"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="date-field__native"
        value={value}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          setDraft(null);
          onChange(event.target.value);
        }}
      />
    </span>
  );
}
