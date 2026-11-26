# Sprint 3 — BD04, mapa, polimento e portfólio

| Campo | Valor |
|---|---|
| Período | 10/11 a 23/11/2026 · checkpoint 17/11 · congelamento 22/11 20h · review 25/11 21h, remarcada a pedido do cliente (estava marcada para 23/11 19h30) |
| Milestone | [Sprint 3](https://github.com/DEVassos/ecopulse-app/milestone/3) |
| Plano | [docs/plano-de-entregas.md § Sprint 3](../plano-de-entregas.md#sprint-3): critérios previstos, denominador e situação de cada critério |
| Atas | [planning](sprint-3/planning.md) · [dailies](sprint-3/dailies/) · [retrospectiva](sprint-3/retrospectiva.md) |
| Burndown | [sprint-3/burndown.md](sprint-3/burndown.md) — Story Points por dia, gerado por `.github/scripts/burndown.sh 3` |
| Versão entregue | branch `release/sprint-3`, criada em 23/11 de `develop` no commit [`4bd0c29`](https://github.com/DEVassos/ecopulse-app/commit/4bd0c29) (merge do PR #430, 23/11 13h02). O congelamento estava marcado para 22/11 às 20h e foi feito em 23/11; o último merge de código é o PR #439, de 22/11 às 15h54. Entrega acompanhada pela [#442](https://github.com/DEVassos/ecopulse-app/issues/442) A entrega foi mergeada em `main` em 23/11 às 18h20 pelo PR [#443](https://github.com/DEVassos/ecopulse-app/pull/443); depois do fechamento, fica na tag [`sprint-3`](https://github.com/DEVassos/ecopulse-app/releases/tag/sprint-3) |
| Participação | [sprint-3/contribuicao.md](sprint-3/contribuicao.md) |
| Review | [sprint-3/review.md](sprint-3/review.md) · vídeo [EcoPulse — Sprint 3](https://youtu.be/l-femMC6UP4) |

## 1. Objetivo da sprint

Consultas agregadas de ranking e comparação por período conferidas e documentadas (BD04), mapa das regiões com bolhas (US10 #51) e simulação de migração para a região mais limpa (US12 #53), elevados a must de produto em 10/11, revisão de usabilidade, responsividade e desempenho, e repositório pronto para ser apresentado como portfólio: sem regressões e com a documentação conferida comando a comando. Tudo o que foi aceito nas Sprints 1 e 2 continua funcionando.

## 2. Itens selecionados

A situação de cada critério previsto fica **só** no [plano de entregas](../plano-de-entregas.md#sprint-3); esta seção registra a seleção da sprint e o responsável.

| Issue | Título | Requisito | Critério | Responsável | Seleção |
|---|---|---|---|---|---|
| #313 | Conferência das consultas agregadas por período e índices | RF14, RF15, RNF03 | BD04 | @viniciusaugusto1997, @LUCASAMR23 | must |
| #256 | Emissões conta de novo coletas inválidas na página seguinte | RF09, RNF04 | DW04, TP03 | @travensolli | must (vem da Sprint 2) |
| #234 | Resumo do dashboard no contrato de 23/10, com IndicatorsPanel | RF08 | DW05 | @DeaTuribio, @LUCASAMR23 | should (vem da Sprint 2) |
| #195 | US15: cadastro de usuário por convite do administrador | RNF05 | DW06 | @LUCASAMR23 | retirada em 20/11 e retomada em 21/11; quebrada em #196 e #197 |
| #196 | Convites e cadastro por convite no backend | RNF05 | DW06, BD01 | @LUCASAMR23, @viniciusaugusto1997 | retirada em 20/11 e retomada em 21/11 com @travensolli; PR #392 em revisão |
| #197 | Telas de convite e de cadastro por convite | RNF05 | DW04, DW06 | @DeaTuribio | retirada em 20/11 e retomada em 21/11; começa depois do PR #392 |
| #55 | US14: polimento, validação de carga e documentação de portfólio | RNF03, RNF05 | ES07, ES08 | @travensolli | must |
| #51 | US10: mapa por bolhas | RF12, RF13 | DW04 | @DeaTuribio | must desde 10/11; tarefas #318–#324 |
| #53 | US12: simulação de migração regional | RF15 | DW03, DW04 | @henriqueptbd-cell, @DeaTuribio | must desde 10/11; tarefas #325 e #326 |
| #226 | US11b: comparação orientada à decisão | RF07, RF15 | DW04, DW05, BD04 | @henriqueptbd-cell | recorte de 10 pontos (#327–#329, #406) entregue; história **dividida** em 21/11 com o restante na [#431](https://github.com/DEVassos/ecopulse-app/issues/431), entregue no mesmo dia pelo PR [#433](https://github.com/DEVassos/ecopulse-app/pull/433) |
| #330–#333 | Polimento do Dashboard e de Emissões (tabela das 24 h, avisos de mudança, eixo, equivalências), filhas de #55 | RF02, RF07, RF09, RF14 | DW04, DW05 | @travensolli, @henriqueptbd-cell | should (#333 could) |
| #54 | US13: exportação de relatórios (PDF e CSV) | RNF05 | DW04 | @DeaTuribio | could, quebrada em #13 e #24 |
| #13 | Layout do relatório executivo para impressão e PDF | RNF05 | DW04 | @DeaTuribio | could |
| #24 | Exportação de dados em CSV e PDF executivo | RNF05 | DW04 | @DeaTuribio | could |
| #275 | Prova de qualidade visual automatizada no CI | RNF01 | ES07 | @travensolli | could |

Itens de processo (5): #312, #310, #311, #169 e #167. Detalhes, estimativas, capacidade e a revisão de 10/11 (todas as issues mantidas; #51 e #53 em must; recorte de #226) estão no [planning](sprint-3/planning.md).

## 3. Riscos e dependências

| Risco | Impacto | Mitigação | Dono |
|---|---|---|---|
| Sprint curta (9 dias úteis) com 62 pontos selecionados | alto | must primeiro; could só depois; o que sobrar é registrado como pendente no fechamento | @henriqueptbd-cell |
| Frontend concentrado em @DeaTuribio | alto | #256 assumida por @travensolli; #51 fica com ela porque já começou; exportação só depois de #234 e #51; #197 saiu do escopo em 20/11 e voltou em 21/11, depois do #196 | @travensolli |
| ES09 coletivo: @viniciusaugusto1997 sem item até a planning | alto | #313 com ele; #196 saiu do escopo em 20/11 e voltou em 21/11 com @travensolli | @viniciusaugusto1997 |
| #226 com 22 pontos e em refinamento | médio | recorte de 10/11 em #327–#329; resolvido em 21/11 com a divisão da história e a [#431](https://github.com/DEVassos/ecopulse-app/issues/431), que entrou na `develop` no mesmo dia pelo PR [#433](https://github.com/DEVassos/ecopulse-app/pull/433) e recebeu a milestone `Sprint 3` em 23/11 | @henriqueptbd-cell |
| Capacidade com todas as issues mantidas (65 pontos na planning) | alto | risco revisto em 20/11: #195–#197 fora do escopo (milestone removida, cards no `Backlog`) e retomadas em 21/11 com a milestone de volta; manter foco nas entregas restantes até o congelamento | @travensolli |
| #197 depende de #196 | médio | dependência volta a valer com a retomada de 21/11: #197 começa depois do PR #392, sem bloquear o resto da sprint | @LUCASAMR23 |
| Regressão nos critérios das Sprints 1 e 2 | alto | `teste-avaliador.sh` antes do congelamento e reteste em "Verificações realizadas" | @travensolli |
| Feriado de 20/11 | baixo | daily assíncrona por texto, com ata | @travensolli |

## 4. Itens retirados e retomados

Em 20/11, as issues [#195](https://github.com/DEVassos/ecopulse-app/issues/195) (US15, cadastro por convite), [#196](https://github.com/DEVassos/ecopulse-app/issues/196) (convites no backend) e [#197](https://github.com/DEVassos/ecopulse-app/issues/197) (telas de convite) saíram do escopo da Sprint 3: a milestone `Sprint 3` foi removida, os três cartões voltaram ao `Backlog` e as issues seguem **abertas**, com comentário apontando a decisão. Não existe Sprint 4 — a Sprint 3 é a entrega final do projeto —, então elas não são transferidas para sprint nenhuma.

Motivo: o checkpoint de 17/11 passou sem branch, commit, PR ou comentário indicando trabalho iniciado, e as entregas não cabem até o congelamento de 22/11 às 20h. **Nenhum critério previsto muda** e o denominador permanece **46** (ES01–ES09, DW01 e BD04): DW06 e BD01 já estão atendidos nas Sprints 1 e 2, e DW04 também. A decisão e a justificativa estão no [Histórico de alterações do plano](../plano-de-entregas.md#histórico-de-alterações-do-plano), entrada de 20/11.

Em 21/11 as três voltaram para a Sprint 3, por decisão do SM com o PO: a tarefa de backend ficou pronta com testes e verificação em compose (PR [#392](https://github.com/DEVassos/ecopulse-app/pull/392)). Nenhum critério muda e o denominador segue 46. Registro na entrada de 21/11 do [Histórico de alterações do plano](../plano-de-entregas.md#histórico-de-alterações-do-plano).

Em 21/11 a [#226](https://github.com/DEVassos/ecopulse-app/issues/226) (US11b) foi **dividida**, depois do checkpoint de 17/11: a história fecha com o recorte de 10 pontos entregue (#327, #328, #329 e #406) e os 12 pontos que faltavam foram para a [#431](https://github.com/DEVassos/ecopulse-app/issues/431), no `Backlog` e sem milestone, com critérios de aceite e "Como verificar" próprios. A verificação de 21/11 mostrou 2 critérios de aceite atendidos, 2 parciais e 2 não atendidos, e é o que está registrado no corpo da história. Com isso o épico [#39](https://github.com/DEVassos/ecopulse-app/issues/39) (EP5) fecha: RF14 e RF15 estão entregues, e o que sobrou na #431 é melhoria de leitura da comparação. Nenhum critério da rubrica muda de sprint e o denominador segue 46. Registro na entrada de 21/11 do [Histórico de alterações do plano](../plano-de-entregas.md#histórico-de-alterações-do-plano).

Ainda em 21/11, às 22h51 (horário de Brasília), a [#431](https://github.com/DEVassos/ecopulse-app/issues/431) entrou na `develop` pelo PR [#433](https://github.com/DEVassos/ecopulse-app/pull/433), de @DeaTuribio, antes do congelamento: ranking dos serviços por CO₂e, ordenação sincronizada entre ranking, dispersão, tabela e CSV, destaque cruzado do mesmo serviço e alerta agregado de coletas com falha ou sem cálculo. É o que faltava nos critérios 1 e 4 da #226 (parciais) e nos critérios 2 e 3 (não atendidos). O PO executou o "Como verificar" da #431 com o backend real na [aprovação do #433](https://github.com/DEVassos/ecopulse-app/pull/433#pullrequestreview-6009378540). O parágrafo anterior fica como registro do que se sabia antes desse merge. Em 23/11 a #431 recebeu a milestone `Sprint 3`; nenhum critério da rubrica muda e o denominador segue 46. Registro na entrada de 23/11 do [Histórico de alterações do plano](../plano-de-entregas.md#histórico-de-alterações-do-plano).

## 5. Verificações realizadas (aplicação da DoD)

Verificações executadas em 21/11 sobre `develop` em [`5ff4a64`](https://github.com/DEVassos/ecopulse-app/commit/5ff4a64), com a stack `ecopulse` no ar (`docker compose ps`: `postgres`, `backend` e `frontend` em `Up (healthy)`). Cada linha traz o comando ou caminho usado, quem executou e o resultado observado; a linha correspondente do [plano de entregas](../plano-de-entregas.md) aponta para cá.

### 5.1 Itens da sprint

| Item | Como foi verificado | Quem | Resultado |
|---|---|---|---|
| [US10 #51](https://github.com/DEVassos/ecopulse-app/issues/51) | `GET /api/regions/summary` e `GET /api/regions` na stack real; testes de `RegionMap.test.tsx`, `RegionList.test.tsx`, `region-map.test.ts` e `regions.service.test.ts` (58 testes) | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | aceite em 21/11 13h26 ([comentário](https://github.com/DEVassos/ecopulse-app/issues/51#issuecomment-7063271008)): 200 com 5 regiões e coordenadas; história fechada |
| [US13 #54](https://github.com/DEVassos/ecopulse-app/issues/54), critério 1 — CSV | Botão "Baixar CSV" da tela `/emissoes` com o serviço Reporting Batch (#8) e o período 21/11–21/11, arquivo aberto e somado; segundo caminho, a própria `collectionsCsv` do app sobre o mesmo filtro; as duas somas comparadas com `psql` sobre `collections` | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | `ecopulse-coletas-reporting-batch-2026-11-21-a-2026-11-21.csv`: 1.069 linhas de dados e 12 colunas com BOM, `co2e_grams` 26,438638141 g e `energy_kwh` 0,660965954 kWh; segundo caminho 1.067 linhas / 26,3818401 g / 0,659546002 kWh no corte anterior. As duas somas batem exatamente com o SQL do mesmo filtro |
| [US13 #54](https://github.com/DEVassos/ecopulse-app/issues/54), critério 2 — PDF | `Page.printToPDF` (A4, margens padrão) sobre `/emissoes` e `/relatorio`, com as páginas inspecionadas | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | `/emissoes`: 3 páginas com cabeçalho "EcoPulse · RELATÓRIO DE EMISSÕES · DEVASSOS", KPIs, gráfico, tabela de intervalos de 15 min e rodapé "Página X de 3"; `/relatorio`: período, cartões 1,40 kg CO₂e / 5,71 kWh / 244,5 g/kWh e o aviso "Sem base para comparar: 0 coletas no período anterior". Prints em [sprint-3-emissoes-pdf-1.png](../img/sprint-3-emissoes-pdf-1.png) e [sprint-3-relatorio-periodo-1.png](../img/sprint-3-relatorio-periodo-1.png) |
| [US14 #55](https://github.com/DEVassos/ecopulse-app/issues/55), teste do avaliador | `bash .agilekit/scripts/teste-avaliador.sh` (clone limpo de `develop`, `.env` a partir de `.env.example`, `docker compose up --build`) | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | 5/5: compose no ar, `GET /health` 200, 6 tabelas, `collections` de 16 para 24 linhas depois de `docker compose restart` e `database/schema.sql` aplicado em PostgreSQL 16 vazio |
| [US14 #55](https://github.com/DEVassos/ecopulse-app/issues/55), README | Clone limpo seguindo o §8 do README: subir a stack, abrir `http://localhost:5173`, `curl localhost:3000/health` e entrar com `ADMIN_EMAIL`/`ADMIN_PASSWORD` | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | frontend 200, `/health` devolve `{"status":"ok","db":"ok"}`, login 200 com token; nenhum passo precisou de ajuste |
| [US14 #55](https://github.com/DEVassos/ecopulse-app/issues/55), painel regional (critério 2) | Dashboard na stack real, região `us-east` selecionada no mapa/lista | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | Painel "Ashburn us-east": 699 g de CO₂e e 1,85 kWh nas últimas 24 h, os 8 serviços na tabela e o veredito "Mover para Toronto reduziria o CO₂e desta região em cerca de 89,42%" ("625 g a menos", `1,851 kWh × 40 g/kWh = 74,02 g`); quatro destinos com a economia: Toronto 40 g (▼ 89,42%), São Paulo 85 g (▼ 77,51%), Dublin 295 g (▼ 21,96%) e Tóquio 465 g (▲ 23,02%) |
| [US11b #226](https://github.com/DEVassos/ecopulse-app/issues/226), critérios 5 e 6 | `GET /api/services/compare?ids=1,2,3,4` com JWT na stack real e a página `/comparacao?servicos=1,2,3,4` no navegador, em 1440 px e em 360 px | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | **Atendidos:** o período aparece com hora (`21/11/2026, 00:00 a 21/11/2026, 20:15 (horário de Brasília)`, igual ao `from`/`to` da API) e em 360 px `scrollWidth = clientWidth = 360`, sem rolagem horizontal da página — só o invólucro da tabela rola. **Parciais:** critério 1 (impacto primeiro com a intensidade entre Energia e CO₂e, mas sem ranking de serviços) e 4 (contagem por serviço na célula de Coletas, sem alerta agregado). **Não atendidos:** 2 (ordem sincronizada e CSV) e 3 (destaque cruzado); o que faltava em 1–4 passou para a #431, entregue pelo PR #433 às 22h51 do mesmo dia, depois desta verificação, e conferido pelo PO na aprovação do #433. Aceite e fechamento em 21/11 ([comentário](https://github.com/DEVassos/ecopulse-app/issues/226)) |
| [ES08](../plano-de-entregas.md#sprint-3) — links | Varredura de todos os links relativos dos `.md` versionados | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | 493 links em 97 arquivos; 26 problemas, todos em `docs/templates/` (caminhos de exemplo dos modelos); nenhum link quebrado na documentação real |
| [ES08](../plano-de-entregas.md#sprint-3) — `docs/api.md` | As 18 rotas documentadas chamadas na stack real (26 casos, com e sem JWT) | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | Todas coerentes com o texto: 200 com o corpo documentado, `401` sem token, `400` em `metric` ausente ou inválida em `/api/services/ranking` e `404` em caminho inexistente. As três divergências iniciais eram expectativa errada minha: `metric` é obrigatório, `/api/auth/me` devolve objeto plano (`id`, `email`, `name`, `role`) e `/api/services` não promete chave `summary` |
| [ES08](../plano-de-entregas.md#sprint-3) — `calculos.md` | Constantes de `backend/src/domain/carbon-calculator.ts` confrontadas com as fórmulas e as escalas de `docs/calculos.md`; exemplo oficial recalculado | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | 100 W de CPU, 0,375 W/GB de RAM, 0,01 W/GB de disco e 0,02 W/GB de rede idênticos aos da doc; `50,87 W → 0,000847833333 kWh → 0,072065833333 gCO₂e` e o exemplo OpenAPI (64,06035 W) conferem |
| [ES07](../plano-de-entregas.md#sprint-3) — DoD-PR | `gh pr list --base develop --state merged --search 'merged:2026-11-10..2026-11-21' --json number,body,author,reviews,mergedAt` e conferência dos checklists e das revisões | [@viniciusaugusto1997](https://github.com/viniciusaugusto1997) | Em 21/11, a consulta retornou 56 PRs: todos com os seis itens marcados ou justificados como N/A e com aprovação de outra conta. Em 44, uma aprovação começa com “DoD verificada” (ignorando maiúsculas/minúsculas). Os 12 fora desse formato são #315, #357, #367, #368, #381, #384, #385, #390, #405, #407, #409 e #416. No #385, a aprovação veio sem texto. A tabela de reteste está registrada abaixo. |

### 5.2 Reteste de regressão (critérios aceitos nas Sprints 1 e 2)

| Critério | Como foi verificado | Quem | Resultado |
|---|---|---|---|
| DW01 | `npx tsc --noEmit` em `backend/` e `frontend/`; `grep '"strict"'` nos dois `tsconfig` | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | exit 0 nos dois módulos; `"strict": true` em `backend/tsconfig.json` e `frontend/tsconfig.json` |
| DW02 | `psql` nas três coletas mais recentes e leitura de `integrations/metrics-api.ts` e `integrations/carbon-api.ts` | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | coletas de 22h48 UTC com intensidade por região (40, 378 e 85 gCO₂e/kWh) e `calculation_status = disponivel`; as duas integrações têm timeout por tentativa, uma repetição só para falha de rede/timeout e `ExternalApiError` tipado |
| DW03 | As 26 chamadas do item `docs/api.md` acima | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | 200/400/401/404 coerentes com o contrato documentado |
| DW04 | `grep -rln "fetch(\|axios" frontend/src` e contagem por pasta | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | HTTP só em `frontend/src/services/api.ts`; `pages` 12, `components` 89, `services` 38, `hooks` 20, `contexts` 2 e `providers` 2 arquivos |
| DW05 | Dashboard real, duas leituras do selo com 70 s de intervalo e contagem de navegações | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | "Última atualização: 21/11 19:50:11 · intervalo: 60 s" e depois 19:51:11, com uma única navegação — atualizou sem recarregar |
| DW06 | `POST /api/auth/login`; `PUT /api/monitoring-settings` sem token, com token inválido e com JWT; `psql` em `users` | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | login 200; 401 sem token e com token inválido; 200 com JWT; hash bcrypt (`$2a$10$`/`$2b$10$`) nas quatro contas |
| BD01, BD03 e DW07 | `teste-avaliador.sh` acima | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | `schema.sql` aplica em PostgreSQL 16 vazio e os dados sobrevivem ao `docker compose restart` |
| BD02 | `grep` de SQL fora de `*repository.ts`, de interpolação `${` em SQL e de ORM nos dois `package.json` | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | nenhum SQL fora de repository, nenhuma interpolação de valor e nenhuma dependência de ORM |
| TP01 | `ls backend/src/domain` e `grep "from '.*domain/"` fora da pasta | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | 6 classes de domínio; 8 imports em `jobs/collector.ts`, `modules/services/services.service.ts` e `modules/invitations/invitations.service.ts` |
| TP02 | `grep` por `any` sem justificativa e typecheck acima | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | nenhum `any` no `src` dos dois módulos e `strict: true` ativo |
| TP03 | `grep` por `catch` vazio e leitura de `shared/errors.ts` e `middlewares/error-handler.ts` | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | nenhum `catch` vazio; erros tipados e envelope `{"error":{"code","message"}}` |

### 5.3 Verificações do congelamento (23/11)

Executadas em 23/11 na máquina do SM. O teste do avaliador usou uma cópia de `.agilekit/scripts/teste-avaliador.sh` que só troca as portas (3100, 5273 e 5534), porque a stack local ocupa a 3000 e a 5173; o resto é o caminho oficial: clone limpo, `.env` a partir de `.env.example` e `docker compose up --build`.

| Item | Como foi verificado | Quem | Resultado |
|---|---|---|---|
| Teste do avaliador em `7e5749f` (último merge de código) | clone limpo, compose, `/health`, restart e `schema.sql` em PostgreSQL 16 vazio | [@travensolli](https://github.com/travensolli) (SM) | compose no ar, `GET /health` 200, 6 tabelas, `collections` de 15 para 22 linhas depois de `docker compose restart` e `schema.sql` aplicado em banco vazio com 6 tabelas |
| Teste do avaliador em `4bd0c29` (base da `release/sprint-3`) | o mesmo roteiro, às 13h05 | [@travensolli](https://github.com/travensolli) (SM) | compose no ar, `GET /health` 200, 6 tabelas, `collections` de 16 para 24 linhas depois do restart e `schema.sql` aplicado em banco vazio com 6 tabelas |
| Documentação e proibições em `4bd0c29` | `bash .github/scripts/check-docs.sh` e `bash .github/scripts/check-forbidden.sh` | [@travensolli](https://github.com/travensolli) (SM) | os dois sem erro; 3 avisos de permalink, em linhas da Sprint 2 e do histórico do plano |
| CI da `develop` em `4bd0c29` | `gh run list --branch develop` | [@travensolli](https://github.com/travensolli) (SM) | workflows `ci` e `checks` concluídos com sucesso |
| [ES07](../plano-de-entregas.md#sprint-3) — DoD-PR dos PRs depois da auditoria de 21/11 | `gh pr list --base develop --state merged --search "merged:2026-11-10..2026-11-24"`, leitura da seção DoD-PR e das revisões dos 7 PRs mergeados depois da consulta da § 5.1 (#427, #430, #432, #433, #435, #437 e #439) | [@travensolli](https://github.com/travensolli) (SM) | os 7 têm os seis itens marcados e aprovação de outra conta, o que leva o total da sprint a 63 PRs na `develop`. Em 6, a aprovação começa com "DoD verificada"; no #439, a aprovação tem uma linha, sem a frase |

## 6. Itens no congelamento (23/11/2026)

A milestone `Sprint 3` tem 79 issues: 69 fechadas por PR mergeado em `develop` ou por aceite registrado, a [#275](https://github.com/DEVassos/ecopulse-app/issues/275), fechada como "não planejada", e 9 abertas até o fechamento (§ 6.4). A coluna Evidência traz o PR que entregou cada item e, nas histórias, o aceite. A situação de cada critério fica só no [plano de entregas](../plano-de-entregas.md#sprint-3).

A [#375](https://github.com/DEVassos/ecopulse-app/issues/375), a [#376](https://github.com/DEVassos/ecopulse-app/issues/376) e a [#431](https://github.com/DEVassos/ecopulse-app/issues/431) foram entregues durante a sprint sem a milestone e a receberam em 23/11, para aparecerem nesta lista ([histórico do plano](../plano-de-entregas.md#histórico-de-alterações-do-plano), 23/11).

### 6.1 Histórias

| Issue | Título | Requisito | Evidência | Responsável |
|---|---|---|---|---|
| [#51](https://github.com/DEVassos/ecopulse-app/issues/51) | US10 — Visualização geográfica por bolhas (mapa) | RF12 RF13 | [aceite do PO em 21/11](https://github.com/DEVassos/ecopulse-app/issues/51#issuecomment-7063271008) | @DeaTuribio |
| [#53](https://github.com/DEVassos/ecopulse-app/issues/53) | US12 — Simulação de migração regional (matriz mais limpa) | RF15 | [aceite do PO em 20/11](https://github.com/DEVassos/ecopulse-app/issues/53#issuecomment-7053141650) | @viniciusaugusto1997 |
| [#54](https://github.com/DEVassos/ecopulse-app/issues/54) | US13 — Exportação de relatórios gerenciais (PDF e CSV) | RNF05 | [aceite do PO em 21/11](https://github.com/DEVassos/ecopulse-app/issues/54#issuecomment-7070552264) | @DeaTuribio |
| [#55](https://github.com/DEVassos/ecopulse-app/issues/55) | US14 — Polimento, validação de carga e documentação de portfólio | RNF03 RNF05 | [aceite do PO em 21/11](https://github.com/DEVassos/ecopulse-app/issues/55#issuecomment-7070561766); aberta até o fechamento (§ 6.4) | @travensolli |
| [#195](https://github.com/DEVassos/ecopulse-app/issues/195) | US15 — Cadastro de usuário por convite do administrador | RNF05 | [aceite do PO em 21/11](https://github.com/DEVassos/ecopulse-app/issues/195#issuecomment-7068007719) | @LUCASAMR23 |
| [#226](https://github.com/DEVassos/ecopulse-app/issues/226) | US11b — Comparação orientada à decisão: Energia × intensidade = CO₂e | RF07 RF15 | [aceite do PO em 21/11](https://github.com/DEVassos/ecopulse-app/issues/226#issuecomment-7070795108) | @henriqueptbd-cell |

### 6.2 Tarefas e bugs

| Issue | Título | Requisito | Evidência | Responsável |
|---|---|---|---|---|
| [#13](https://github.com/DEVassos/ecopulse-app/issues/13) | [UI-04] Layout do Relatório Executivo para Impressão e PDF | — | [#387](https://github.com/DEVassos/ecopulse-app/pull/387) | @travensolli, @DeaTuribio |
| [#24](https://github.com/DEVassos/ecopulse-app/issues/24) | [FE-05] Módulo Global de Exportação de Dados em CSV e PDF Executivo | — | [#386](https://github.com/DEVassos/ecopulse-app/pull/386) | @DeaTuribio |
| [#196](https://github.com/DEVassos/ecopulse-app/issues/196) | [tarefa] Convites e cadastro por convite no backend | RNF05 | [#392](https://github.com/DEVassos/ecopulse-app/pull/392) | @travensolli, @LUCASAMR23, @viniciusaugusto1997 |
| [#197](https://github.com/DEVassos/ecopulse-app/issues/197) | [tarefa] Telas de convite e de cadastro por convite | RNF05 | [#393](https://github.com/DEVassos/ecopulse-app/pull/393) | @travensolli, @DeaTuribio |
| [#234](https://github.com/DEVassos/ecopulse-app/issues/234) | [tarefa] Resumo do dashboard no contrato de 23/10, com IndicatorsPanel (RF08) | RF08 | [#390](https://github.com/DEVassos/ecopulse-app/pull/390) | @DeaTuribio, @LUCASAMR23, @henriqueptbd-cell |
| [#256](https://github.com/DEVassos/ecopulse-app/issues/256) | [bug] Emissões conta de novo coletas inválidas ao buscar a página seguinte | RF09 RNF04 | [#315](https://github.com/DEVassos/ecopulse-app/pull/315) | @travensolli |
| [#313](https://github.com/DEVassos/ecopulse-app/issues/313) | [tarefa] Conferência das consultas agregadas por período e índices (BD04) | RF14 RF15 RNF03 | [#337](https://github.com/DEVassos/ecopulse-app/pull/337) | @LUCASAMR23, @viniciusaugusto1997 |
| [#318](https://github.com/DEVassos/ecopulse-app/issues/318) | [tarefa] ADR da biblioteca de mapas e das imagens de satélite | RF13 | [#338](https://github.com/DEVassos/ecopulse-app/pull/338) | @DeaTuribio |
| [#319](https://github.com/DEVassos/ecopulse-app/issues/319) | [tarefa] GET /api/regions com coordenadas, intensidade e % renovável | RF13 RF15 | [#339](https://github.com/DEVassos/ecopulse-app/pull/339) | @LUCASAMR23 |
| [#320](https://github.com/DEVassos/ecopulse-app/issues/320) | [tarefa] GET /api/regions/summary com energia e CO₂e por região no período | RF13 RF14 | [#354](https://github.com/DEVassos/ecopulse-app/pull/354) | @viniciusaugusto1997 |
| [#321](https://github.com/DEVassos/ecopulse-app/issues/321) | [tarefa] Funções de região no frontend: agregação, pior estado, alternativa e estimativa | RF13 RF15 | [#340](https://github.com/DEVassos/ecopulse-app/pull/340) | @travensolli |
| [#322](https://github.com/DEVassos/ecopulse-app/issues/322) | [tarefa] Mapa de bolhas por região no Dashboard | RF12 RF13 RNF01 | [#355](https://github.com/DEVassos/ecopulse-app/pull/355) | @DeaTuribio |
| [#323](https://github.com/DEVassos/ecopulse-app/issues/323) | [tarefa] Modo apresentação do mapa com pausa | RF13 RNF01 | [#385](https://github.com/DEVassos/ecopulse-app/pull/385) | @DeaTuribio |
| [#324](https://github.com/DEVassos/ecopulse-app/issues/324) | [tarefa] Selo de rede limpa na tabela e no mapa | RF12 RF13 | [#367](https://github.com/DEVassos/ecopulse-app/pull/367) | @travensolli |
| [#325](https://github.com/DEVassos/ecopulse-app/issues/325) | [tarefa] Fórmulas da simulação de migração, eficiência e rede limpa em calculos.md | RF07 RF15 | [#334](https://github.com/DEVassos/ecopulse-app/pull/334) | @henriqueptbd-cell |
| [#326](https://github.com/DEVassos/ecopulse-app/issues/326) | [tarefa] Alternativa mais limpa no mapa: destino e redução estimada | RF15 | [#384](https://github.com/DEVassos/ecopulse-app/pull/384) | @DeaTuribio |
| [#327](https://github.com/DEVassos/ecopulse-app/issues/327) | [tarefa] Potência por recurso (powerBreakdown) em /api/services e /api/services/compare | RF07 RF15 | [#372](https://github.com/DEVassos/ecopulse-app/pull/372) | @LUCASAMR23 |
| [#328](https://github.com/DEVassos/ecopulse-app/issues/328) | [tarefa] Comparação com impacto primeiro, intensidade da região e potência por recurso | RF07 RF15 | [#377](https://github.com/DEVassos/ecopulse-app/pull/377) | @henriqueptbd-cell |
| [#329](https://github.com/DEVassos/ecopulse-app/issues/329) | [tarefa] Eficiência energética e de carbono no ranking e na comparação | RF14 RF15 | [#389](https://github.com/DEVassos/ecopulse-app/pull/389) | @henriqueptbd-cell |
| [#330](https://github.com/DEVassos/ecopulse-app/issues/330) | [tarefa] Tabela do Dashboard com energia e CO₂e das 24 h e parte de cada serviço | RF09 RF14 | [#368](https://github.com/DEVassos/ecopulse-app/pull/368) | @travensolli |
| [#331](https://github.com/DEVassos/ecopulse-app/issues/331) | [tarefa] Avisos de mudança de estado dos serviços a cada atualização | RF02 RF05 RF06 RNF04 | [#374](https://github.com/DEVassos/ecopulse-app/pull/374) | @travensolli |
| [#332](https://github.com/DEVassos/ecopulse-app/issues/332) | [tarefa] Eixo do gráfico de Emissões ajustado ao trecho com dados | RF09 RNF01 | [#344](https://github.com/DEVassos/ecopulse-app/pull/344) | @travensolli |
| [#333](https://github.com/DEVassos/ecopulse-app/issues/333) | [tarefa] Equivalências do CO₂e com fatores citados | RF07 | [#350](https://github.com/DEVassos/ecopulse-app/pull/350) | @henriqueptbd-cell |
| [#341](https://github.com/DEVassos/ecopulse-app/issues/341) | [tarefa] Dados das regiões no frontend: service, tipos e backend falso | RF13 | [#343](https://github.com/DEVassos/ecopulse-app/pull/343) | @DeaTuribio |
| [#342](https://github.com/DEVassos/ecopulse-app/issues/342) | [tarefa] Lista de regiões no Dashboard com seleção compartilhada | RF12 RF13 RNF01 | [#345](https://github.com/DEVassos/ecopulse-app/pull/345) | @DeaTuribio |
| [#346](https://github.com/DEVassos/ecopulse-app/issues/346) | [tarefa] Índice (service_id, collected_at DESC, id DESC) para findAllWithLastReading | RF14 RNF03 | [#371](https://github.com/DEVassos/ecopulse-app/pull/371) | @viniciusaugusto1997 |
| [#347](https://github.com/DEVassos/ecopulse-app/issues/347) | [tarefa] FILTER em co2e_grams na série de findSeries | RF14 | [#369](https://github.com/DEVassos/ecopulse-app/pull/369) | @LUCASAMR23 |
| [#348](https://github.com/DEVassos/ecopulse-app/issues/348) | [tarefa] Borda do GET /api/collections: alinhar o fim do período com as agregações | RF14 | [#370](https://github.com/DEVassos/ecopulse-app/pull/370) | @LUCASAMR23 |
| [#349](https://github.com/DEVassos/ecopulse-app/issues/349) | [tarefa] Teste de repositório que fixa os totais por período e muda a janela | RF14 RNF03 | [#391](https://github.com/DEVassos/ecopulse-app/pull/391) | @viniciusaugusto1997 |
| [#351](https://github.com/DEVassos/ecopulse-app/issues/351) | [tarefa] Liga lista e mapa de regiões ao backend real e publica o README com print do compose | RF12 RF13 RNF01 | [#373](https://github.com/DEVassos/ecopulse-app/pull/373) | @DeaTuribio, @viniciusaugusto1997 |
| [#375](https://github.com/DEVassos/ecopulse-app/issues/375) | [tarefa] Janela única de 24 h para resumo, ranking e regiões | RF12 RF13 | [#428](https://github.com/DEVassos/ecopulse-app/pull/428) | @viniciusaugusto1997 |
| [#376](https://github.com/DEVassos/ecopulse-app/issues/376) | [tarefa] Manter o zoom manual do mapa ao girar o celular | RF13 RNF01 | [#432](https://github.com/DEVassos/ecopulse-app/pull/432) | @DeaTuribio |
| [#382](https://github.com/DEVassos/ecopulse-app/issues/382) | [tarefa] Contas e painel da simulação de migração | RF15 | [#383](https://github.com/DEVassos/ecopulse-app/pull/383) | @DeaTuribio |
| [#388](https://github.com/DEVassos/ecopulse-app/issues/388) | [tarefa] Aviso de mudança de estado sem cobrir o mapa no celular | RF02 RNF01 | [#411](https://github.com/DEVassos/ecopulse-app/pull/411) | @travensolli |
| [#394](https://github.com/DEVassos/ecopulse-app/issues/394) | [tarefa] Gráfico do histórico alterna entre CPU, memória, disco e rede | RF09 RF10 | [#405](https://github.com/DEVassos/ecopulse-app/pull/405) | @henriqueptbd-cell |
| [#395](https://github.com/DEVassos/ecopulse-app/issues/395) | [tarefa] Recomendação de região em cartão: veredito, antes e depois, e por quê | RF15 RNF01 | [#412](https://github.com/DEVassos/ecopulse-app/pull/412) | @travensolli |
| [#396](https://github.com/DEVassos/ecopulse-app/issues/396) | [tarefa] Aproximar um trecho do gráfico de Emissões com botões e teclado | RF10 RNF01 | [#413](https://github.com/DEVassos/ecopulse-app/pull/413) | @travensolli |
| [#397](https://github.com/DEVassos/ecopulse-app/issues/397) | [tarefa] Selecionar o trecho do gráfico de Emissões arrastando o mouse | RF10 RNF01 | [#414](https://github.com/DEVassos/ecopulse-app/pull/414) | @travensolli |
| [#398](https://github.com/DEVassos/ecopulse-app/issues/398) | [tarefa] Página Ajuda com abas: como usar e o que só o administrador altera | RNF01 RNF05 | [#416](https://github.com/DEVassos/ecopulse-app/pull/416) | @travensolli |
| [#399](https://github.com/DEVassos/ecopulse-app/issues/399) | [tarefa] Dispersão "Carga ou região?" na Comparação | RF07 RF15 | [#418](https://github.com/DEVassos/ecopulse-app/pull/418) | @travensolli |
| [#400](https://github.com/DEVassos/ecopulse-app/issues/400) | [tarefa] Rotas para a pessoa alterar o próprio nome e a própria senha | RNF05 | [#419](https://github.com/DEVassos/ecopulse-app/pull/419) | @travensolli |
| [#401](https://github.com/DEVassos/ecopulse-app/issues/401) | [tarefa] Tela de perfil para alterar o próprio nome e a própria senha | RNF01 RNF05 | [#420](https://github.com/DEVassos/ecopulse-app/pull/420) | @travensolli |
| [#402](https://github.com/DEVassos/ecopulse-app/issues/402) | [tarefa] Regras do relatório do período: tendência, causa e concentração | RF08 RF14 | [#421](https://github.com/DEVassos/ecopulse-app/pull/421) | @travensolli |
| [#403](https://github.com/DEVassos/ecopulse-app/issues/403) | [tarefa] Página Relatório com os achados do período | RF08 RF14 | [#422](https://github.com/DEVassos/ecopulse-app/pull/422) | @travensolli |
| [#404](https://github.com/DEVassos/ecopulse-app/issues/404) | [tarefa] Ajuda: guia de leitura e fórmulas com o exemplo oficial | RF07 RNF05 | [#417](https://github.com/DEVassos/ecopulse-app/pull/417) | @travensolli |
| [#406](https://github.com/DEVassos/ecopulse-app/issues/406) | [tarefa] Linhas de CO₂e dos serviços comparados no mesmo gráfico | RF07 RF15 RNF01 | [#407](https://github.com/DEVassos/ecopulse-app/pull/407) | @henriqueptbd-cell |
| [#408](https://github.com/DEVassos/ecopulse-app/issues/408) | [FE-07] Impressão / PDF no Dashboard e na Comparação | RNF05 | [#409](https://github.com/DEVassos/ecopulse-app/pull/409) | @henriqueptbd-cell |
| [#410](https://github.com/DEVassos/ecopulse-app/issues/410) | [tarefa] Emissões em barras por intervalo, com a miniatura do período no zoom | RF10 RNF01 | [#415](https://github.com/DEVassos/ecopulse-app/pull/415) | @travensolli |
| [#431](https://github.com/DEVassos/ecopulse-app/issues/431) | [tarefa] Ranking por CO₂e com ordenação sincronizada, CSV e destaque cruzado na Comparação | RF15 RNF01 | [#433](https://github.com/DEVassos/ecopulse-app/pull/433) | @DeaTuribio |
| [#434](https://github.com/DEVassos/ecopulse-app/issues/434) | [tarefa] Dashboard: regiões em três linhas, painel em duas colunas e atualização na página | RF13 RF15 RNF01 RNF02 | [#435](https://github.com/DEVassos/ecopulse-app/pull/435) | @travensolli |
| [#436](https://github.com/DEVassos/ecopulse-app/issues/436) | [tarefa] Vídeo em looping no fundo da tela de login | RNF01 | [#437](https://github.com/DEVassos/ecopulse-app/pull/437) | @henriqueptbd-cell |
| [#438](https://github.com/DEVassos/ecopulse-app/issues/438) | [tarefa] Página inicial de apresentação em /inicio | RNF01 | [#439](https://github.com/DEVassos/ecopulse-app/pull/439) | @DeaTuribio |

### 6.3 Processo

| Issue | Título | Requisito | Evidência | Responsável |
|---|---|---|---|---|
| [#312](https://github.com/DEVassos/ecopulse-app/issues/312) | [processo] Planejamento da Sprint 3 | — | [#314](https://github.com/DEVassos/ecopulse-app/pull/314) | @travensolli |
| [#316](https://github.com/DEVassos/ecopulse-app/issues/316) | [processo] Registra no plano o corte da #226 e o novo escopo da #53 | — | [#334](https://github.com/DEVassos/ecopulse-app/pull/334) | @henriqueptbd-cell |
| [#352](https://github.com/DEVassos/ecopulse-app/issues/352) | [processo] Sprint 3 — refinamento da US11b registrado no plano (ES03) | RF07 RF15 | [#353](https://github.com/DEVassos/ecopulse-app/pull/353) | @henriqueptbd-cell |
| [#356](https://github.com/DEVassos/ecopulse-app/issues/356) | [processo] Atualizar o agilekit para a 2.3.11 | — | [#357](https://github.com/DEVassos/ecopulse-app/pull/357) | @travensolli |
| [#359](https://github.com/DEVassos/ecopulse-app/issues/359) | [processo] Sprint 3 — aceite do BD04 executado no compose e registrado no plano (ES07, BD04) | — | [#360](https://github.com/DEVassos/ecopulse-app/pull/360) | @henriqueptbd-cell |
| [#362](https://github.com/DEVassos/ecopulse-app/issues/362) | [processo] Atualizar o agilekit para a 2.3.12 | — | [#363](https://github.com/DEVassos/ecopulse-app/pull/363) em `develop` e [#364](https://github.com/DEVassos/ecopulse-app/pull/364) em `main` | @travensolli |
| [#365](https://github.com/DEVassos/ecopulse-app/issues/365) | [processo] Atas das dailies — Sprint 3, semana 1 | — | [#366](https://github.com/DEVassos/ecopulse-app/pull/366) | @travensolli |
| [#378](https://github.com/DEVassos/ecopulse-app/issues/378) | [processo] Sprint 3 — situação dos critérios ES01–ES09 e DW01 no plano (ES04) | — | [#379](https://github.com/DEVassos/ecopulse-app/pull/379) | @henriqueptbd-cell |
| [#380](https://github.com/DEVassos/ecopulse-app/issues/380) | [processo] Preenche a situação dos 13 critérios da Sprint 2 no plano (ES04) | — | commit `3969187`, no PR [#379](https://github.com/DEVassos/ecopulse-app/pull/379) ([comentário de 20/11](https://github.com/DEVassos/ecopulse-app/issues/380#issuecomment-7056096509)) | @henriqueptbd-cell |
| [#423](https://github.com/DEVassos/ecopulse-app/issues/423) | [processo] Plano: registra o escopo de 21/11 e o aceite da US10 (#51) no histórico | — | [#424](https://github.com/DEVassos/ecopulse-app/pull/424) | @henriqueptbd-cell |
| [#426](https://github.com/DEVassos/ecopulse-app/issues/426) | [processo] Atas das dailies — Sprint 3, semana 2 | — | [#427](https://github.com/DEVassos/ecopulse-app/pull/427) | @travensolli |
| [#429](https://github.com/DEVassos/ecopulse-app/issues/429) | [processo] Sprint 3 — Verificações realizadas e reteste de regressão (ES07) | — | [#430](https://github.com/DEVassos/ecopulse-app/pull/430) | @henriqueptbd-cell |

### 6.4 Pendentes e itens que saíram da sprint

| Issue | Situação | Destino |
|---|---|---|
| [#55](https://github.com/DEVassos/ecopulse-app/issues/55) US14 — polimento, validação de carga e documentação de portfólio | aceite do PO em 21/11; continua aberta porque o README, a documentação alinhada e o teste do avaliador de 23/11 entram pela release | fecha no fechamento, pelo PR de sincronização da `develop` |
| [#275](https://github.com/DEVassos/ecopulse-app/issues/275) Prova de qualidade visual automatizada no CI | não foi iniciada e não será feita; fechada como "não planejada" em 23/11 | [histórico do plano](../plano-de-entregas.md#histórico-de-alterações-do-plano), 23/11 |
| [#311](https://github.com/DEVassos/ecopulse-app/issues/311), [#167](https://github.com/DEVassos/ecopulse-app/issues/167) e [#169](https://github.com/DEVassos/ecopulse-app/issues/169) (processo) | retrospectiva da Sprint 2 consolidada, com a revisão das duas ações da Sprint 1 | fecharam no merge do PR [#441](https://github.com/DEVassos/ecopulse-app/pull/441), em 23/11 às 18h23 |
| [#310](https://github.com/DEVassos/ecopulse-app/issues/310) Daily — Sprint 3 | aberta até o fechamento, como issue fixada das dailies | fecha no fechamento |
| [#335](https://github.com/DEVassos/ecopulse-app/issues/335) e [#336](https://github.com/DEVassos/ecopulse-app/issues/336) (processo) | registro da review e participação da sprint | fecham no fechamento, pelo PR de sincronização |
| [#440](https://github.com/DEVassos/ecopulse-app/issues/440) Retrospectiva da Sprint 3 — respostas individuais | 3 de 5 respostas até o prazo de 24/11, às 18h (@travensolli, @viniciusaugusto1997 e @henriqueptbd-cell), mais a do @LUCASAMR23 fora do prazo, em 26/11, às 20h09; consolidadas em [retrospectiva.md](sprint-3/retrospectiva.md) | fecha no fechamento, pelo PR de sincronização |
| [#442](https://github.com/DEVassos/ecopulse-app/issues/442) Entrega da Sprint 3 | release, tag e sincronização da `develop` | fecha no fechamento |

## 7. Review (25/11/2026)

Ata completa: [review.md](sprint-3/review.md).

### 7.1 Demonstrado

- **Formato:** presencial, em 25/11 às 21h, com Otávio Abreu dos Santos Silva (UniLaunch, cliente) e o Prof. Rodrigo Silva Peres (Fatec Jacareí, ponto focal). A review estava marcada para 23/11 às 19h30 e foi remarcada a pedido do cliente. O time apresentou o [vídeo da Sprint 3](https://youtu.be/l-femMC6UP4) e, em seguida, a aplicação: o PO mostrou as funcionalidades enquanto o SM navegava.
- **Roteiro:** 13 itens por requisito, da página inicial ao processo ([review.md § 2](sprint-3/review.md#2-roteiro-da-demonstração-por-requisito)).
- **Versão:** a entrega já estava em `main` desde 23/11 às 18h20 (PR [#443](https://github.com/DEVassos/ecopulse-app/pull/443)), com o teste do avaliador em clone limpo (§ 5.3).

### 7.2 Feedback do cliente

- Gostou da visualização do gráfico de colunas na página Emissões e da impressão em PDF.
- Ficou impressionado com o carregamento rápido da tela.
- Disse que o time trouxe "a experiência de escritório para o trabalho": a exportação para Excel e PDF foi além dos requisitos e é um pedido comum no mundo corporativo.
- Nenhum comentário pede mudança. As perguntas de produto do roteiro ficaram sem resposta específica ([review.md § 3](sprint-3/review.md#3-feedback-do-cliente)).

### 7.3 Decisões e alterações no backlog

- **Nenhuma issue `feedback-cliente`:** a reunião não trouxe apontamento acionável, e a Sprint 3 é a última do projeto.
- **Critérios:** nenhum muda de sprint e o denominador continua 46. A situação de cada um está no [plano de entregas](../plano-de-entregas.md#sprint-3), com a entrada de 26/11 no "Histórico de alterações do plano".

## 8. Participação

Relatório ES09 gerado por `evidencias.sh 3` em 23/11: [contribuicao.md](sprint-3/contribuicao.md).

- **Sem lacunas:** os cinco têm PR mergeado na sprint, ligado a issue e revisado por outra conta. De 11 a 23/11 foram 64 PRs mergeados em `develop`: @travensolli 27, @henriqueptbd-cell 17, @DeaTuribio 13, @LUCASAMR23 4 e @viniciusaugusto1997 3. Os cinco também revisaram PRs dos colegas.
- **Commits sem login:** dois commits de @viniciusaugusto1997 no PR #430 (`fe99279` e `5ba30a8`) saíram com um e-mail que não está ligado à conta. As outras entregas dele (#354, #371 e #428) e as revisões estão no relatório.
- **Concentração:** @travensolli é autor de 27 dos 64 PRs (na Sprint 2, 41 de 71), 22 deles de 17 a 23/11. O tema está na [retrospectiva](sprint-3/retrospectiva.md#3-o-que-parar).
- **Review:** sem demonstração individual por integrante, porque o formato foi vídeo e demonstração conduzida pelo PO e pelo SM. O vídeo foi produzido por @henriqueptbd-cell e @DeaTuribio.

## 9. Métricas

| Métrica | Valor |
|---|---|
| Issues da milestone | 79, das quais 73 fechadas (abertas: #55, #310, #335, #336, #440 e #442, que fecham no fechamento) |
| Story Points: escopo inicial / final / concluídos | 75 / 161 / 156 ([burndown](sprint-3/burndown.md)); o escopo estava em 97 no checkpoint de 17/11 |
| PRs mergeados em `develop` | 64, de 11 a 23/11 (62 até o congelamento, mais o #430 e o #441 em 23/11), e a entrega em `main` pelo #443 |
| Merges por dia em `develop` | 11/11: 2 · 12/11: 1 · 13/11: 5 · 15/11: 1 · 16/11: 5 · 17/11: 9 · 18/11: 2 · 19/11: 4 · 20/11: 4 · 21/11: 26 · 22/11: 3 · 23/11: 2 (horário de Brasília) |
| Merges por integrante (10–16/11 · 17–23/11) | Andrea 4 · 9 · Gabriel 5 · 22 · Henrique 4 · 13 · Lucas 1 · 3 · Vinicius 0 · 3 |
| PRs com primeira revisão em mais de 24h | 8: #354 (73h), #337 e #379 (47h), #334 (46h), #353 (40h), #339 e #355 (30h), #357 (26h). Sprint 2: 6 |
| PRs mergeados sem revisão | 0. Sprint 2: 2 |
| Atas de daily / dias úteis | 10 / 10, de 10 a 23/11; a de 20/11, feriado, teve um só respondente no dia |
| Regressões (`regressao`) | 0 |
| Nota estimada (`/auditar 3`, 23/11) | 32,5 de 46 antes do registro pós-review; 44,5 de 46 com o fechamento executado |
