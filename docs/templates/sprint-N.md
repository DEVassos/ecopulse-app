# Sprint N — `<objetivo em poucas palavras>`

<!-- Template do agilekit (repo/docs/templates/sprint-N.md). Destino: docs/sprints/sprint-N.md — registro oficial lido pela rubrica (objetivo, versão entregue, itens concluídos e pendentes, verificações realizadas e decisões da Sprint Review). Criado na planning por `/sprint N iniciar` (seções 1 e 2 preenchidas, demais com "ainda não ocorreu") e completado no fechamento por `/sprint N fechar`. Substitua os campos `<...>`; nunca declare concluído o que não está em develop/main. -->

| Campo | Valor |
|---|---|
| Período | `<dd/mm>` a `<dd/mm/aaaa>` · checkpoint `<dd/mm>` · congelamento `<dd/mm>` 20h · review `<dd/mm>` 19h30 |
| Milestone | [Sprint N](https://github.com/DEVassos/greener-app/milestones) |
| Versão entregue | tag [`sprint-N`](https://github.com/DEVassos/greener-app/releases/tag/sprint-N) · commit `<sha curto>` em `main` |
| Plano | [docs/plano-de-entregas.md § Sprint N](../plano-de-entregas.md#sprint-n): critérios previstos, denominador e situação de cada critério |
| Atas | [planning](sprint-N/planning.md) · [dailies](sprint-N/dailies/) · [review](sprint-N/review.md) · [retrospectiva](sprint-N/retrospectiva.md) · [participação](sprint-N/contribuicao.md) · [burndown](sprint-N/burndown.md) |

## 1. Objetivo da sprint

`<objetivo em 1–2 frases, idêntico ao planning.md e ao plano de entregas>`

## 2. Itens selecionados

A situação de cada critério é registrada **só** no [plano de entregas](../plano-de-entregas.md#sprint-n); esta seção lista os itens selecionados e o PR de cada um.

| Issue | Título | Requisito | Critério | Responsável | PR |
|---|---|---|---|---|---|
| #`<n>` | `<título>` | RF01 | DW02 | @LUCASAMR23 | #`<pr>` |

## 3. Itens concluídos

| Issue | Título | Requisito | Critério | PR mergeado | Responsável |
|---|---|---|---|---|---|
| #`<n>` | `<título>` | RF01 | DW02, DW03 | [#`<pr>`](https://github.com/DEVassos/greener-app/pull/1) | @LUCASAMR23 |

## 4. Itens pendentes ou movidos

| Issue | Situação | Motivo | Destino |
|---|---|---|---|
| #`<n>` | movido | `<motivo objetivo: dependência, estimativa subestimada, feedback do cliente>` | Sprint N+1 |

## 5. Verificações realizadas (aplicação da DoD)

| Item | Como foi verificado | Quem | Resultado |
|---|---|---|---|
| #`<n>` / PR #`<pr>` | `docker compose up --build`; `curl http://localhost:3000/services` → lista com `<x>` serviços | @henriqueptbd-cell | aprovado em `<dd/mm>` — review "DoD verificada" |
| `database/schema.sql` | `psql -f schema.sql` em banco vazio; `\dt` lista `services`, `collections` | @travensolli | aprovado em `<dd/mm>` |

## 6. Sprint Review (`<dd/mm/aaaa>`)

Ata completa: [review.md](sprint-N/review.md).

### 6.1 Demonstrado
- `<RFxx — o que foi mostrado, por quem (@login)>`

### 6.2 Feedback do cliente
- `<item de feedback, literal quando possível>` → issue #`<n>` (`feedback-cliente`)

### 6.3 Decisões e alterações no backlog
- `<decisão: item adicionado/removido/repriorizado, critério movido>` — registrado no "Histórico de alterações do plano" em `<dd/mm>`.

## 7. Participação

Relatório ES09 gerado por `evidencias.sh N`: [contribuicao.md](sprint-N/contribuicao.md). Resumo: `<todos com evidência verificável / lacuna de @login justificada em ...>`.

## 8. Métricas

| Métrica | Valor |
|---|---|
| Issues planejadas / concluídas | `<x>` / `<y>` |
| Story Points: escopo inicial / final / concluídos | `<x>` / `<y>` / `<z>` — [burndown](sprint-N/burndown.md) |
| PRs mergeados em `develop` | `<n>` |
| PRs com revisão em >24h | `<n>` |
| Dailies registradas / dias úteis | `<x>` / `<y>` |
| Regressões (`regressao`) | `<n>` |
| Nota estimada (`/auditar N`) | `<pontos obtidos>` / `<denominador>` |
