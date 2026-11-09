# Sprint 2 — Dashboard completo, tolerância a falhas e configuração protegida

| Campo | Valor |
|---|---|
| Período | 20/10 a 09/11/2026 · checkpoint 30/10 · congelamento 08/11 20h · review 09/11 19h30 (a confirmar) |
| Milestone | [Sprint 2](https://github.com/DEVassos/ecopulse-app/milestone/2) |
| Plano | [docs/plano-de-entregas.md § Sprint 2](../plano-de-entregas.md#sprint-2): critérios previstos, denominador e situação de cada critério |
| Atas | [planning](sprint-2/planning.md) · [dailies](sprint-2/dailies/) |
| Burndown | [sprint-2/burndown.md](sprint-2/burndown.md) — Story Points por dia, gerado por `.github/scripts/burndown.sh 2` |
| Versão entregue | branch `release/sprint-2`, criada em 09/11 de `develop` no commit [`0d03190`](https://github.com/DEVassos/ecopulse-app/commit/0d03190e65e7b8f9dd8ec17a4197602b8fc9fcec) (merge do PR #304, 08/11 16h09); nada entrou em `develop` depois do congelamento de 08/11 20h. Entrega acompanhada pela [#305](https://github.com/DEVassos/ecopulse-app/issues/305) |
| Review | [sprint-2/review.md](sprint-2/review.md) · vídeo [EcoPulse — Sprint 2](https://youtu.be/an9g07c_nIs) |

## 1. Objetivo da sprint

Dashboard completo com energia e CO₂e por serviço e indicadores agregados, tolerância a falhas (serviço indisponível, sem métricas, API fora do ar) visível na interface, atualização periódica com intervalo e "Última atualização" informados, e área de configuração do monitoramento protegida por JWT no backend. A identidade visual volta ao fundo azul-escuro, com verde só em ações e destaques, e o logo pulsa a cada atualização (feedback da Review 1). Tudo o que foi aceito na Sprint 1 continua funcionando.

## 2. Itens selecionados

A situação de cada critério previsto fica **só** no [plano de entregas](../plano-de-entregas.md#sprint-2); esta seção registra a seleção da sprint e o responsável.

| Issue | Título | Requisito | Critério | Responsável | Seleção |
|---|---|---|---|---|---|
| #43 | US02 — Motor de cálculo ambiental | RF07, RF12 | TP01, DW03 | @LUCASAMR23 | planejado |
| #45 | US04 — Dashboard executivo e operacional | RF08, RF09, RF11, RNF01, RNF02 | DW05 | @DeaTuribio | planejado |
| #48 | US07 — Autenticação segura JWT | RNF05 | DW06 | @LUCASAMR23 | planejado |
| #49 | US08 — Histórico de coletas e SQL de análise | RF04, RF10 | BD04 (apoio), DW03 | @LUCASAMR23 | planejado — quebrada em #140, #188, #189 e #190 em 22/10 |
| #50 | US09 — Ranking de impacto e eficiência | RF14 | BD04, DW05 | @DeaTuribio | planejado |
| #51 | US10 — Mapa de bolhas | RF12, RF13 | DW05 (could) | — | could |
| #52 | US11 — Comparação entre serviços | RF15 | BD04, DW05 | @DeaTuribio | planejado — quebrada em #193 e #194 em 22/10 |
| #6 | DB-03 Seed do usuário admin | RNF05 | BD01 | @viniciusaugusto1997 | planejado |
| #18 | BE-05 Domain Service do cálculo | RF07 | TP01 | @LUCASAMR23 | fora da sprint — entregue na Sprint 1 pelo PR #139; fechada em 22/10 |
| #20 | BE-07 Login JWT com bcrypt e middleware | RNF05 | DW06 | @LUCASAMR23 | planejado |
| #21 | FE-02 Cards de KPIs executivos | RF08, RF09 | DW05 | @travensolli | planejado — escopo: cards de estado; energia e CO₂e do período na #175 (22/10) |
| #25 | FE-06 Tela de login e proteção de rotas | RNF05 | DW06 | @henriqueptbd-cell | planejado |
| #132 | Gráfico de CPU no histórico | RF10 | DW04 | @travensolli | planejado |
| #140 | Histórico marca buracos de coleta | RF04, RF10 | DW05 | @henriqueptbd-cell | planejado |
| #173 | Classes de domínio com encapsulamento (TP01) | RF07, RF02 | TP01 | @LUCASAMR23 | planejado |
| #174 | Erros tipados e middleware (TP03) | RNF04, RF02, RF05, RF06 | TP03 | @viniciusaugusto1997 | planejado |
| #175 | Painel de indicadores agregados | RF08 | DW05, BD04 | @DeaTuribio, @LUCASAMR23 | planejado |
| #176 | Intervalo configurável e estados destacados | RF05, RF06, RF11 | DW05, DW06 | @DeaTuribio | planejado |
| #180 | Fundo azul, verde nos destaques e logo pulsante | RNF01 | DW04 (apoio), ES08 | @DeaTuribio | planejado |
| #188 | Energia e CO₂e por coleta em `GET /api/collections` | RF07, RF10 | DW03 | @viniciusaugusto1997 | planejado — entrou em 22/10 (#49) |
| #189 | Série de energia e CO₂e por intervalo (`GET /api/collections/series`) | RF10, RF07 | DW03, BD04 (apoio) | @viniciusaugusto1997 | planejado — entrou em 22/10 (#49) |
| #190 | Página Emissões com gráfico de CO₂e por estação | RF07, RF09, RF10 | DW04, DW05 | @DeaTuribio, @travensolli | planejado — entrou em 22/10 (#49) |
| #193 | Comparação entre serviços em `GET /api/services/compare` | RF15 | DW03, BD04 (apoio) | @LUCASAMR23 | planejado — entrou em 22/10 (#52) |
| #194 | Tela de comparação entre serviços | RF15 | DW04, DW05 | @travensolli | planejado — entrou em 22/10 (#52) |

Itens de processo e qualidade (12): #159, #160, #161, #162, #163, #164, #165, #166, #167, #168, #169 e #178 — detalhes e responsáveis no [planning](sprint-2/planning.md).

## 3. Riscos e dependências

| Risco | Impacto | Mitigação | Dono |
|---|---|---|---|
| APIs auxiliares instáveis (métricas/carbono) | alto | timeout, cache do último valor e estado `indisponivel` visível; nunca exibir resultado válido após falha | @LUCASAMR23 |
| Carga de backend concentrada em @LUCASAMR23 | alto | #174 e #163 com @viniciusaugusto1997; revisão cruzada; quebrar #49 em tarefas | @henriqueptbd-cell |
| #49 e #52 com 8 pontos e sem tarefas suficientes (DoR) | médio | quebradas em 22/10: #188, #189 e #190 na #49; #193 e #194 na #52 | @henriqueptbd-cell |
| @viniciusaugusto1997 em viagem programada (combinada com o professor e a equipe), com a volta registrada por ele em 30/10 ([ata de 30/10](sprint-2/dailies/2026-10-30.md)); seguiam com ele a #174 (TP03) e a #6 | alto | a #188 e a #189 passaram para @henriqueptbd-cell em 22/10 e foram mergeadas em 25 e 26/10 ([ata de 22/10](sprint-2/dailies/2026-10-22.md)); a #6 foi concluída pelo PR #224 em 30/10 e a #174, com @henriqueptbd-cell, pelo PR #233 em 02/11, dois dias depois do gatilho de 30/10 (planning § 4); o PR #242 (#163), mergeado em 02/11, é o primeiro dele na sprint ([ata de 02/11](sprint-2/dailies/2026-11-02.md)); em 03/11 ele abriu o backend da #176 (#250 e #251, PRs #253 e #254) | @travensolli |
| #52 depende de #49 e #50 | médio | implementar a comparação depois do ranking e do histórico | @DeaTuribio |
| Frontend com #45, #50, #52 e #51 (could) | alto | priorizar #45 e #50; #51 só se sobrar capacidade | @DeaTuribio |
| Paleta e animação do logo podem desatualizar prints/docs e falhar em acessibilidade | médio | refazer `docs/identidade-visual.md` e prints no mesmo PR (#180); testar falha e `prefers-reduced-motion` | @DeaTuribio |
| 02/11 (feriado) reduz um dia útil | baixo | daily assíncrona por texto, com ata | @travensolli |
| Rulesets dependem de acesso admin à org | médio | #164 com o SM; registrar o bloqueio se o acesso faltar | @travensolli |

## 4. Verificações realizadas (aplicação da DoD)

| Item | Como foi verificado | Quem | Resultado |
|---|---|---|---|
| #164 / PRs [#191](https://github.com/DEVassos/greener-app/pull/191) e [#192](https://github.com/DEVassos/greener-app/pull/192) | Depois do merge, `bash .agilekit/scripts/gh-bootstrap.sh --rulesets`; `gh api repos/DEVassos/greener-app/rulesets/24529098` (`develop`) e `.../24529100` (`main`) mostram os sete checks obrigatórios (`commits`, `pr`, `docs`, `backend`, `frontend`, `compose`, `schema`), `bypass_actors` vazio e `require_last_push_approval: true`, iguais aos JSON versionados, e `current_user_can_bypass: never` para admin | @travensolli | aplicado em 22/10 |
| [US02 #43](https://github.com/DEVassos/greener-app/issues/43) | `cd backend && npm test -- --run tests/carbon-calculator.test.ts tests/carbon-api.test.ts tests/collector.test.ts` (56 testes); `GET /api/collections?limit=50` retorna coleta calculada; `CarbonCalculator` com o exemplo de `docs/calculos.md` retorna 50,870000 W, 0,000847833333 kWh e 0,072065833333 gCO₂e | @henriqueptbd-cell (PO) | aceite técnico verificado em 02/11; PR de rastreabilidade aguardando revisão |
| [TP01 #173](https://github.com/DEVassos/greener-app/issues/173) | `(cd backend && npx vitest run tests/domain-models.test.ts tests/carbon-calculator.test.ts)` → 8 testes passando; `grep -rnE "from '(\.\./)+domain/" backend/src` → 5 linhas: quatro imports em `jobs/collector.ts` e `MonitoringStatus` em `modules/services/services.service.ts` (`EnergyEstimate` não é importado: chega pelo retorno de `CarbonCalculator.calculate()`); `git log -1 origin/develop -- backend/src/domain/` → `42f169d`, sem alteração desde o merge | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) (PO) | verificado em 06/11; [aceite registrado na #173](https://github.com/DEVassos/greener-app/issues/173#issuecomment-6699345099) e linha do plano em `Concluído` no PR #290 |
| Teste do avaliador: clone limpo de `develop` em [`0d03190`](https://github.com/DEVassos/ecopulse-app/commit/0d03190e65e7b8f9dd8ec17a4197602b8fc9fcec), reteste dos critérios da Sprint 1 (DW07, BD01, BD03) | `bash .agilekit/scripts/teste-avaliador.sh --ref develop`, com backend, frontend e PostgreSQL nas portas 3100, 5273 e 5534 por `compose.override.yaml`, para não parar a stack local: compose no ar; `GET /health` 200; banco com 5 tabelas; `collections` de 16 para 24 linhas depois de `docker compose restart`; `database/schema.sql` aplicado em PostgreSQL 16 vazio (5 tabelas) | @travensolli | passou em 09/11 |
| CI de `develop` no commit do congelamento (reteste de DW01, DW02, DW03, BD02 e TP02) | `gh run list --branch develop`: workflows `checks` (`commits`, `pr`, `docs`) e `ci` (`backend` com PostgreSQL, `frontend` com lint, `compose`, `schema`) em `0d03190`; `bash .github/scripts/check-forbidden.sh` e `check-docs.sh` locais | @travensolli | verde em 08/11 19h10; scripts sem erros em 09/11 |
| [US04 #45](https://github.com/DEVassos/ecopulse-app/issues/45) | Dashboard com 8 serviços na stack isolada `ecopulse-verify`; leitura nova sem recarregar em 35 s; 390 px sem rolagem da página; backend parado mantém as 8 linhas com o aviso | @henriqueptbd-cell (PO) | [aceite em 07/11](https://github.com/DEVassos/ecopulse-app/issues/45#issuecomment-6713216324), com ressalva sobre os segundos no selo, [respondida por @DeaTuribio](https://github.com/DEVassos/ecopulse-app/issues/45#issuecomment-6713244901) |
| [US07 #48](https://github.com/DEVassos/ecopulse-app/issues/48) | `POST /api/auth/login` 200; `PUT /api/monitoring-settings` 401 sem token e 200 com JWT; token inválido leva ao `/login`; senha do seed como hash bcrypt | @henriqueptbd-cell (PO) | [aceite em 07/11](https://github.com/DEVassos/ecopulse-app/issues/48#issuecomment-6713216411) |
| [US08 #49](https://github.com/DEVassos/ecopulse-app/issues/49) | `GET /api/collections/series` (24 h, 15 min) conferido contra SQL manual; `/emissoes?servico=5` mostra os mesmos totais da API | @henriqueptbd-cell (PO) | [aceite em 07/11](https://github.com/DEVassos/ecopulse-app/issues/49#issuecomment-6713216439) |
| [US09 #50](https://github.com/DEVassos/ecopulse-app/issues/50) | `GET /api/services/ranking` para CO₂e e energia conferido contra SQL manual; partes no dashboard somam 100,0% | @henriqueptbd-cell (PO) | [aceite em 07/11](https://github.com/DEVassos/ecopulse-app/issues/50#issuecomment-6713216339) |
| [US11 #52](https://github.com/DEVassos/ecopulse-app/issues/52) | `GET /api/services/compare` conferido contra SQL manual em `develop` (`e1ffdc8`); tela e gráficos da comparação com dados reais | @DeaTuribio | [verificação em 03/11](https://github.com/DEVassos/ecopulse-app/issues/52#issuecomment-6610988364) |

**Exceções à DoD-PR**, registradas porque não há como corrigi-las depois do merge:

- [#191](https://github.com/DEVassos/greener-app/pull/191) e [#192](https://github.com/DEVassos/greener-app/pull/192) (#164): mergeados sem aprovação, por bypass de admin, por decisão de @travensolli (SM) em 22/10, para cumprir o prazo da #164 (23/10) com o PO ausente. Foram os últimos merges possíveis com bypass, porque a própria #164 o removeu.

- [#170](https://github.com/DEVassos/ecopulse-app/pull/170), [#171](https://github.com/DEVassos/ecopulse-app/pull/171), [#206](https://github.com/DEVassos/ecopulse-app/pull/206), [#207](https://github.com/DEVassos/ecopulse-app/pull/207), [#208](https://github.com/DEVassos/ecopulse-app/pull/208), [#213](https://github.com/DEVassos/ecopulse-app/pull/213), [#214](https://github.com/DEVassos/ecopulse-app/pull/214), [#215](https://github.com/DEVassos/ecopulse-app/pull/215), [#227](https://github.com/DEVassos/ecopulse-app/pull/227), [#228](https://github.com/DEVassos/ecopulse-app/pull/228), [#229](https://github.com/DEVassos/ecopulse-app/pull/229) e [#295](https://github.com/DEVassos/ecopulse-app/pull/295): aprovados por alguém diferente do autor, mas a aprovação não começa com "DoD verificada", como pede a [DoD § 4](../processo/definition-of-done.md#4-como-a-aplicação-da-dod-é-evidenciada). Conferido com `gh pr view <n> --json reviews` em 09/11.

## 5. Itens no congelamento (08/11/2026)

A milestone `Sprint 2` tem 75 issues: 73 fechadas por PR mergeado em `develop` ou por aceite registrado, a [#177](https://github.com/DEVassos/ecopulse-app/issues/177), fechada como duplicada da [#172](https://github.com/DEVassos/ecopulse-app/issues/172), e a própria #172, aberta até o fechamento. A coluna Evidência traz o PR que entregou cada item e, nas histórias, o aceite. A situação de cada critério fica só no [plano de entregas](../plano-de-entregas.md#sprint-2).

O PR [#214](https://github.com/DEVassos/ecopulse-app/pull/214) (backend da comparação, #193, RF15) é o único PR com cartão próprio no quadro, que só adiciona issues automaticamente. O cartão ficou em "Backlog" depois do merge de 25/10. Em 09/11 ele recebeu a milestone `Sprint 2` e passou para "Concluído", por decisão do SM.

### 5.1 Histórias

| Issue | Título | Requisito | Evidência | Responsável |
|---|---|---|---|---|
| [#43](https://github.com/DEVassos/ecopulse-app/issues/43) | US02 — Motor de cálculo ambiental (potência, energia e CO₂e) | RF07 RF12 | [#249](https://github.com/DEVassos/ecopulse-app/pull/249) · [aceite do PO em 03/11](https://github.com/DEVassos/ecopulse-app/issues/43#issuecomment-6592927159) | @LUCASAMR23 |
| [#45](https://github.com/DEVassos/ecopulse-app/issues/45) | US04 — Dashboard executivo e operacional em tempo real | RF08 RF09 RF11 RNF01 RNF02 | [aceite do PO em 07/11](https://github.com/DEVassos/ecopulse-app/issues/45#issuecomment-6713216324) | @DeaTuribio |
| [#48](https://github.com/DEVassos/ecopulse-app/issues/48) | US07 — Autenticação segura JWT (backend e frontend) | RNF05 | [aceite do PO em 07/11](https://github.com/DEVassos/ecopulse-app/issues/48#issuecomment-6713216411) | @LUCASAMR23 |
| [#49](https://github.com/DEVassos/ecopulse-app/issues/49) | US08 — Histórico de coletas e consultas SQL de análise | RF04 RF10 | [aceite do PO em 07/11](https://github.com/DEVassos/ecopulse-app/issues/49#issuecomment-6713216439) | @LUCASAMR23 |
| [#50](https://github.com/DEVassos/ecopulse-app/issues/50) | US09 — Ranking de impacto e eficiência energética | RF14 | [aceite do PO em 07/11](https://github.com/DEVassos/ecopulse-app/issues/50#issuecomment-6713216339) | @DeaTuribio |
| [#52](https://github.com/DEVassos/ecopulse-app/issues/52) | US11 — Módulo de comparação entre serviços | RF15 | [verificação de @DeaTuribio em 03/11](https://github.com/DEVassos/ecopulse-app/issues/52#issuecomment-6610988364) | @DeaTuribio |

### 5.2 Tarefas e bugs

| Issue | Título | Requisito | Evidência | Responsável |
|---|---|---|---|---|
| [#6](https://github.com/DEVassos/ecopulse-app/issues/6) | [DB-03] Script de Seed seed.sql com Usuário Administrador Inicial | — | [#224](https://github.com/DEVassos/ecopulse-app/pull/224) | @viniciusaugusto1997 |
| [#20](https://github.com/DEVassos/ecopulse-app/issues/20) | [BE-07] Autenticação JWT: Login com bcrypt e Middleware de Proteção | — | [#208](https://github.com/DEVassos/ecopulse-app/pull/208) | @LUCASAMR23 |
| [#21](https://github.com/DEVassos/ecopulse-app/issues/21) | [FE-02] Componentização dos Cards de KPIs Executivos (Nível 1) | RF08 RF09 | [#202](https://github.com/DEVassos/ecopulse-app/pull/202) | @travensolli |
| [#25](https://github.com/DEVassos/ecopulse-app/issues/25) | [FE-06] Tela de Login e Proteção de Rotas Privadas (Área Restrita) | RNF05 | [#243](https://github.com/DEVassos/ecopulse-app/pull/243) | @travensolli |
| [#132](https://github.com/DEVassos/ecopulse-app/issues/132) | [tarefa] Gráfico de CPU no histórico do serviço | RF10 | [#201](https://github.com/DEVassos/ecopulse-app/pull/201) | @travensolli |
| [#140](https://github.com/DEVassos/ecopulse-app/issues/140) | [tarefa] Histórico de coletas marca buracos de coleta (Sem coleta por …) | RF04 RF10 | [#247](https://github.com/DEVassos/ecopulse-app/pull/247) | @henriqueptbd-cell |
| [#160](https://github.com/DEVassos/ecopulse-app/issues/160) | [tarefa] Verificação de lint com ESLint no frontend e no CI | RNF05 | [#230](https://github.com/DEVassos/ecopulse-app/pull/230) | @travensolli |
| [#161](https://github.com/DEVassos/ecopulse-app/issues/161) | [tarefa] Validar o formato das respostas da API nas fronteiras do frontend | RNF04 | [#235](https://github.com/DEVassos/ecopulse-app/pull/235) | @travensolli |
| [#162](https://github.com/DEVassos/ecopulse-app/issues/162) | [tarefa] Rodar os testes de integração com PostgreSQL no CI | RNF04 | [#241](https://github.com/DEVassos/ecopulse-app/pull/241) | @travensolli |
| [#163](https://github.com/DEVassos/ecopulse-app/issues/163) | [tarefa] Atualizar o Vitest do backend e eliminar os alertas do npm audit | — | [#242](https://github.com/DEVassos/ecopulse-app/pull/242) | @viniciusaugusto1997 |
| [#173](https://github.com/DEVassos/ecopulse-app/issues/173) | [tarefa] Classes de domínio com encapsulamento e testes (TP01) | RF02 RF07 | [#209](https://github.com/DEVassos/ecopulse-app/pull/209) | @LUCASAMR23 |
| [#174](https://github.com/DEVassos/ecopulse-app/issues/174) | [tarefa] Erros tipados e middleware de tratamento (TP03) | RF02 RF05 RF06 RNF04 | [#233](https://github.com/DEVassos/ecopulse-app/pull/233) | @henriqueptbd-cell, @viniciusaugusto1997 |
| [#175](https://github.com/DEVassos/ecopulse-app/issues/175) | [tarefa] Painel de indicadores agregados no dashboard (RF08) | RF08 | [#215](https://github.com/DEVassos/ecopulse-app/pull/215) | @DeaTuribio, @LUCASAMR23 |
| [#176](https://github.com/DEVassos/ecopulse-app/issues/176) | [tarefa] Intervalo de atualização configurável e estados destacados | RF05 RF06 RF11 RNF02 | [#270](https://github.com/DEVassos/ecopulse-app/pull/270) | @DeaTuribio, @viniciusaugusto1997 |
| [#180](https://github.com/DEVassos/ecopulse-app/issues/180) | [tarefa] Fundo azul com verde nos destaques e logo que pulsa a cada atualização | RNF01 | [#184](https://github.com/DEVassos/ecopulse-app/pull/184) | @DeaTuribio |
| [#188](https://github.com/DEVassos/ecopulse-app/issues/188) | [tarefa] Expõe energia e CO₂e por coleta em GET /api/collections | RF07 RF10 | [#206](https://github.com/DEVassos/ecopulse-app/pull/206) | @henriqueptbd-cell |
| [#189](https://github.com/DEVassos/ecopulse-app/issues/189) | [tarefa] Série de energia e CO₂e por intervalo em GET /api/collections/series | RF04 RF07 RF10 | [#207](https://github.com/DEVassos/ecopulse-app/pull/207) | @henriqueptbd-cell |
| [#190](https://github.com/DEVassos/ecopulse-app/issues/190) | [tarefa] Página Emissões com gráfico de CO₂e por estação | RF07 RF09 RF10 | [#223](https://github.com/DEVassos/ecopulse-app/pull/223), [#216](https://github.com/DEVassos/ecopulse-app/pull/216), [#200](https://github.com/DEVassos/ecopulse-app/pull/200) | @travensolli, @DeaTuribio |
| [#193](https://github.com/DEVassos/ecopulse-app/issues/193) | [tarefa] Comparação entre serviços em GET /api/services/compare | RF15 | [#214](https://github.com/DEVassos/ecopulse-app/pull/214) | @LUCASAMR23 |
| [#194](https://github.com/DEVassos/ecopulse-app/issues/194) | [tarefa] Tela de comparação entre serviços | RF15 | [#219](https://github.com/DEVassos/ecopulse-app/pull/219) | @travensolli |
| [#203](https://github.com/DEVassos/ecopulse-app/issues/203) | [tarefa] Tabela e aviso de falha legíveis em notebook | RF09 RF11 RNF01 | [#217](https://github.com/DEVassos/ecopulse-app/pull/217) | @travensolli |
| [#212](https://github.com/DEVassos/ecopulse-app/issues/212) | [bug] Tempo real continua ligado depois do Voltar do navegador em /emissoes | RF07 | [#245](https://github.com/DEVassos/ecopulse-app/pull/245) | @travensolli |
| [#218](https://github.com/DEVassos/ecopulse-app/issues/218) | [tarefa] Gráfico de energia e CO₂e na tela de comparação | RF15 | [#225](https://github.com/DEVassos/ecopulse-app/pull/225) | @travensolli |
| [#222](https://github.com/DEVassos/ecopulse-app/issues/222) | [tarefa] Refazer o print da página Emissões com o backend real | RF10 | [#223](https://github.com/DEVassos/ecopulse-app/pull/223) | @DeaTuribio |
| [#231](https://github.com/DEVassos/ecopulse-app/issues/231) | [tarefa] Marcar o ADR 0007 como aceito após o PR #230 | RNF05 | [#232](https://github.com/DEVassos/ecopulse-app/pull/232) | @travensolli |
| [#236](https://github.com/DEVassos/ecopulse-app/issues/236) | [tarefa] Registrar em ADR a conferência de respostas nas fronteiras de API | RNF04 | [#238](https://github.com/DEVassos/ecopulse-app/pull/238) | @travensolli |
| [#237](https://github.com/DEVassos/ecopulse-app/issues/237) | [tarefa] Conferir as respostas do resumo e da comparação no frontend | RF08 RF15 RNF04 | [#268](https://github.com/DEVassos/ecopulse-app/pull/268) | @DeaTuribio |
| [#239](https://github.com/DEVassos/ecopulse-app/issues/239) | [tarefa] Implementar resumo e comparação no backend falso do frontend | RF08 RF15 | [#240](https://github.com/DEVassos/ecopulse-app/pull/240) | @travensolli |
| [#246](https://github.com/DEVassos/ecopulse-app/issues/246) | [bug] Backend reinicia na primeira subida do compose (healthcheck do banco) | — | [#248](https://github.com/DEVassos/ecopulse-app/pull/248) | @DeaTuribio |
| [#250](https://github.com/DEVassos/ecopulse-app/issues/250) | [tarefa] Configuração persistida do dashboard no backend | RF11 RNF02 | [#253](https://github.com/DEVassos/ecopulse-app/pull/253) | @viniciusaugusto1997 |
| [#251](https://github.com/DEVassos/ecopulse-app/issues/251) | [tarefa] Motivo seguro da indisponibilidade no backend | RF05 RF06 | [#254](https://github.com/DEVassos/ecopulse-app/pull/254) | @viniciusaugusto1997 |
| [#257](https://github.com/DEVassos/ecopulse-app/issues/257) | [tarefa] Login na página raiz e aplicação inteira protegida por JWT | RNF05 | [#269](https://github.com/DEVassos/ecopulse-app/pull/269) | @DeaTuribio, @viniciusaugusto1997 |
| [#258](https://github.com/DEVassos/ecopulse-app/issues/258) | [tarefa] Polimento visual das telas (acessibilidade, consistência e celular) | RNF01 | [#264](https://github.com/DEVassos/ecopulse-app/pull/264) | @travensolli |
| [#259](https://github.com/DEVassos/ecopulse-app/issues/259) | [tarefa] Dashboard com o impacto primeiro e colunas da última leitura | RF08 RF09 | [#276](https://github.com/DEVassos/ecopulse-app/pull/276) | @travensolli |
| [#260](https://github.com/DEVassos/ecopulse-app/issues/260) | [tarefa] Ranking de CO₂e das últimas 24 h no dashboard, com participação | RF14 | [#288](https://github.com/DEVassos/ecopulse-app/pull/288) | @DeaTuribio |
| [#261](https://github.com/DEVassos/ecopulse-app/issues/261) | [tarefa] Tabela de serviços com dado antigo e removido apagados | RF09 RNF04 | [#277](https://github.com/DEVassos/ecopulse-app/pull/277) | @travensolli |
| [#262](https://github.com/DEVassos/ecopulse-app/issues/262) | [tarefa] Acessibilidade: leitura do período, placeholder, alvos e teclado | RNF01 | [#278](https://github.com/DEVassos/ecopulse-app/pull/278) | @travensolli |
| [#263](https://github.com/DEVassos/ecopulse-app/issues/263) | [tarefa] Celular sem esconder energia e CO₂e | RNF01 | [#279](https://github.com/DEVassos/ecopulse-app/pull/279) | @travensolli |
| [#265](https://github.com/DEVassos/ecopulse-app/issues/265) | [tarefa] Tema claro alternável com o escuro | RNF01 | [#280](https://github.com/DEVassos/ecopulse-app/pull/280) | @travensolli |
| [#266](https://github.com/DEVassos/ecopulse-app/issues/266) | [tarefa] Números na fonte de texto com algarismos tabulares | RNF01 | [#281](https://github.com/DEVassos/ecopulse-app/pull/281) | @travensolli |
| [#267](https://github.com/DEVassos/ecopulse-app/issues/267) | [tarefa] Filtros de Emissões e Comparação em grupos | RF15 RNF01 | [#282](https://github.com/DEVassos/ecopulse-app/pull/282) | @travensolli |
| [#271](https://github.com/DEVassos/ecopulse-app/issues/271) | [tarefa] Unidades, picos e variações honestos nas telas | RF07 RF08 RNF01 | [#283](https://github.com/DEVassos/ecopulse-app/pull/283) | @travensolli |
| [#272](https://github.com/DEVassos/ecopulse-app/issues/272) | [tarefa] Saliência e texto: calma no saudável, ação no problema | RF09 RNF01 | [#284](https://github.com/DEVassos/ecopulse-app/pull/284) | @travensolli |
| [#273](https://github.com/DEVassos/ecopulse-app/issues/273) | [tarefa] Seletor de período com atalhos e calendário | RF15 RNF01 | [#285](https://github.com/DEVassos/ecopulse-app/pull/285) | @travensolli |
| [#274](https://github.com/DEVassos/ecopulse-app/issues/274) | [tarefa] Menu em grade no celular, tooltip único e cor por grandeza | RNF01 | [#286](https://github.com/DEVassos/ecopulse-app/pull/286) | @travensolli |
| [#287](https://github.com/DEVassos/ecopulse-app/issues/287) | [tarefa] Implementa ranking de impacto no backend | RF14 | [#291](https://github.com/DEVassos/ecopulse-app/pull/291) | @viniciusaugusto1997 |
| [#289](https://github.com/DEVassos/ecopulse-app/issues/289) | [tarefa] Atualiza o plano com decisões visuais da Sprint 2 | RF02 RF07 RF08 RF09 RF12 RF13 RNF01 | [#290](https://github.com/DEVassos/ecopulse-app/pull/290) | @henriqueptbd-cell |
| [#293](https://github.com/DEVassos/ecopulse-app/issues/293) | [tarefa] Alinha a documentação de access_entries ao que existe | RNF05 | [#296](https://github.com/DEVassos/ecopulse-app/pull/296) | @viniciusaugusto1997 |
| [#294](https://github.com/DEVassos/ecopulse-app/issues/294) | [bug] Parametriza ordenação SQL do ranking conforme BD02 | RF14 | [#295](https://github.com/DEVassos/ecopulse-app/pull/295) | @viniciusaugusto1997 |
| [#297](https://github.com/DEVassos/ecopulse-app/issues/297) | [tarefa] Expõe fator, potência, recursos e intervalo em GET /api/services | RF09 RF12 | [#299](https://github.com/DEVassos/ecopulse-app/pull/299) | @travensolli |
| [#298](https://github.com/DEVassos/ecopulse-app/issues/298) | [tarefa] Fator da região e detalhes da coleta na tabela de serviços | RF09 RF12 | [#300](https://github.com/DEVassos/ecopulse-app/pull/300) | @travensolli |
| [#301](https://github.com/DEVassos/ecopulse-app/issues/301) | [tarefa] Alinha o README raiz ao congelamento da Sprint 2 | RNF05 | [#303](https://github.com/DEVassos/ecopulse-app/pull/303) | @travensolli |

### 5.3 Processo

| Issue | Título | Requisito | Evidência | Responsável |
|---|---|---|---|---|
| [#122](https://github.com/DEVassos/ecopulse-app/issues/122) | [processo] Renomear o repositório greener-app para EcoPulse | — | [#304](https://github.com/DEVassos/ecopulse-app/pull/304) | @travensolli |
| [#159](https://github.com/DEVassos/ecopulse-app/issues/159) | [processo] Priorizar a comparação entre serviços e a análise dos dados (feedback da Review 1) | RF14 RF15 | [#204](https://github.com/DEVassos/ecopulse-app/pull/204) | @henriqueptbd-cell |
| [#164](https://github.com/DEVassos/ecopulse-app/issues/164) | [processo] Rulesets: checks do CI obrigatórios e validação cruzada sem bypass | — | [#191](https://github.com/DEVassos/ecopulse-app/pull/191) | @travensolli |
| [#165](https://github.com/DEVassos/ecopulse-app/issues/165) | [processo] Permalinks com SHA no plano e uma fonte principal por assunto | — | [#213](https://github.com/DEVassos/ecopulse-app/pull/213) | @henriqueptbd-cell |
| [#166](https://github.com/DEVassos/ecopulse-app/issues/166) | [processo] Enviar ao cliente as dúvidas estruturadas sobre o objetivo do produto | — | [#244](https://github.com/DEVassos/ecopulse-app/pull/244) | @henriqueptbd-cell |
| [#168](https://github.com/DEVassos/ecopulse-app/issues/168) | [processo] Revisão cruzada em todo PR | — | [#185](https://github.com/DEVassos/ecopulse-app/pull/185) | @travensolli |
| [#178](https://github.com/DEVassos/ecopulse-app/issues/178) | [processo] Planejamento da Sprint 2 | — | [#179](https://github.com/DEVassos/ecopulse-app/pull/179) | @travensolli |
| [#181](https://github.com/DEVassos/ecopulse-app/issues/181) | [processo] Desligar os PRs automáticos do Dependabot | — | [#182](https://github.com/DEVassos/ecopulse-app/pull/182) | @travensolli |
| [#186](https://github.com/DEVassos/ecopulse-app/issues/186) | [processo] Refs #n não deve fechar a issue no merge | — | [#228](https://github.com/DEVassos/ecopulse-app/pull/228) | @travensolli |
| [#187](https://github.com/DEVassos/ecopulse-app/issues/187) | [processo] Atas das dailies — Sprint 2, semana 1 | — | [#220](https://github.com/DEVassos/ecopulse-app/pull/220) | @travensolli |
| [#198](https://github.com/DEVassos/ecopulse-app/issues/198) | [processo] Registrar as mudanças de escopo da Sprint 2 de 22/10 | — | [#199](https://github.com/DEVassos/ecopulse-app/pull/199) | @travensolli |
| [#205](https://github.com/DEVassos/ecopulse-app/issues/205) | [processo] Burndown ignora tarefas omitidas pelo gh project item-list | — | [#227](https://github.com/DEVassos/ecopulse-app/pull/227) | @travensolli |
| [#210](https://github.com/DEVassos/ecopulse-app/issues/210) | [processo] Check pr aceita corpo de PR sem a DoD-PR | — | [#211](https://github.com/DEVassos/ecopulse-app/pull/211) | @travensolli |
| [#221](https://github.com/DEVassos/ecopulse-app/issues/221) | [processo] Atas das dailies — Sprint 2, semana 2 | — | [#255](https://github.com/DEVassos/ecopulse-app/pull/255) | @travensolli |
| [#292](https://github.com/DEVassos/ecopulse-app/issues/292) | [processo] Atas das dailies — Sprint 2, semana 3 | — | [#302](https://github.com/DEVassos/ecopulse-app/pull/302) | @travensolli |

### 5.4 Pendentes e itens que saíram da sprint

| Issue | Situação | Destino |
|---|---|---|
| [#172](https://github.com/DEVassos/ecopulse-app/issues/172) Daily — Sprint 2 | aberta até o fechamento, como issue fixada das dailies | fecha no `/sprint 2 fechar` |
| [#305](https://github.com/DEVassos/ecopulse-app/issues/305) Entrega da Sprint 2 | release, tag e back-merge | fecha no fechamento |
| [#51](https://github.com/DEVassos/ecopulse-app/issues/51) US10 — Mapa de bolhas (`could`) | não puxada: a planning a condicionou às histórias `must` concluídas até 06/11 | Sprint 3, movida pelo PO em 06/11 |
| [#167](https://github.com/DEVassos/ecopulse-app/issues/167) e [#169](https://github.com/DEVassos/ecopulse-app/issues/169) (processo) | ações da retrospectiva da Sprint 1 com resultado registrado em 07/11 | Sprint 3, movidas no congelamento ([#167](https://github.com/DEVassos/ecopulse-app/issues/167#issuecomment-6723975416), [#169](https://github.com/DEVassos/ecopulse-app/issues/169#issuecomment-6723976230)); fecham pelo PR da retrospectiva da Sprint 2 |
| [#256](https://github.com/DEVassos/ecopulse-app/issues/256) bug da paginação em Emissões | em andamento com @DeaTuribio | Sprint 3, por decisão do PO com @DeaTuribio em 06/11 |
