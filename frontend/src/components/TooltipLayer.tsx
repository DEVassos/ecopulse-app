import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { placeTooltip } from '../utils/tooltip-position';
import './TooltipLayer.css';

interface Shown {
  target: Element;
  text: string;
  /** Valor exato em destaque (`data-tooltip-value`), acima do texto. */
  value: string | null;
}

/** Espera do ponteiro antes de abrir; com um tooltip já aberto, o próximo abre na hora. */
const HOVER_DELAY_MS = 250;

/** Popover do navegador: põe o tooltip na camada de cima, acima até de um <dialog> modal aberto. */
const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

function tooltipTarget(node: EventTarget | null): Element | null {
  return node instanceof Element ? node.closest('[data-tooltip]') : null;
}

/**
 * Tooltip único da aplicação (#274), no lugar do `title` do navegador: um cartão escuro acima do elemento, dentro da
 * tela, com o valor exato em destaque quando houver. Vale para qualquer elemento com `data-tooltip` (e, opcional,
 * `data-tooltip-value`): abre com o ponteiro e com o foco do teclado, fecha ao sair, ao clicar, ao rolar e com Esc.
 * Enquanto está aberto, o elemento ganha `aria-describedby` apontando para ele, se o texto não for o próprio nome.
 */
export default function TooltipLayer() {
  const id = useId();
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    let open = false;
    function show(target: Element) {
      window.clearTimeout(timer.current);
      open = true;
      setShown({ target, text: target.getAttribute('data-tooltip') ?? '', value: target.getAttribute('data-tooltip-value') });
    }
    function hide() {
      window.clearTimeout(timer.current);
      if (!open) return;
      open = false;
      setShown(null);
    }
    function onPointerOver(event: PointerEvent) {
      // No toque não há "passar por cima": o dedo abriria e fecharia o tooltip no mesmo gesto
      if (event.pointerType === 'touch') return;
      const target = tooltipTarget(event.target);
      if (!target) return;
      window.clearTimeout(timer.current);
      if (open) show(target);
      else timer.current = window.setTimeout(() => show(target), HOVER_DELAY_MS);
    }
    function onPointerOut(event: PointerEvent) {
      const from = tooltipTarget(event.target);
      if (from && tooltipTarget(event.relatedTarget) !== from) hide();
    }
    function onFocusIn(event: FocusEvent) {
      const target = tooltipTarget(event.target);
      // Só o foco do teclado: o clique do mouse já mostrou (ou escondeu) pelo ponteiro
      if (target && event.target instanceof Element && event.target.matches(':focus-visible')) show(target);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') hide();
    }
    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('pointerdown', hide);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', hide);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', hide, true);
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('pointerdown', hide);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', hide, true);
    };
  }, []);

  // Posição e descrição acessível, depois que o texto novo já está no cartão (para medir o tamanho dele)
  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!tip) return;
    if (supportsPopover) {
      if (shown && !tip.matches(':popover-open')) tip.showPopover();
      if (!shown && tip.matches(':popover-open')) tip.hidePopover();
    }
    if (!shown) return;
    const rect = shown.target.getBoundingClientRect();
    const placement = placeTooltip(
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      { width: tip.offsetWidth, height: tip.offsetHeight },
      { width: document.documentElement.clientWidth, height: window.innerHeight },
    );
    tip.style.left = `${placement.left}px`;
    tip.style.top = `${placement.top}px`;
    tip.style.setProperty('--tooltip-arrow', `${placement.arrow}px`);
    tip.dataset.side = placement.side;

    const target = shown.target;
    if (target.getAttribute('aria-label') === shown.text) return;
    const previous = target.getAttribute('aria-describedby');
    target.setAttribute('aria-describedby', previous ? `${previous} ${id}` : id);
    return () => {
      if (previous) target.setAttribute('aria-describedby', previous);
      else target.removeAttribute('aria-describedby');
    };
  }, [shown, id]);

  return (
    <div
      ref={tipRef}
      id={id}
      role="tooltip"
      className="tooltip"
      popover={supportsPopover ? 'manual' : undefined}
      hidden={supportsPopover ? undefined : shown === null}
    >
      {shown?.value && <strong>{shown.value}</strong>}
      {shown && <span>{shown.text}</span>}
    </div>
  );
}
