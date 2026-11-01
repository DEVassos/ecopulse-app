# ADR 0004 — Vite e Tailwind CSS no frontend

| Campo | Valor |
|---|---|
| Status | aceito |
| Data | 2026-10-08 |
| Decisores | @DeaTuribio (frontend), @henriqueptbd-cell (PO), @travensolli (SM) |
| Rastreabilidade | issue #67 (decisão), #9 (setup do frontend), #11 (guia de estilos) · requisitos RP01, RNF01, RNF05 · critérios DW01, DW04, ES08 |

## Contexto e problema

O edital (RP01) exige frontend em React com TypeScript, mas não define ferramenta de build nem de estilo. O frontend precisa de servidor de desenvolvimento, de build de produção e de um jeito consistente de aplicar o design system em [`docs/identidade-visual.md`](../identidade-visual.md).

A escolha de Vite já constava em [`docs/requisitos.md`](../requisitos.md) § RP01 ("Decisão do time: Vite + React + TypeScript") e em [`planning.md`](../sprints/sprint-1/planning.md) (FE-01: "React + TypeScript + Vite + Tailwind"). O Tailwind CSS não estava registrado em nenhuma decisão; a revisão do PR #62 apontou a lacuna. Este ADR registra as duas escolhas.

Ainda não existe `frontend/Dockerfile` em `develop`: a dockerização do frontend é a issue #26. O build estático gerado pelo Vite (`dist/`) é o que o container do frontend vai servir quando a #26 for entregue.

## Fatores de decisão

- DW01 e DW04: projeto React + TypeScript com `tsconfig` e organização em `pages/components/services/hooks/contexts/providers`.
- RP01: React + TypeScript são obrigatórios; o resto é decisão do time.
- ES08 e RNF05: quem abre o repositório precisa entender e reproduzir o setup pelo `frontend/README.md`.
- O protótipo EcoPulse e o guia de estilos (#11) já usam a paleta do Tailwind (`slate-950`, `emerald-500` aparecem nos critérios das issues #9 e #11).
- Aplicar os tokens do guia direto no JSX, sem CSS repetido e sem custo de runtime.

## Opções consideradas

**Build / servidor de desenvolvimento**

1. **Vite**
2. Create React App
3. Next.js

**Estilo**

1. CSS puro / CSS Modules
2. **Tailwind CSS**
3. CSS-in-JS
4. Biblioteca de componentes (MUI, Chakra)

## Decisão

Escolhemos **Vite** para build e servidor de desenvolvimento, porque (a) oferece servidor de desenvolvimento rápido (HMR) e build estático simples e (b) é o padrão de mercado para projetos React.

Escolhemos **Tailwind CSS** para estilo, porque (a) o protótipo EcoPulse da Andrea e o guia de estilos (#11) já foram concebidos na paleta do Tailwind e (b) as classes utilitárias aplicam os tokens do guia direto no JSX, sem CSS repetido e sem runtime, ao contrário de CSS-in-JS.

Como se materializa no repositório (PR [#62](https://github.com/DEVassos/greener-app/pull/62), issue #9):

- `frontend/package.json`: `vite` `^8.3.2`, `@vitejs/plugin-react` `^6.1.2`, `react` `^19.3.0`, `tailwindcss` e `@tailwindcss/vite` `^4.3.3`. Scripts `dev` (`vite`), `build` (`tsc --noEmit && vite build`) e `preview`.
- `frontend/vite.config.ts`: `plugins: [react(), tailwindcss()]` e `server: { port: 5173 }`. Não há `tailwind.config.js`; a configuração fica no CSS.
- `frontend/src/styles/global.css`:
  - linha 9: `@layer theme, base, components, utilities;` fixa a prioridade das camadas;
  - linhas 10–11: importa só `tailwindcss/theme.css` e `tailwindcss/utilities.css`, sem o `preflight`;
  - linhas 14–37: tokens do design system em `:root` (fonte única das cores);
  - linhas 40–57: `@theme inline` expõe os tokens como classes (`bg-surface`, `text-muted`, `border-border`, `text-primary`, `font-display`…);
  - linhas 59–91: reset mínimo próprio em `@layer base`.
- `frontend/src/styles/layout.css`, `src/components/AppHeader.css`, `Brand.css` e `src/pages/DashboardPage.css`: CSS dos componentes dentro de `@layer components`.
- Regras de uso (cor nova entra primeiro no guia, depois como token) em [`frontend/README.md`](../../frontend/README.md) § Estilos.

## Consequências

**Positivas**
- Servidor com HMR e build estático (`npm run build` gera `dist/`), que é o insumo do container do frontend na #26.
- Os tokens do guia têm fonte única (`:root` em `global.css`) e viram classes utilitárias; o JSX usa `bg-surface`, `text-muted` etc. sem repetir CSS.
- Sem runtime de estilo: o Tailwind gera CSS em tempo de build.
- Sem arquivo `tailwind.config.js` para manter.

**Negativas / custos**
- O Vite 8 exige Node.js 20.19+ ou 22.12+ (registrado em `frontend/README.md`). Mitigação: a imagem do container fixará a versão do Node quando a #26 entregar o `frontend/Dockerfile`.
- O Tailwind 4 só funciona em navegadores modernos; as versões mínimas estão em https://tailwindcss.com/docs/compatibility. Navegadores antigos não são suportados.
- Classes utilitárias alongam o JSX. Mitigação: padrões repetidos ficam em CSS de componente (`.panel`, `.page`).
- CSS próprio e utilitárias convivem e exigem disciplina de camadas. Na revisão do PR #62, o CSS fora de camada vencia as utilitárias; foi corrigido no commit [`99ccaca`](https://github.com/DEVassos/greener-app/commit/99ccaca4a703c12c6d5f1cd3c7053f6ccfde188e). Regra atual: todo CSS novo entra em `@layer components`.
- A paleta padrão do Tailwind convive com os tokens do guia, e há risco de usar `emerald-500` cru em vez do token. Mitigação: o `frontend/README.md` § Estilos define os tokens de `:root` como fonte única das cores e manda toda cor nova entrar primeiro no guia; nas telas, usar as classes dos tokens (`text-primary`) em vez das da paleta padrão (`text-emerald-500`).
- O `preflight` está desligado para não alterar os componentes com CSS próprio; o reset passa a ser responsabilidade do projeto (camada `base` de `global.css`).

## Prós e contras das opções

### Create React App
- Bom: configuração pronta para React.
- Ruim: foi descontinuado pelo time do React em fev/2025.

### Next.js
- Bom: roteamento e renderização no servidor integrados.
- Ruim: traz SSR e servidor próprio, enquanto o backend Node já é um serviço separado; a aplicação é uma SPA sem necessidade de SSR neste escopo.

### CSS puro / CSS Modules
- Bom: sem dependência extra.
- Ruim: cada tela repetiria declarações dos tokens do guia; a paleta do protótipo (nomes do Tailwind) teria de ser traduzida à mão.

### CSS-in-JS
- Bom: estilos junto do componente.
- Ruim: custo de runtime no navegador.

### Biblioteca de componentes (MUI, Chakra)
- Bom: componentes prontos.
- Ruim: impõe visual próprio, que concorre com o design system do guia de estilos (#11).

## Como verificar que está em vigor

A partir da raiz do repositório:

```bash
grep -n "tailwindcss" frontend/package.json frontend/vite.config.ts
```

Resultado esperado: `package.json` lista `@tailwindcss/vite` e `tailwindcss` em `^4.3.3`; `vite.config.ts` importa `tailwindcss from '@tailwindcss/vite'` e o usa em `plugins`.

```bash
grep -n "@layer\|@theme\|@import" frontend/src/styles/global.css
```

Resultado esperado: `@layer theme, base, components, utilities;` antes dos dois `@import` parciais (`tailwindcss/theme.css`, `tailwindcss/utilities.css`), depois `@theme inline` e `@layer base`. Não há import de `preflight.css`.

```bash
cd frontend && npm ci && npm run build
```

Resultado esperado: termina sem erros de TypeScript e gera `frontend/dist/` (procedimento descrito em `frontend/README.md` § Como verificar este módulo isoladamente).

## Links

- Issue: #67 (este ADR) · #9 (setup React/TS/Vite/Tailwind) · #11 (guia de estilos) · #26 (dockerização do frontend)
- PRs: [#62](https://github.com/DEVassos/greener-app/pull/62) (merge `eb5f8fa`) · [#61](https://github.com/DEVassos/greener-app/pull/61) (merge `2ec520c`)
- Código (permalink): [`vite.config.ts`](https://github.com/DEVassos/greener-app/blob/eb5f8fa1fea2619e017bab800a65993d357470f4/frontend/vite.config.ts) · [`global.css`](https://github.com/DEVassos/greener-app/blob/eb5f8fa1fea2619e017bab800a65993d357470f4/frontend/src/styles/global.css)
- Requisito: [RP01](../requisitos.md) · Critérios DW01/DW04 no [plano de entregas](../plano-de-entregas.md)
- Guia de estilos: [`docs/identidade-visual.md`](../identidade-visual.md) · Módulo: [`frontend/README.md`](../../frontend/README.md) · Planejamento: [`sprint-1/planning.md`](../sprints/sprint-1/planning.md)
- Referências externas: https://vite.dev/guide/ · https://tailwindcss.com/docs/compatibility
