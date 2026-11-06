import { useEffect, useState } from 'react';

/** Há conteúdo escondido à direita de uma área com rolagem horizontal (1 px de folga para arredondamento). */
export function hasMoreToTheRight(scrollLeft: number, clientWidth: number, scrollWidth: number): boolean {
  return scrollLeft + clientWidth < scrollWidth - 1;
}

/**
 * Acompanha uma área com rolagem horizontal e diz se ainda há colunas à direita (#263). A tela usa isso para mostrar
 * a pista de "há mais colunas" só enquanto ela é verdade: some quando a pessoa rola até o fim ou quando tudo cabe.
 * Devolve `[ref, hasMore]`: o ref vai na área rolável.
 */
export function useHorizontalOverflow<T extends HTMLElement>() {
  // Ref de callback: a área pode aparecer depois da montagem (a matriz da Comparação só existe com dados)
  const [element, setElement] = useState<T | null>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (!element) return;
    const update = () => setMore(hasMoreToTheRight(element.scrollLeft, element.clientWidth, element.scrollWidth));
    element.addEventListener('scroll', update, { passive: true });
    // O ResizeObserver já chama update ao começar a observar; depois, a cada mudança de largura da janela, das fontes
    // ou das linhas que o polling acrescenta
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => {
      element.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [element]);

  return [setElement, element !== null && more] as const;
}
