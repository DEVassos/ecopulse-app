# Sprint 2 — Dashboard completo, tolerância a falhas e configuração protegida

| Campo | Valor |
|---|---|
| Período | 20/10 a 09/11/2026 · checkpoint 30/10 · congelamento 08/11 20h · review 09/11 19h30 (a confirmar) |
| Milestone | [Sprint 2](https://github.com/DEVassos/greener-app/milestone/2) |
| Plano | [docs/plano-de-entregas.md § Sprint 2](../plano-de-entregas.md#sprint-2): critérios previstos, denominador e situação de cada critério |
| Atas | [planning](sprint-2/planning.md) · [dailies](sprint-2/dailies/) |
| Burndown | [sprint-2/burndown.md](sprint-2/burndown.md) — Story Points por dia, gerado por `.github/scripts/burndown.sh 2` |

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
| @viniciusaugusto1997 em viagem programada (combinada com o professor e a equipe), ainda sem data de volta registrada em 26/10; seguem com ele a #174 (TP03) e a #6 | alto | gatilho do TP03 em 30/10 (planning § 4); a #188 e a #189 passaram para @henriqueptbd-cell em 22/10 e foram mergeadas em 25 e 26/10 ([ata de 22/10](sprint-2/dailies/2026-10-22.md)) | @travensolli |
| #52 depende de #49 e #50 | médio | implementar a comparação depois do ranking e do histórico | @DeaTuribio |
| Frontend com #45, #50, #52 e #51 (could) | alto | priorizar #45 e #50; #51 só se sobrar capacidade | @DeaTuribio |
| Paleta e animação do logo podem desatualizar prints/docs e falhar em acessibilidade | médio | refazer `docs/identidade-visual.md` e prints no mesmo PR (#180); testar falha e `prefers-reduced-motion` | @DeaTuribio |
| 02/11 (feriado) reduz um dia útil | baixo | daily assíncrona por texto, com ata | @travensolli |
| Rulesets dependem de acesso admin à org | médio | #164 com o SM; registrar o bloqueio se o acesso faltar | @travensolli |

## 4. Verificações realizadas (aplicação da DoD)

| Item | Como foi verificado | Quem | Resultado |
|---|---|---|---|
| #164 / PRs [#191](https://github.com/DEVassos/greener-app/pull/191) e [#192](https://github.com/DEVassos/greener-app/pull/192) | Depois do merge, `bash .agilekit/scripts/gh-bootstrap.sh --rulesets`; `gh api repos/DEVassos/greener-app/rulesets/24529098` (`develop`) e `.../24529100` (`main`) mostram os sete checks obrigatórios (`commits`, `pr`, `docs`, `backend`, `frontend`, `compose`, `schema`), `bypass_actors` vazio e `require_last_push_approval: true`, iguais aos JSON versionados, e `current_user_can_bypass: never` para admin | @travensolli | aplicado em 22/10 |

**Exceções à DoD-PR**, registradas porque não há como corrigi-las depois do merge:

- [#191](https://github.com/DEVassos/greener-app/pull/191) e [#192](https://github.com/DEVassos/greener-app/pull/192) (#164): mergeados sem aprovação, por bypass de admin, por decisão de @travensolli (SM) em 22/10, para cumprir o prazo da #164 (23/10) com o PO ausente. Foram os últimos merges possíveis com bypass, porque a própria #164 o removeu.
