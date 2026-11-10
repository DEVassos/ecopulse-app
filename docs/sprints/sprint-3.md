# Sprint 3 — BD04, mapa, polimento e portfólio

| Campo | Valor |
|---|---|
| Período | 10/11 a 23/11/2026 · checkpoint 17/11 · congelamento 22/11 20h · review 23/11 19h30 (a confirmar) |
| Milestone | [Sprint 3](https://github.com/DEVassos/ecopulse-app/milestone/3) |
| Plano | [docs/plano-de-entregas.md § Sprint 3](../plano-de-entregas.md#sprint-3): critérios previstos, denominador e situação de cada critério |
| Atas | [planning](sprint-3/planning.md) |

## 1. Objetivo da sprint

Consultas agregadas de ranking e comparação por período conferidas e documentadas (BD04), mapa dos serviços com coordenadas (US10 #51, `could`), revisão de usabilidade, responsividade e desempenho, e repositório pronto para ser apresentado como portfólio: sem regressões e com a documentação conferida comando a comando. Tudo o que foi aceito nas Sprints 1 e 2 continua funcionando.

## 2. Itens selecionados

A situação de cada critério previsto fica **só** no [plano de entregas](../plano-de-entregas.md#sprint-3); esta seção registra a seleção da sprint e o responsável.

| Issue | Título | Requisito | Critério | Responsável | Seleção |
|---|---|---|---|---|---|
| #313 | Conferência das consultas agregadas por período e índices | RF14, RF15, RNF03 | BD04 | @viniciusaugusto1997, @LUCASAMR23 | must |
| #256 | Emissões conta de novo coletas inválidas na página seguinte | RF09, RNF04 | DW04, TP03 | @DeaTuribio | must (vem da Sprint 2) |
| #234 | Resumo do dashboard no contrato de 23/10, com IndicatorsPanel | RF08 | DW05 | @DeaTuribio, @LUCASAMR23 | should (vem da Sprint 2) |
| #195 | US15: cadastro de usuário por convite do administrador | RNF05 | DW06 | @LUCASAMR23 | should, quebrada em #196 e #197 |
| #196 | Convites e cadastro por convite no backend | RNF05 | DW06, BD01 | @LUCASAMR23, @viniciusaugusto1997 | should |
| #197 | Telas de convite e de cadastro por convite | RNF05 | DW04, DW06 | @DeaTuribio | should |
| #55 | US14: polimento, validação de carga e documentação de portfólio | RNF03, RNF05 | ES07, ES08 | @travensolli | must |
| #226 | US11b: comparação orientada à decisão | RF07, RF15 | DW04, DW05, BD04 | @henriqueptbd-cell | could, em refinamento |
| #51 | US10: mapa por bolhas | RF12, RF13 | DW04 | @travensolli | could |
| #53 | US12: simulação de migração regional | RF15 | DW03, DW04 | @viniciusaugusto1997 | could |
| #54 | US13: exportação de relatórios (PDF e CSV) | RNF05 | DW04 | @DeaTuribio | could, quebrada em #13 e #24 |
| #13 | Layout do relatório executivo para impressão e PDF | RNF05 | DW04 | @DeaTuribio | could |
| #24 | Exportação de dados em CSV e PDF executivo | RNF05 | DW04 | @DeaTuribio | could |
| #275 | Prova de qualidade visual automatizada no CI | RNF01 | ES07 | @travensolli | could |

Itens de processo (5): #312, #310, #311, #169 e #167. Detalhes, estimativas e capacidade estão no [planning](sprint-3/planning.md).

## 3. Riscos e dependências

| Risco | Impacto | Mitigação | Dono |
|---|---|---|---|
| Sprint curta (9 dias úteis) com 62 pontos selecionados | alto | must primeiro; could só depois; o que sobrar é registrado como pendente no fechamento | @henriqueptbd-cell |
| Frontend concentrado em @DeaTuribio | alto | #51 com @travensolli; exportação só depois de #256, #234 e #197 | @travensolli |
| ES09 coletivo: @viniciusaugusto1997 sem item até a planning | alto | #313 e #196 com ele; PR até o checkpoint de 17/11 | @viniciusaugusto1997 |
| #226 com 22 pontos e em refinamento | médio | o PO decide o escopo até 12/11 e quebra em tarefas ≤5 | @henriqueptbd-cell |
| #197 depende de #196 | médio | contrato das rotas na issue antes do primeiro commit (#167) | @LUCASAMR23 |
| Regressão nos critérios das Sprints 1 e 2 | alto | `teste-avaliador.sh` antes do congelamento e reteste em "Verificações realizadas" | @travensolli |
| Feriado de 20/11 | baixo | daily assíncrona por texto, com ata | @travensolli |
