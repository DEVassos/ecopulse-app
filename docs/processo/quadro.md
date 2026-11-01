# Quadro do time — GitHub Project v2 "EcoPulse"

<!-- gerado pelo agilekit — edite em DEVassos/agilekit (repo/docs/processo/quadro.md) -->

O quadro é um **GitHub Project v2 da organização DEVassos**, público, ligado ao repositório `DEVassos/greener-app`. É a visão do Sprint Backlog para o time e para o avaliador; a fonte da verdade continua sendo as **issues** (o quadro só reflete o estado delas). O número do projeto fica na variável `PROJECT_NUMBER` do repositório (hoje `6`); a URL é `https://github.com/orgs/DEVassos/projects/<PROJECT_NUMBER>` — <https://github.com/orgs/DEVassos/projects/6>.

## 1. Colunas (campo `Status`)

| Coluna | Significado | Entra quando | Sai quando |
|---|---|---|---|
| **Backlog** | Item identificado e descrito, ainda sem sprint | Issue aberta sem milestone | Recebe a milestone `Sprint N` |
| **Sprint Backlog** | Selecionado para a sprint corrente, com DoR completa e responsável | Milestone atribuída (planning) | 1º push na branch da issue |
| **Em andamento** | Alguém está trabalhando: existe branch `tipo/<n>-slug` com commits | Push na branch (ou `/tarefa`) | PR aberto para `develop` |
| **Em revisão** | PR aberto (não rascunho) aguardando revisão e execução do "Como verificar" | PR aberto ou marcado pronto para revisão | PR mergeado, fechado ou convertido em rascunho |
| **Concluído** | PR mergeado em `develop`; issue fechada com o link do PR | Merge em `develop` ou issue fechada | Issue reaberta (volta para Em andamento com a label `regressao`) |

Ordem lógica: `Backlog < Sprint Backlog < Em andamento < Em revisão < Concluído`. A automação nunca move um cartão para trás, exceto nos casos explícitos (PR convertido em rascunho, PR fechado sem merge, issue reaberta).

## 2. Campos

| Campo | Tipo | Uso |
|---|---|---|
| `Status` | single select (nativo, opções renomeadas pelo bootstrap) | As cinco colunas acima |
| `Milestone` | nativo da issue | Faz o papel de **Sprint**: `Sprint 1`, `Sprint 2`, `Sprint 3`. Filtra a view "Sprint atual" |
| `Critério` | texto (criado pelo bootstrap) | Código(s) da rubrica que a issue comprova (`DW02`, `BD01`…), copiado do formulário de história; alimenta a coluna Código do plano de entregas |
| `Story Points` | número (criado pelo bootstrap) | Estimativa da issue, copiada da seção "Estimativa (pontos)" do formulário pelo workflow `board`; somada por grupo nas views em Table (ver [Story Points](#story-points-campo-numérico)) |
| `Assignees` | nativo | Responsável pela issue; base da view "Por pessoa" (ES09) |
| `Labels` | nativo | `RFxx`/`RNFxx`, `tipo:*`, `area:*`, `prioridade:*`, `bloqueado`, `feedback-cliente`, `regressao` |
| `Parent issue` · `Sub-issues progress` | nativos | Hierarquia épico → história → tarefa: agrupam as views "Épicos → Histórias" e "Histórias → Tarefas" e mostram o andamento de cada pai |

## 3. Quem move o quê

| Movimento | Automático (workflow `board`) | Manual |
|---|---|---|
| Entrar no quadro em Backlog | sim, ao abrir a issue | — |
| Backlog ↔ Sprint Backlog | sim, ao atribuir ou remover a milestone | PO atribui a milestone na planning (`gh issue edit n --milestone "Sprint N"`) |
| → Em andamento | sim, no 1º push da branch `tipo/<n>-slug` | dev via `/tarefa n` (feedback imediato, com o próprio token) |
| → Em revisão | sim, ao abrir PR para `develop` com `Closes #n` | dev via `/pr` |
| → Concluído | sim: o merge em `develop` fecha a issue e comenta o link do PR | **ninguém** (ver seção 7) |
| Reaberta → Em andamento + `regressao` | sim | — |

Só **issues** entram no quadro; PRs não são adicionados (o vínculo é o `Closes #n` do PR). A tabela completa evento → ação está no cabeçalho de [`.github/scripts/board-route.sh`](../../.github/scripts/board-route.sh).

## 4. Workflows nativos do Project (ligar na interface, uma vez)

Em `Project → ⋯ → Workflows`, o SM habilita os workflows abaixo como rede de segurança (funcionam mesmo sem o PAT da seção 5):

| Workflow nativo | Configuração |
|---|---|
| Auto-add to project | repositório `DEVassos/greener-app`, filtro `is:issue` |
| Item closed | Status → **Concluído** |
| Item reopened | Status → **Em andamento** |
| Auto-archive items | desligado (o avaliador precisa ver o histórico completo) |

## 5. Variáveis e segredo da automação

| Nome | Tipo | Valor / regra |
|---|---|---|
| `PROJECT_OWNER` | variável do repositório (`gh variable set`) | `DEVassos` |
| `PROJECT_NUMBER` | variável do repositório | número do Project (`gh project list --owner DEVassos`) |
| `PROJECTS_TOKEN` | **secret** do repositório (`gh secret set`) | PAT **fine-grained** da organização DEVassos: Resource owner `DEVassos`; Organization permissions → **Projects: Read and write**; Repository permissions (apenas `greener-app`) → **Issues: Read and write**, Pull requests: Read, Metadata: Read. Validade **2026-12-31**. Titular: SM (`@travensolli`) |

O token padrão das Actions (`GITHUB_TOKEN`) **não acessa Projects v2**; por isso o PAT. Sem ele, o workflow `board` emite um aviso e termina com sucesso: issues, labels e comentários continuam funcionando e o quadro fica apenas com os workflows nativos da seção 4.

**Rotação:** se o titular mudar, o token expirar ou vazar, o SM revoga em `Settings → Developer settings → Personal access tokens`, cria outro com as mesmas permissões e roda `gh secret set PROJECTS_TOKEN -R DEVassos/greener-app`. A troca é registrada na ata da daily do dia. Se a política da organização bloquear PATs fine-grained, pedir liberação ao owner (`devassosfatec`) ou usar um PAT classic com escopos `repo` e `project`.

## 6. Views do Project

Views que existem no Project, conferidas em 09/10/2026 (#64):

| View | Layout | Filtro / agrupamento | Colunas | Para quê |
|---|---|---|---|---|
| **Sprint atual** | Board por `Status` | `milestone:"Sprint N" -type:Epic` | Title, Assignees, Labels, Sub-issues progress, Story Points | Daily e checkpoint: o que está em cada coluna. O SM troca o `N` do filtro na planning (`/sprint N iniciar`) |
| **Por pessoa** | Table | sem filtro fixo; ordenada por `Status` | Title, Status, Parent issue, Sub-issues progress, Story Points | ES09 e WIP (máximo 2 em Em andamento por pessoa): na barra da view, filtre `assignee:<login> milestone:"Sprint N"` |
| **Backlog (PO)** | Table | `-type:Epic -status:Concluído`, agrupada por `Milestone` | Title, Status, Labels, Parent issue, Critério, Story Points | Refinamento e planning: o que falta por sprint, com o total de pontos de cada grupo |
| **Épicos** | Table | `type:Epic` | Title, Status, Labels, Sub-issues progress | Visão dos temas do edital e do andamento de cada épico |
| **Épicos → Histórias** | Table | `type:Feature`, agrupada por `Parent issue` | Title, Status, Labels, Milestone, Sub-issues progress, Story Points | Histórias de cada épico, com o andamento das tarefas |
| **Histórias → Tarefas** | Table | `type:Task`, agrupada por `Parent issue` | Title, Assignees, Status, Labels, Milestone, Repository, Critério, Story Points | Tarefas de cada história, com responsável e critério da rubrica |

Impedimentos da daily: filtre `label:bloqueado` em qualquer view.

## 7. Se a automação falhar

1. Confira a execução em `Actions → board`: o aviso `PROJECTS_TOKEN/PROJECT_NUMBER ausentes` significa PAT expirado ou variável faltando (seção 5).
2. Mova o cartão **manualmente** no quadro para o status correto e registre na ata da daily que a automação falhou (vira issue `tipo:processo` se repetir).
3. Lembre: o `Closes #n` nativo do GitHub **só fecha a issue em merge na branch padrão (`main`)**. Como o trabalho entra em `develop`, quem fecha a issue é o workflow `board`. Se ele falhou, feche a issue à mão com o link do PR — `gh issue close n --reason completed --comment "Entregue em #<pr>"` — e o workflow nativo "Item closed" move o cartão para Concluído.
4. Nunca mova para Concluído um item cujo PR não foi mergeado em `develop`.
5. Mudanças no workflow `board` ou nos scripts precisam chegar a `main` (os eventos de issues e push rodam a partir da branch padrão): PR para `develop` e PR para `main`, conforme o [CONTRIBUTING](../../.github/CONTRIBUTING.md).

## Hierarquia do backlog (Épico → História → Tarefa)

O backlog segue o modelo do Jira usando **sub-issues** nativas do GitHub:

| Nível | O que é | Como se identifica | Quem cria |
|---|---|---|---|
| **Épico** | Tema de requisitos do edital (ex.: EP1 — Descoberta e monitoramento dinâmico, RF01/RF02/RF05/RF06) | label `tipo:epico` (tipo *Epic* da org, quando existir); sem milestone, atravessa as sprints | PO (uma vez, pelo seed) |
| **História** | Valor para o usuário, com critérios de aceite e "Como verificar" | label `tipo:historia`, tipo *Feature*; milestone da sprint; sub-issue do épico | PO (formulário "História de usuário" ou `/historia`) |
| **Tarefa** | Fatia técnica de uma história (ou enabler) | label `tipo:tarefa`, tipo *Task*; sub-issue da história; é o que vira branch e PR | Dev/SM (formulário "Tarefa técnica" ou `/tarefa --criar`) |

- O campo **Épico (pai)** do formulário de história e **História pai** do formulário de tarefa (`#N`) fazem a vinculação automaticamente (workflow `board` ao abrir/editar a issue). O vínculo também pode ser feito na UI: *Sub-issues › Add existing issue*.
- No quadro, as views **Épicos → Histórias** e **Histórias → Tarefas** ([seção 6](#6-views-do-project)) agrupam por *Parent issue* e mostram o andamento em **Sub-issues progress**: juntas, são a visão "épico → história → tarefa".
- Uma **tarefa** fecha pelo merge do PR em `develop` (automático). Uma **história** é fechada pelo PO depois de executar o "Como verificar" (aceite). Um **épico** fecha quando todas as histórias fecham (o PO fecha na review da última sprint em que ele aparece).
- Requisito individual (RFxx) continua como **label** em épicos, histórias e tarefas: é o que o avaliador procura para ES04.

Scripts: `bash .agilekit/scripts/gh-seed-backlog.sh` (cria épicos/histórias/tarefas do seed) e `bash .agilekit/scripts/gh-link-subissues.sh` (monta/repara os vínculos, idempotente).

### Story Points (campo numérico)

O Project tem o campo **Story Points** (número). Ele é preenchido automaticamente pelo workflow `board` a partir da seção "Estimativa (pontos)" do formulário (histórias e tarefas) ou de "Story Points: N" no corpo, ao abrir ou editar a issue; o seed também grava. Nas views em Table, agrupar por *Parent issue*, *Assignees* ou *Milestone* mostra a **soma** por grupo (clique no cabeçalho do grupo › *Sum*): é a capacidade da sprint por pessoa e o tamanho de cada história/épico. Para ajustar à mão: `bash .github/scripts/project-set-status.sh <n> - --number "Story Points=5"`.

O mesmo campo alimenta o **burndown** da sprint (`bash .github/scripts/burndown.sh N --out docs/sprints/sprint-N/burndown.md`, ver [processo § 2.2](README.md#22-burndown-da-sprint)): issue sem Story Points fica fora do gráfico e aparece listada em "Fora da soma".
