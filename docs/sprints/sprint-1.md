# Sprint 1 — pipeline de coleta em Docker e primeira tela do dashboard

| Campo | Valor |
|---|---|
| Período | 29/09 a 19/10/2026 · checkpoint 09/10 · congelamento 18/10 20h · review 19/10 19h30 (realizada por videochamada) · fechamento 20/10 |
| Situação | **Sprint encerrada em 20/10/2026** |
| Versão entregue | tag [`sprint-1`](https://github.com/DEVassos/greener-app/releases/tag/sprint-1) em `main`, criada depois do merge da `release/sprint-1`: entrega em 19/10 (PR [#154](https://github.com/DEVassos/greener-app/pull/154), [`1f5cf18`](https://github.com/DEVassos/greener-app/commit/1f5cf18)) e registro pós-review em 20/10 ([#153](https://github.com/DEVassos/greener-app/issues/153)) |
| Milestone | [Sprint 1](https://github.com/DEVassos/greener-app/milestone/1) |
| Critérios previstos | ES01–ES09, DW01 + DW02, DW03, DW04, DW07, BD01, BD02, BD03, TP02 — denominador **79** |
| Plano | [docs/plano-de-entregas.md § Sprint 1](../plano-de-entregas.md#sprint-1) |
| Atas | [planejamento](sprint-1/planning.md) · [dailies](sprint-1/dailies/) · [review](sprint-1/review.md) · [participação](sprint-1/contribuicao.md) |
| Burndown | [sprint-1/burndown.md](sprint-1/burndown.md) — Story Points por dia, gerado por `.github/scripts/burndown.sh 1` |
| Daily | issue fixada [#74 Daily — Sprint 1](https://github.com/DEVassos/greener-app/issues/74); atas em PR semanal pelas issues [#72](https://github.com/DEVassos/greener-app/issues/72) e [#73](https://github.com/DEVassos/greener-app/issues/73) |

## 1. Objetivo da sprint

Pipeline de coleta persistido em Docker e primeira tela apresentável do dashboard: o backend descobre os serviços no agregador, coleta métricas e grava o histórico no PostgreSQL; o frontend lista os serviços descobertos com estado de monitoramento e localização, atualizando sem recarregar a página. A aplicação inteira sobe com `docker compose up --build`.

O [planning.md](sprint-1/planning.md) guarda a proposta inicial do PO (100 pontos, 25 tarefas, 82 story points). Em 05/10 a sprint foi replanejada para **79 pontos e 19 tarefas**, com motor de cálculo, KPIs e JWT na Sprint 2 e exportação na Sprint 3 ([histórico do plano](../plano-de-entregas.md#histórico-de-alterações-do-plano)). Este registro segue o plano vigente.

Na primeira semana (29/09 a 03/10) não existia repositório: foram discussões e acertos iniciais da equipe sobre o desafio, o escopo e a divisão do trabalho, registrados nas atas retroativas de 29/09 a 02/10 ([#72](https://github.com/DEVassos/greener-app/issues/72)). O Projeto-GreenER nasceu em 04/10 e este repositório em 05/10, com o histórico anterior importado e a autoria preservada ([#56](https://github.com/DEVassos/greener-app/issues/56), PR [#57](https://github.com/DEVassos/greener-app/pull/57)).

## 2. Critérios previstos e responsáveis

| Critério | Pontos | Responsáveis no plano | Issues que entregam |
|---|---|---|---|
| ES01–ES09 | 40 | Henrique (PO), Gabriel (SM), todos em ES09 | [#3](https://github.com/DEVassos/greener-app/issues/3), [#4](https://github.com/DEVassos/greener-app/issues/4), [#47](https://github.com/DEVassos/greener-app/issues/47), [#64](https://github.com/DEVassos/greener-app/issues/64), [#65](https://github.com/DEVassos/greener-app/issues/65), [#72](https://github.com/DEVassos/greener-app/issues/72), [#73](https://github.com/DEVassos/greener-app/issues/73), [#78](https://github.com/DEVassos/greener-app/issues/78) |
| DW01 | 3 | Gabriel, Lucas | [#8](https://github.com/DEVassos/greener-app/issues/8), [#9](https://github.com/DEVassos/greener-app/issues/9) |
| DW02 | 5 | Lucas, Vinicius | [#15](https://github.com/DEVassos/greener-app/issues/15), [#16](https://github.com/DEVassos/greener-app/issues/16), [#17](https://github.com/DEVassos/greener-app/issues/17), [#19](https://github.com/DEVassos/greener-app/issues/19), [#97](https://github.com/DEVassos/greener-app/issues/97) |
| DW03 | 6 | Lucas | [#8](https://github.com/DEVassos/greener-app/issues/8), [#15](https://github.com/DEVassos/greener-app/issues/15), [#19](https://github.com/DEVassos/greener-app/issues/19), [#111](https://github.com/DEVassos/greener-app/issues/111), [#112](https://github.com/DEVassos/greener-app/issues/112), [#118](https://github.com/DEVassos/greener-app/issues/118) |
| DW04 | 4 | Andrea | [#9](https://github.com/DEVassos/greener-app/issues/9), [#22](https://github.com/DEVassos/greener-app/issues/22), [#23](https://github.com/DEVassos/greener-app/issues/23), [#120](https://github.com/DEVassos/greener-app/issues/120), [#131](https://github.com/DEVassos/greener-app/issues/131) |
| DW07 | 3 | Gabriel, Henrique | [#7](https://github.com/DEVassos/greener-app/issues/7), [#26](https://github.com/DEVassos/greener-app/issues/26), [#27](https://github.com/DEVassos/greener-app/issues/27), [#80](https://github.com/DEVassos/greener-app/issues/80) |
| BD01 | 4 | Vinicius | [#5](https://github.com/DEVassos/greener-app/issues/5), [#28](https://github.com/DEVassos/greener-app/issues/28) |
| BD02 | 6 | Vinicius, Lucas | [#14](https://github.com/DEVassos/greener-app/issues/14), [#112](https://github.com/DEVassos/greener-app/issues/112) |
| BD03 | 2 | Vinicius | [#27](https://github.com/DEVassos/greener-app/issues/27) |
| TP02 | 6 | Lucas, Andrea | [#8](https://github.com/DEVassos/greener-app/issues/8), [#9](https://github.com/DEVassos/greener-app/issues/9) |

Responsáveis conforme o [plano de entregas](../plano-de-entregas.md#sprint-1), com os ajustes de 09/10 (DW01 e DW07) e 15/10 (DW02) registrados no histórico do plano.

Gatilhos de replanejamento (plano § Sprint 1): `GET /services` e `GET /collections` em `develop` até 11/10, senão DW02 vai para a Sprint 2 (denominador 74); tela de serviços em `develop` até 14/10, senão DW04 vai para a Sprint 2 (denominador 75).

## 3. Itens da milestone e situação no fechamento (20/10/2026)

### 3.1 Histórias

| Issue | Título | Requisitos | Responsável | Situação no fechamento |
|---|---|---|---|---|
| [#42](https://github.com/DEVassos/greener-app/issues/42) | US01 — Descoberta e ingestão dinâmica de serviços | RF01–RF06, RNF04 | @LUCASAMR23 | sub-issues entregues: cliente de métricas ([#95](https://github.com/DEVassos/greener-app/pull/95)), JSON bruto ([#98](https://github.com/DEVassos/greener-app/pull/98)), worker ([#99](https://github.com/DEVassos/greener-app/pull/99)), tratamento de erros ([#124](https://github.com/DEVassos/greener-app/pull/124)) e rota de serviços ([#115](https://github.com/DEVassos/greener-app/pull/115)); [verificação de 18/10](https://github.com/DEVassos/greener-app/issues/42#issuecomment-6257081953); [aceita pelo PO](https://github.com/DEVassos/greener-app/issues/42#issuecomment-6279647830) e fechada em 19/10 |
| [#44](https://github.com/DEVassos/greener-app/issues/44) | US03 — Modelagem e persistência em PostgreSQL (SQL puro) | RF10 | @viniciusaugusto1997 | sub-issues entregues: schema ([#77](https://github.com/DEVassos/greener-app/pull/77)), UML ([#57](https://github.com/DEVassos/greener-app/pull/57)), repositories ([#94](https://github.com/DEVassos/greener-app/pull/94)) e histórico de coletas ([#116](https://github.com/DEVassos/greener-app/pull/116)); [verificação de 18/10](https://github.com/DEVassos/greener-app/issues/44#issuecomment-6257082212); [aceita pelo PO](https://github.com/DEVassos/greener-app/issues/44#issuecomment-6279647777) e fechada em 19/10 |
| [#46](https://github.com/DEVassos/greener-app/issues/46) | US05 — Infraestrutura e dockerização total | RNF05 | @travensolli | sub-issues entregues: Dockerfiles ([#91](https://github.com/DEVassos/greener-app/pull/91)), compose com Postgres e backend ([#113](https://github.com/DEVassos/greener-app/pull/113)) e frontend com nginx ([#81](https://github.com/DEVassos/greener-app/pull/81)); [verificação de 18/10](https://github.com/DEVassos/greener-app/issues/46#issuecomment-6257082458); [aceita pelo PO](https://github.com/DEVassos/greener-app/issues/46#issuecomment-6279647785) e fechada em 19/10 |
| [#47](https://github.com/DEVassos/greener-app/issues/47) | US06 — Gestão e documentação da sprint | RNF05 | @henriqueptbd-cell | fechada pelo PR [#123](https://github.com/DEVassos/greener-app/pull/123) em 16/10; o [`contribuicao.md`](sprint-1/contribuicao.md) foi gerado no fechamento, em 20/10 |

A história [#45](https://github.com/DEVassos/greener-app/issues/45) (US04 — dashboard executivo e operacional) saiu da Sprint 1 no replanejamento: está na milestone `Sprint 2` (§3.4).

### 3.2 Tarefas técnicas

| Issue | Título | Requisito | Critério | Responsável | Situação no fechamento | PR |
|---|---|---|---|---|---|---|
| [#5](https://github.com/DEVassos/greener-app/issues/5) | Script DDL `schema.sql` para PostgreSQL | RF10 | BD01 | @LUCASAMR23 | mergeado em `develop` | [#77](https://github.com/DEVassos/greener-app/pull/77) |
| [#9](https://github.com/DEVassos/greener-app/issues/9) | Setup do projeto React com TypeScript, Vite e Tailwind | RNF01 | DW01, DW04 | @travensolli | mergeado em `develop` | [#62](https://github.com/DEVassos/greener-app/pull/62) |
| [#11](https://github.com/DEVassos/greener-app/issues/11) | Guia de estilos e design system dark mode | RNF01 | ES07 | @travensolli, @DeaTuribio | mergeado em `develop` | [#61](https://github.com/DEVassos/greener-app/pull/61) |
| [#22](https://github.com/DEVassos/greener-app/issues/22) | Tabela operacional de serviços com status e localização | RF09, RF12 | DW04 | @DeaTuribio | mergeado em `develop` | [#69](https://github.com/DEVassos/greener-app/pull/69) |
| [#28](https://github.com/DEVassos/greener-app/issues/28) | Modelagem UML (diagrama de classes / ERD) com Mermaid | — | BD01, DW01 | @LUCASAMR23, @viniciusaugusto1997 | mergeado em `develop` | [#57](https://github.com/DEVassos/greener-app/pull/57) |
| [#67](https://github.com/DEVassos/greener-app/issues/67) | ADR 0004: Vite e Tailwind CSS no frontend | RNF05 | ES08 | @travensolli | mergeado em `develop` | [#76](https://github.com/DEVassos/greener-app/pull/76) |
| [#8](https://github.com/DEVassos/greener-app/issues/8) | Setup da API REST Node.js com TypeScript e estrutura modular | — | DW01, DW03 | @LUCASAMR23 | mergeado em `develop` | [#86](https://github.com/DEVassos/greener-app/pull/86) |
| [#12](https://github.com/DEVassos/greener-app/issues/12) | Componente de indicador visual de última atualização | RNF02 | ES03 | @travensolli | mergeado em `develop` | [#89](https://github.com/DEVassos/greener-app/pull/89) |
| [#23](https://github.com/DEVassos/greener-app/issues/23) | Hook de polling e atualização sem recarregar | RF11, RNF02 | DW04 | @DeaTuribio | mergeado em `develop` | [#100](https://github.com/DEVassos/greener-app/pull/100) |
| [#7](https://github.com/DEVassos/greener-app/issues/7) | Variáveis de ambiente e `.env.example` | — | DW07 | @henriqueptbd-cell | mergeado em `develop` | [#82](https://github.com/DEVassos/greener-app/pull/82) |
| [#10](https://github.com/DEVassos/greener-app/issues/10) | Protótipo de alta fidelidade no Figma | RNF01 | ES03 | @travensolli | mergeado em `develop` | [#101](https://github.com/DEVassos/greener-app/pull/101) |
| [#14](https://github.com/DEVassos/greener-app/issues/14) | Repositories em SQL puro parametrizado | RF10 | BD02 | @LUCASAMR23 | mergeado em `develop` | [#94](https://github.com/DEVassos/greener-app/pull/94) |
| [#15](https://github.com/DEVassos/greener-app/issues/15) | Cliente HTTP da API agregadora de métricas | RF01, RF03 | DW02, DW03 | @DeaTuribio, @LUCASAMR23 | mergeado em `develop` | [#95](https://github.com/DEVassos/greener-app/pull/95) |
| [#16](https://github.com/DEVassos/greener-app/issues/16) | Tratamento de erros e mapeamento de status HTTP | RF05, RF06, RNF04 | DW02 | @LUCASAMR23 | mergeado em `develop` | [#124](https://github.com/DEVassos/greener-app/pull/124) |
| [#17](https://github.com/DEVassos/greener-app/issues/17) | Cliente HTTP da API de intensidade de carbono | RF07 | DW02 | @viniciusaugusto1997 | mergeado em `develop` | [#92](https://github.com/DEVassos/greener-app/pull/92) |
| [#19](https://github.com/DEVassos/greener-app/issues/19) | Worker de polling e reconciliação em background | RF02, RF04 | DW03 | @viniciusaugusto1997 | mergeado em `develop` | [#99](https://github.com/DEVassos/greener-app/pull/99) |
| [#26](https://github.com/DEVassos/greener-app/issues/26) | Dockerfiles do backend e do frontend | — | DW07 | @travensolli | mergeado em `develop` | [#91](https://github.com/DEVassos/greener-app/pull/91) |
| [#27](https://github.com/DEVassos/greener-app/issues/27) | `compose.yaml` com volume persistente do PostgreSQL | RNF05 | DW07, BD03 | @henriqueptbd-cell | mergeado em `develop` | [#113](https://github.com/DEVassos/greener-app/pull/113) |
| [#64](https://github.com/DEVassos/greener-app/issues/64) | Conferir o Project Kanban e documentar seus campos | RNF05 | ES04, ES09 | @travensolli | mergeado em `develop` | [#83](https://github.com/DEVassos/greener-app/pull/83) |
| [#65](https://github.com/DEVassos/greener-app/issues/65) | Atribuir responsáveis às histórias da Sprint 1 | RNF05 | ES09 | @henriqueptbd-cell | mergeado em `develop` | [#85](https://github.com/DEVassos/greener-app/pull/85) |
| [#66](https://github.com/DEVassos/greener-app/issues/66) | Corrigir cor primária, tokens e nome EcoPulse no guia visual | RNF01 | — | @travensolli | mergeado em `develop` | [#84](https://github.com/DEVassos/greener-app/pull/84) |

#### Tarefas abertas durante a sprint (criadas depois do planejamento)

| Issue | Título | Requisito | Critério | Responsável | Situação no fechamento | PR |
|---|---|---|---|---|---|---|
| [#80](https://github.com/DEVassos/greener-app/issues/80) | Containerizar o frontend com nginx no compose | RNF05 | DW07 | @travensolli | mergeado em `develop` | [#81](https://github.com/DEVassos/greener-app/pull/81) |
| [#87](https://github.com/DEVassos/greener-app/issues/87) | Aplicar a paleta em tons de verde-escuro | RNF01 | — | @DeaTuribio | mergeado em `develop` | [#88](https://github.com/DEVassos/greener-app/pull/88) |
| [#97](https://github.com/DEVassos/greener-app/issues/97) | Expor JSON bruto e cancelamento no cliente de métricas | RF03 | DW02 | @viniciusaugusto1997 | mergeado em `develop` | [#98](https://github.com/DEVassos/greener-app/pull/98) |
| [#104](https://github.com/DEVassos/greener-app/issues/104) | Restaurar as variáveis do `.env.example` | RNF02 | DW07 | @DeaTuribio | mergeado em `develop` | [#105](https://github.com/DEVassos/greener-app/pull/105) |
| [#106](https://github.com/DEVassos/greener-app/issues/106) | Ajustar o polling após a revisão do #100 | RF11 | DW04 | @DeaTuribio | mergeado em `develop` | [#114](https://github.com/DEVassos/greener-app/pull/114) |
| [#109](https://github.com/DEVassos/greener-app/issues/109) | Atualizar `checkout` e `setup-node` para v7 | RNF05 | DW01 | @travensolli | mergeado em `develop` | [#110](https://github.com/DEVassos/greener-app/pull/110) |
| [#111](https://github.com/DEVassos/greener-app/issues/111) | Expor os serviços monitorados na API | RF01, RF09 | DW03, DW04 | @LUCASAMR23 | mergeado em `develop` | [#115](https://github.com/DEVassos/greener-app/pull/115) |
| [#112](https://github.com/DEVassos/greener-app/issues/112) | Expor o histórico de coletas na API | RF03, RF10 | DW03, BD02 | @LUCASAMR23 | mergeado em `develop` | [#116](https://github.com/DEVassos/greener-app/pull/116) |
| [#118](https://github.com/DEVassos/greener-app/issues/118) | Liberar CORS para o dashboard chamar a API | RF09 | DW03 | @DeaTuribio | mergeado em `develop` | [#119](https://github.com/DEVassos/greener-app/pull/119) |
| [#120](https://github.com/DEVassos/greener-app/issues/120) | Corrigir rolagem no celular e localização nula | RF09, RF12 | DW04 | @DeaTuribio | mergeado em `develop` | [#121](https://github.com/DEVassos/greener-app/pull/121) |
| [#103](https://github.com/DEVassos/greener-app/issues/103) | Documentar o cliente da API de carbono | RF07 | DW02, ES08 | @henriqueptbd-cell, @viniciusaugusto1997 | mergeado em `develop` | [#125](https://github.com/DEVassos/greener-app/pull/125) |
| [#131](https://github.com/DEVassos/greener-app/issues/131) | Janela de detalhes do serviço com histórico de coletas | RF09, RF10 | DW04 | @travensolli | mergeado em `develop` (17/10) | [#135](https://github.com/DEVassos/greener-app/pull/135) |
| [#132](https://github.com/DEVassos/greener-app/issues/132) | Gráfico de CPU no histórico do serviço | RF10 | DW04 | @travensolli | **movida para a Sprint 2** no congelamento: sem branch nem PR até 18/10 20h, pela regra do plano de 16/10 | — |
| [#129](https://github.com/DEVassos/greener-app/issues/129) | Documentar o status Removido da tabela de serviços | RF02 | ES08 | @DeaTuribio | mergeado em `develop` (16/10) | [#130](https://github.com/DEVassos/greener-app/pull/130) |
| [#133](https://github.com/DEVassos/greener-app/issues/133) | Gravar energia e CO₂e na coleta e expor em `GET /api/services` (adiantada da Sprint 2) | RF07 | DW02, DW03 | @LUCASAMR23 | mergeado em `develop` (16/10); milestone corrigida para a Sprint 1 em 18/10 | [#139](https://github.com/DEVassos/greener-app/pull/139) |
| [#134](https://github.com/DEVassos/greener-app/issues/134) | Registrar o adiantamento do cálculo de CO₂e: plano, ADR 0006 e roteiro da review | RF07 | ES06, ES08 | @henriqueptbd-cell | mergeado em `develop`: plano e ADR 0006 em 17/10, roteiro da review em 18/10 | [#136](https://github.com/DEVassos/greener-app/pull/136), [#141](https://github.com/DEVassos/greener-app/pull/141) |
| [#146](https://github.com/DEVassos/greener-app/issues/146) | Alinhar a documentação ao código entregue (ES08) | RNF05 | ES08, DW03 | @travensolli | mergeado em `develop` (18/10) | [#147](https://github.com/DEVassos/greener-app/pull/147) |
| [#140](https://github.com/DEVassos/greener-app/issues/140) | Histórico de coletas marca buracos de coleta | RF04, RF10 | — | @henriqueptbd-cell | **fica na Sprint 2**: funcionalidade iniciada em 18/10, sem PR antes do congelamento | — |

### 3.3 Processo e gestão

| Issue | Título | Responsável | Situação no fechamento | PR |
|---|---|---|---|---|
| [#1](https://github.com/DEVassos/greener-app/issues/1) | Processo ágil, templates e automação do repositório (agilekit) | @travensolli | mergeado em `develop` | [#2](https://github.com/DEVassos/greener-app/pull/2), [#30](https://github.com/DEVassos/greener-app/pull/30), [#33](https://github.com/DEVassos/greener-app/pull/33), [#34](https://github.com/DEVassos/greener-app/pull/34) |
| [#3](https://github.com/DEVassos/greener-app/issues/3) | Plano de entregas e matriz de rastreabilidade | @henriqueptbd-cell | mergeado em `develop` | [#32](https://github.com/DEVassos/greener-app/pull/32) |
| [#4](https://github.com/DEVassos/greener-app/issues/4) | Padronizar as issues da Sprint 1 e publicar o backlog | @henriqueptbd-cell | mergeado em `develop` | [#75](https://github.com/DEVassos/greener-app/pull/75) |
| [#56](https://github.com/DEVassos/greener-app/issues/56) | Importar o histórico do Projeto-GreenER com autoria preservada | @travensolli | mergeado em `develop` | [#57](https://github.com/DEVassos/greener-app/pull/57) |
| [#59](https://github.com/DEVassos/greener-app/issues/59) | Preparar o repositório para o agilekit 2.0 | @travensolli | mergeado em `develop` | [#60](https://github.com/DEVassos/greener-app/pull/60) |
| [#70](https://github.com/DEVassos/greener-app/issues/70) | Sincronizar o repositório com o agilekit 2.2.0 | @travensolli | mergeado em `develop` | [#71](https://github.com/DEVassos/greener-app/pull/71) |
| [#72](https://github.com/DEVassos/greener-app/issues/72) | Atas das dailies — semana 1 | @travensolli | mergeado em `develop` | [#107](https://github.com/DEVassos/greener-app/pull/107) |
| [#73](https://github.com/DEVassos/greener-app/issues/73) | Atas das dailies — semana 2 | @travensolli | mergeado em `develop` | [#108](https://github.com/DEVassos/greener-app/pull/108) |
| [#78](https://github.com/DEVassos/greener-app/issues/78) | Publicar o registro da Sprint 1 (este documento) | @travensolli | mergeado em `develop`; revisado em 15/10 | [#79](https://github.com/DEVassos/greener-app/pull/79) |
| [#58](https://github.com/DEVassos/greener-app/issues/58) | Checklist de início por integrante | todos | fechada em 20/10 com os 38 itens marcados; as permissões do repositório ficam como estão, por decisão do SM | — |
| [#74](https://github.com/DEVassos/greener-app/issues/74) | Daily — Sprint 1 (issue fixada) | @travensolli | fechada em 19/10 | — |
| [#102](https://github.com/DEVassos/greener-app/issues/102) | Atas das dailies — semana 3 | @travensolli | mergeado em `develop` (18/10): atas de 13 a 16/10 (12/10, feriado, sem registro); a de 16/10 foi completada pelo PR [#152](https://github.com/DEVassos/greener-app/pull/152). A ata de 19/10, dia da review, entra no fechamento | [#142](https://github.com/DEVassos/greener-app/pull/142) |
| [#117](https://github.com/DEVassos/greener-app/issues/117) | Burndown da Sprint 1 | @travensolli | mergeado em `develop` (18/10); versão final, até 19/10, gerada no fechamento | [#143](https://github.com/DEVassos/greener-app/pull/143) |
| [#68](https://github.com/DEVassos/greener-app/issues/68) | Aplicar o nome EcoPulse a docs e configurações (repositório mantido) | @travensolli | mergeado em `develop` (16/10; antecipada da Sprint 2 em 15/10) | [#126](https://github.com/DEVassos/greener-app/pull/126) |
| [#127](https://github.com/DEVassos/greener-app/issues/127) | Descontinuar e arquivar o Projeto-GreenER e o Project 5 | @travensolli | mergeado em `develop` (16/10) | [#128](https://github.com/DEVassos/greener-app/pull/128) |
| [#144](https://github.com/DEVassos/greener-app/issues/144) | Retirar do repositório a proposta interna de diferenciais | @travensolli | mergeado em `develop` (18/10) | [#145](https://github.com/DEVassos/greener-app/pull/145) |
| [#148](https://github.com/DEVassos/greener-app/issues/148) | Exportar o backlog e alinhar as histórias no fechamento | @travensolli | mergeado em `develop` (18/10); export final no fechamento | [#149](https://github.com/DEVassos/greener-app/pull/149) |
| [#150](https://github.com/DEVassos/greener-app/issues/150) | Atualizar este registro e o plano no congelamento | @travensolli | mergeado em `develop` (18/10) | [#151](https://github.com/DEVassos/greener-app/pull/151) |
| [#153](https://github.com/DEVassos/greener-app/issues/153) | Entrega da Sprint 1: release, registro pós-review, tag e sincronização da `develop` | @travensolli | entrega mergeada em `main` em 19/10; registro pós-review em 20/10 | [#154](https://github.com/DEVassos/greener-app/pull/154) |
| [#158](https://github.com/DEVassos/greener-app/issues/158) | Respostas individuais da retrospectiva | @travensolli | aberta até a retrospectiva (prazo 21/10); fecha com o PR de `retrospectiva.md` | — |

### 3.4 Itens movidos no replanejamento de 05/10

| Issue | Título | Destino | Motivo |
|---|---|---|---|
| [#45](https://github.com/DEVassos/greener-app/issues/45) | US04 — Dashboard executivo e operacional em tempo real | Sprint 2 | os KPIs (DW05) dependem do motor de cálculo, que saiu da Sprint 1 |
| [#6](https://github.com/DEVassos/greener-app/issues/6) | Seed com usuário administrador inicial | Sprint 2 | depende da autenticação JWT (DW06), prevista para a Sprint 2 |
| [#18](https://github.com/DEVassos/greener-app/issues/18) | Domain service do cálculo socioambiental | Sprint 2 | motor de cálculo (TP01) entregue como fatia vertical completa na Sprint 2 |
| [#20](https://github.com/DEVassos/greener-app/issues/20) | Autenticação JWT: login com bcrypt e middleware | Sprint 2 | DW06 previsto para a Sprint 2 |
| [#21](https://github.com/DEVassos/greener-app/issues/21) | Cards de KPIs executivos | Sprint 2 | KPIs dependem do motor de cálculo |
| [#25](https://github.com/DEVassos/greener-app/issues/25) | Tela de login e proteção de rotas privadas | Sprint 2 | DW06 previsto para a Sprint 2 |
| [#13](https://github.com/DEVassos/greener-app/issues/13) | Layout do relatório executivo para impressão e PDF | Sprint 3 | exportação é diferencial fora do edital (RP05 pede MVP) |
| [#24](https://github.com/DEVassos/greener-app/issues/24) | Exportação de dados em CSV e PDF | Sprint 3 | exportação é diferencial fora do edital (RP05 pede MVP) |

## 4. Responsáveis por integrante

Pela autoria dos 48 PRs mergeados em `develop` até o congelamento (06/10 a 17/10), conferida em 18/10/2026 com `gh pr list --state merged --base develop`:

| Integrante | Papel | PRs mergeados (autor) | Em revisão no congelamento | Linhas do plano |
|---|---|---|---|---|
| Henrique Camargo `@henriqueptbd-cell` | PO | [#75](https://github.com/DEVassos/greener-app/pull/75), [#82](https://github.com/DEVassos/greener-app/pull/82), [#85](https://github.com/DEVassos/greener-app/pull/85), [#91](https://github.com/DEVassos/greener-app/pull/91), [#123](https://github.com/DEVassos/greener-app/pull/123), [#125](https://github.com/DEVassos/greener-app/pull/125), [#136](https://github.com/DEVassos/greener-app/pull/136) | [#141](https://github.com/DEVassos/greener-app/pull/141) | ES01, ES03, ES04, ES08, ES09, DW07 |
| Gabriel Travensolli `@travensolli` | SM | [#30](https://github.com/DEVassos/greener-app/pull/30), [#32](https://github.com/DEVassos/greener-app/pull/32), [#33](https://github.com/DEVassos/greener-app/pull/33), [#57](https://github.com/DEVassos/greener-app/pull/57), [#60](https://github.com/DEVassos/greener-app/pull/60), [#71](https://github.com/DEVassos/greener-app/pull/71), [#76](https://github.com/DEVassos/greener-app/pull/76), [#79](https://github.com/DEVassos/greener-app/pull/79), [#81](https://github.com/DEVassos/greener-app/pull/81), [#83](https://github.com/DEVassos/greener-app/pull/83), [#84](https://github.com/DEVassos/greener-app/pull/84), [#107](https://github.com/DEVassos/greener-app/pull/107), [#108](https://github.com/DEVassos/greener-app/pull/108), [#110](https://github.com/DEVassos/greener-app/pull/110), [#113](https://github.com/DEVassos/greener-app/pull/113), [#126](https://github.com/DEVassos/greener-app/pull/126), [#128](https://github.com/DEVassos/greener-app/pull/128), [#135](https://github.com/DEVassos/greener-app/pull/135) | [#142](https://github.com/DEVassos/greener-app/pull/142), [#143](https://github.com/DEVassos/greener-app/pull/143), [#145](https://github.com/DEVassos/greener-app/pull/145), [#147](https://github.com/DEVassos/greener-app/pull/147), [#149](https://github.com/DEVassos/greener-app/pull/149) e [#151](https://github.com/DEVassos/greener-app/pull/151) | ES02, ES05, ES06, ES07, ES08, ES09, DW01, DW07 |
| Andrea Turibio `@DeaTuribio` | dev frontend | [#61](https://github.com/DEVassos/greener-app/pull/61), [#62](https://github.com/DEVassos/greener-app/pull/62), [#69](https://github.com/DEVassos/greener-app/pull/69), [#88](https://github.com/DEVassos/greener-app/pull/88), [#89](https://github.com/DEVassos/greener-app/pull/89), [#100](https://github.com/DEVassos/greener-app/pull/100), [#101](https://github.com/DEVassos/greener-app/pull/101), [#105](https://github.com/DEVassos/greener-app/pull/105), [#114](https://github.com/DEVassos/greener-app/pull/114), [#119](https://github.com/DEVassos/greener-app/pull/119), [#121](https://github.com/DEVassos/greener-app/pull/121), [#130](https://github.com/DEVassos/greener-app/pull/130) | — | DW04, TP02, ES09 |
| Lucas Amorim `@LUCASAMR23` | dev backend | [#94](https://github.com/DEVassos/greener-app/pull/94), [#95](https://github.com/DEVassos/greener-app/pull/95), [#115](https://github.com/DEVassos/greener-app/pull/115), [#116](https://github.com/DEVassos/greener-app/pull/116), [#124](https://github.com/DEVassos/greener-app/pull/124), [#139](https://github.com/DEVassos/greener-app/pull/139) | — | DW01, DW02, DW03, BD02, TP02, ES09 |
| Vinicius Augusto `@viniciusaugusto1997` | dev banco de dados | [#77](https://github.com/DEVassos/greener-app/pull/77), [#86](https://github.com/DEVassos/greener-app/pull/86), [#92](https://github.com/DEVassos/greener-app/pull/92), [#98](https://github.com/DEVassos/greener-app/pull/98), [#99](https://github.com/DEVassos/greener-app/pull/99) | — | DW02, BD01, BD02, BD03, ES09 |

- **Revisões e responsabilidade por issue.** A participação também conta revisões, issues e documentação; o retrato completo por login sai no `sprint-1/contribuicao.md`, gerado por `.github/scripts/evidencias.sh 1` no fechamento.
- **PRs substituídos.** Dois PRs foram fechados sem merge e substituídos por versões revisadas: [#90](https://github.com/DEVassos/greener-app/pull/90) (por [#95](https://github.com/DEVassos/greener-app/pull/95)) e [#93](https://github.com/DEVassos/greener-app/pull/93) (por [#94](https://github.com/DEVassos/greener-app/pull/94)).
- **Ausência programada.** @viniciusaugusto1997 está fora a partir de 13/10, numa viagem programada combinada com o professor avaliador e com a equipe, e volta na Sprint 2 como dev. As entregas dele nesta sprint são o schema e a UML ([#77](https://github.com/DEVassos/greener-app/pull/77)), a API REST com saúde ([#86](https://github.com/DEVassos/greener-app/pull/86)), o cliente de carbono ([#92](https://github.com/DEVassos/greener-app/pull/92)), o JSON bruto e cancelamento ([#98](https://github.com/DEVassos/greener-app/pull/98)) e o worker de coleta ([#99](https://github.com/DEVassos/greener-app/pull/99)), além de revisões ([#94](https://github.com/DEVassos/greener-app/pull/94), [#95](https://github.com/DEVassos/greener-app/pull/95)).

## 5. Riscos no congelamento (18/10/2026)

| Risco | Impacto | Resposta | Dono |
|---|---|---|---|
| PRs de documentação em revisão no congelamento: [#141](https://github.com/DEVassos/greener-app/pull/141), [#142](https://github.com/DEVassos/greener-app/pull/142), [#143](https://github.com/DEVassos/greener-app/pull/143), [#145](https://github.com/DEVassos/greener-app/pull/145), [#147](https://github.com/DEVassos/greener-app/pull/147), [#149](https://github.com/DEVassos/greener-app/pull/149) e [#151](https://github.com/DEVassos/greener-app/pull/151) | ES06, ES08 e ES02 dependem do merge antes do corte da `release/sprint-1` | revisão do PO em até 24 h; a release é cortada de `develop` depois dos merges, e nenhuma funcionalidade entra depois de 18/10 20h | Henrique, Gabriel |
| Histórias [#42](https://github.com/DEVassos/greener-app/issues/42), [#44](https://github.com/DEVassos/greener-app/issues/44) e [#46](https://github.com/DEVassos/greener-app/issues/46) abertas com todas as sub-issues entregues | ES03 e ES07: aceite formal pendente | verificação registrada nas três issues em 18/10; o PO decide o fechamento | Henrique |
| Emissões abaixo de 0,05 g por coleta aparecem como "0,0" na tabela (1 casa decimal) | a demo pode sugerir valor zero | explicar a unidade na review mostrando `GET /api/services`; formatação na Sprint 2 | Henrique, Andrea |
| `review.md` sem feedback e `contribuicao.md` inexistente | ES06 e ES09 só fecham depois da review de 19/10 | feedback registrado até 20/10 23h59; `evidencias.sh 1` no fechamento | Gabriel, Henrique |

**Desfecho em 20/10/2026:**

- Os PRs de documentação foram revisados e mergeados em `develop` na noite de 18/10, antes do corte da release.
- As histórias #42, #44 e #46 foram aceitas pelo PO em 19/10.
- `review.md` e `contribuicao.md` foram completados no fechamento.
- A formatação de emissões pequenas segue prevista para a Sprint 2.

## 6. Verificações realizadas

Uma linha por item concluído: o que foi verificado, por quem e com que resultado (DoD-Sprint, item 2).

| Item | Como foi verificado | Quem verificou | Resultado |
|---|---|---|---|
| [#9](https://github.com/DEVassos/greener-app/issues/9) · PR [#62](https://github.com/DEVassos/greener-app/pull/62) | CI `frontend` (build + TypeScript) e `check-forbidden.sh`, `check-docs.sh`, `check-commit-msg.sh` | CI e revisor do PR | verde |
| [#22](https://github.com/DEVassos/greener-app/issues/22) · PR [#69](https://github.com/DEVassos/greener-app/pull/69) | build do frontend e leitura dos prints `docs/img/sprint-1-servicos.png` e `docs/img/sprint-1-servicos-celular.png` | @DeaTuribio (autora) e revisor do PR | a tabela lista os serviços com status e localização |
| [#5](https://github.com/DEVassos/greener-app/issues/5), [#28](https://github.com/DEVassos/greener-app/issues/28) · PR [#77](https://github.com/DEVassos/greener-app/pull/77) | execução do `database/schema.sql` em PostgreSQL 16 limpo e revisão do ERD em Mermaid | @viniciusaugusto1997 (autor, roteiro `verificacao-schema.md`); aprovações de @LUCASAMR23 e @henriqueptbd-cell | tabelas, PK/FK e restrições criadas |
| [#78](https://github.com/DEVassos/greener-app/issues/78) · PR [#79](https://github.com/DEVassos/greener-app/pull/79) | `check-docs.sh` e `check-commit-msg.sh` | CI e revisor do PR | verde |
| [#8](https://github.com/DEVassos/greener-app/issues/8) · PR [#86](https://github.com/DEVassos/greener-app/pull/86) | Node 24.13.1 no Windows e Node 20.20.2 com PostgreSQL 16 em containers descartáveis: 19 testes; `/health` 200; queda do banco 500; recuperação 200; SIGTERM com exit 0 | @viniciusaugusto1997 (executou) e revisor do PR | verde |
| [#17](https://github.com/DEVassos/greener-app/issues/17) · PR [#92](https://github.com/DEVassos/greener-app/pull/92) | Node 24-alpine com PostgreSQL 16-alpine: **90/90 testes** (6 de integração com PostgreSQL, 30 do cliente de carbono, nenhum pulado) | @viniciusaugusto1997; revisão com `CHANGES_REQUESTED` de @travensolli resolvida | verde |
| [#14](https://github.com/DEVassos/greener-app/issues/14) · PR [#94](https://github.com/DEVassos/greener-app/pull/94) | 25 testes unitários e 31/31 com PostgreSQL descartável | @LUCASAMR23; revisão de @viniciusaugusto1997 | verde |
| [#15](https://github.com/DEVassos/greener-app/issues/15) · PR [#95](https://github.com/DEVassos/greener-app/pull/95) | 42/42 testes, `npx tsc --noEmit` e build | @LUCASAMR23; revisão de @viniciusaugusto1997 | verde |
| [#19](https://github.com/DEVassos/greener-app/issues/19) · PR [#99](https://github.com/DEVassos/greener-app/pull/99) | 82/82 testes (7 com PostgreSQL) e snapshot combinado em Node 20.20.2 → 125/125 | @viniciusaugusto1997; revisão com `CHANGES_REQUESTED` de @DeaTuribio resolvida | verde |
| [#23](https://github.com/DEVassos/greener-app/issues/23) · PR [#100](https://github.com/DEVassos/greener-app/pull/100) | imagem construída com `--build-arg VITE_REFRESH_INTERVAL_MS=5000` e print `docs/img/sprint-1-atualizacao-automatica.png` | @DeaTuribio (executou) e revisor do PR | o dashboard atualiza sem recarregar a página |
| [#27](https://github.com/DEVassos/greener-app/issues/27) · PR [#113](https://github.com/DEVassos/greener-app/pull/113) | `docker compose ps` com backend, frontend e postgres em `Up (healthy)`; `GET /health` → `{"status":"ok","db":"ok"}`; contagem preservada após `docker compose restart` e após `down`/`up` | @travensolli (executou) e revisor do PR | verde |
| [#111](https://github.com/DEVassos/greener-app/issues/111) · PR [#115](https://github.com/DEVassos/greener-app/pull/115) | `npx tsc --noEmit` e 13 testes; execução no compose real registrada em comentário por @DeaTuribio: `GET /api/services` → 200, inclusive serviço sem localização; `stop postgres` → 500 `DATABASE_ERROR` sem stack trace | @DeaTuribio (executou) e @henriqueptbd-cell (aprovou) | verde |
| [#112](https://github.com/DEVassos/greener-app/issues/112) · PR [#116](https://github.com/DEVassos/greener-app/pull/116) | 6 testes, incluindo 400 e 404; validação com PostgreSQL real depois do merge da [#27](https://github.com/DEVassos/greener-app/issues/27) | @LUCASAMR23; revisão de @henriqueptbd-cell | verde |
| [#118](https://github.com/DEVassos/greener-app/issues/118) · PR [#119](https://github.com/DEVassos/greener-app/pull/119) | 132 testes; CORS conferido no compose real (`Access-Control-Allow-Origin: http://localhost:5173`, `Vary: Origin`); Edge exibiu 8 serviços coletados da API real, console sem erros | @DeaTuribio (executou) e @henriqueptbd-cell (aprovou) | verde |
| [#120](https://github.com/DEVassos/greener-app/issues/120) · PR [#121](https://github.com/DEVassos/greener-app/pull/121) | largura do documento em 390 px: 494 → 390; texto "— sem localização" no lugar do campo vazio; ordenação conferida; build e `check-*` | @DeaTuribio (executou) e @henriqueptbd-cell (aprovou) | verde |
| [#1](https://github.com/DEVassos/greener-app/issues/1) · PRs [#30](https://github.com/DEVassos/greener-app/pull/30) e [#33](https://github.com/DEVassos/greener-app/pull/33) | execução dos comandos do kit e criação das issues pelo formulário | @LUCASAMR23 | aprovado em 08/10 |
| [#3](https://github.com/DEVassos/greener-app/issues/3) · PR [#32](https://github.com/DEVassos/greener-app/pull/32) | revisão do replanejamento da Sprint 1 no plano | @henriqueptbd-cell | aprovado em 08/10 |
| [#56](https://github.com/DEVassos/greener-app/issues/56) · PR [#57](https://github.com/DEVassos/greener-app/pull/57) | conferência da importação dos commits do Projeto-GreenER com autoria preservada | @henriqueptbd-cell | aprovado em 08/10 |
| [#11](https://github.com/DEVassos/greener-app/issues/11) · PR [#61](https://github.com/DEVassos/greener-app/pull/61) | validação do guia de identidade visual | @travensolli | aprovado em 08/10 |
| [#4](https://github.com/DEVassos/greener-app/issues/4) · PR [#75](https://github.com/DEVassos/greener-app/pull/75) | "DoD verificada": snapshot do backlog conferido contra as issues | @travensolli | aprovado em 09/10 |
| [#80](https://github.com/DEVassos/greener-app/issues/80) · PR [#81](https://github.com/DEVassos/greener-app/pull/81) | "Como verificar" executado no `2944ae0` com Docker no WSL: build (`tsc --noEmit && vite build`), container `healthy`, fallback da SPA em `/configuracao`, cabeçalhos de segurança e cache, erro sem backend e modo demonstração | @DeaTuribio | aprovado em 10/10 |
| [#65](https://github.com/DEVassos/greener-app/issues/65) · PR [#85](https://github.com/DEVassos/greener-app/pull/85) | "DoD verificada": "Como verificar" executado na branch (`1b75800`) | @travensolli | aprovado em 09/10 |
| [#87](https://github.com/DEVassos/greener-app/issues/87) · PR [#88](https://github.com/DEVassos/greener-app/pull/88) | cores conferidas no documento e na aplicação | @henriqueptbd-cell | aprovado em 09/10 |
| [#12](https://github.com/DEVassos/greener-app/issues/12) · PR [#89](https://github.com/DEVassos/greener-app/pull/89) | "DoD verificada" no HEAD `d37fc83`, depois do merge da `develop` que resolveu o conflito em `frontend/README.md` | @travensolli | aprovado em 13/10 |
| [#26](https://github.com/DEVassos/greener-app/issues/26) · PR [#91](https://github.com/DEVassos/greener-app/pull/91) | "DoD verificada" no HEAD `79fcb63`, com o conflito de `backend/README.md` resolvido | @travensolli | aprovado em 13/10 |
| [#97](https://github.com/DEVassos/greener-app/issues/97) · PR [#98](https://github.com/DEVassos/greener-app/pull/98) | "DoD verificada": o bloqueio da revisão de 13/10 (README) foi resolvido no `22ff280`, e o código do cliente segue igual ao verificado no `269b658` | @travensolli | aprovado em 14/10 |
| [#10](https://github.com/DEVassos/greener-app/issues/10) · PR [#101](https://github.com/DEVassos/greener-app/pull/101) | prints e links do protótipo no Figma conferidos | @henriqueptbd-cell | aprovado em 13/10 |
| [#104](https://github.com/DEVassos/greener-app/issues/104) · PR [#105](https://github.com/DEVassos/greener-app/pull/105) | "DoD verificada": `backend/README.md` e `.env.example` com `JWT_SECRET`, `JWT_EXPIRES_IN` e `POLLING_INTERVAL_MS` alinhados | @LUCASAMR23 | aprovado em 14/10 |
| [#72](https://github.com/DEVassos/greener-app/issues/72) · PR [#107](https://github.com/DEVassos/greener-app/pull/107) | "Como verificar" das atas da semana 1: 5 atas presentes, todas com "Impedimentos" e a sinalização de registro retroativo; `check-docs.sh` sem erros | @henriqueptbd-cell | aprovado em 14/10 |
| [#73](https://github.com/DEVassos/greener-app/issues/73) · PR [#108](https://github.com/DEVassos/greener-app/pull/108) | `ls` das atas da semana 2 (06 a 09/10) e 12/10 ausente por feriado | @henriqueptbd-cell | aprovado em 14/10 |
| [#106](https://github.com/DEVassos/greener-app/issues/106) · PR [#114](https://github.com/DEVassos/greener-app/pull/114) | aprovação de uma linha; o comportamento (atualização a cada 30 s e "Última atualização") aparece no ensaio da review de 18/10 ([#141](https://github.com/DEVassos/greener-app/pull/141)) | @LUCASAMR23 | aprovado em 14/10 |
| [#47](https://github.com/DEVassos/greener-app/issues/47) · PR [#123](https://github.com/DEVassos/greener-app/pull/123) | aprovação de uma linha ("revisado e funciona normalmente") | @LUCASAMR23 | aprovado em 16/10 |
| [#16](https://github.com/DEVassos/greener-app/issues/16) · PR [#124](https://github.com/DEVassos/greener-app/pull/124) | conferência de que os `try/catch` já existiam; o PR acrescenta o teste de regressão de falha isolada (rede, timeout, 404 e 500); CI verde | @henriqueptbd-cell | aprovado em 15/10 |
| [#103](https://github.com/DEVassos/greener-app/issues/103) · PR [#125](https://github.com/DEVassos/greener-app/pull/125) | "DoD verificada": na head `6eabf3c`, `npm ci && npm test` (132 testes aprovados e 7 pulados), `tsc --noEmit`, os checks e `docker compose up --build` com `/health` 200 | @travensolli | aprovado em 16/10 |
| [#68](https://github.com/DEVassos/greener-app/issues/68) · PR [#126](https://github.com/DEVassos/greener-app/pull/126) e [#127](https://github.com/DEVassos/greener-app/issues/127) · PR [#128](https://github.com/DEVassos/greener-app/pull/128) | aprovações de uma linha ("dod revisado e correto", "revisado e correto") | @henriqueptbd-cell | aprovados em 16/10 |
| [#129](https://github.com/DEVassos/greener-app/issues/129) · PR [#130](https://github.com/DEVassos/greener-app/pull/130) | aprovação de uma linha ("Testado e aprovado") | @LUCASAMR23 | aprovado em 16/10 |
| [#131](https://github.com/DEVassos/greener-app/issues/131) · PR [#135](https://github.com/DEVassos/greener-app/pull/135) | "DoD verificada": `docker compose up --build` em 17/10, das 20h40 às 20h50, em `f713909` e em `4bfa07b`; a revisora commitou a correção `4bfa07b` e declarou isso na revisão | @DeaTuribio | aprovado em 17/10 |
| [#134](https://github.com/DEVassos/greener-app/issues/134) · PR [#136](https://github.com/DEVassos/greener-app/pull/136) | "DoD verificada": passos 1–6 em `26e6091`, com a ADR 0006 conferida contra o código do #139 | @DeaTuribio | aprovado em 17/10 |
| [#133](https://github.com/DEVassos/greener-app/issues/133) · PR [#139](https://github.com/DEVassos/greener-app/pull/139) | aprovação de uma linha ("dod revisado e aprovado"), 66 s depois do pedido. Verificação de fato em 18/10: ensaio da review por @henriqueptbd-cell ([#141](https://github.com/DEVassos/greener-app/pull/141), § 2.1) e reexecução por @travensolli, com 8 serviços com `energyKwh`/`emissionsG` numéricos e, com a API de carbono fora, coletas `indisponivel` com `NULL` e o serviço `ativo` | @henriqueptbd-cell; reexecução @travensolli | aprovado em 16/10; verificado em 18/10 |
| Congelamento (`develop` em `16d520f`) | `bash .agilekit/scripts/teste-avaliador.sh --ref develop` (clone limpo), `check-forbidden.sh`, `check-docs.sh` e compose local com `/health`, `/api/services` e `/api/collections` | @travensolli | 18/10: compose no ar, `/health` 200, 4 tabelas, persistência de 15 → 22 linhas após restart, schema em banco vazio; checks sem erros |
| [#134](https://github.com/DEVassos/greener-app/issues/134) · PR [#141](https://github.com/DEVassos/greener-app/pull/141) | "DoD verificada": "Como verificar" executado em 18/10, das 20h30 às 20h55, no clone atualizado | @travensolli | aprovado e mergeado em 18/10 |
| PRs de documentação pós-congelamento: [#142](https://github.com/DEVassos/greener-app/pull/142), [#143](https://github.com/DEVassos/greener-app/pull/143), [#147](https://github.com/DEVassos/greener-app/pull/147), [#149](https://github.com/DEVassos/greener-app/pull/149), [#151](https://github.com/DEVassos/greener-app/pull/151) e [#152](https://github.com/DEVassos/greener-app/pull/152) | aprovações de uma linha ("dod revisado") ou sem texto (#152) | @henriqueptbd-cell | mergeados em 18/10, entre 21h39 e 22h31 |
| [#144](https://github.com/DEVassos/greener-app/issues/144) · PR [#145](https://github.com/DEVassos/greener-app/pull/145) | aprovação sem texto | @DeaTuribio | mergeado em 18/10 |
| Entrega · PR [#154](https://github.com/DEVassos/greener-app/pull/154) (`release/sprint-1` → `main`) | "DoD verificada (conteúdo da release)": o ensaio de ponta a ponta de 18/10, os PRs pós-congelamento revisados, o vídeo linkado e a CI de `develop` verde | @henriqueptbd-cell | aprovado e mergeado em 19/10 às 12h04 |
| Fechamento (`main` em [`1f5cf18`](https://github.com/DEVassos/greener-app/commit/1f5cf18)) | `bash .agilekit/scripts/teste-avaliador.sh --ref main` (clone limpo de `main`, seguindo o README: `.env` a partir do `.env.example` e `docker compose up --build`), `check-forbidden.sh` e `check-docs.sh` | @travensolli | 20/10: compose no ar, `/health` 200, 4 tabelas, persistência de 8 → 16 linhas após restart, schema aplicado em banco vazio; checks sem erros (13 avisos de permalink no plano) |

**Exceções à DoD-PR**, registradas porque não há como corrigi-las depois do merge:

- [#60](https://github.com/DEVassos/greener-app/pull/60) e [#110](https://github.com/DEVassos/greener-app/pull/110): mergeados pelo autor sem revisão.
- [#82](https://github.com/DEVassos/greener-app/pull/82): mergeado com pedido de mudanças pendente; as variáveis apagadas no merge foram restauradas no [#105](https://github.com/DEVassos/greener-app/pull/105).
- [#113](https://github.com/DEVassos/greener-app/pull/113): aprovado por @henriqueptbd-cell, que é co-autor do PR.
- Aprovações de uma linha, sem descrever o que foi executado: [#71](https://github.com/DEVassos/greener-app/pull/71), [#76](https://github.com/DEVassos/greener-app/pull/76), [#83](https://github.com/DEVassos/greener-app/pull/83), [#84](https://github.com/DEVassos/greener-app/pull/84), [#114](https://github.com/DEVassos/greener-app/pull/114), [#123](https://github.com/DEVassos/greener-app/pull/123), [#126](https://github.com/DEVassos/greener-app/pull/126), [#128](https://github.com/DEVassos/greener-app/pull/128), [#130](https://github.com/DEVassos/greener-app/pull/130) e [#139](https://github.com/DEVassos/greener-app/pull/139). No [#139](https://github.com/DEVassos/greener-app/pull/139), a verificação foi complementada em 18/10, como mostra a tabela.
- Aprovações de uma linha ou sem texto nos PRs de documentação mergeados depois do congelamento: #142, #143, #145, #147, #149, #151 e #152.
- As aprovações vieram quase todas do PO @henriqueptbd-cell, e não do **par de revisão** nominal de `.github/equipe.json` (Gabriel ↔ Henrique, Andrea → Lucas, Lucas → Vinicius, Vinicius → Andrea).

Ação para a Sprint 2: aprovação só com "DoD verificada" e o que foi executado, pelo par de revisão.

## 7. Review (19/10/2026)

Ata completa: [review.md](sprint-1/review.md). Roteiro e ensaio de 18/10: [#134](https://github.com/DEVassos/greener-app/issues/134), PR [#141](https://github.com/DEVassos/greener-app/pull/141).

### 7.1 Demonstrado

- **Formato:** videochamada de cerca de 7 min, às 19h30, com Otávio Abreu dos Santos Silva (UniLaunch, cliente) e o Prof. Arley Souza (Fatec Jacareí).
- **Roteiro:** a equipe se apresentou, exibiu o [vídeo de 3 min](https://youtu.be/3Hx4kzuudSw) com o produto como entregue na Sprint 1, preparado por @henriqueptbd-cell, e respondeu às perguntas.
- **Verificação:** o roteiro ao vivo por requisito não foi executado. A verificação de ponta a ponta desta versão é o ensaio de 18/10 ([review.md § 2.1](sprint-1/review.md#21-resultado-observado-no-ensaio-de-18102026)).

### 7.2 Feedback do cliente

- Gostou de já ver o consumo e a persistência dos dados da API dele (RF01, RF03, RF10).
- Para uma primeira sprint está bom: mesmo sem JWT e login inicial, já há algo para manusear e usar no dia a dia.
- Gostou da interface e ficou curioso para ver as próximas implementações.
- O intuito é trabalhar com o que já temos; o foco principal é poder comparar serviços para ver o que compensa fazer, e a intenção é analisar dados → [#159](https://github.com/DEVassos/greener-app/issues/159) (`feedback-cliente`).
- Os apontamentos escritos do cliente sobre o repositório chegaram em 20/10 e estão em [review.md § 3.1](sprint-1/review.md#31-apontamentos-escritos-do-cliente-20102026). Os pontos a melhorar viraram as issues `feedback-cliente` [#160](https://github.com/DEVassos/greener-app/issues/160), [#161](https://github.com/DEVassos/greener-app/issues/161), [#162](https://github.com/DEVassos/greener-app/issues/162), [#163](https://github.com/DEVassos/greener-app/issues/163), [#164](https://github.com/DEVassos/greener-app/issues/164), [#165](https://github.com/DEVassos/greener-app/issues/165) e [#166](https://github.com/DEVassos/greener-app/issues/166), na milestone Sprint 2, e os de produto complementam a [#159](https://github.com/DEVassos/greener-app/issues/159). Não descontam pontos na Sprint 1 e passam a ser exigidos a partir da Sprint 2.

### 7.3 Decisões e alterações no backlog

- **Priorização:** a comparação entre serviços e a análise dos dados passam a ser a prioridade do backlog ([#159](https://github.com/DEVassos/greener-app/issues/159), Sprint 2). Na planning da Sprint 2, o PO decide se antecipa a US09, ranking ([#50](https://github.com/DEVassos/greener-app/issues/50)), e a US11, comparação ([#52](https://github.com/DEVassos/greener-app/issues/52)).
- **Critérios:** nenhum muda de sprint. O denominador da Sprint 1 continua 79, e a autenticação JWT (DW06) segue na Sprint 2. Registrado no "Histórico de alterações do plano" em 20/10.

## 8. Participação

Relatório ES09 gerado por `evidencias.sh 1`: [contribuicao.md](sprint-1/contribuicao.md).

- **Sem lacunas:** os cinco integrantes têm contribuição verificável por login, com PRs mergeados, revisões e commits em `develop`.
- **Ausência programada:** a ausência de @viniciusaugusto1997 a partir de 13/10 está registrada na § 4; as entregas dele estão no relatório.
- **Correção no script:** o relatório foi gerado com uma correção local no script do kit, que parava num e-mail com maiúsculas. Os detalhes estão em contribuicao.md § Observações.

## 9. Métricas

| Métrica | Valor |
|---|---|
| Issues da milestone | 19 no replanejamento de 05/10; 67 em 20/10, das quais 65 fechadas (abertas: #153, a entrega, e #158, a retrospectiva) |
| Story Points: escopo inicial / final / concluídos | 66 / 108 / 107 até 19/10 ([burndown](sprint-1/burndown.md)); o ponto restante é a #58, fechada em 20/10 |
| PRs mergeados em `develop` | 56, de 06/10 a 18/10, mais a entrega em `main` (#154) |
| Merges por dia em `develop` | 06/10: 1 · 07/10: 5 · 08/10: 7 · 09/10: 6 · 12/10: 2 · 13/10: 5 · 14/10: 12 · 15/10: 2 · 16/10: 6 · 17/10: 2 · 18/10: 8, todos de documentação |
| Merges por integrante (05–11/10 · 12–18/10) | Andrea 4 · 8 · Gabriel 11 · 14 · Henrique 2 · 6 · Lucas 0 · 6 · Vinicius 2 · 3 |
| PRs com primeira revisão em mais de 24h | 7: #30, #32, #33, #57, #89, #91 e #136 |
| PRs mergeados sem revisão | 2: #60 e #110 |
| Atas de daily / dias úteis | 14 / 15. Falta 12/10 (feriado); 19/10 foi o dia da review |
| Regressões (`regressao`) | 0 |
| Nota estimada (`/auditar 1`, 18/10) | 71 a 74 de 79 (9,0 a 9,4), com o fechamento executado |
