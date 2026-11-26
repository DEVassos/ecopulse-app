# Retrospectiva — Sprint 3

| Campo | Valor |
|---|---|
| Consolidação | 26/11/2026, por @travensolli, a partir das respostas individuais publicadas na [#440](https://github.com/DEVassos/ecopulse-app/issues/440) em 23/11 |
| Participantes | três dos cinco, por escrito: @travensolli, @viniciusaugusto1997 e @henriqueptbd-cell. @DeaTuribio e @LUCASAMR23 não responderam até o prazo |
| Formato | manter / parar / começar, revisão das ações [#167](https://github.com/DEVassos/ecopulse-app/issues/167) e [#169](https://github.com/DEVassos/ecopulse-app/issues/169) e lições do projeto, só com o que está escrito nas respostas. A retrospectiva foi feita por escrito na [#440](https://github.com/DEVassos/ecopulse-app/issues/440), sem reunião |
| Prazo das respostas | 24/11/2026, às 18h. As três chegaram em 23/11, às 16h11, 16h13 e 18h28 |

Respostas individuais: [@travensolli](https://github.com/DEVassos/ecopulse-app/issues/440#issuecomment-7111213783) · [@viniciusaugusto1997](https://github.com/DEVassos/ecopulse-app/issues/440#issuecomment-7111276889) · [@henriqueptbd-cell](https://github.com/DEVassos/ecopulse-app/issues/440#issuecomment-7114515878).

As três respostas foram escritas antes da review, que o cliente remarcou para 25/11. O retorno do cliente está em [review.md § 3](review.md#3-feedback-do-cliente). Como a Sprint 3 é a última do projeto, as propostas não viram issues `tipo:processo`: ficam registradas aqui como lições para um próximo projeto.

## 1. Métricas da sprint

| Métrica | Valor | Comentário |
|---|---|---|
| Story Points: escopo inicial / final / concluídos | 75 / 161 / 156 | 97 no checkpoint de 17/11 e 154 em 21/11 ([burndown](burndown.md)). As respostas citam 141 pontos, número do burndown anterior; o final, gerado em 26/11, inclui issues que receberam a milestone ou os pontos depois de 22/11 |
| PRs mergeados em `develop` | 64, de 11 a 23/11 | 26 deles em 21/11, um sábado |
| PRs com mais de 24h até a primeira revisão | 8 | #354 (73h), #337 e #379 (47h), #334 (46h), #353 (40h), #339 e #355 (30h), #357 (26h). Sprint 2: 6 |
| PRs mergeados sem revisão | 0 | Sprint 2: 2 |
| Dailies registradas / dias úteis | 10 / 10 | a de 20/11, feriado, teve um só respondente no dia |
| Regressões abertas (`regressao`) | 0 | |
| Lacunas de participação (ES09) | nenhuma | dois commits de @viniciusaugusto1997 (`fe99279` e `5ba30a8`) estão sem login; fonte: [contribuicao.md](contribuicao.md) |
| Nota dada pelo time (1 a 5) | 4 nas três respostas | "o produto fechou completo e verificado, [...] mas repetimos o padrão da Sprint 2 em escala maior" (@travensolli) |

## 2. O que manter

- **Regra cobrada por ferramenta.** O ruleset com checks obrigatórios e revisão sem bypass segurou as três sprints: nenhum dos 64 PRs foi mergeado sem aprovação de outra conta (@travensolli; @henriqueptbd-cell no item 10).
- **Verificar antes de declarar pronto.** Aceite do PO na stack real, reteste dos critérios das Sprints 1 e 2 e teste do avaliador em cada ponto da release ([sprint-3.md § 5](../sprint-3.md#5-verificações-realizadas-aplicação-da-dod)). O PO deixou "DoD verificada", com o que executou, em 24 dos 30 PRs que revisou (@travensolli, @henriqueptbd-cell).
- **Revisão com evidência repetível.** No #337, o `EXPLAIN` da consulta completa levou à correção do texto; no #371, os planos antes e depois do índice ficaram num roteiro SQL que outra pessoa repete (@viniciusaugusto1997).
- **Plano com permalink e histórico.** Cada mudança de escopo de 17, 20 e 21/11 tem autor e motivo no histórico do plano (@henriqueptbd-cell).
- **Tarefa pequena com issue própria.** Os ajustes de 21/11 (#394, #406, #408, #431, #434, #436 e #438) entraram como tarefas filhas, com critério de aceite e PR (@henriqueptbd-cell).
- **Ata em todo dia útil** (@travensolli).

## 3. O que parar

- **Escopo crescendo depois do checkpoint.** As três respostas citam o mesmo fato: 97 pontos no checkpoint e 26 merges em 21/11. O SM quebrou a regra de corte que ele mesmo propôs na retrospectiva da Sprint 2, com 13 tarefas abertas depois de 17/11 e 12 PRs abertos no mesmo minuto (#411 a #422). O PO chegou a 8 PRs abertos ao mesmo tempo em 21/11, contra o WIP de 2.
- **SM e PO fazendo trabalho de produto por falta de capacidade no frontend.** O SM foi autor de 26 dos 63 PRs até o congelamento; o PO, de 8 PRs `feat(frontend)`. Para o PO, o efeito foi deixar a #335 e a #336 abertas (@travensolli, @henriqueptbd-cell).
- **Reverter decisão de escopo em 24h.** A #195, a #196 e a #197 saíram da sprint em 20/11 e voltaram em 21/11 (@travensolli).
- **PR parado sem cobrança pelo número.** O #354 esperou 73h pela primeira revisão, e os três citam o atraso; o #334, o #337, o #353 e o #379 passaram de 40h (@henriqueptbd-cell, @viniciusaugusto1997, @travensolli).
- **Daily acumulada ou fora do prazo.** @viniciusaugusto1997 publicou as de 16 e 17/11 em 18/11; @henriqueptbd-cell respondeu 6 dos 9 dias úteis até 20/11; @travensolli respondeu 5 vezes depois das 21h e não respondeu no feriado.
- **Aceite de história no fim da sprint.** A US14 (#55) foi aceita em 21/11, dois dias antes da review marcada (@henriqueptbd-cell).
- **Ambiente de validação preparado na hora da revisão.** No #372 faltou a integração com PostgreSQL; no #430, o compose local não subiu (@viniciusaugusto1997).
- **Código no dia do congelamento.** O #435, o #437 e o #439 entraram em 22/11, e a release esperou o #430, aprovado só em 23/11 (@travensolli, @henriqueptbd-cell, @viniciusaugusto1997).

## 4. O que começar (num próximo projeto)

- **Regra importante nasce com o check que a cobra.** Exemplo: o CI recusa a issue que recebe a milestone depois do checkpoint sem linha no histórico do plano (@travensolli, @henriqueptbd-cell).
- **SM e PO sem tarefa de produto.** Falta de capacidade numa área vira decisão de escopo na daily, registrada no plano (@travensolli, @henriqueptbd-cell).
- **Último dia de código na quinta antes do congelamento.** A release sai no domingo às 20h, mesmo com PR de documentação aberto (@travensolli); o corte das funcionalidades fica separado do fechamento das evidências (@viniciusaugusto1997).
- **Aceite em até 2 dias úteis depois do merge**, com o resultado em comentário na issue (@henriqueptbd-cell).
- **PR parado cobrado pelo número na daily**, com responsável e suplente de revisão definidos na abertura (@henriqueptbd-cell, @viniciusaugusto1997).
- **Base de teste reproduzível desde o primeiro dia**, com portas próprias e dados fixos, porque a stack isolada sobe com o banco vazio (@viniciusaugusto1997; também citado por @travensolli e @henriqueptbd-cell).
- **Lembrete da daily no fim da tarde** (@travensolli, @viniciusaugusto1997), ou horário fixo de 20h30 para quem não está em aula (@henriqueptbd-cell).

## 5. Revisão das ações anteriores

| Ação | O que as respostas dizem | Encaminhamento |
|---|---|---|
| [#167](https://github.com/DEVassos/ecopulse-app/issues/167) Contrato de integração na issue antes do primeiro commit | Funcionou na #320: as dúvidas de 11/11 foram respondidas em 13/11, antes do PR #354 (@viniciusaugusto1997, @travensolli). Faltou na #234: o contrato de 10/11 foi aprovado só em 19/11, e a tarefa acabou entregue pelo PO no #390 (@henriqueptbd-cell, @travensolli). Proposta do PO: contrato sem resposta em 2 dias úteis recebe a label `bloqueado` e entra na ata até ser respondido | Fechada pelo PR [#441](https://github.com/DEVassos/ecopulse-app/pull/441) em 23/11; a proposta fica como lição |
| [#169](https://github.com/DEVassos/ecopulse-app/issues/169) Daily por texto até as 21h, com @ nos impedimentos | Em parte: os cinco responderam na #310, mas com dias sem resposta e fora do horário. Funcionou quando o impedimento tinha nome (@henriqueptbd-cell, @viniciusaugusto1997, @travensolli) | Fechada pelo PR [#441](https://github.com/DEVassos/ecopulse-app/pull/441) em 23/11; o lembrete automático fica como lição |

## 6. Lições do projeto

- As regras que se mantiveram nas três sprints foram as que uma ferramenta cobra: ruleset sem bypass, hooks e checks do CI. As que dependiam de disciplina (corte depois do checkpoint, revisão em 24h, daily até as 21h, "DoD verificada") escorregaram sob pressão (@travensolli, @henriqueptbd-cell).
- PO que aceita no fim da sprint descobre o problema tarde (@henriqueptbd-cell).
- Contrato, roteiro repetível e evidência ligada ao commit entram junto com a entrega (@viniciusaugusto1997).

## 7. Melhorias no kit (agilekit)

| Problema | Exemplo | Proposta | Quem citou |
|---|---|---|---|
| `git agilekit-guard` analisa a linha inteira, e não cada comando | `git commit --no-edit` seguido de `git merge --no-ff` barrado como `--no-verify` (21/11); apagar uma branch remota barrado com a `develop` em uso | analisar só o trecho de cada comando `git` | @travensolli, @henriqueptbd-cell |
| `board-route.sh` lê todo `#n` das mensagens de commit | o merge `2ea998e` do #379 citou #195–#197 e moveu as três para "Em andamento" (20/11) | ler só o `(#n)` do assunto | @travensolli |
| `teste-avaliador.sh` usa as portas fixas 3000/5173 | cópia com as portas 3100/5273/5534 em 23/11 | portas configuráveis | @travensolli, @henriqueptbd-cell |
| `check-commit-msg.sh` conta bytes no Git Bash | `CO₂e` gasta 3 bytes no `₂` | contar caracteres | @travensolli |
| `gh pr edit` falha ao editar o corpo | "Projects (classic) is being deprecated" no #441, em 23/11 | a skill `/revisar` editar com `gh api ... --method PATCH` | @henriqueptbd-cell |
| `check-pr.sh` reprova os critérios de aceite que o revisor ainda vai marcar | o PR nasce com o check vermelho (#441) | aceitar `N/A — aguardando revisor` ou separar os critérios do check do autor | @henriqueptbd-cell |
| Preparo do ambiente de build | `npm ci` com `SELF_SIGNED_CERT_IN_CHAIN` e `no space left on device` no #430 | testar o acesso ao registry e o espaço em disco no preparo | @viniciusaugusto1997 |

## 8. Sem resposta

@DeaTuribio e @LUCASAMR23 não responderam na [#440](https://github.com/DEVassos/ecopulse-app/issues/440) até o prazo de 24/11, às 18h, nem até esta consolidação, em 26/11.
