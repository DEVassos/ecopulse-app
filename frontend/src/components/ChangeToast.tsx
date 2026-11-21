import { useEffect, useState } from 'react';
import type { StatusChangesState } from '../hooks/useStatusChanges';
import { ChangeLine } from './RecentChanges';
import './StatusChanges.css';

/** Tempo na tela de cada lote; depois, o mesmo texto continua em "Últimas mudanças". */
const TOAST_MS = 8000;
const TOAST_LINES = 3;

/**
 * Aviso discreto das mudanças da última atualização (#331): some sozinho, não recebe foco e é anunciado uma vez pelo
 * leitor de tela. A região viva fica sempre montada (vazia sem aviso), para o anúncio não se perder.
 */
export default function ChangeToast({ toast }: { toast: StatusChangesState['toast'] }) {
  const [closedId, setClosedId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setClosedId(toast.id), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const open = toast !== null && closedId !== toast.id;
  const extra = open ? toast.changes.length - TOAST_LINES : 0;
  const box =
    'flex items-start gap-2 rounded-[10px] border border-l-[3px] border-border border-l-primary bg-surface py-2.5 pr-2 pl-3.5 ' +
    'text-sm text-[var(--text-2)] shadow-[0_8px_24px_rgb(0_0_0/0.25)] motion-safe:animate-[change-toast-in_180ms_ease-out]';

  return (
    // No canto inferior direito; no celular, a largura da tela menos as margens de 16 px
    <div className={`change-toast fixed right-4 bottom-4 z-30 w-[min(360px,calc(100vw-32px))] ${open ? box : ''}`}>
      <div role="status" aria-live="polite" className="flex-1">
        {open && (
          <>
            <ul className="m-0 grid list-none gap-0.5 p-0">
              {toast.changes.slice(0, TOAST_LINES).map((change) => (
                <ChangeLine key={change.key} change={change} />
              ))}
            </ul>
            {extra > 0 && <p className="mt-1 mb-0 ml-3.5 text-xs text-muted">e mais {extra} em “Últimas mudanças”.</p>}
          </>
        )}
      </div>
      {/* Fora da região viva: o leitor de tela anuncia só as mudanças, não o rótulo do botão */}
      {open && (
        <button
          type="button"
          onClick={() => setClosedId(toast.id)}
          aria-label="Fechar aviso"
          className="size-6 shrink-0 cursor-pointer rounded-md border-0 bg-transparent text-lg leading-none text-muted hover:text-text"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}
