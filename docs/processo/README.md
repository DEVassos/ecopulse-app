# Como trabalhamos — processo ágil do EcoPulse

<!-- gerado pelo agilekit — edite em DEVassos/agilekit (repo/docs/processo/README.md) -->

Este documento descreve o processo Scrum do time EcoPulse (FATEC ABP 2DSM 2026-2, organização DEVassos). Ele existe para que qualquer pessoa — integrante novo, professor ou avaliador — entenda em poucos minutos **quem faz o quê, quando e onde fica a evidência**. A rubrica lê apenas o GitHub até o fechamento de cada sprint; por isso o processo foi desenhado para que cada atividade deixe um rastro verificável (issue, commit, PR, arquivo em `docs/`).

Documentos relacionados: [Definition of Ready / Done](definition-of-done.md) · [Quadro (GitHub Project)](quadro.md) · [Onboarding](onboarding.md) · [Guia de contribuição: branches, commits, PRs, release](../../.github/CONTRIBUTING.md) · [Templates Scrum](../templates/) · [Plano de entregas](../plano-de-entregas.md) · [Requisitos](../requisitos.md) · [ADRs](../adr/README.md).

## 1. Equipe e papéis (fixos nas três sprints)

| Papel | Integrante | GitHub | Área primária | Backup |
|---|---|---|---|---|
| Product Owner | Henrique Camargo | `@henriqueptbd-cell` | produto | `@travensolli` |
| Scrum Master | Gabriel Travensolli | `@travensolli` | infra / processo | `@henriqueptbd-cell` |
| Desenvolvedora | Andrea Turibio | `@DeaTuribio` | frontend | `@LUCASAMR23` |
| Desenvolvedor | Lucas Amorim | `@LUCASAMR23` | backend | `@viniciusaugusto1997` |
| Desenvolvedor | Vinicius Augusto | `@viniciusaugusto1997` | banco de dados | `@DeaTuribio` |

A fonte oficial é [`.github/equipe.json`](../../.github/equipe.json) (login, e-mails aceitos, papel, backup, área, par de revisão). Os papéis não rodam entre sprints; o backup assume as responsabilidades do papel em caso de ausência.

- **PO** — dono do Product Backlog: escreve e prioriza as histórias (`tipo:historia`) com critérios de aceite e "Como verificar (avaliador)", mantém `docs/plano-de-entregas.md`, aceita as entregas executando a verificação e registra o retorno do cliente.
- **SM** — dono do processo: conduz as cerimônias, garante as atas, mantém o quadro, DoR/DoD, templates, `.github/workflows` e `.github/scripts`, consolida as evidências de participação (ES09), faz release e tag.
- **Devs** — donos do produto técnico: código, SQL, testes, interface, documentação do próprio PR e revisão técnica dos PRs dos colegas.

### 1.1 Cartão de participação por papel (mínimos verificáveis por sprint)

ES09 vale 8 pontos e é **coletivo**: zera para o time inteiro se um integrante não tiver contribuição verificável. A tabela abaixo é o mínimo que cada papel deve conseguir apontar no GitHub ao fim de cada sprint. O SM confere no checkpoint e no congelamento com `bash .github/scripts/evidencias.sh N`.

| Papel | Mínimos verificáveis por sprint | Categorias ES09 cobertas |
|---|---|---|
| PO (Henrique) | Autor das `tipo:historia` da sprint (critérios + "Como verificar"); ≥1 PR em `docs/plano-de-entregas.md` (planejamento no início, Situação no fechamento); ≥2 reviews de aceite executando o "Como verificar"; `review.md` (feedback do cliente) junto com o SM; dono de `docs/calculos.md` a partir da Sprint 2; 1 tarefa real pequena por sprint (ex.: `database/seeds/emission_factors.sql`, `.env.example`) | planejamento, documentação, revisão (+ SQL) |
| SM (Gabriel) | PR de planejamento (`planning.md` + `sprint-N.md`); atas de daily (PR semanal); registro de review e retro em ≤24h; dono de DoR/DoD, template de PR, `.github/workflows` e `.github/scripts` (código real); ≥2 reviews com comentário "DoD verificada"; `evidencias.sh` no checkpoint e no congelamento; release + tag `sprint-N` | planejamento, documentação, código (CI), revisão |
| Dev ×3 (Andrea, Lucas, Vinicius) | ≥2 PRs mergeados ligados a issue com label RF; ≥1 review técnica com comentário substantivo; docs do próprio PR (`api.md`, `database/README.md`, README do módulo); nome em ≥1 linha de Responsáveis do plano | código, SQL, testes, interface, documentação, revisão |

Além disso, **todos** demonstram ≥1 item na Sprint Review e aparecem nas atas de daily. Quantidade de commits não mede participação; o que conta é a cadeia issue → branch → commit → PR → revisão → evidência.

## 2. Cerimônias

O calendário oficial (sprints, checkpoints, congelamentos, reviews e feriados) está em [`.github/calendario.json`](../../.github/calendario.json). As datas de review ainda são **a confirmar pelo cliente**.

| Cerimônia | Quando | Duração | Participantes | Saída obrigatória (evidência) |
|---|---|---|---|---|
| Sprint Planning | 1º dia útil da sprint | 90 min | Time inteiro | `docs/sprints/sprint-N/planning.md` + `docs/sprints/sprint-N.md` inicial, milestone `Sprint N` com as issues selecionadas e responsáveis, **PR de planejamento aberto no mesmo dia** (ES02) |
| Daily | **Diária, seg–sex**: presencial em sala de aula nos dias de aula (19h sugerido); **assíncrona por mensagem de texto** quando não houver aula ou em feriado | ≤15 min | Time inteiro | **Ata do dia** em `docs/sprints/sprint-N/dailies/AAAA-MM-DD.md` (template [`daily.md`](../templates/daily.md)), sempre com a seção Impedimentos. Mensagens assíncronas vão na issue fixada "Daily — Sprint N"; o SM consolida com `/daily` e abre o **PR semanal das atas**, revisado pelo PO, que também atualiza o **burndown** (`docs/sprints/sprint-N/burndown.md`, [seção 2.2](#22-burndown-da-sprint)) |
| Refinamento | 1× por semana, após uma daily | 30 min | PO + 1 dev (rotativo) | Histórias da próxima sprint com DoR completa; dúvidas ao cliente/professor anotadas na issue |
| Checkpoint | Data-limite em `calendario.json` (S1 09/10 · S2 30/10 · S3 17/11) | — | PO + SM | Última data para **mover um critério** para a sprint seguinte; decisão registrada no "Histórico de alterações do plano"; `evidencias.sh N` e `burndown.sh N` rodados |
| Congelamento | Domingo anterior à review, **20h** (S1 18/10 · S2 08/11 · S3 22/11) | — | SM | `develop` limpa, PRs da milestone mergeados ou movidos, CI verde, `release/sprint-N` criada e PR para `main` aberto (`/sprint N congelar`); burndown final em `sprint-N/burndown.md` |
| Sprint Review | Com o cliente (S1 19/10 · S2 09/11 · S3 23/11, 19h30, a confirmar) | 60 min | Time + cliente/professor | **Todos demonstram** ≥1 item; **o SM é o escriba**: roteiro e feedback em `docs/sprints/sprint-N/review.md` |
| Pós-review | ≤24h após a review | — | SM + PO | Feedback consolidado em `review.md` e `sprint-N.md`; issues `feedback-cliente` na milestone N+1; entrada no "Histórico de alterações do plano"; merge do release em `main` + tag `sprint-N` (ES06) |
| Retrospectiva | Aula seguinte à review | 30 min | Time inteiro | `docs/sprints/sprint-N/retrospectiva.md`; cada ação vira issue `tipo:processo` com dono e prazo |

Observações de calendário: feriados em 12/10, 15/10 (sem aula), 02/11 e 20/11 — nesses dias a daily é assíncrona. A Sprint 3 tem 14 dias: planning na noite de 09/11 (logo após a review da Sprint 2) e congelamento em 22/11.

### 2.1 Como funciona a daily

1. Em dia de aula, o SM abre a daily em sala; cada integrante responde em ≤3 min: o que fez desde a última daily, o que fará até a próxima, impedimentos.
2. Sem aula, cada integrante publica as mesmas três respostas como **comentário na issue fixada "Daily — Sprint N"** até as 21h.
3. O SM (ou quem registrar) gera a ata do dia com `/daily AAAA-MM-DD` (ou `/daily --texto`, colando as mensagens) em `docs/sprints/sprint-N/dailies/AAAA-MM-DD.md`.
4. Impedimentos viram comentário na issue bloqueada + label `bloqueado`; o SM acompanha até resolver e registra o desfecho na ata seguinte.
5. Na sexta-feira o SM abre o PR `docs/<n>-dailies-sprint-N-semana-k` com as atas da semana e o burndown atualizado; o PO revisa. Sem ata, a daily não aconteceu para a rubrica.

### 2.2 Burndown da sprint

O burndown mostra, dia a dia, quantos **Story Points** da sprint ainda estão abertos, comparados com a linha ideal (do escopo inicial até zero no último dia) e com o escopo do dia. Ele é gerado a partir do GitHub, sem planilha à parte:

```bash
bash .github/scripts/burndown.sh N --out docs/sprints/sprint-N/burndown.md
```

- **Fonte:** issues da milestone `Sprint N` e o campo `Story Points` do [quadro](quadro.md#story-points-campo-numérico). Tarefas, processo e bugs entram na soma; histórias e épicos não, porque os pontos deles já estão nas tarefas filhas. Issues sem Story Points aparecem listadas à parte no arquivo, para o PO estimar.
- **Quando atualizar:** no PR semanal das atas (sexta), no checkpoint, no congelamento e no fechamento. O arquivo de cada sprint é versionado; o do congelamento é o que fica na tag `sprint-N`.
- **Como ler:** restante acima da linha ideal indica atraso; barra de escopo que sobe indica trabalho acrescentado durante a sprint, que a daily e o checkpoint precisam explicar.
- **Data-base:** quando o backlog chega ao GitHub depois do início da sprint (caso da Sprint 1, importada em 04–05/10), `burndown_base` da sprint em `.github/calendario.json` define até quando as issues criadas contam como escopo planejado desde o primeiro dia.

## 3. Acordos de trabalho (10)

1. **Se não está no GitHub, não aconteceu.** Decisões, atas, verificações e feedback ficam em issues, PRs ou `docs/`.
2. **Nunca push em `main` ou `develop`.** Trabalho sempre em branch com o número da issue; integração só por PR com 1 aprovação.
3. **1 issue = 1 branch = 1 PR ≤400 linhas**; a branch é apagada no merge.
4. **WIP máximo 2 por pessoa** em "Em andamento". Termine (ou peça ajuda) antes de puxar outra issue.
5. **Commit ao fim de cada sessão de trabalho**, com `(#n)` na mensagem e no padrão do [guia de contribuição](../../.github/CONTRIBUTING.md).
6. **Revisão em ≤24h, executando o "Como verificar".** Quem revisa roda a aplicação; não aprova só lendo o diff.
7. **Daily em todos os dias úteis, sempre com ata.** Presencial em aula, assíncrona por texto sem aula.
8. **Segredos nunca no repositório.** `.env` é local; o que vai versionado é `.env.example`.
9. **Co-autoria só do time.** `Co-authored-by` vazio ou de alguém de `equipe.json`; quem gera código com apoio de IA explica isso no PR.
10. **Nada é anunciado antes do merge.** README, plano e `sprint-N.md` só descrevem o que está em `develop`/`main`; "Concluído" só após verificação.

## 4. Ciclo de vida de uma issue

```
Backlog → Sprint Backlog → Em andamento → Em revisão → Concluído
```

| Transição | Quem / o que move | Gatilho |
|---|---|---|
| (nova) → **Backlog** | automação (workflow `board`) | Issue aberta: o PO cria histórias com o formulário; devs abrem tarefas e bugs; ações de retro viram `tipo:processo` |
| Backlog → **Sprint Backlog** | PO na planning (automação reflete) | A issue recebe a milestone `Sprint N`; DoR completa e assignee definido |
| Sprint Backlog → **Em andamento** | automação (ou o dev via `/tarefa`) | 1º push na branch `tipo/<n>-slug` criada a partir de `origin/develop` |
| Em andamento → **Em revisão** | automação (ou `/pr`) | PR aberto para `develop` com `Closes #n`, fora de rascunho |
| Em revisão → Em andamento | automação | PR convertido em rascunho ou fechado sem merge |
| Em revisão → **Concluído** | automação | PR mergeado em `develop`: o workflow fecha a issue e comenta o link do PR |
| Concluído → Em andamento | automação | Issue reaberta (ganha a label `regressao`; conta como regressão na rubrica cumulativa) |

Ninguém move manualmente para Concluído: a única porta é o merge em `develop` com a DoD-PR cumprida. Se a automação falhar, siga [quadro.md](quadro.md#7-se-a-automação-falhar). O `Closes #n` nativo do GitHub só fecha a issue em merge na branch padrão (`main`); no nosso fluxo, quem fecha é o workflow `board`.

## 5. Onde fica cada coisa

| Arquivo / local | Conteúdo | Fonte principal de | Dono |
|---|---|---|---|
| GitHub Issues + [quadro](quadro.md) | Product Backlog vivo, Sprint Backlog (milestone), estado de cada item | estado e prioridade de cada item | PO (conteúdo), SM (quadro) |
| `docs/backlog/product-backlog.md` | Retrato versionado das issues, gerado por `backlog-export.sh` na planning e no fechamento | retrato do backlog em uma data | SM |
| `docs/plano-de-entregas.md` | Plano das três sprints exigido pela rubrica: critérios, entregas, responsáveis, evidências, situação, histórico de alterações | **critérios de cada sprint e situação de cada critério** | PO (SM revisa) |
| `docs/requisitos.md` | RF/RNF/RP do edital com âncoras e critérios da rubrica relacionados | RF/RNF/RP do edital | PO |
| `docs/processo/*.md` | Este processo, DoR/DoD, quadro, onboarding | processo, DoR/DoD, quadro e onboarding | SM |
| `docs/templates/*.md` | Modelos de todos os registros Scrum e dos documentos técnicos | formato dos registros e documentos | SM |
| `docs/sprints/sprint-N.md` | Registro oficial da sprint: objetivo, versão/tag, concluídos, pendentes, verificações realizadas, review, métricas | registro oficial de cada sprint | SM (PO valida) |
| `docs/sprints/sprint-N/planning.md` · `review.md` · `retrospectiva.md` · `contribuicao.md` | Atas das cerimônias e relatório de participação (ES09) | atas das cerimônias e participação | SM |
| `docs/sprints/sprint-N/burndown.md` | Burndown da sprint em Story Points, gerado por `burndown.sh N` ([seção 2.2](#22-burndown-da-sprint)) | burndown em Story Points | SM |
| `docs/sprints/sprint-N/dailies/AAAA-MM-DD.md` | Ata de cada daily (uma por dia útil) | ata de cada daily | SM ou quem registrar |
| `docs/adr/` | Decisões de arquitetura no formato MADR, com rastreabilidade para issue/RF/critério | decisões de arquitetura (ADR) | devs e SM |
| `docs/api.md` · `docs/arquitetura.md` · `docs/calculos.md` | Documentação técnica; nasce no mesmo PR do código que documenta | documentação técnica (API, arquitetura, cálculos) | dev da área (`calculos.md`: PO com o dev backend) |
| `README.md` da raiz · `frontend/README.md` · `backend/README.md` · `database/README.md` | O que existe de fato e como executar | o que existe e como executar cada módulo | dev da área; raiz: SM com o PO |
| `.github/CONTRIBUTING.md` | Regras de branch, commit, co-autoria, PR, release e tags | regras de branch, commit, PR, release e tags | SM |
| `.github/equipe.json` · `.github/calendario.json` | Dados do time e do calendário usados por scripts, hooks e CI | dados do time e calendário da automação | SM (alteração via PR) |
| `.github/workflows` · `.github/scripts` | Checks (`commits`, `pr`, `docs`), automação do quadro, CI, exportadores | checks e automação do repositório | SM |

**Regra de fonte principal:** a situação dos critérios de cada sprint fica apenas no plano de entregas; `sprint-N.md`, `sprint-N/review.md` e as demais atas apontam para ele em vez de repetir números ou status.

## 6. Fluxo resumido de uma sprint

1. **Planning (dia 1):** PO apresenta as histórias com DoR; o time seleciona, estima e atribui; SM publica `planning.md` + `sprint-N.md` e a issue "Daily — Sprint N" por PR no mesmo dia.
2. **Execução:** cada dev segue `issue → /tarefa → commits (#n) → /pr → revisão em ≤24h → merge`; daily todos os dias úteis com ata; refinamento semanal.
3. **Checkpoint:** PO e SM avaliam cada critério previsto; o que não vai fechar é movido para a próxima sprint com registro no histórico do plano.
4. **Congelamento (domingo 20h):** SM congela `develop`, roda `teste-avaliador.sh`, `check-docs.sh`, `/auditar` e `burndown.sh N`, abre `release/sprint-N` → `main`.
5. **Review:** demonstração por RF com o cliente; SM registra o feedback.
6. **Pós-review (≤24h) e retro:** feedback vira issues; plano, `sprint-N.md` e README atualizados; merge do release, tag `sprint-N`; retro gera ações `tipo:processo`.

## Hierarquia do backlog

Épico (tema de requisitos do edital) → História (valor para o usuário, com critérios de aceite) → Tarefa (fatia técnica que vira branch e PR). A relação é feita com sub-issues do GitHub e aparece no quadro em *Parent issue* e *Sub-issues progress*. Detalhes e views em [quadro.md](quadro.md#hierarquia-do-backlog-épico--história--tarefa).
