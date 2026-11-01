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
| **Secundária** | Dados secundários, links e destaques auxiliares | Azul-ciano | `#38BDF8` | `--sky` | 8,7:1 |
| **Destaque da marca** | Elementos exclusivos da identidade visual/logotipo | Amarelo | `#FACC15` | `--yellow` | 12,2:1 |
| **Alerta** | Estados de aviso (ex: serviço sem métricas) | Laranja | `#F97316` | `--warning` | 6,7:1 |
| **Erro** | Estados críticos (ex: serviço indisponível/caído) | Vermelho | `#EF4444` | `--error` | 5,0:1 |
| **Texto** | Cor padrão para textos e títulos | Cinza-claro | `#E2E8F0` | `--text` | 15,2:1 |
| **Neon** | Só no que pede atenção: maior impacto, pico de gráfico, "ao vivo" e pulso do logo. Nunca em texto corrido, fundo de card ou linha de gráfico | Verde-neon | `#5CFFB8` | `--neon` | 14,7:1 |

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
| `--accent-hover` | `#34D399` | Hover de elementos na cor Primária, texto do item ativo e do selo "Ativo", barras de ranking | 9,7:1 |
| `--on-accent` | `#04120C` | Texto e ícones sobre fundo na cor Primária (ex.: botão principal) | 7,6:1 sobre `#10B981` |
| `--sky-hover` | `#7DD3FC` | Hover de links | 11,2:1 |
| `--danger` | `#F87171` | Texto pequeno de erro; o `#EF4444` fica para ícones, bordas e fundos, porque sobre a superfície chega só a 4,5:1 | 6,8:1 |
| `--neon-glow` | `rgb(92 255 184 / 0.35)` | Brilho do neon (`box-shadow` / `drop-shadow`); nunca sozinho | — |

No Tailwind, os tokens viram classes: `bg-bg`, `bg-surface`, `bg-surface-2`, `bg-surface-3`, `border-border`, `text-text`, `text-muted`, `text-faint`, `text-primary` (`--accent`), `text-primary-hover` (`--accent-hover`), `text-secondary` (`--sky`), `text-brand` (`--yellow`), `text-warning`, `text-error` e `text-danger` (`--danger`), além das variantes `bg-*` e `border-*` de cada uma. Os demais tokens de apoio são usados pelo CSS dos componentes, com `var(--token)`.

---

## 3. Diretrizes de Interface e Componentes

### Painéis e Cards
* Utilizam a cor de superfície (`#131C2E`) sobre o fundo azul-noite (`#0B1220`) para criar profundidade e hierarquia visual.
* Bordas sutis e cantos arredondados para manter uma aparência limpa e profissional.

### Botões
* **Botão cheio** (ação principal da tela, ex.: "Entrar"): fundo `--accent`, texto `--on-accent`. O texto fica escuro porque o branco sobre o verde dá 2,5:1 e reprova no AA.
* **Botão vazado** (ações secundárias, ex.: "Tentar novamente", "Atualizar agora"): classe `.btn-outline` (`frontend/src/styles/controls.css`), fundo transparente, borda e texto `--accent`; no hover, `--accent` a 10% no fundo e texto `--accent-hover`.

### Item ativo (menu do topo)
* Fundo `--accent` a 15%, borda `--accent` e texto `--accent-hover` em negrito. Os demais itens ficam em `--muted` e passam a `--text` no hover. A borda é uma `border` de 1 px (transparente nos itens inativos), para continuar visível no alto contraste do sistema.
* Ainda não há abas na interface; quando houver, o item selecionado segue este mesmo padrão.

### Selos de estado
* Texto e cor juntos (o estado nunca é mostrado só pela cor), sempre com tokens: **Ativo**/**OK** em `--accent-hover` sobre `--accent` a 10%; **Indisponível**/**Erro** em `--danger` sobre `--error` a 10%; **Sem métricas** em `--warning` sobre `--warning` a 10%; **Removido** em `--muted` sobre `--surface-3`. Sobre a superfície, o pior caso é 5,4:1 (Sem métricas), acima do AA para texto pequeno.

### Barras de ranking e de proporção
* Trilho em `--border`, barra em `--accent-hover` e o 1º lugar em `--neon` (com `--neon-glow` de brilho). É o padrão que o ranking da US09 (#50) e qualquer barra de proporção vão seguir. Como o neon e o `--accent-hover` ficam a 1,5:1 um do outro, o 1º lugar também precisa de rótulo ou posição, não só da cor.
* Na comparação entre serviços (`CompareChart`, #218), as barras não são ranking: ficam em `--sky` sobre trilho em `--border`, e no CO₂e o menor vai em `--accent-hover` e o maior em `--warning`, os mesmos tons do destaque da tabela, sempre com a seta "↓"/"↑" e a legenda.

### Tipografia
* Tipografia limpa e sem serifa otimizada para painéis de dados (Dashboards), em três famílias do Google Fonts carregadas em `frontend/index.html`:

| Token CSS | Família | Pesos | Uso |
| :--- | :--- | :--- | :--- |
| `--sans` | IBM Plex Sans | 400, 500, 600 | Texto corrido, tabelas, botões e menus; fonte padrão da página, em 15 px |
| `--mono` | IBM Plex Mono | 400, 500 | Valores numéricos e códigos: CPU, energia, emissão e horário da última leitura (alinhados à direita) e o código da região na tabela de serviços |
| `--display` | Space Grotesk | 500, 600, 700 | Logotipo e títulos de página e de seção |

* Contraste rigoroso entre o texto cinza-claro (`#E2E8F0`) e o fundo azul-noite (`#0B1220`), de 15,2:1, e a superfície (`#131C2E`), de 13,8:1, para garantir conforto visual em monitoramento prolongado. Texto pequeno usa no mínimo `--muted` (`#94A3B8`).

### Responsividade (Mobile First)
* Em telas menores (dispositivos móveis), o layout se reorganiza em uma única coluna fluida:
  1. Painel superior de indicadores gerais.
  2. Mapa reduzido.
  3. Dashboard da região/serviço selecionado.
  4. Ranking de consumo ao final da página.

---

## 4. Tipos de Gráficos e Visualização
* **Biblioteca recomendada:** Chart.js (pela simplicidade) ou ECharts (para gráficos mais fluidos e animados).
* **Abas do Dashboard:**
  * **Cards:** Visão geral rápida da região.
  * **Memória de Cálculo:** Transparência de dados (métricas brutas, coeficientes e fórmulas).
  * **Barras:** Ranking de impacto por serviço.
  * **Linha:** Evolução temporal de energia e $CO_2e$.
  * **Composição:** Detalhamento por tipo de recurso (CPU, RAM, disco e rede).