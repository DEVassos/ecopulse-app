# Sprint Planning — Sprint 2

| Campo | Valor |
|---|---|
| Data e local | 20/10/2026, sala de aula (retrospectiva da Sprint 1 + início da planning), 90 min |
| Presentes | @henriqueptbd-cell (PO), @travensolli (SM), @DeaTuribio, @LUCASAMR23, @viniciusaugusto1997 (conferir na ata da retrospectiva) |
| Ausentes | nenhum registrado até a planning |
| Período da sprint | 20/10 a 09/11/2026 · checkpoint 30/10 · congelamento 08/11 20h · review 09/11 19h30 (a confirmar) |
| Milestone | `Sprint 2` |

## 1. Objetivo da sprint

Dashboard completo com energia e CO₂e por serviço e indicadores agregados, tolerância a falhas (serviço indisponível, sem métricas, API fora do ar) visível na interface, atualização periódica com intervalo e "Última atualização" informados, e área de configuração do monitoramento protegida por JWT no backend. A identidade visual volta ao fundo azul-escuro, com verde só em ações e destaques, e o logo pulsa a cada atualização (feedback da Review 1). Tudo o que foi aceito na Sprint 1 continua funcionando.

## 2. Capacidade

| Integrante | Dias disponíveis | Ausências previstas | Observações |
|---|---|---|---|
| @DeaTuribio | 14 | nenhuma registrada | frontend: dashboard, ranking, comparação |
| @LUCASAMR23 | 14 | nenhuma registrada | backend: cálculo, JWT, histórico |
| @viniciusaugusto1997 | 14 | nenhuma registrada | db/backend: seed, erros, Vitest |
| @henriqueptbd-cell | 14 | nenhuma registrada | PO: histórias, aceite, plano, `calculos.md` |
| @travensolli | 14 | nenhuma registrada | SM: atas, quadro, CI, rulesets |

Feriados no período: 02/11 (daily assíncrona por texto, com ata). Capacidade total estimada: 70 pessoas-dia (5 × 14 dias úteis). Itens de processo não entram no total de pontos.

## 3. Itens selecionados (Sprint Backlog)

### Histórias

| Issue | Título | Requisito | Critério | Responsável | Estimativa | DoR |
|---|---|---|---|---|---|---|
| #43 | US02 — Motor de cálculo ambiental | RF07, RF12 | TP01, DW03 | @LUCASAMR23 | 5 | ok (quebrada em #18) |
| #45 | US04 — Dashboard executivo e operacional | RF08, RF09, RF11, RNF01, RNF02 | DW05 | @DeaTuribio | 13 | ok (quebrada em #21, #25, #132, #140, #175, #176, #180) |
| #48 | US07 — Autenticação segura JWT | RNF05 | DW06 | @LUCASAMR23 | 8 | ok (quebrada em #6, #20, #25) |
| #49 | US08 — Histórico de coletas e SQL de análise | RF04, RF10 | BD04 (apoio), DW03 | @LUCASAMR23 | 8 | **atenção**: 8 pontos e só a #140 como tarefa; quebrar até 23/10 |
| #50 | US09 — Ranking de impacto e eficiência | RF14 | BD04, DW05 | @DeaTuribio | 5 | ok |
| #51 | US10 — Mapa de bolhas | RF12, RF13 | DW05 (could) | — | 5 | could: puxada só se sobrar capacidade |
| #52 | US11 — Comparação entre serviços | RF15 | BD04, DW05 | @DeaTuribio | 8 | **atenção**: 8 pontos sem tarefas; quebrar até 23/10 |

### Tarefas de código

| Issue | Título | Requisito | Critério | Responsável | Estimativa | DoR |
|---|---|---|---|---|---|---|
| #6 | DB-03 Seed do usuário admin | RNF05 | BD01 | @viniciusaugusto1997 | 2 | ok |
| #18 | BE-05 Domain Service do cálculo | RF07 | TP01 | @LUCASAMR23 | 5 | ok |
| #20 | BE-07 Login JWT com bcrypt e middleware | RNF05 | DW06 | @LUCASAMR23 | 5 | ok |
| #21 | FE-02 Cards de KPIs executivos | RF08, RF09 | DW05 | @travensolli | 3 | ok |
| #25 | FE-06 Tela de login e proteção de rotas | RNF05 | DW06 | @henriqueptbd-cell | 3 | ok |
| #132 | Gráfico de CPU no histórico | RF10 | DW04 | @travensolli | 2 | ok |
| #140 | Histórico marca buracos de coleta | RF04, RF10 | DW05 | @henriqueptbd-cell | 2 | ok |
| #173 | Classes de domínio com encapsulamento (TP01) | RF07, RF02 | TP01 | @LUCASAMR23 | 3 | ok |
| #174 | Erros tipados e middleware (TP03) | RNF04, RF02, RF05, RF06 | TP03 | @viniciusaugusto1997 | 3 | ok |
| #175 | Painel de indicadores agregados | RF08 | DW05, BD04 | @DeaTuribio, @LUCASAMR23 | 3 | ok |
| #176 | Intervalo configurável e estados destacados | RF05, RF06, RF11 | DW05, DW06 | @DeaTuribio | 3 | ok |
| #180 | Fundo azul, verde nos destaques e logo pulsante | RNF01 | DW04 (apoio), ES08 | @DeaTuribio | 2 | ok |

### Processo e qualidade (feedback da Review 1)

| Issue | Título | Requisito | Critério | Responsável | Estimativa | DoR |
|---|---|---|---|---|---|---|
| #159 | Priorizar comparação e análise | RF14, RF15 | ES01 | @henriqueptbd-cell | — | ok |
| #160 | ESLint no frontend e no CI | DW01 | TP02 | @travensolli | — | ok |
| #161 | Validar formato das respostas da API | RNF04 | TP02 | @travensolli | — | ok |
| #162 | Testes de integração PG no CI | RNF04 | TP03 | @travensolli | — | ok |
| #163 | Atualizar Vitest do backend | DW01 | TP03 | @viniciusaugusto1997 | — | ok |
| #164 | Rulesets: checks e validação cruzada | RNF04 | ES07 | @travensolli | — | ok |
| #165 | Permalinks com SHA no plano | ES04 | ES04 | @henriqueptbd-cell | — | ok |
| #166 | Dúvidas estruturadas ao cliente | ES01 | ES06 | @henriqueptbd-cell | — | ok |
| #167 | Contrato de integração na issue | ES03 | ES03 | @DeaTuribio | — | ok |
| #168 | Revisão cruzada em todo PR | ES07 | ES07 | @travensolli | — | ok |
| #169 | Daily por texto no mesmo dia | ES09 | ES09 | @travensolli | — | ok |
| #178 | Planejamento da Sprint 2 | ES02 | ES02 | @travensolli | — | ok |

**Total de código:** 36 pontos em tarefas + 18 em histórias sem tarefas (#50 5, #52 8, #51 5 could) + 6 restantes da #49 (8 − 2 da #140) = **60 pontos** (55 sem a #51, que é `could`). As histórias #43, #45 e #48 são roll-ups e não entram na soma. Itens de processo não entram no total.

## 4. Critérios da rubrica previstos e denominador

| Código | Pontos | Entrega que o comprova | Responsável |
|---|---|---|---|
| ES01–ES09 | 40 | processo e registros da sprint (plano, atas, DoD, contribuição) | PO + SM + todos |
| DW01 | 3 | módulos frontend/backend em TypeScript estrito | @DeaTuribio, @LUCASAMR23 |
| DW05 | 3 | dashboard com energia, CO₂e, estados, intervalo e "Última atualização" | @DeaTuribio |
| DW06 | 3 | JWT no backend + bcrypt + rotas de configuração protegidas | @LUCASAMR23, @viniciusaugusto1997 |
| TP01 | 6 | classes de domínio com encapsulamento e uso real | @LUCASAMR23 |
| TP03 | 6 | erros tipados + error-handler + falhas visíveis | @viniciusaugusto1997 |

**Denominador da sprint:** 61 pontos. Gatilhos: se #173/#174 não estiverem em `develop` até 30/10, TP01/TP03 são replanejados com registro no histórico do plano; regressão de DW02, DW03, DW04, BD01–BD03 ou TP02 (aceitos na S1) derruba a nota cumulativa.

## 5. Riscos e dependências

| Risco | Impacto | Mitigação | Dono |
|---|---|---|---|
| APIs auxiliares instáveis (métricas/carbono) | alto | timeout, cache do último valor e estado `indisponivel` visível; nunca exibir resultado válido após falha | @LUCASAMR23 |
| Carga de backend concentrada em @LUCASAMR23 | alto | #174 e #163 com @viniciusaugusto1997; revisão cruzada; quebrar #49 em tarefas | @henriqueptbd-cell |
| #49 e #52 com 8 pontos e sem tarefas suficientes (DoR) | médio | PO quebra em tarefas até 23/10 e atualiza a milestone | @henriqueptbd-cell |
| #52 depende de #49 e #50 | médio | implementar a comparação depois do ranking e do histórico; não bloquear o início da sprint | @DeaTuribio |
| Frontend com #45, #50, #52 e #51 (could) | alto | priorizar #45 e #50; #51 só se sobrar capacidade | @DeaTuribio |
| Paleta e animação do logo podem desatualizar prints/docs e falhar em acessibilidade | médio | refazer `docs/identidade-visual.md` e prints no mesmo PR (#180); testar falha de atualização e `prefers-reduced-motion`; usar tokens, sem hex solto | @DeaTuribio |
| 02/11 (feriado) reduz um dia útil | baixo | daily assíncrona por texto, com ata | @travensolli |
| Rulesets dependem de acesso admin à org | médio | #164 com o SM; se o acesso faltar, registrar o bloqueio na issue e no plano | @travensolli |

## 6. Decisões da planning

- Comparação entre serviços (#52) e ranking (#50) entram na Sprint 2 para responder ao feedback da Review 1 (#159); BD04 continua previsto formalmente na Sprint 3, mas as consultas de análise são entregues já na S2 em #49, #50 e #175.
- TP01 (#173) e TP03 (#174) entram na Sprint 2 como tarefas explícitas, com donos nomeados, para não depender de "sobra" das histórias.
- #51 (mapa) permanece `could`: só é puxada se as histórias `must` estiverem concluídas até 06/11.
- Par de revisão da sprint: a dupla que desenvolve cada frente revisa os PRs um do outro, mesmo quando o revisor é co-autor, porque é quem acompanha o que está sendo feito. Frontend: @DeaTuribio ↔ @travensolli; backend e banco/infra: @LUCASAMR23 ↔ @viniciusaugusto1997; processos: @henriqueptbd-cell ↔ @travensolli. A aprovação começa com "DoD verificada" e descreve o que foi executado. Fonte: `.github/equipe.json` (#185).
- Nenhum critério muda de sprint nesta planning; o denominador continua 61.
- A tarefa #180 (fundo azul-escuro, verde só em ações/destaques e logo pulsante, RNF01, 2 pts) entra na Sprint 2 a partir do feedback da Review 1; é uma entrega parcial de RNF01, cuja revisão final de responsividade continua na Sprint 3. O denominador segue 61.

## 7. Encaminhamentos

- [x] Issue fixada "Daily — Sprint 2" (#172) criada e fixada (@travensolli)
- [x] `docs/sprints/sprint-2.md` inicial criado (@travensolli)
- [x] Issues #173–#176 criadas e atribuídas (@henriqueptbd-cell)
- [x] Issue #180 criada e atribuída (@DeaTuribio)
- [x] Linhas da Sprint 2 no plano de entregas revisadas, incluindo #180 (@henriqueptbd-cell)
- [x] `docs/backlog/product-backlog.md` regenerado (@travensolli) — 108 issues, incluído neste PR
- [x] #49 e #52 quebradas em tarefas até 23/10 (@henriqueptbd-cell) — feito em 22/10 por @travensolli, como backup do PO: #188, #189 e #190 na #49; #193 e #194 na #52 (#198)
- [ ] `docs/calculos.md` com o exemplo numérico conferido (@henriqueptbd-cell)
