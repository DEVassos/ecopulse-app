# Product Backlog — EcoPulse

<!-- Template do agilekit (repo/docs/templates/product-backlog.md). O arquivo real, docs/backlog/product-backlog.md, NÃO é editado à mão: é gerado por `bash .github/scripts/backlog-export.sh` a partir das issues do GitHub, na planning e no fechamento de cada sprint. Este modelo documenta a estrutura gerada e serve de referência para quem lê o export. -->

_Exportado das issues de [DEVassos/greener-app](https://github.com/DEVassos/greener-app/issues) em `<dd/mm/aaaa hh:mm>` por `.github/scripts/backlog-export.sh`. A fonte da verdade é o GitHub Issues e o [quadro](https://github.com/orgs/DEVassos/projects/1); este arquivo é um retrato versionado para a avaliação (ES01)._

Legenda — Prioridade: **must** (obrigatório), **should** (importante), **could** (desejável, ex.: RF13). Estado: aberta/fechada.

## Prioridade must

| # | Título | Requisito | Tipo | Sprint | Estado | Responsáveis |
|---|---|---|---|---|---|---|
| [#`<n>`](https://github.com/DEVassos/greener-app/issues/1) | `<RF01 — Descobrir serviços no agregador>` | RF01 | historia | Sprint 1 | aberta | @LUCASAMR23 |
| [#`<n>`](https://github.com/DEVassos/greener-app/issues/2) | `<RF10 — Gravar histórico de coletas>` | RF10 | historia | Sprint 1 | aberta | @viniciusaugusto1997 |

## Prioridade should

| # | Título | Requisito | Tipo | Sprint | Estado | Responsáveis |
|---|---|---|---|---|---|---|
| [#`<n>`](https://github.com/DEVassos/greener-app/issues/3) | `<RF12 — Exibir localização dos serviços>` | RF12 | historia | Sprint 1 | aberta | @DeaTuribio |

## Prioridade could

| # | Título | Requisito | Tipo | Sprint | Estado | Responsáveis |
|---|---|---|---|---|---|---|
| [#`<n>`](https://github.com/DEVassos/greener-app/issues/4) | `<RF13 — Mapa dos serviços>` | RF13 | historia | — | aberta | — |

## Sem prioridade definida

Seção emitida apenas quando existe issue sem label `prioridade:*`; o PO corrige a prioridade antes da planning.

## Cobertura do escopo obrigatório

| Requisito | Issues |
|---|---|
| RF01 | #`<n>` |
| RF02 | #`<n>` |
| RF03 | #`<n>` |
| RF04 | #`<n>` |
| RF05 | #`<n>` |
| RF06 | #`<n>` |
| RF07 | #`<n>` |
| RF08 | #`<n>` |
| RF09 | #`<n>` |
| RF10 | #`<n>` |
| RF11 | #`<n>` |
| RF12 | #`<n>` |
| RF13 | #`<n>` |
| RF14 | #`<n>` |
| RF15 | #`<n>` |
| RNF01 | #`<n>` |
| RNF02 | #`<n>` |
| RNF03 | #`<n>` |
| RNF04 | #`<n>` |
| RNF05 | ⚠ sem issue |

## Como ler e regenerar

- Cada linha é uma issue: o **Tipo** vem da label `tipo:*` (historia, tarefa, bug, processo); **Sprint** é a milestone; **Responsáveis** são os assignees; **Requisito** são as labels `RFxx`/`RNFxx`.
- "⚠ sem issue" na cobertura indica requisito obrigatório ainda sem história — o PO cria com `/historia <RF> <título>` antes da planning seguinte.
- Regenerar: `bash .github/scripts/backlog-export.sh` (precisa de `gh` autenticado e `jq`) e commitar o arquivo no PR de planejamento ou de fechamento da sprint (`chore(processo): atualiza retrato do backlog (#n)`).
