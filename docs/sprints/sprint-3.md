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
