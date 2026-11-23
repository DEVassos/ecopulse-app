# Sprint Review — Sprint 3

| Campo | Valor |
|---|---|
| Data e horário | 23/11/2026 19h30 |
| Local | videochamada |
| Formato | apresentação do vídeo da Sprint 3, preparado pelo PO, seguida da conversa com o cliente. Não há demonstração individual por integrante |
| Condução | @henriqueptbd-cell (PO) e @travensolli (SM, escriba) |
| Cliente / avaliadores | convidados: Otávio Abreu dos Santos Silva (UniLaunch, cliente) e Prof. Arley Souza (Fatec Jacareí, avaliação da entrega), como nas Sprints 1 e 2 |
| Versão demonstrada | branch `release/sprint-3`, criada de `develop` no commit [`4bd0c29`](https://github.com/DEVassos/ecopulse-app/commit/4bd0c29) em 23/11. O último merge de código é o do PR [#439](https://github.com/DEVassos/ecopulse-app/pull/439), em 22/11 às 15h54; depois dele só entrou documentação. O congelamento estava marcado para 22/11 às 20h e foi feito em 23/11 |
| Ambiente | `docker compose up --build` num clone limpo de `develop` em `4bd0c29`, em 23/11/2026: compose no ar, `/health` 200, persistência após `restart` e `schema.sql` em banco vazio ([sprint-3.md § 5.3](../sprint-3.md#53-verificações-do-congelamento-2311)) |

## 1. Objetivo da sprint e resultado

**Objetivo:** consultas agregadas de ranking e comparação por período conferidas e documentadas (BD04), mapa das regiões com bolhas (US10) e simulação de migração para a região mais limpa (US12), revisão de usabilidade, responsividade e desempenho, e repositório pronto para ser apresentado como portfólio, sem regressões.

**O que a release entrega:** 63 PRs mergeados em `develop` de 11 a 23/11. A Sprint 3 levou o produto da investigação das emissões para a decisão sobre onde e como reduzir:

- mapa de bolhas e lista de regiões por CO₂e, com o selo Rede limpa;
- simulação de migração para a região mais limpa, com a redução estimada;
- tabela de serviços com energia e CO₂e das 24 h e avisos de mudança de estado;
- página Emissões em barras, com zoom e equivalências do CO₂e;
- Comparação com potência por recurso, eficiência, linhas de CO₂e, dispersão e ranking com ordenação e CSV;
- Relatório do período e exportação em CSV e PDF;
- página Ajuda com guia de leitura e fórmulas;
- cadastro por convite, papéis e perfil;
- página inicial de apresentação;
- consultas por período conferidas contra o banco e índice da última coleta (BD04).

O resumo por requisito está no [README § 3](../../../README.md#3-funcionalidades-implementadas) e o detalhe, com prints, em [funcionalidades.md](../../funcionalidades.md). A situação de cada critério fica **só** no [plano de entregas](../../plano-de-entregas.md#sprint-3).

## 2. Roteiro da demonstração (por requisito)

A review apresenta o vídeo da Sprint 3 e segue com a conversa do PO e do SM com o cliente. A tabela lista, na ordem do produto, o que a release entrega, onde cada item aparece e quem o entregou no GitHub. Ela serve de guia para a conversa e não descreve o vídeo cena a cena.

| Ordem | Requisito | O que a entrega mostra | Onde (URL, tela) | Entregue por |
|---|---|---|---|---|
| 1 | RNF01 | Página inicial de apresentação e vídeo no fundo do login | `http://localhost:5173/inicio` e `/login` | @DeaTuribio ([#439](https://github.com/DEVassos/ecopulse-app/pull/439)), @henriqueptbd-cell ([#437](https://github.com/DEVassos/ecopulse-app/pull/437)) |
| 2 | RF12, RF13 | Regiões por CO₂e e mapa de bolhas, com seleção compartilhada e selo Rede limpa | Dashboard | @DeaTuribio ([#345](https://github.com/DEVassos/ecopulse-app/pull/345), [#355](https://github.com/DEVassos/ecopulse-app/pull/355), [#373](https://github.com/DEVassos/ecopulse-app/pull/373)), @LUCASAMR23 ([#339](https://github.com/DEVassos/ecopulse-app/pull/339)), @viniciusaugusto1997 ([#354](https://github.com/DEVassos/ecopulse-app/pull/354)), @travensolli ([#367](https://github.com/DEVassos/ecopulse-app/pull/367)) |
| 3 | RF15 | Alternativa mais limpa: simulação de migração de uma região para outra, com a redução estimada | painel da região, no Dashboard | @DeaTuribio ([#383](https://github.com/DEVassos/ecopulse-app/pull/383), [#384](https://github.com/DEVassos/ecopulse-app/pull/384)), @travensolli ([#340](https://github.com/DEVassos/ecopulse-app/pull/340), [#412](https://github.com/DEVassos/ecopulse-app/pull/412)), @henriqueptbd-cell ([#334](https://github.com/DEVassos/ecopulse-app/pull/334)) |
| 4 | RF09, RF14, RF02 | Tabela com energia e CO₂e das 24 h e a parte de cada serviço; avisos quando um serviço muda de estado | tabela do Dashboard | @travensolli ([#368](https://github.com/DEVassos/ecopulse-app/pull/368), [#374](https://github.com/DEVassos/ecopulse-app/pull/374)) |
| 5 | RF08 | Indicadores das últimas 24 h com a variação contra as 24 h anteriores | topo do Dashboard | @henriqueptbd-cell ([#390](https://github.com/DEVassos/ecopulse-app/pull/390)) |
| 6 | RF10, RF07 | Emissões em barras por intervalo, zoom por botões e arrasto, e equivalências do CO₂e | `/emissoes` | @travensolli ([#413](https://github.com/DEVassos/ecopulse-app/pull/413), [#414](https://github.com/DEVassos/ecopulse-app/pull/414), [#415](https://github.com/DEVassos/ecopulse-app/pull/415)), @henriqueptbd-cell ([#350](https://github.com/DEVassos/ecopulse-app/pull/350)) |
| 7 | RF15, RF14 | Comparação: potência por recurso, eficiência, linhas de CO₂e, dispersão "Carga ou região?" e ranking com ordenação e CSV | `/comparacao` | @LUCASAMR23 ([#372](https://github.com/DEVassos/ecopulse-app/pull/372)), @henriqueptbd-cell ([#377](https://github.com/DEVassos/ecopulse-app/pull/377), [#389](https://github.com/DEVassos/ecopulse-app/pull/389), [#407](https://github.com/DEVassos/ecopulse-app/pull/407)), @travensolli ([#418](https://github.com/DEVassos/ecopulse-app/pull/418)), @DeaTuribio ([#433](https://github.com/DEVassos/ecopulse-app/pull/433)) |
| 8 | RF08, RF14, RNF05 | Relatório do período, exportação em CSV e PDF e impressão do Dashboard e da Comparação | `/relatorio`; **Baixar CSV** e **Imprimir / PDF** | @travensolli ([#421](https://github.com/DEVassos/ecopulse-app/pull/421), [#422](https://github.com/DEVassos/ecopulse-app/pull/422)), @DeaTuribio ([#386](https://github.com/DEVassos/ecopulse-app/pull/386), [#387](https://github.com/DEVassos/ecopulse-app/pull/387)), @henriqueptbd-cell ([#409](https://github.com/DEVassos/ecopulse-app/pull/409)) |
| 9 | RNF05, RF07 | Ajuda com guia de uso, guia de leitura e fórmulas com o exemplo oficial | `/ajuda` | @travensolli ([#416](https://github.com/DEVassos/ecopulse-app/pull/416), [#417](https://github.com/DEVassos/ecopulse-app/pull/417)) |
| 10 | RP06, DW06 | Cadastro por convite, papéis `admin` e `usuario`, e perfil para trocar o nome e a senha | `/configuracao`, `/cadastro` e `/perfil` | @travensolli ([#392](https://github.com/DEVassos/ecopulse-app/pull/392), [#393](https://github.com/DEVassos/ecopulse-app/pull/393), [#419](https://github.com/DEVassos/ecopulse-app/pull/419), [#420](https://github.com/DEVassos/ecopulse-app/pull/420)) |
| 11 | BD04, RNF03 | Consultas de ranking e comparação por período conferidas contra o banco, e índice da última coleta | `GET /api/services/ranking` e `GET /api/services/compare`; [calculos.md](../../calculos.md#consultas-agregadas-por-período) | @henriqueptbd-cell ([#337](https://github.com/DEVassos/ecopulse-app/pull/337), [#391](https://github.com/DEVassos/ecopulse-app/pull/391)), @LUCASAMR23 ([#369](https://github.com/DEVassos/ecopulse-app/pull/369), [#370](https://github.com/DEVassos/ecopulse-app/pull/370)), @viniciusaugusto1997 ([#371](https://github.com/DEVassos/ecopulse-app/pull/371)) |
| 12 | — | Plano de entregas, backlog e o que fica como evolução depois do projeto | [plano](../../plano-de-entregas.md#sprint-3); issues | @henriqueptbd-cell |
| 13 | — | Processo: quadro, atas, DoD aplicada e participação | GitHub Project; `docs/sprints/` | @travensolli |

### 2.1 Pendências da Review 2 trazidas para esta review

| Pendência ([review da Sprint 2 § 5](../sprint-2/review.md#5-pendências-e-perguntas-em-aberto)) | Situação em 23/11 |
|---|---|
| Retorno escrito do cliente sobre a Review de 09/11 | não chegou; a Sprint 2 foi fechada em 18/11 com o retorno verbal registrado |
| Perguntas de produto que ficaram sem resposta | voltam na § 2.2 |

### 2.2 Perguntas de produto ao cliente

São as perguntas da [review da Sprint 2 § 2.2](../sprint-2/review.md#22-perguntas-de-produto-ao-cliente), que ficaram sem resposta. O PO pergunta só o que a entrega não tiver respondido:

- A comparação e o ranking ajudam o operador a decidir quais serviços compensam?
- Quais indicadores e período ainda faltam para essa decisão, se houver?
- As informações mostradas justificam o espaço que ocupam na interface? Quais filtros devem ficar visíveis e como os recursos devem ser organizados?
- A distinção entre dado mensurável e informação contextualizada está clara?

## 6. Encaminhamentos pós-review (até 24/11)

- Feedback do cliente, decisões e pendências registrados neste arquivo, nas seções 3 a 5 (@travensolli, com @henriqueptbd-cell).
- Uma issue `feedback-cliente` para cada apontamento acionável. Como a Sprint 3 é a última, elas ficam no Backlog, sem milestone.
- Situação de cada critério da Sprint 3 verificada no plano, com permalink, e entrada no "Histórico de alterações do plano" (@henriqueptbd-cell).
- `docs/sprints/sprint-3.md` com a review, a participação e as métricas; `contribuicao.md`, backlog e burndown finais (@travensolli).

O segundo PR da `release/sprint-3` para `main`, a tag `sprint-3` e a GitHub Release vêm depois desse registro, pela [#442](https://github.com/DEVassos/ecopulse-app/issues/442).
