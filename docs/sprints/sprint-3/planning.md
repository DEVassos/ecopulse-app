# Sprint Planning — Sprint 3

| Campo | Valor |
|---|---|
| Data e local | 10/11/2026: seleção consolidada pelo SM a partir do [plano de entregas § Sprint 3](../../plano-de-entregas.md#sprint-3) e do quadro, publicada por PR no mesmo dia; o time valida pela revisão deste PR e pela daily de 11/11 |
| Presentes | @travensolli (SM, consolidação); @henriqueptbd-cell (PO) revisa o PR |
| Ausentes | nenhum registrado |
| Período da sprint | 10/11 a 23/11/2026 · checkpoint 17/11 · congelamento 22/11 20h · review 23/11 19h30 (a confirmar) |
| Milestone | `Sprint 3` |

## 1. Objetivo da sprint

Consultas agregadas de ranking e comparação por período conferidas e documentadas (BD04), mapa dos serviços com coordenadas (US10 #51, `could`), revisão de usabilidade, responsividade e desempenho, e repositório pronto para ser apresentado como portfólio: sem regressões e com a documentação conferida comando a comando. Tudo o que foi aceito nas Sprints 1 e 2 continua funcionando.

## 2. Capacidade

| Integrante | Dias disponíveis | Ausências previstas | Observações |
|---|---|---|---|
| @DeaTuribio | 9 | nenhuma registrada | frontend: bug de Emissões, resumo do dashboard, convites, exportação |
| @LUCASAMR23 | 9 | nenhuma registrada | backend: convites (US15), resumo do dashboard, BD04 |
| @viniciusaugusto1997 | 9 | nenhuma registrada | banco: BD04, tabela de convites, simulação regional |
| @henriqueptbd-cell | 9 | nenhuma registrada | PO: refinamento da US11b, aceite, plano, `calculos.md` |
| @travensolli | 9 | nenhuma registrada | SM: atas, quadro, CI visual, mapa, portfólio |

Dias úteis: 10, 11, 12, 13, 16, 17, 18, 19 e 23/11. Feriado em 20/11 (daily assíncrona por texto, com ata). Capacidade total estimada: 45 pessoas-dia (5 × 9). Itens de processo não entram no total de pontos.

## 3. Itens selecionados (Sprint Backlog)

Todas as issues abertas que ainda cabem no produto entram na milestone `Sprint 3`, porque é a última sprint. As que não forem concluídas até o congelamento ficam registradas como pendentes no fechamento, com motivo. Os épicos #35–#41 continuam sem milestone, porque agrupam histórias das três sprints.

### Critério novo da sprint (must)

| Issue | Título | Requisito | Critério | Responsável | Estimativa | DoR |
|---|---|---|---|---|---|---|
| #313 | Conferência das consultas agregadas por período e índices | RF14, RF15, RNF03 | BD04 | @viniciusaugusto1997, @LUCASAMR23 | 3 | ok |

### Pendências da Sprint 2 e histórias must/should

| Issue | Título | Requisito | Critério | Responsável | Estimativa | DoR |
|---|---|---|---|---|---|---|
| #256 | Emissões conta de novo coletas inválidas na página seguinte | RF09, RNF04 | DW04, TP03 (regressão) | @DeaTuribio | sem estimativa | ok (branch com 2 commits, sem PR) |
| #234 | Resumo do dashboard no contrato de 23/10, com IndicatorsPanel | RF08 | DW05, BD04 (apoio) | @DeaTuribio, @LUCASAMR23 | 3 | ok |
| #195 | US15: cadastro de usuário por convite do administrador | RNF05 | DW06 | @LUCASAMR23 | 10 | ok (quebrada em #196 e #197) |
| #196 | Convites e cadastro por convite no backend | RNF05 | DW06, BD01 | @LUCASAMR23, @viniciusaugusto1997 | 5 | ok |
| #197 | Telas de convite e de cadastro por convite | RNF05 | DW04, DW06 | @DeaTuribio | 5 | ok (depende de #196) |
| #55 | US14: polimento, validação de carga e documentação de portfólio | RNF03, RNF05 | ES08, ES07 | @travensolli | 5 | ok |

### Could (puxadas depois dos must, na ordem abaixo)

| Issue | Título | Requisito | Critério | Responsável | Estimativa | DoR |
|---|---|---|---|---|---|---|
| #226 | US11b: comparação orientada à decisão (Energia × intensidade = CO₂e) | RF07, RF15 | DW04, DW05, BD04 | @henriqueptbd-cell (refinamento) | 22 | **pendente**: em refinamento; o PO decide o escopo e quebra em tarefas ≤5 até 12/11 |
| #51 | US10: visualização geográfica por bolhas (mapa) | RF12, RF13 | DW04 | @travensolli | 5 | ok |
| #53 | US12: simulação de migração regional | RF15 | DW03, DW04 | @viniciusaugusto1997 | 5 | ok |
| #54 | US13: exportação de relatórios gerenciais (PDF e CSV) | RNF05 | DW04 | @DeaTuribio | 5 | ok (quebrada em #13 e #24) |
| #13 | Layout do relatório executivo para impressão e PDF | RNF05 | DW04 | @DeaTuribio | 2 | ok |
| #24 | Módulo de exportação de dados em CSV e PDF executivo | RNF05 | DW04 | @DeaTuribio | 5 | ok |
| #275 | Prova de qualidade visual automatizada no CI | RNF01 | ES07 | @travensolli | 2 | ok |

### Processo

| Issue | Título | Critério | Responsável |
|---|---|---|---|
| #312 | Planejamento da Sprint 3 (este PR) | ES02 | @travensolli |
| #310 | Daily — Sprint 3 (issue fixada) | ES05, ES09 | @travensolli |
| #311 | Retrospectiva da Sprint 2: respostas individuais | ES06 | @travensolli |
| #169 | Daily por texto respondida no mesmo dia | ES09 | @travensolli |
| #167 | Contrato de integração na issue antes do primeiro commit | ES03 | @DeaTuribio |

**Total de código:** must/should = 21 pontos em tarefas (#313 3, #234 3, #196 5, #197 5, mais #55 5) + #256 sem estimativa. Could = 41 pontos (#226 22, #51 5, #53 5, #13 2, #24 5, #275 2). As histórias #195 e #54 são roll-ups das tarefas filhas e não entram na soma. O total de 62 pontos passa da capacidade; por isso os itens could só entram depois que os must estiverem em revisão.

## 4. Critérios da rubrica previstos e denominador

| Código | Pontos | Entrega que o comprova | Responsável |
|---|---|---|---|
| ES01–ES09 | 40 | processo e registros da sprint (plano, atas, DoD, contribuição) | PO + SM + todos |
| DW01 | 3 | módulos frontend/backend em TypeScript estrito | @DeaTuribio, @LUCASAMR23 |
| BD04 | 3 | consultas agregadas por período com `SUM`/`GROUP BY`/`ORDER BY`, conferidas contra `SELECT` manual e com índice (#313) | @viniciusaugusto1997, @LUCASAMR23 |

**Denominador da sprint:** 46 pontos. Gatilho: se #313 não estiver em revisão até o checkpoint de 17/11, o PO e o SM decidem no checkpoint e registram a decisão no "Histórico de alterações do plano". DW02–DW07, BD01–BD03 e TP01–TP03, aceitos nas Sprints 1 e 2, continuam valendo de forma cumulativa: regressão derruba a nota.

## 5. Riscos e dependências

| Risco | Impacto | Mitigação | Dono |
|---|---|---|---|
| Sprint curta (9 dias úteis) com 62 pontos selecionados | alto | must primeiro (#313, #256, #234, #196, #197, #55); could só depois; o que sobrar é registrado como pendente no fechamento | @henriqueptbd-cell |
| Frontend concentrado em @DeaTuribio (7 itens) | alto | #51 com @travensolli; #13/#24 só depois de #256, #234 e #197; revisão pelo par da frente | @travensolli |
| ES09 coletivo: @viniciusaugusto1997 não tinha item até esta planning | alto | #313 (BD04) e #196 (tabela `invitations`) com ele; PR até o checkpoint | @viniciusaugusto1997 |
| #226 com 22 pontos e ainda em refinamento | médio | o PO decide o escopo até 12/11 e quebra em tarefas ≤5; sem decisão, a história sai da sprint com registro | @henriqueptbd-cell |
| #197 depende das rotas de #196 | médio | contrato das rotas na issue antes do primeiro commit (#167); front com mock até o merge do back | @LUCASAMR23 |
| Regressão nos critérios das Sprints 1 e 2 durante o polimento | alto | `teste-avaliador.sh` antes do congelamento; reteste de todos os critérios em "Verificações realizadas" (ES07) | @travensolli |
| Feriado de 20/11 | baixo | daily assíncrona por texto, com ata | @travensolli |

## 6. Decisões da planning

- Por ser a última sprint, todas as issues abertas do produto (exceto os épicos) entram na milestone `Sprint 3`, divididas em must/should e could. O que não for entregue é registrado no fechamento como pendente, sem anunciar funcionalidade.
- BD04 ganha uma tarefa própria (#313), porque as consultas já existem desde a Sprint 2 e o que falta é a conferência dos totais, o `EXPLAIN` com índice e o registro em `docs/calculos.md`.
- #226 (US11b) entra em refinamento com o PO; antes da decisão dele, nenhuma tarefa filha é criada.
- Branches remotas sem PR e já incorporadas ou substituídas (`feature/175-painel-indicadores-agregados`, `feature/237-confere-resumo-comparacao`, `docs/166-duvidas-consumo-agua`) foram apagadas em 10/11.
- Par de revisão da sprint (mantido da Sprint 2): frontend @DeaTuribio ↔ @travensolli; backend e banco @LUCASAMR23 ↔ @viniciusaugusto1997; processos @henriqueptbd-cell ↔ @travensolli. A aprovação começa com "DoD verificada" e descreve o que foi executado.
- Nenhum critério muda de sprint nesta planning; o denominador continua 46.

## 7. Encaminhamentos

- [x] Issue fixada "Daily — Sprint 3" (#310) criada (@travensolli)
- [x] `docs/sprints/sprint-3.md` inicial criado (@travensolli)
- [x] Issue #313 (BD04) criada e atribuída (@travensolli)
- [x] Issues abertas da sprint com responsável e cartão em "Sprint Backlog" ou além (@travensolli)
- [x] `docs/backlog/product-backlog.md` regenerado (@travensolli)
- [ ] Story Points de #256, #167, #169, #310 e #311 (@henriqueptbd-cell, até 11/11)
- [ ] Escopo de #226 decidido e quebrado em tarefas ≤5 (@henriqueptbd-cell, até 12/11)
