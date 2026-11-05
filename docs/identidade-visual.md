# EcoPulse — Identidade Visual e Diretrizes de Design

Este documento detalha a identidade visual, a paleta de cores, os princípios de design e as diretrizes de interface do aplicativo **EcoPulse**, com foco em tecnologia, sustentabilidade e clareza de dados.

EcoPulse é o nome da aplicação, decidido pelo time em 08/10/2026 (PR #62). A interface já o usava; a documentação e as configurações passaram a usá-lo na #68. No edital do desafio o produto aparece como GreenER, e o repositório continua `DEVassos/greener-app` (renome previsto na #122).

O protótipo navegável no Figma, com as telas de dashboard, login e cadastro em desktop e celular, está em [produto/prototipo-figma.md](produto/prototipo-figma.md).

---

## 1. Conceito e Tema

O EcoPulse adota um **tema escuro (Dark Theme)** com uma estética moderna voltada para sistemas de monitoramento corporativo e infraestrutura em nuvem ("cara de tecnologia"). O design prioriza a legibilidade de dados densos, uso eficiente de espaço e forte apelo visual através de mapas e gráficos interativos. A base é **azul-escuro** (fundo, superfícies e bordas), e o **verde fica só no que é ação ou destaque**: o verde-esmeralda da ação principal e do item ativo, e o neon no que pede atenção (maior impacto, pico de gráfico, "ao vivo"). Assim o verde volta a significar alguma coisa, sem competir com o laranja dos alertas e o vermelho dos erros. A regra vale desde a #180 (20/10/2026), em resposta ao feedback do cliente na Sprint Review 1, que achou a tela "verde demais"; a base verde-escura da #87 foi abandonada.

### Logotipo

Ícone de folha na cor Primária (`#10B981`) seguido do nome em Space Grotesk 700, 24 px: "Eco" na cor do texto (`#E2E8F0`) e "Pulse" no amarelo da marca (`#FACC15`). Implementado no componente `Brand` (`frontend/src/components/Brand.tsx`), usado no cabeçalho (`AppHeader`). As telas de acesso (login) chegam com a autenticação da Sprint 2.

**Pulso de "ao vivo"** (#180): a cada busca bem-sucedida de `/services` (no primeiro carregamento, a cada intervalo e no **Atualizar agora**), a folha se desfaz, o cabinho vira uma linha de batimento com um brilho `--neon` correndo por ela e a folha volta. A animação leva 2,4 s, em SVG (SMIL), sem biblioteca. O pulso diz que o dashboard buscou os dados de novo, não que chegou uma coleta nova: ele toca mesmo quando os valores não mudaram. O `Brand` recebe `pulseKey` com o horário da busca (o `updatedAt` do `useServices`, no relógio do navegador) e toca uma vez a cada valor novo; o `DashboardPage` repassa esse valor pelo `AppHeader`. Uma busca que termina no meio do pulso não o reinicia. O logo fica parado quando a busca falha (o horário não muda), nas páginas sem polling (ex.: `/configuracao`) e com `prefers-reduced-motion: reduce`.

---

## 2. Paleta de Cores

A paleta de cores foi estruturada para distinguir claramente elementos funcionais, de marca e de alerta (evitando confusão entre status de sistema e decoração).

Os valores ficam em `frontend/src/styles/global.css`, fonte única das cores no código. O contraste é a razão WCAG 2.1 sobre o fundo `#0B1220`. O mínimo AA é 4,5:1 para texto normal e 3:1 para texto grande (≥ 24 px, ou ≥ 18,7 px em negrito).

| Uso | Descrição | Cor (Nome Amigável) | Código Hexadecimal | Token CSS | Contraste sobre o fundo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fundo** | Cor de fundo principal da aplicação | Azul-noite | `#0B1220` | `--bg` | — |
| **Superfície** | Cor de fundo para cards, painéis e contêineres | Azul-ardósia escuro | `#131C2E` | `--surface` | — |
| **Primária** | Marca, botões de ação principal e elementos ativos | Verde-esmeralda | `#10B981` | `--accent` | 7,4:1 |
| **Secundária** | Dados secundários, links, destaques auxiliares e a cor da **energia** em gráficos e barras (#274) | Azul-ciano | `#38BDF8` | `--sky` | 8,7:1 |
| **Destaque da marca** | Elementos exclusivos da identidade visual/logotipo | Amarelo | `#FACC15` | `--yellow` | 12,2:1 |
| **Alerta** | Estados de aviso (ex: serviço sem métricas) e a seta ▲ de energia ou CO₂e que subiu contra o período anterior (#271), porque nessas métricas menos é melhor; a seta ▼ fica em `--accent-hover` e a variação abaixo de 0,5% ("±0%") em `--muted` | Laranja | `#F97316` | `--warning` | 6,7:1 |
| **Erro** | Estados críticos (ex: serviço indisponível/caído) | Vermelho | `#EF4444` | `--error` | 5,0:1 |
| **Texto** | Cor padrão para textos e títulos | Cinza-claro | `#E2E8F0` | `--text` | 15,2:1 |
| **Neon** | Só no que pede atenção: maior impacto, pico, "ao vivo" e pulso do logo, e um destaque por vez na tela. Na página Emissões ele fica com o tile de pico ("Pico de uma coleta" ou, agrupado, "Maior intervalo"), o mesmo pico do chip do gráfico (#271, #272); o maior ponto do gráfico fica em `--text`, sem brilho (#258). Nunca em texto corrido, fundo de card ou linha de gráfico | Verde-neon | `#5CFFB8` | `--neon` | 14,7:1 |

> **Nota de Usabilidade:** O amarelo (`#FACC15`) é utilizado restritivamente para elementos da marca. Alertas de sistema utilizam obrigatoriamente o laranja (`#F97316`) para garantir que problemas operacionais sejam imediatamente identificados sem ambiguidade.

### Tokens de apoio

Variações usadas pelos componentes para camadas, bordas, hierarquia de texto e estados de interação:

| Token CSS | Código Hexadecimal | Uso | Contraste sobre o fundo |
| :--- | :--- | :--- | :--- |
| `--surface-2` | `#0E1626` | Fundo do cabeçalho (barra superior) | — |
| `--surface-3` | `#16233A` | Fundo de selos neutros (ex.: estado "Removido") | — |
| `--border` | `#22304A` | Bordas de cards, tabelas e divisórias; trilho das barras de ranking | — |
| `--text-2` | `#CBD5E1` | Texto secundário, como avisos e parágrafos de apoio | 12,6:1 |
| `--muted` | `#94A3B8` | Rótulos, legendas, rodapé e metadados; a cor mais apagada permitida para texto pequeno | 7,3:1 |
| `--faint` | `#64748B` | Só elementos decorativos ou texto grande; não serve para texto pequeno | 3,9:1 |
| `--accent-hover` | `#34D399` | Hover de elementos na cor Primária, texto do item ativo, seta ▼ da variação, barras de ranking | 9,7:1 |
| `--on-accent` | `#04120C` | Texto e ícones sobre fundo na cor Primária (ex.: botão principal) | 7,6:1 sobre `#10B981` |
| `--sky-hover` | `#7DD3FC` | Hover de links | 11,2:1 |
| `--danger` | `#F87171` | Texto pequeno de erro; o `#EF4444` fica para ícones, bordas e fundos, porque sobre a superfície chega só a 4,5:1 | 6,8:1 |
| `--neon-glow` | `rgb(92 255 184 / 0.35)` | Brilho do neon (`box-shadow` / `drop-shadow`); nunca sozinho | — |
| `--focus-ring` | `0 0 0 3px` de `--accent` a 22% | Anel de foco dos campos de texto (login e busca da tabela), junto da borda em `--accent`; classe `.field-focus` em `controls.css` | — |

O `:root` declara `color-scheme: dark` (#258): caixas de seleção, selects, calendários e barras de rolagem do navegador seguem o tema escuro, sem precisar de regra por campo. A seleção de texto usa `--accent` a 35%, e o cursor de digitação, `--accent`.

No Tailwind, os tokens viram classes: `bg-bg`, `bg-surface`, `bg-surface-2`, `bg-surface-3`, `border-border`, `text-text`, `text-muted`, `text-faint`, `text-primary` (`--accent`), `text-primary-hover` (`--accent-hover`), `text-secondary` (`--sky`), `text-brand` (`--yellow`), `text-warning`, `text-error` e `text-danger` (`--danger`), além das variantes `bg-*` e `border-*` de cada uma. Os demais tokens de apoio são usados pelo CSS dos componentes, com `var(--token)`.

### Tema claro (#265)

O botão de sol/lua do cabeçalho (e do canto do login) alterna o tema claro e o escuro. Na primeira visita vale a preferência do sistema (`prefers-color-scheme`); depois do clique, a escolha fica no `localStorage` (`ecopulse-theme`). O `index.html` aplica o atributo `data-theme` no `<html>` antes da primeira pintura, para não piscar o tema errado. O tema claro remapeia os mesmos papéis em `:root[data-theme='light']`, em `global.css`, e não é o escuro invertido. Os componentes não têm cor própria.

| Token CSS | Claro | Uso | Contraste (pior caso entre fundo, superfície e superfície 2) |
| :--- | :--- | :--- | :--- |
| `--bg` / `--surface` / `--surface-2` / `--surface-3` | `#F4F6FA` / `#FFFFFF` / `#EEF2F7` / `#E2E8F0` | Fundo, cards e painéis, cabeçalho e campos, selos neutros | — |
| `--border` | `#D3DBE6` | Bordas e divisórias | — |
| `--text` / `--text-2` / `--muted` | `#0F172A` / `#334155` / `#526072` | Texto, texto de apoio, rótulos | 15,9:1 / 9,2:1 / 5,7:1 |
| `--faint` | `#94A3B8` | Só decoração | 2,3:1 |
| `--accent` / `--accent-hover` / `--on-accent` | `#047857` / `#065F46` / `#FFFFFF` | Ação principal e item ativo; texto branco no botão cheio | 4,9:1 / 6,8:1 / 5,5:1 sobre `--accent` |
| `--sky` / `--sky-hover` | `#0369A1` / `#075985` | Links, foco, dado secundário | 5,3:1 / 6,7:1 |
| `--yellow` | `#A87700` | Só o "Pulse" do logo (texto grande) | 3,5:1 |
| `--warning` / `--error` / `--danger` | `#A8380B` / `#DC2626` / `#B91C1C` | Alerta; erro em borda e ícone; texto de erro | 5,6:1 (também sobre o fundo tingido de alerta) / 4,3:1 / 5,8:1 |
| `--neon` / `--neon-text` | `#009966` / `#00754E` | Neon de gráfico (ponto, barra, brilho); texto no papel do neon | 3,3:1 / 5,1:1 |

No tema escuro, `--neon-text` é o próprio `--neon`. Os dois só se separam no claro, porque o verde-neon de gráfico não passa no AA como texto. O fundo atrás da janela de detalhes vira o token `--scrim`: no escuro, o fundo a 80%; no claro, um cinza-azulado translúcido.

---

## 3. Diretrizes de Interface e Componentes

### Painéis e Cards
* Utilizam a cor de superfície (`#131C2E`) sobre o fundo azul-noite (`#0B1220`) para criar profundidade e hierarquia visual.
* Bordas sutis e cantos arredondados para manter uma aparência limpa e profissional.
* Os ícones dos cards são SVG de linha 24×24, com o mesmo traço (`metricIconProps`, em `MetricTile.tsx`), na cor do tom do card. Caractere ou emoji não serve de ícone (#258).
* O número isolado de um card (estado, indicadores do período, resumo da página Emissões) usa `--sans` semibold, não a fonte de título.
* No dashboard, o impacto vem primeiro (#259): os indicadores de energia e CO₂e do período ficam no topo, com o número em 28 px. Os cards de estado vêm logo abaixo, na versão compacta do `MetricTile` (cerca de 64 px, número em 22 px).

### Botões
* Alvo de toque: pelo menos 24×24 px em qualquer botão, e 44 px nas ações do cabeçalho e dos formulários (#262).
* **Botão cheio** (ação principal da tela, ex.: "Aplicar", "Comparar"): fundo `--accent`, texto `--on-accent`. "Entrar" e "Sair" ficam vazados (#272), porque o login não é a ação da página. O texto fica escuro porque o branco sobre o verde dá 2,5:1 e reprova no AA.
* **Botão vazado** (ações secundárias, ex.: "Tentar novamente", "Atualizar agora"): classe `.btn-outline` (`frontend/src/styles/controls.css`), fundo transparente, borda e texto `--accent`; no hover, `--accent` a 10% no fundo e texto `--accent-hover`.

### Filtros (#267)
* Os filtros ficam numa barra em grupos, na ordem da pergunta: **o quê** (serviço), **quando** (o seletor de período da #273: a pílula com o intervalo ativo e ‹ › ao lado) e **como** (agrupamento). Na página Emissões, o **Tempo real** fica à direita. A partir de 960 px a barra é uma faixa só; abaixo disso, um grupo por linha, na mesma ordem.
* O que só muda a forma de exibir, como "Por intervalo / Acumulado", fica no card do gráfico em que age, e não na barra de filtros.
* Escolha múltipla de serviços em chips: botão com `aria-pressed`, nome, região em `--muted` e um lugar fixo para o ✓. Marcado: borda `--accent` e fundo `--accent` a 10%. Acima dos chips, a contagem ("N de 10 selecionados") e **Limpar**.
* Ícones de navegação (‹ ›) são SVG, nunca caracteres.
* Datas sempre em DD/MM/AAAA, com algarismos tabulares. O período se escolhe no seletor próprio (`PeriodPicker`, #273), nunca no campo de data nativo, que segue o idioma do navegador: uma pílula em `--surface-2` com borda `--border` (em `--accent`, com o anel de foco, enquanto o painel está aberto), o nome do atalho e as datas em `--muted`. O painel tem os atalhos (seleção com fundo `--accent` a 12% e anel fino, sem borda lateral) e um calendário de um mês com a semana na segunda-feira: início e fim são pontas cheias em `--accent` com texto `--on-accent`, os dias entre eles uma faixa em `--accent` a 14%, hoje é sublinhado e os dias que não podem ser escolhidos ficam em `--faint`. No celular, o painel abre de baixo para cima, sobre o fundo apagado, com dias de 44 px.

### Item ativo (menu do topo)
* Fundo `--accent` a 15%, borda `--accent` e texto `--accent-hover` em negrito. Os demais itens ficam em `--muted` e passam a `--text` no hover. A borda é uma `border` de 1 px (transparente nos itens inativos), para continuar visível no alto contraste do sistema.
* Ainda não há abas na interface; quando houver, o item selecionado segue este mesmo padrão.

### Selos de estado
* Texto e cor juntos (o estado nunca é mostrado só pela cor), sempre com tokens: **Ativo** com o texto em `--muted`, borda `--border` e o ponto em `--accent`, sem fundo, porque o estado saudável fica calmo e só o problema ganha cor (#272; o card **Ativos** também não ganha tom nem borda); **Indisponível**/**Erro** em `--danger` sobre `--error` a 10%; **Sem métricas** em `--warning` sobre `--warning` a 10%; **Removido** em `--muted` sobre `--surface-3`. Sobre a superfície, o pior caso é 5,4:1 (Sem métricas), acima do AA para texto pequeno.

### Tooltip
* Um tooltip só para a aplicação inteira (`TooltipLayer`, #274), no lugar do `title` do navegador: cartão escuro nos dois temas (`--tooltip-bg` `#0F172A`, borda `--tooltip-border` `#334155`, texto `--tooltip-text` `#F8FAFC` a 17,1:1 e `--tooltip-muted` `#CBD5E1` a 12,0:1), com uma seta que aponta o centro do elemento. Fica acima do elemento e dentro da tela; sem espaço em cima, vai para baixo.
* Quando há um valor exato, ele vem em destaque (15 px, 600, algarismos tabulares) acima do texto: o número compacto "1,44" da tabela mostra "1,438 Wh" no tooltip.
* Abre com o ponteiro (depois de 250 ms) e com o foco do teclado; fecha ao sair, ao clicar, ao rolar e com Esc. Os tooltips dos gráficos (Emissões e CPU) usam o mesmo cartão; dentro dele, o aviso de falha usa `--tooltip-warning` (`#FB923C`, 7,9:1), porque o `--warning` do tema claro sumiria no fundo escuro.

### Barras de ranking e de proporção
* Trilho em `--border`, barra em `--accent-hover` e o 1º lugar em `--neon` (com `--neon-glow` de brilho). É o padrão que o ranking da US09 (#50) e qualquer barra de proporção vão seguir. Como o neon e o `--accent-hover` ficam a 1,5:1 um do outro, o 1º lugar também precisa de rótulo ou posição, não só da cor.
* **Cor por grandeza (#274):** energia é sempre `--sky` e CO₂e é sempre `--accent`, nas barras da Comparação e no gráfico de Emissões; o tom quente (`--warning`) fica só para problema. Na comparação entre serviços (`CompareChart`, #218), as barras não são ranking: ficam sobre trilho em `--border`, e no CO₂e só o maior muda de cor (`--warning`), com a seta "↑"; o menor continua em `--accent`, marcado pela seta "↓". Linhas de referência, como a média do gráfico de Emissões, ficam em cinza (`--muted`, rótulo em `--text-2`).

### Tipografia
* Tipografia limpa e sem serifa otimizada para painéis de dados (Dashboards), em duas famílias do Google Fonts carregadas em `frontend/index.html` (IBM Plex Sans e Space Grotesk):

| Token CSS | Família | Pesos | Uso |
| :--- | :--- | :--- | :--- |
| `--sans` | IBM Plex Sans | 400, 500, 600 | Texto corrido, tabelas, botões e menus; fonte padrão da página, em 15 px |
| `--sans` + `tabular-nums` | IBM Plex Sans | 400, 500 | Números de dados (#266): CPU, energia, emissão, horários, eixos e rótulos dos gráficos e a matriz da comparação, alinhados à direita, com a classe `font-data` (`global.css`). Os algarismos tabulares têm a mesma largura, então as vírgulas ficam alinhadas sem fonte mono. Nome de lugar (cidade, país) fica sem `tabular-nums`. A IBM Plex Mono saiu do projeto: tinha cara de terminal para a interface |
| `--display` | Space Grotesk | 500, 600, 700 | Logotipo e títulos de página e de seção |

* Contraste rigoroso entre o texto cinza-claro (`#E2E8F0`) e o fundo azul-noite (`#0B1220`), de 15,2:1, e a superfície (`#131C2E`), de 13,8:1, para garantir conforto visual em monitoramento prolongado. Texto pequeno usa no mínimo `--muted` (`#94A3B8`). Isso vale também para o placeholder dos campos (#262). O menor tamanho de texto é 12 px.

### Responsividade (Mobile First)
* Em telas menores (dispositivos móveis), o layout se reorganiza em uma única coluna fluida:
  1. Painel superior de indicadores gerais.
  2. Mapa reduzido.
  3. Dashboard da região/serviço selecionado.
  4. Ranking de consumo ao final da página.
* Cabeçalho abaixo de 961 px (#258): a primeira linha tem a marca e **Entrar**/**Sair**, a segunda o menu e a terceira a "Última atualização" com o botão de atualizar. Na tela larga, tudo fica numa linha só.
* Abaixo de 600 px (#274), a faixa do menu dá lugar ao botão **Menu**, na linha da marca, que abre uma grade de duas colunas logo abaixo do cabeçalho, sobre o fundo apagado: cada página é um cartão em `--surface` com o ícone sobre o rótulo, e a atual tem o mesmo verde do item ativo da faixa. Nenhum item do menu fica cortado ou escondido numa rolagem lateral.
* Os cards de energia e emissões do período ficam em uma coluna no celular, para o valor e a unidade ("g CO₂e") caberem na mesma linha.
* Tabela de serviços abaixo de 600 px (#263): a emissão da última leitura aparece também sob o nome, em `--mono` 12 px e `--muted`. Toda área com rolagem horizontal (tabela de serviços, matriz da Comparação) mostra uma sombra interna em `--bg` na borda direita enquanto há colunas escondidas (`.scroll-edge`). É um sinal de estado, não elevação, e some quando a rolagem chega ao fim.
* O menu do topo rola até o item ativo ao abrir cada página, e o selo de atualização não quebra o horário nem o intervalo no meio.
* Energia e CO₂e aparecem na unidade que o valor pede (Wh, kWh, mg, g…), uma só por coluna, linha ou eixo, com a unidade no cabeçalho (#271); a regra está em [frontend/README.md](../frontend/README.md#unidades-de-energia-e-emissão-271).

---

## 4. Tipos de Gráficos e Visualização
* **Biblioteca recomendada:** Chart.js (pela simplicidade) ou ECharts (para gráficos mais fluidos e animados).
* **Abas do Dashboard:**
  * **Cards:** Visão geral rápida da região.
  * **Memória de Cálculo:** Transparência de dados (métricas brutas, coeficientes e fórmulas).
  * **Barras:** Ranking de impacto por serviço.
  * **Linha:** Evolução temporal de energia e $CO_2e$.
  * **Composição:** Detalhamento por tipo de recurso (CPU, RAM, disco e rede).