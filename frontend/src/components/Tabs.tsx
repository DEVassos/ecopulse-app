import { useId } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { nextTabId } from '../utils/tabs';
import type { TabIds } from '../utils/tabs';
import './Tabs.css';

export interface TabItem<Id extends string> {
  id: Id;
  /** Texto da aba, também o nome do painel para o leitor de tela. */
  label: string;
  panel: ReactNode;
}

interface Props<Id extends string> {
  /** Nome da lista de abas para o leitor de tela ("Seções da ajuda"). */
  label: string;
  tabs: readonly [TabItem<Id>, ...TabItem<Id>[]];
  /** Aba aberta: quem usa decide onde ela mora (na Ajuda, em `?aba=`). */
  selected: Id;
  onSelect: (id: Id) => void;
}

/**
 * Abas acessíveis e controladas (#398), no padrão "Tabs" do ARIA Authoring Practices: só a aba aberta entra no Tab
 * (foco itinerante); → e ← andam em círculo, Home e End vão às pontas, e a seleção acompanha o foco. Todos os painéis
 * ficam montados e só o da aba aberta aparece, então cada `aria-controls` aponta para um elemento que existe.
 */
export default function Tabs<Id extends string>({ label, tabs, selected, onSelect }: Props<Id>) {
  const prefix = useId();
  const ids: TabIds<Id> = [tabs[0].id, ...tabs.slice(1).map((tab) => tab.id)];
  const tabId = (id: Id) => `${prefix}-aba-${id}`;
  const panelId = (id: Id) => `${prefix}-painel-${id}`;

  // Anda a partir da aba com foco, e não da `selected`: a troca passa pela URL e a nova renderização pode chegar depois
  // da tecla seguinte; contar da aba focada não perde nem repete passos com a tecla segurada
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: Id) {
    const next = nextTabId(ids, current, event.key);
    if (next === null) return;
    event.preventDefault(); // Home e End não rolam a página
    document.getElementById(tabId(next))?.focus();
    if (next !== current) onSelect(next);
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="tabs__list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            aria-selected={tab.id === selected}
            aria-controls={panelId(tab.id)}
            tabIndex={tab.id === selected ? 0 : -1}
            className="tabs__tab"
            onClick={() => tab.id !== selected && onSelect(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" id={panelId(tab.id)} aria-labelledby={tabId(tab.id)} hidden={tab.id !== selected} tabIndex={0} className="tabs__panel">
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
