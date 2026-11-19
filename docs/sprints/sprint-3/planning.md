# Sprint Planning — Sprint 3

| Campo | Valor |
|---|---|
| Data e local | 10/11/2026: seleção consolidada pelo SM a partir do [plano de entregas § Sprint 3](../../plano-de-entregas.md#sprint-3) e do quadro, publicada por PR no mesmo dia; o time valida pela revisão deste PR e pela daily de 11/11 |
| Presentes | @travensolli (SM, consolidação); @henriqueptbd-cell (PO) revisa o PR |
| Ausentes | nenhum registrado |
| Período da sprint | 10/11 a 23/11/2026 · checkpoint 17/11 · congelamento 22/11 20h · review 23/11 19h30 (a confirmar) |
| Milestone | `Sprint 3` |

## 1. Objetivo da sprint

Consultas agregadas de ranking e comparação por período conferidas e documentadas (BD04), mapa das regiões com bolhas (US10 #51) e simulação de migração para a região mais limpa (US12 #53), elevados a must de produto em 10/11 porque respondem às perguntas do desafio sobre regiões e migração, revisão de usabilidade, responsividade e desempenho, e repositório pronto para ser apresentado como portfólio: sem regressões e com a documentação conferida comando a comando. Tudo o que foi aceito nas Sprints 1 e 2 continua funcionando.

## 2. Capacidade

| Integrante | Dias disponíveis | Ausências previstas | Observações |
|---|---|---|---|
| @DeaTuribio | 9 | nenhuma registrada | frontend: mapa (já iniciado localmente), resumo do dashboard, convites, exportação |
| @LUCASAMR23 | 9 | nenhuma registrada | backend: convites (US15), resumo do dashboard, BD04 |
| @viniciusaugusto1997 | 9 | nenhuma registrada | banco: BD04, tabela de convites, simulação regional |
| @henriqueptbd-cell | 9 | nenhuma registrada | PO: refinamento da US11b, aceite, plano, `calculos.md`; reforço no frontend (#328, #329, #333) |
| @travensolli | 9 | nenhuma registrada | SM: atas, quadro, bug de Emissões, CI visual, portfólio; reforço no frontend (#321, #324, #330–#332) |

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
| #256 | Emissões conta de novo coletas inválidas na página seguinte | RF09, RNF04 | DW04, TP03 (regressão) | @travensolli | sem estimativa | ok (assumida pelo SM em 10/11 a partir da branch `fix/256-paginacao-emissoes-2`, com 2 commits de @DeaTuribio) |
| #234 | Resumo do dashboard no contrato de 23/10, com IndicatorsPanel | RF08 | DW05, BD04 (apoio) | @DeaTuribio, @LUCASAMR23 | 3 | ok |
| #195 | US15: cadastro de usuário por convite do administrador | RNF05 | DW06 | @LUCASAMR23 | 10 | ok (quebrada em #196 e #197) |
| #196 | Convites e cadastro por convite no backend | RNF05 | DW06, BD01 | @LUCASAMR23, @viniciusaugusto1997 | 5 | ok |
| #197 | Telas de convite e de cadastro por convite | RNF05 | DW04, DW06 | @DeaTuribio | 5 | ok (depende de #196) |
| #55 | US14: polimento, validação de carga e documentação de portfólio | RNF03, RNF05 | ES08, ES07 | @travensolli | 5 | ok |

### Mapa e simulação (must de produto desde 10/11)

As histórias viram roll-ups das tarefas abaixo, criadas em 10/11 com contrato, critérios de aceite e "Como verificar". O protótipo da @DeaTuribio (`docs/produto/prototipo-mapa-regioes.html`, branch `feature/51-visualizacao-geografica-por-bolhas-mapa`) é a referência visual.

| Issue | Título | História | Requisito | Responsável | Estimativa | Prioridade |
|---|---|---|---|---|---|---|
| #318 | ADR da biblioteca de mapas e das imagens de satélite | #51 | RF13 | @DeaTuribio | 1 | must |
| #319 | `GET /api/regions` com coordenadas, intensidade e % renovável | #51 | RF13, RF15 | @LUCASAMR23 | 3 | must |
| #320 | `GET /api/regions/summary` com energia e CO₂e por região no período | #51 | RF13, RF14 (BD04) | @viniciusaugusto1997 | 3 | must |
| #321 | Funções de região no frontend: agregação, pior estado, alternativa e estimativa | #51 | RF13, RF15 | @travensolli | 2 | must |
| #322 | Mapa de bolhas por região no Dashboard | #51 | RF12, RF13 | @DeaTuribio | 5 | must |
| #325 | Fórmulas da simulação, eficiência e rede limpa em `calculos.md` | #53 | RF07, RF15 | @henriqueptbd-cell | 1 | must |
| #326 | Alternativa mais limpa no mapa: destino e redução estimada | #53 | RF15 | @DeaTuribio | 3 | must |
| #324 | Selo de rede limpa na tabela e no mapa | #51 | RF12, RF13 | @travensolli | 1 | should |
| #323 | Modo apresentação do mapa com pausa | #51 | RF13 | @DeaTuribio | 2 | could |

### Comparação, eficiência e polimento (should, a partir de 10/11)

| Issue | Título | História | Requisito | Responsável | Estimativa | Prioridade |
|---|---|---|---|---|---|---|
| #327 | Potência por recurso (`powerBreakdown`) em `/api/services` e `/api/services/compare` | #226 | RF07, RF15 | @LUCASAMR23 | 2 | should |
| #328 | Comparação com impacto primeiro, intensidade da região e potência por recurso | #226 | RF07, RF15 | @henriqueptbd-cell | 3 | should |
| #329 | Eficiência energética e de carbono no ranking e na comparação | #226 | RF14, RF15 | @henriqueptbd-cell | 2 | should |
| #330 | Tabela do Dashboard com energia e CO₂e das 24 h e parte de cada serviço | #55 | RF09, RF14 | @travensolli | 2 | should |
| #331 | Avisos de mudança de estado dos serviços a cada atualização | #55 | RF02, RF05, RF06 | @travensolli | 2 | should |
| #332 | Eixo do gráfico de Emissões ajustado ao trecho com dados | #55 | RF09 | @travensolli | 1 | should |
| #333 | Equivalências do CO₂e com fatores citados | #55 | RF07 | @henriqueptbd-cell | 2 | could (só com fatores em `calculos.md` até 17/11) |

### Could (puxadas depois dos must, na ordem abaixo)

| Issue | Título | Requisito | Critério | Responsável | Estimativa | DoR |
|---|---|---|---|---|---|---|
| #226 | US11b: comparação orientada à decisão (Energia × intensidade = CO₂e) | RF07, RF15 | DW04, DW05, BD04 | @henriqueptbd-cell | roll-up | recorte de 10/11 em #327, #328 e #329 (should); o restante da história fica pendente se não couber |
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

**Total de código (revisto em 10/11):** pendências e must/should anteriores = 21 pontos (#313 3, #234 3, #196 5, #197 5, #55 5) + #256 sem estimativa; mapa e simulação = 19 pontos (#318–#326, sem #323); comparação, eficiência e polimento = 12 pontos (#327–#332); could = 13 pontos (#323 2, #333 2, #13 2, #24 5, #275 2). Total: 65 pontos. As histórias #195, #54, #51, #53 e #226 são roll-ups das tarefas filhas e não entram na soma. **Por decisão do time em 10/11, nenhuma issue sai da sprint** (US15, exportação e #275 incluídas). Como o total passa da capacidade, a ordem de trabalho e os pontos de controle da seção 5 definem o que entra primeiro; o que não for entregue é registrado como pendente no fechamento.

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
| Frontend concentrado em @DeaTuribio | alto | #256 assumida por @travensolli; #51 fica com ela porque já começou; #13/#24 só depois de #234, #197 e #51; revisão pelo par da frente | @travensolli |
| ES09 coletivo: @viniciusaugusto1997 não tinha item até esta planning | alto | #313 (BD04) e #196 (tabela `invitations`) com ele; PR até o checkpoint | @viniciusaugusto1997 |
| #226 com 22 pontos e ainda em refinamento | médio | recorte de 10/11 em #327–#329; o restante da história fica pendente se não couber | @henriqueptbd-cell |
| Capacidade com todas as issues mantidas (65 pontos) | alto | pontos de controle: 13/11 (#319 em revisão, #321 e #325 mergeadas), 15/11 (#322 em revisão; se não, corta #323 e #324 da ordem), 17/11 (#313 em revisão, gatilho de BD04), 19/11 (tudo em revisão). Ajuste de responsáveis de #197, #24 e #13 discutido na daily de 11/11 | @travensolli |
| Mapa dependente de internet para as imagens | médio | fundo offline com contorno dos países e aviso de falha, decididos no ADR #318 | @DeaTuribio |
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
- **Revisão de 10/11 (após o documento "EcoPulse: ideias para a Sprint final e prazos", de @DeaTuribio):**
  - Todas as issues continuam na sprint, inclusive US15 (#195–#197), exportação (#54, #13, #24) e #275.
  - #51 e #53 sobem para `prioridade:must` de produto: respondem às perguntas do desafio "como as regiões influenciam a emissão" e "qual o impacto de migrar para uma região mais limpa".
  - O mapa é dividido pela fronteira natural: componente visual com @DeaTuribio (#322) e funções puras testadas com @travensolli (#321), com as assinaturas combinadas na issue até 11/11.
  - O backend entrega `GET /api/regions` (#319, repassa o `/regions` da Carbon API, que já traz coordenadas, intensidade e % renovável) e `GET /api/regions/summary` (#320, `GROUP BY region_code`, mais evidência de BD04), em vez de coordenadas em `/api/services`.
  - O mapa usa o mesmo período de 24 h dos KPIs; a cor da bolha é a do pior estado, com os nomes do código ("Indisponível"); serviços removidos ficam fora do mapa.
  - A alternativa mais limpa é a de menor intensidade entre todas as regiões da Carbon API, inclusive as sem serviço.
  - Eficiência (pergunta do desafio): potência média (W) e intensidade da região (g CO₂e/kWh); W/%CPU foi descartada porque, no modelo oficial, dá ≈ 1 para todos os serviços (#325).
  - A US11b (#226) fica no recorte #327–#329, que também mostra o peso de memória, disco e rede (composição da potência), e não só da CPU.
  - Imagens de satélite: EOX Sentinel-2 cloudless como padrão, com licença conferida no ADR (#318).

## 7. Encaminhamentos

- [x] Issue fixada "Daily — Sprint 3" (#310) criada (@travensolli)
- [x] `docs/sprints/sprint-3.md` inicial criado (@travensolli)
- [x] Issue #313 (BD04) criada e atribuída (@travensolli)
- [x] Issues abertas da sprint com responsável e cartão em "Sprint Backlog" ou além (@travensolli)
- [x] `docs/backlog/product-backlog.md` regenerado (@travensolli)
- [ ] Story Points de #256, #167, #169, #310 e #311 (@henriqueptbd-cell, até 11/11)
- [x] Escopo de #226 decidido e quebrado em tarefas ≤5: #327, #328 e #329 (10/11)
- [x] Tarefas #318–#333 criadas com critérios de aceite, "Como verificar", Story Points e milestone `Sprint 3` (@travensolli, 10/11)
- [ ] Assinaturas de `utils/regions.ts` (#321) e contratos de #319 e #320 confirmados nas issues (@travensolli, @DeaTuribio, @LUCASAMR23, @viniciusaugusto1997, até 11/11)
- [ ] #325 (`calculos.md`) mergeada (@henriqueptbd-cell, até 13/11)
