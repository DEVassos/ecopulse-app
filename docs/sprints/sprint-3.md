# Sprint 3 — BD04, mapa, polimento e portfólio

| Campo | Valor |
|---|---|
| Período | 10/11 a 23/11/2026 · checkpoint 17/11 · congelamento 22/11 20h · review 23/11 19h30 (a confirmar) |
| Milestone | [Sprint 3](https://github.com/DEVassos/ecopulse-app/milestone/3) |
| Plano | [docs/plano-de-entregas.md § Sprint 3](../plano-de-entregas.md#sprint-3): critérios previstos, denominador e situação de cada critério |
| Atas | [planning](sprint-3/planning.md) |

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
| #226 | US11b: comparação orientada à decisão | RF07, RF15 | DW04, DW05, BD04 | @henriqueptbd-cell | should no recorte #327–#329 |
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
| #226 com 22 pontos e em refinamento | médio | recorte de 10/11 em #327–#329 | @henriqueptbd-cell |
| Capacidade com todas as issues mantidas (65 pontos na planning) | alto | risco revisto em 20/11: #195–#197 fora do escopo (milestone removida, cards no `Backlog`) e retomadas em 21/11 com a milestone de volta; manter foco nas entregas restantes até o congelamento | @travensolli |
| #197 depende de #196 | médio | dependência volta a valer com a retomada de 21/11: #197 começa depois do PR #392, sem bloquear o resto da sprint | @LUCASAMR23 |
| Regressão nos critérios das Sprints 1 e 2 | alto | `teste-avaliador.sh` antes do congelamento e reteste em "Verificações realizadas" | @travensolli |
| Feriado de 20/11 | baixo | daily assíncrona por texto, com ata | @travensolli |

## 4. Itens retirados e retomados

Em 20/11, as issues [#195](https://github.com/DEVassos/ecopulse-app/issues/195) (US15, cadastro por convite), [#196](https://github.com/DEVassos/ecopulse-app/issues/196) (convites no backend) e [#197](https://github.com/DEVassos/ecopulse-app/issues/197) (telas de convite) saíram do escopo da Sprint 3: a milestone `Sprint 3` foi removida, os três cartões voltaram ao `Backlog` e as issues seguem **abertas**, com comentário apontando a decisão. Não existe Sprint 4 — a Sprint 3 é a entrega final do projeto —, então elas não são transferidas para sprint nenhuma.

Motivo: o checkpoint de 17/11 passou sem branch, commit, PR ou comentário indicando trabalho iniciado, e as entregas não cabem até o congelamento de 22/11 às 20h. **Nenhum critério previsto muda** e o denominador permanece **46** (ES01–ES09, DW01 e BD04): DW06 e BD01 já estão atendidos nas Sprints 1 e 2, e DW04 também. A decisão e a justificativa estão no [Histórico de alterações do plano](../plano-de-entregas.md#histórico-de-alterações-do-plano), entrada de 20/11.

Em 21/11 as três voltaram para a Sprint 3, por decisão do SM com o PO: a tarefa de backend ficou pronta com testes e verificação em compose (PR [#392](https://github.com/DEVassos/ecopulse-app/pull/392)). Nenhum critério muda e o denominador segue 46. Registro na entrada de 21/11 do [Histórico de alterações do plano](../plano-de-entregas.md#histórico-de-alterações-do-plano).

## 5. Verificações realizadas (aplicação da DoD)

Verificações executadas em 21/11 sobre `develop` em [`5ff4a64`](https://github.com/DEVassos/ecopulse-app/commit/5ff4a64), com a stack `ecopulse` no ar (`docker compose ps`: `postgres`, `backend` e `frontend` em `Up (healthy)`). Cada linha traz o comando ou caminho usado, quem executou e o resultado observado; a linha correspondente do [plano de entregas](../plano-de-entregas.md) aponta para cá.

### 5.1 Itens da sprint

| Item | Como foi verificado | Quem | Resultado |
|---|---|---|---|
| [US10 #51](https://github.com/DEVassos/ecopulse-app/issues/51) | `GET /api/regions/summary` e `GET /api/regions` na stack real; testes de `RegionMap`, `RegionList`, `RegionDetail` e `regions.ts` | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | aceite em 21/11 13h26 ([comentário](https://github.com/DEVassos/ecopulse-app/issues/51#issuecomment-7063271008)): 200 com 5 regiões e coordenadas; história fechada |
| [US13 #54](https://github.com/DEVassos/ecopulse-app/issues/54), critério 1 — CSV | Botão "Exportar CSV" da tela `/emissoes` com o serviço Reporting Batch (#8) e o período 21/11–21/11, arquivo aberto e somado; segundo caminho, a própria `collectionsCsv` do app sobre o mesmo filtro; as duas somas comparadas com `psql` sobre `collections` | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | `ecopulse-coletas-reporting-batch-2026-11-21-a-2026-11-21.csv`: 1.069 linhas de dados e 12 colunas com BOM, `co2e_grams` 26,438638141 g e `energy_kwh` 0,660965954 kWh; segundo caminho 1.067 linhas / 26,3818401 g / 0,659546002 kWh no corte anterior. As duas somas batem exatamente com o SQL do mesmo filtro |
| [US13 #54](https://github.com/DEVassos/ecopulse-app/issues/54), critério 2 — PDF | `Page.printToPDF` (A4, margens padrão) sobre `/emissoes` e `/relatorio`, com as páginas inspecionadas | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | `/emissoes`: 3 páginas com cabeçalho "EcoPulse · RELATÓRIO DE EMISSÕES · DEVASSOS", KPIs, gráfico, tabela de intervalos de 15 min e rodapé "Página X de 3"; `/relatorio`: período, cartões 1,40 kg CO₂e / 5,71 kWh / 244,5 g/kWh e o aviso "Sem base para comparar: 0 coletas no período anterior". Prints em [sprint-3-emissoes-pdf-1.png](../img/sprint-3-emissoes-pdf-1.png) e [sprint-3-relatorio-periodo-1.png](../img/sprint-3-relatorio-periodo-1.png) |
| [US14 #55](https://github.com/DEVassos/ecopulse-app/issues/55), teste do avaliador | `bash .agilekit/scripts/teste-avaliador.sh` (clone limpo de `develop`, `.env` a partir de `.env.example`, `docker compose up --build`) | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | 5/5: compose no ar, `GET /health` 200, 6 tabelas, `collections` de 16 para 24 linhas depois de `docker compose restart` e `database/schema.sql` aplicado em PostgreSQL 16 vazio |
| [US14 #55](https://github.com/DEVassos/ecopulse-app/issues/55), README | Clone limpo seguindo o §8 do README: subir a stack, abrir `http://localhost:5173`, `curl localhost:3000/health` e entrar com `ADMIN_EMAIL`/`ADMIN_PASSWORD` | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | frontend 200, `/health` devolve `{"status":"ok","db":"ok"}`, login 200 com token; nenhum passo precisou de ajuste |
| [US14 #55](https://github.com/DEVassos/ecopulse-app/issues/55), painel regional (critério 2) | Dashboard na stack real, região `us-east` selecionada no mapa/lista | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | Painel "Ashburn us-east": 699 g de CO₂e e 1,85 kWh nas últimas 24 h, os 8 serviços na tabela e o veredito "Mover para Toronto reduziria o CO₂e desta região em cerca de 89,42%" ("625 g a menos", `1,851 kWh × 40 g/kWh = 74,02 g`); quatro destinos com a economia: Toronto 40 g (▼ 89,42%), São Paulo 85 g (▼ 77,51%), Dublin 295 g (▼ 21,96%) e Tóquio 465 g (▲ 23,02%) |
| [ES08](../plano-de-entregas.md#sprint-3) — links | Varredura de todos os links relativos dos `.md` versionados | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | 493 links em 97 arquivos; 26 problemas, todos em `docs/templates/` (caminhos de exemplo dos modelos); nenhum link quebrado na documentação real |
| [ES08](../plano-de-entregas.md#sprint-3) — `docs/api.md` | As 19 rotas documentadas chamadas na stack real (26 casos, com e sem JWT) | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | Todas coerentes com o texto: 200 com o corpo documentado, `401` sem token, `400` em `metric` ausente ou inválida em `/api/services/ranking` e `404` em caminho inexistente. As três divergências iniciais eram expectativa errada minha: `metric` é obrigatório, `/api/auth/me` devolve objeto plano (`id`, `email`, `name`, `role`) e `/api/services` não promete chave `summary` |
| [ES08](../plano-de-entregas.md#sprint-3) — `calculos.md` | Constantes de `backend/src/domain/carbon-calculator.ts` confrontadas com as fórmulas e as escalas de `docs/calculos.md`; exemplo oficial recalculado | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | 100 W de CPU, 0,375 W/GB de RAM, 0,01 W/GB de disco e 0,02 W/GB de rede idênticos aos da doc; `50,87 W → 0,000847833333 kWh → 0,072065833333 gCO₂e` e o exemplo OpenAPI (64,06035 W) conferem |
| [ES07](../plano-de-entregas.md#sprint-3) — DoD-PR | `gh pr list --state merged` de 10/11 a 18/11 e leitura dos corpos | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | 28 PRs mergeados, todos com ≥1 aprovação e checklist da DoD-PR; 26 com a frase "DoD verificada" (#315 e #358 sem a frase; conferido em 18/11) |

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
