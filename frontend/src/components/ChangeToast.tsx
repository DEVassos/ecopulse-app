import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import type { StatusChangesState } from '../hooks/useStatusChanges';
import { ChangeLine } from './RecentChanges';
import './StatusChanges.css';

/** Tempo na tela de cada lote; depois, o mesmo texto continua em "Últimas mudanças". */
const TOAST_MS = 8000;
const TOAST_LINES = 3;
/** Até aqui o Dashboard põe o mapa das regiões no rodapé da tela; o aviso sai de baixo e encurta (#388). */
const NARROW_QUERY = '(max-width: 599px)';
/** Folga entre o aviso e a base do cabeçalho, ou o topo da janela quando o cabeçalho já saiu da tela (#388). */
const TOP_GAP = 8;

const BOX =
  'flex items-start gap-2 rounded-[10px] border border-l-[3px] border-border border-l-primary bg-surface ' +
  'text-[var(--text-2)] shadow-[0_8px_24px_rgb(0_0_0/0.25)] motion-safe:animate-[change-toast-in_180ms_ease-out]';

/**
 * Topo do aviso no celular (#388): logo abaixo do cabeçalho enquanto ele aparece, para não cobrir "Atualizar agora"
 * na segunda linha dele; com a página rolada, o cabeçalho sai da tela e o aviso fica perto do topo da janela.
 */
export function narrowToastTop(headerBottom: number | null): number {
  return Math.max(TOP_GAP, Math.round(headerBottom ?? 0) + TOP_GAP);
}

/** Onde o aviso aparece e quantas frases cabem, por largura da janela (#388). */
export function toastLayout(
  narrow: boolean,
  headerBottom: number | null = null,
): { lines: number; wrapper: string; box: string; style?: CSSProperties } {
  return narrow
    ? {
        lines: 1,
        // Topo, abaixo do cabeçalho: o rodapé é do mapa, onde ficam o "+" e o "−" do zoom
        wrapper: 'fixed right-4 left-4 z-30',
        box: `${BOX} py-2 pr-2 pl-3 text-[13px]`,
        style: { top: narrowToastTop(headerBottom) },
      }
    : {
        lines: TOAST_LINES,
        wrapper: 'fixed right-4 bottom-4 z-30 w-[min(360px,calc(100vw-32px))]',
        box: `${BOX} py-2.5 pr-2 pl-3.5 text-sm`,
      };
}

/**
 * Base do cabeçalho na janela, medida antes da pintura e acompanhada ao rolar: o cabeçalho tem duas linhas no celular
 * (121 px em 390 px) e a faixa do modo demonstração o empurra para baixo, então um topo fixo cobria os controles dele.
 */
function useHeaderBottom(active: boolean): number | null {
  const [bottom, setBottom] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!active) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const header = document.querySelector('header.topbar');
      setBottom(header ? header.getBoundingClientRect().bottom : null);
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [active]);

  return bottom;
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
  const open = toast !== null && closedId !== toast.id;
  const narrow = useNarrowViewport();
  const layout = toastLayout(narrow, useHeaderBottom(narrow && open));

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setClosedId(toast.id), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const extra = open ? toast.changes.length - layout.lines : 0;

  return (
    <div className={`${layout.wrapper} ${open ? layout.box : ''}`} style={layout.style}>
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
