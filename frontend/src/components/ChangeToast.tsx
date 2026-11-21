import { useEffect, useState } from 'react';
import type { StatusChangesState } from '../hooks/useStatusChanges';
import { ChangeLine } from './RecentChanges';
import './StatusChanges.css';

/** Tempo na tela de cada lote; depois, o mesmo texto continua em "Últimas mudanças". */
const TOAST_MS = 8000;
const TOAST_LINES = 3;
/** Até aqui o Dashboard põe o mapa das regiões no rodapé da tela; o aviso sai de baixo e encurta (#388). */
const NARROW_QUERY = '(max-width: 599px)';

const BOX =
  'flex items-start gap-2 rounded-[10px] border border-l-[3px] border-border border-l-primary bg-surface ' +
  'text-[var(--text-2)] shadow-[0_8px_24px_rgb(0_0_0/0.25)] motion-safe:animate-[change-toast-in_180ms_ease-out]';

/** Onde o aviso aparece e quantas frases cabem, por largura da janela (#388). */
export function toastLayout(narrow: boolean): { lines: number; wrapper: string; box: string } {
  return narrow
    ? {
        lines: 1,
        // Topo, abaixo dos 69 px do cabeçalho do celular: o rodapé é do mapa, onde ficam o "+" e o "−" do zoom
        wrapper: 'fixed top-[76px] right-4 left-4 z-30',
        box: `${BOX} py-2 pr-2 pl-3 text-[13px]`,
      }
    : {
        lines: TOAST_LINES,
        wrapper: 'fixed right-4 bottom-4 z-30 w-[min(360px,calc(100vw-32px))]',
        box: `${BOX} py-2.5 pr-2 pl-3.5 text-sm`,
      };
}

/** Largura da janela acompanhada ao vivo: girar o celular ou encolher a janela troca o layout sem recarregar. */
function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(NARROW_QUERY);
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return narrow;
}

/**
 * Aviso discreto das mudanças da última atualização (#331): some sozinho, não recebe foco e é anunciado uma vez pelo
 * leitor de tela. A região viva fica sempre montada (vazia sem aviso), para o anúncio não se perder.
 */
export default function ChangeToast({ toast }: { toast: StatusChangesState['toast'] }) {
  const [closedId, setClosedId] = useState<string | null>(null);
  const layout = toastLayout(useNarrowViewport());

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setClosedId(toast.id), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const open = toast !== null && closedId !== toast.id;
  const extra = open ? toast.changes.length - layout.lines : 0;

  return (
    <div className={`${layout.wrapper} ${open ? layout.box : ''}`}>
      <div role="status" aria-live="polite" className="flex-1">
        {open && (
          <>
            <ul className="m-0 grid list-none gap-0.5 p-0">
              {toast.changes.slice(0, layout.lines).map((change) => (
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
