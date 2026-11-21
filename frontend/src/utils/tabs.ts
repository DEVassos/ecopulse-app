// Navegação entre abas (#398): as regras do teclado e da URL ficam aqui, fora do componente, para serem testadas.
// Padrão "Tabs" do ARIA Authoring Practices: setas andam em círculo, Home e End vão às pontas.

/** Lista de abas com pelo menos uma: a primeira é a aba padrão. */
export type TabIds<Id extends string> = readonly [Id, ...Id[]];

/**
 * Aba que recebe o foco (e a seleção) depois de uma tecla na lista de abas: → e ← andam em círculo (da última volta
 * à primeira), Home vai à primeira e End à última. Qualquer outra tecla devolve `null`, e a lista não reage.
 */
export function nextTabId<Id extends string>(ids: TabIds<Id>, current: Id, key: string): Id | null {
  const index = Math.max(0, ids.indexOf(current));
  switch (key) {
    case 'ArrowRight':
      return ids[(index + 1) % ids.length];
    case 'ArrowLeft':
      return ids[(index - 1 + ids.length) % ids.length];
    case 'Home':
      return ids[0];
    case 'End':
      return ids[ids.length - 1];
    default:
      return null;
  }
}

/**
 * Aba do endereço (`?aba=`). Endereço sem aba, com aba digitada errado ou de uma aba que não existe mais abre a
 * primeira, em vez de uma página sem painel.
 */
export function readTab<Id extends string>(ids: TabIds<Id>, value: string | null): Id {
  return ids.find((id) => id === value) ?? ids[0];
}
