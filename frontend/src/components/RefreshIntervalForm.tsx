import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMonitoring } from '../hooks/useMonitoring';
import { ApiError } from '../services/api';
import { updateRefreshInterval } from '../services/monitoring.service';
import { formatDayTime } from '../utils/format';

/**
 * Seletor do intervalo de atualização do dashboard (#176, DW05). As opções vêm do backend
 * (`allowedIntervalsSeconds`), assim os valores aceitos ficam num lugar só.
 */
export default function RefreshIntervalForm() {
  const { settings, applySettings } = useMonitoring();
  // null: o administrador ainda não mexeu, então o rádio acompanha o valor salvo
  const [choice, setChoice] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  if (!settings) {
    return (
      <p className="m-0 text-muted">
        Não foi possível ler o intervalo atual no servidor. O dashboard segue com o padrão local; tente de novo em instantes.
      </p>
    );
  }

  const selected = choice ?? settings.refreshIntervalSeconds;
  const changed = selected !== settings.refreshIntervalSeconds;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!changed || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await updateRefreshInterval(selected);
      applySettings(saved);
      setChoice(null);
      setMessage({ kind: 'ok', text: `Intervalo salvo: o dashboard passa a atualizar a cada ${saved.refreshIntervalSeconds} s.` });
    } catch (reason) {
      setMessage({ kind: 'error', text: reason instanceof ApiError ? reason.message : 'Não foi possível salvar o intervalo.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-sm text-muted">Atualização automática do dashboard</legend>
        <div className="flex flex-wrap gap-2">
          {settings.allowedIntervalsSeconds.map((seconds) => (
            <label
              key={seconds}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 font-mono text-sm has-checked:border-primary has-checked:bg-primary/15 has-focus-visible:outline-2 has-focus-visible:outline-primary"
            >
              <input
                type="radio"
                name="refresh-interval"
                value={seconds}
                checked={selected === seconds}
                onChange={() => {
                  setChoice(seconds);
                  setMessage(null);
                }}
                className="accent-[var(--accent)]"
              />
              {seconds} s
            </label>
          ))}
        </div>
      </fieldset>

      <p className="m-0 text-xs text-muted">
        {settings.updatedAt
          ? `Valor salvo: ${settings.refreshIntervalSeconds} s, trocado em ${formatDayTime(settings.updatedAt)}.`
          : `Valor salvo: ${settings.refreshIntervalSeconds} s (padrão, ainda não configurado).`}{' '}
        Vale para todos os visitantes do dashboard, a partir do próximo ciclo.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!changed || saving}
          className="h-9 cursor-pointer rounded-lg border-0 bg-primary px-4 font-sans text-sm font-semibold text-[var(--on-accent)] hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        {/* Região viva: o resultado do Salvar é anunciado pelo leitor de tela */}
        <p role="status" className={`m-0 text-sm ${message?.kind === 'error' ? 'text-danger' : 'text-muted'}`}>
          {message?.text}
        </p>
      </div>
    </form>
  );
}
