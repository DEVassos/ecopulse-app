# Definition of Ready e Definition of Done — EcoPulse

<!-- gerado pelo agilekit — edite em DEVassos/agilekit (repo/docs/processo/definition-of-done.md) -->

A rubrica (ES07, 3 pontos) pede uma DoD **objetiva** e **evidência de sua aplicação** aos itens declarados concluídos. Este documento define três listas — DoR (entrada na sprint), DoD-PR (cada Pull Request) e DoD-Sprint (fechamento) — e a forma como a aplicação de cada uma fica registrada no GitHub. Cada item indica o critério da rubrica que protege.

## 1. Definition of Ready (DoR) — 5 itens

Uma história só entra no Sprint Backlog (milestone `Sprint N`) quando os cinco itens abaixo estão marcados no formulário da issue ([`historia.yml`](../../.github/ISSUE_TEMPLATE/historia.yml) — são as mesmas caixas). O PO é o responsável; o SM confere na planning (`/sprint N iniciar` lista as histórias que ainda não cumprem).

| # | Item | Protege |
|---|---|---|
| 1 | Requisito (RFxx/RNFxx) **e** critério da rubrica (DWxx/BDxx/TPxx) informados | ES01, ES04 |
| 2 | ≥2 critérios de aceite verificáveis no formato Dado / Quando / Então | ES03 |
| 3 | "Como verificar (avaliador)" preenchido: comandos, URLs, consulta SQL e o resultado esperado, executável em ≤5 min por alguém de fora | ES03, ES07 |
| 4 | Estimativa ≤5 pontos (se maior, quebrar em tarefas `tipo:tarefa` ligadas à história) | ES02, ES05 |
| 5 | Sem dependência bloqueante aberta (ou a dependência está na mesma sprint, planejada antes desta) | ES02 |

## 2. Definition of Done do Pull Request (DoD-PR) — 6 itens

Um PR só pode ser mergeado em `develop` quando os seis itens estão marcados `[x]` (ou `N/A — motivo`) no [template de PR](../../.github/PULL_REQUEST_TEMPLATE.md) e confirmados pelo revisor.

| # | Item | Protege |
|---|---|---|
| 1 | O PR tem `Closes #n`; os commits têm `#n`; o trailer `Co-authored-by`, se existir, aponta para alguém de `.github/equipe.json` | ES04, ES09 |
| 2 | A aplicação sobe com `docker compose up --build` e o **revisor executou** o "Como verificar" da issue, marcando os critérios de aceite | ES07, DW07 |
| 3 | Acesso ao banco só em `*.repository.ts`, com SQL explícito e parâmetros (`$1`, `$2`…); nenhum ORM; nenhuma interpolação de valores no texto SQL | BD02, DW03 |
| 4 | Nenhum `any` sem comentário `// any-justificado:`; nenhum `catch` vazio ou que devolve resultado válido após uma falha | TP02, TP03 |
| 5 | Documentação no mesmo PR: rota nova → `docs/api.md`; tabela nova → `database/schema.sql` + `database/README.md`; funcionalidade → README do módulo e da raiz; variável → `.env.example` | DW03, ES08 |
| 6 | Aprovado por alguém **≠ autor** com ≥1 comentário substantivo (o que foi executado, o que foi conferido) | ES09, ES07 |

Regras de apoio (validadas pelos checks `commits`, `pr` e `docs`): PR ≤400 linhas; base `develop` (só `release/*` e `hotfix/*` vão para `main`); labels da issue herdadas. Detalhes em [CONTRIBUTING.md](../../.github/CONTRIBUTING.md).

## 3. Definition of Done da Sprint (DoD-Sprint) — 4 itens

A sprint só é declarada fechada (`/sprint N fechar`) quando:

| # | Item | Protege |
|---|---|---|
| 1 | Cada critério previsto tem a linha de `docs/plano-de-entregas.md` com **permalink (SHA)** na coluna Evidência e Situação verificada pelo PO ("Concluído", "Parcial" ou "Movido para Sprint N+1") | ES02, ES04 |
| 2 | `docs/sprints/sprint-N.md` completo, incluindo a tabela **Verificações realizadas** e a seção Review (demonstrado, feedback do cliente, alterações no backlog) | ES06, ES07 |
| 3 | `README.md` da raiz atualizado: funcionalidades implementadas com `(RFxx, #PR)`, como executar, status da sprint | ES08 |
| 4 | `release/sprint-N` mergeada em `main` com CI verde e tag anotada `sprint-N` publicada como GitHub Release | ES05, DW07 |

## 4. Como a aplicação da DoD é evidenciada

O avaliador não vê reuniões; vê artefatos. A aplicação da DoD deixa três rastros:

1. **Checklist do PR** — o autor marca os seis itens da DoD-PR no corpo do PR (o check `pr` recusa o corpo sem a seção DoD-PR, sem algum dos seis itens ou com `- [ ]` pendente sem `N/A — motivo`). O revisor confirma item a item ao executar o "Como verificar" e marca os critérios de aceite copiados da issue.
2. **Aprovação com comentário "DoD verificada"** — a review de aprovação começa com a frase `DoD verificada` e descreve o que foi executado (comando, URL ou consulta e o resultado observado). O SM faz ≥2 dessas por sprint; devs e PO também aprovam dessa forma.
3. **Tabela "Verificações realizadas" em `docs/sprints/sprint-N.md`** — uma linha por item concluído: item (issue/PR) · como foi verificado · quem verificou · resultado. Essa tabela é a prova consolidada de ES07 e alimenta a coluna Evidência do plano de entregas.

| Pergunta do avaliador | Onde está a resposta |
|---|---|
| A DoD existe e é objetiva? | Este arquivo (seções 2 e 3) |
| Foi aplicada a cada item concluído? | Checklist marcada em cada PR + review "DoD verificada" de alguém ≠ autor |
| Foi aplicada à sprint? | `docs/sprints/sprint-N.md` → Verificações realizadas; plano com permalinks; tag `sprint-N` |

## 5. Quando um item não cumpre a DoD

- PR que não cumpre a DoD-PR volta para "Em andamento" (converter em rascunho) com comentário do revisor dizendo qual item falhou e o que observou.
- Item que não cumpre a DoD até o congelamento **não é declarado concluído**: a issue perde a milestone atual e recebe a seguinte; a linha do plano fica como "Movido para Sprint N+1" com a razão no "Histórico de alterações do plano". Pendência honesta custa menos pontos do que inconsistência: a rubrica classifica como "parcialmente atendido" o que não pôde ser verificado plenamente e aponta regressões.
- Critério que depende de um item movido é reavaliado no checkpoint (data-limite em `calendario.json`) pelo PO e pelo SM.
