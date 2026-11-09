# Sprint Review — Sprint 2

| Campo | Valor |
|---|---|
| Data e horário | 09/11/2026 19h30 |
| Local | videochamada |
| Participantes do time | @henriqueptbd-cell (PO), @travensolli (SM, escriba), @DeaTuribio, @LUCASAMR23, @viniciusaugusto1997 |
| Cliente / avaliadores | convidados: Otávio Abreu dos Santos Silva (UniLaunch, cliente) e Prof. Arley Souza (Fatec Jacareí, avaliação da entrega), como na Sprint 1 |
| Versão demonstrada | branch `release/sprint-2`, criada de `develop` no commit [`0d03190`](https://github.com/DEVassos/ecopulse-app/commit/0d03190e65e7b8f9dd8ec17a4197602b8fc9fcec), o merge do PR [#304](https://github.com/DEVassos/ecopulse-app/pull/304) em 08/11 às 16h09. Nenhuma funcionalidade entrou em `develop` depois do congelamento de 08/11 20h. Depois do fechamento, a versão fica na tag [`sprint-2`](https://github.com/DEVassos/ecopulse-app/releases/tag/sprint-2) |
| Ambiente | `docker compose up --build` num clone limpo de `develop` em `0d03190`, em 09/11/2026: compose no ar, `/health` 200, persistência após `restart` e `schema.sql` em banco vazio ([sprint-2.md § 4](../sprint-2.md#4-verificações-realizadas-aplicação-da-dod)) |
| Vídeo da demonstração | [EcoPulse — Sprint 2 \| DEVassos (FATEC Jacareí) — De Monitoramento a Investigação de Emissões](https://youtu.be/an9g07c_nIs) (YouTube), com o produto como está na `release/sprint-2` |

## 1. Objetivo da sprint e resultado

**Objetivo:** dashboard completo com energia e CO₂e por serviço e indicadores agregados, tolerância a falhas visível na interface, atualização periódica com intervalo e "Última atualização" informados, e área de configuração protegida por JWT no backend. A identidade visual volta ao fundo azul-escuro, com verde só em ações e destaques (feedback da Review 1).

**O que a release entrega:** 67 PRs mergeados em `develop` de 20/10 a 08/11 e 71 issues fechadas na milestone. A Sprint 2 levou o produto do monitoramento para a investigação das emissões:

- indicadores das últimas 24 h com variação;
- ranking de CO₂e;
- página Emissões por período;
- comparação entre serviços;
- fator da região na tabela;
- login JWT na aplicação inteira;
- intervalo de atualização configurável;
- erros tipados no backend;
- o pacote visual, com tema claro, acessibilidade e celular.

A lista completa, com requisito e PR, está no [README § 3](../../../README.md#3-funcionalidades-implementadas). A situação de cada critério fica **só** no [plano de entregas](../../plano-de-entregas.md#sprint-2).

## 2. Roteiro da demonstração (por requisito)

O roteiro do vídeo foi estruturado pelo PO e combinado com o time antes da review. A tabela segue a ordem do produto e indica, para cada item, onde ele aparece e quem o entregou no GitHub. Quem apresentou cada parte na reunião fica registrado com o feedback, depois da review.

| Ordem | Requisito | O que é mostrado | Como (URL, tela) | Entregue por |
|---|---|---|---|---|
| 1 | DW06, RNF05 | Login e aplicação inteira protegida por JWT; sessão expirada volta ao login | `http://localhost:5173/login`; `GET /api/services` sem token → 401 | @LUCASAMR23 ([#208](https://github.com/DEVassos/ecopulse-app/pull/208)), @travensolli ([#243](https://github.com/DEVassos/ecopulse-app/pull/243)), @DeaTuribio ([#269](https://github.com/DEVassos/ecopulse-app/pull/269)) |
| 2 | RF08 | Energia e CO₂e das últimas 24 h com a variação contra as 24 h anteriores; cards de estado | topo do dashboard | @LUCASAMR23 ([#215](https://github.com/DEVassos/ecopulse-app/pull/215)), @travensolli ([#202](https://github.com/DEVassos/ecopulse-app/pull/202)) |
| 3 | RF14 | Quem pesa mais no CO₂e: parte de cada serviço nas 24 h, somando 100% | coluna "Parte do CO₂e" e frase acima da tabela | @viniciusaugusto1997 ([#291](https://github.com/DEVassos/ecopulse-app/pull/291)), @DeaTuribio ([#288](https://github.com/DEVassos/ecopulse-app/pull/288)) |
| 4 | RF09, RF07 | Fator da região que explica a emissão; estados com motivo seguro da indisponibilidade | tabela de serviços | @travensolli ([#299](https://github.com/DEVassos/ecopulse-app/pull/299), [#300](https://github.com/DEVassos/ecopulse-app/pull/300)), @viniciusaugusto1997 ([#254](https://github.com/DEVassos/ecopulse-app/pull/254)) |
| 5 | RF07, RF10 | Emissões de um serviço no período, com seletor de período e agrupamento automático | `/emissoes` | @DeaTuribio ([#200](https://github.com/DEVassos/ecopulse-app/pull/200), [#216](https://github.com/DEVassos/ecopulse-app/pull/216)), @henriqueptbd-cell ([#206](https://github.com/DEVassos/ecopulse-app/pull/206), [#207](https://github.com/DEVassos/ecopulse-app/pull/207)) |
| 6 | RF15 | Comparação de 2 a 10 serviços no mesmo período, com menor e maior CO₂e destacados | `/comparacao` | @LUCASAMR23 ([#214](https://github.com/DEVassos/ecopulse-app/pull/214)), @travensolli ([#219](https://github.com/DEVassos/ecopulse-app/pull/219)) |
| 7 | RF11, RF05, RF06 | Intervalo de atualização configurável (15, 30 ou 60 s) valendo sem recarregar | `/configuracao` e selo "Última atualização" | @viniciusaugusto1997 ([#253](https://github.com/DEVassos/ecopulse-app/pull/253)), @DeaTuribio ([#270](https://github.com/DEVassos/ecopulse-app/pull/270)) |
| 8 | RNF04, TP03, TP01 | Falha da API ou do banco vira estado visível, nunca resultado válido; classes de domínio | faixa "Mostrando dados de …"; `backend/src/shared/errors.ts`, `backend/src/domain/` | @henriqueptbd-cell ([#233](https://github.com/DEVassos/ecopulse-app/pull/233)), @LUCASAMR23 ([#209](https://github.com/DEVassos/ecopulse-app/pull/209)) |
| 9 | RNF01 | Fundo azul, tema claro, acessibilidade e celular | botão de tema; tela de 390 px | @DeaTuribio ([#184](https://github.com/DEVassos/ecopulse-app/pull/184)), @travensolli ([#264](https://github.com/DEVassos/ecopulse-app/pull/264), [#278](https://github.com/DEVassos/ecopulse-app/pull/278) a [#286](https://github.com/DEVassos/ecopulse-app/pull/286)) |
| 10 | — | Respostas aos apontamentos da Review 1, plano e próximos passos | issues [#159](https://github.com/DEVassos/ecopulse-app/issues/159) a [#166](https://github.com/DEVassos/ecopulse-app/issues/166); [plano](../../plano-de-entregas.md#sprint-3) | @henriqueptbd-cell |
| 11 | — | Processo: quadro, atas, DoD aplicada e rulesets sem bypass | GitHub Project; `docs/sprints/` | @travensolli |

### 2.1 Apontamentos da Review 1 atendidos na Sprint 2

| Apontamento do cliente (20/10) | Issue | Entrega |
|---|---|---|
| Priorizar comparação entre serviços e análise dos dados | [#159](https://github.com/DEVassos/ecopulse-app/issues/159) | comparação ([#219](https://github.com/DEVassos/ecopulse-app/pull/219)), ranking ([#288](https://github.com/DEVassos/ecopulse-app/pull/288)), indicadores ([#215](https://github.com/DEVassos/ecopulse-app/pull/215)) e Emissões ([#216](https://github.com/DEVassos/ecopulse-app/pull/216)) |
| Lint (ESLint) no frontend | [#160](https://github.com/DEVassos/ecopulse-app/issues/160) | `npm run lint` no job `frontend` do CI |
| Validar as respostas nas fronteiras do frontend | [#161](https://github.com/DEVassos/ecopulse-app/issues/161) | conferência do contrato a cada busca, ampliada na [#237](https://github.com/DEVassos/ecopulse-app/issues/237) |
| Testes de integração com PostgreSQL no CI | [#162](https://github.com/DEVassos/ecopulse-app/issues/162) | *service container* no job `backend` |
| Alertas do `npm audit` no Vitest | [#163](https://github.com/DEVassos/ecopulse-app/issues/163) | Vitest atualizado |
| Rulesets com todos os checks e validação cruzada | [#164](https://github.com/DEVassos/ecopulse-app/issues/164) | sete checks obrigatórios, sem bypass e com aprovação do último push |
| Permalinks com SHA e uma fonte principal por assunto | [#165](https://github.com/DEVassos/ecopulse-app/issues/165) | situação dos critérios só no plano |
| Dúvidas estruturadas ao cliente por e-mail | [#166](https://github.com/DEVassos/ecopulse-app/issues/166) | resposta de 02/11 registrada na [review da Sprint 1 § 3.2](../sprint-1/review.md#32-resposta-complementar-do-cliente-02112026) |

### 2.2 Perguntas de produto ao cliente

As perguntas vêm da [planning § 8](planning.md#8-perguntas-de-produto-para-a-sprint-review-2). O PO pergunta só o que a demonstração não tiver respondido:

- A comparação e o ranking ajudam o operador a decidir quais serviços compensam?
- Quais indicadores e período ainda faltam para essa decisão, se houver?
- As informações mostradas justificam o espaço que ocupam na interface? Quais filtros devem ficar visíveis e como os recursos devem ser organizados?
- A distinção entre dado mensurável e informação contextualizada está clara?

## 6. Encaminhamentos pós-review (até 10/11)

- [ ] Feedback do cliente, decisões e pendências registrados neste arquivo, nas seções 3 a 5 (@travensolli)
- [ ] Issues `feedback-cliente` criadas na milestone Sprint 3 (@henriqueptbd-cell)
- [ ] Situação de cada critério da Sprint 2 verificada no plano, com permalink, e entrada no "Histórico de alterações do plano" (@henriqueptbd-cell)
- [ ] `docs/sprints/sprint-2.md` com versão, concluídos, review, participação e métricas; `contribuicao.md`, backlog e burndown finais (@travensolli)
- [ ] Merge de `release/sprint-2` em `main`, tag `sprint-2` e GitHub Release (@travensolli)
