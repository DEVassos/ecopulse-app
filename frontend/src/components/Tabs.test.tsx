import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Tabs from './Tabs';

type Id = 'como-usar' | 'administracao';

const render = (selected: Id) =>
  renderToStaticMarkup(
    <Tabs<Id>
      label="Seções da ajuda"
      selected={selected}
      onSelect={() => {}}
      tabs={[
        { id: 'como-usar', label: 'Como usar', panel: <p>Passos</p> },
        { id: 'administracao', label: 'Administração', panel: <p>Papéis</p> },
      ]}
    />,
  );

/** Abertura de cada elemento com o papel pedido, na ordem do HTML. */
const tags = (html: string, role: string) => html.match(new RegExp(`<[a-z]+[^>]*role="${role}"[^>]*>`, 'g')) ?? [];
const attr = (tag: string, name: string) => tag.match(new RegExp(` ${name}="([^"]*)"`))?.[1] ?? null;

describe('Tabs', () => {
  it('monta a lista com nome e a aba aberta com aria-selected; só ela entra no Tab (#398)', () => {
    const html = render('administracao');
    expect(html).toContain('role="tablist" aria-label="Seções da ajuda"');
    const tabs = tags(html, 'tab');
    expect(tabs.map((tab) => attr(tab, 'aria-selected'))).toEqual(['false', 'true']);
    expect(tabs.map((tab) => attr(tab, 'tabindex'))).toEqual(['-1', '0']);
  });

  it('liga cada aba ao seu painel e mostra só o painel da aba aberta', () => {
    const html = render('como-usar');
    const tabs = tags(html, 'tab');
    const panels = tags(html, 'tabpanel');
    tabs.forEach((tab, index) => {
      expect(attr(tab, 'aria-controls')).toBe(attr(panels[index], 'id'));
      expect(attr(panels[index], 'aria-labelledby')).toBe(attr(tab, 'id'));
    });
    expect(panels.map((panel) => panel.includes(' hidden'))).toEqual([false, true]);
    expect(html).toContain('<p>Papéis</p>'); // montado, mas escondido: o aria-controls aponta para algo que existe
  });
});
