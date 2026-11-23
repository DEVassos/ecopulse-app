# Retrospectiva — Sprint 2

| Campo | Valor |
|---|---|
| Consolidação | 23/11/2026, por @travensolli, a partir das respostas individuais publicadas na [#311](https://github.com/DEVassos/ecopulse-app/issues/311) de 10 a 17/11 |
| Participantes | os cinco, por escrito: @henriqueptbd-cell, @viniciusaugusto1997, @travensolli, @DeaTuribio e @LUCASAMR23 |
| Formato | manter / parar / começar e revisão das ações da Sprint 1, só com o que está escrito nas respostas. Não há ata de reunião de retrospectiva da Sprint 2 |
| Prazo das respostas | 11/11/2026, às 18h. Uma chegou antes (10/11), uma no mesmo dia, às 22h09, e três em 16 e 17/11 |

Respostas individuais: [@henriqueptbd-cell](https://github.com/DEVassos/ecopulse-app/issues/311#issuecomment-6781863054) (10/11) · [@viniciusaugusto1997](https://github.com/DEVassos/ecopulse-app/issues/311#issuecomment-6811357197) (11/11) · [@travensolli](https://github.com/DEVassos/ecopulse-app/issues/311#issuecomment-6935317199) (16/11) · [@DeaTuribio](https://github.com/DEVassos/ecopulse-app/issues/311#issuecomment-6949421141) (17/11) · [@LUCASAMR23](https://github.com/DEVassos/ecopulse-app/issues/311#issuecomment-6966724983) (17/11). As datas estão no horário de Brasília.

Este documento saiu no último dia da Sprint 3. Por isso a seção 6 diz o que aconteceu com cada proposta durante a Sprint 3, em vez de abrir ações novas.

## 1. Métricas da sprint

Os números vêm de [`sprint-2.md` § 8](../sprint-2.md#8-métricas), que é a fonte principal das métricas da sprint.

| Métrica | Valor | Comentário |
|---|---|---|
| Story Points: escopo inicial / final / concluídos | 31 / 120 / 120 | o escopo estava em 118 no congelamento; o pacote visual (12 tarefas, 36 pontos) entrou em 04 e 05/11, depois do checkpoint de 30/10 |
| PRs mergeados em `develop` | 71, de 20/10 a 09/11 | 15 deles em 06/11 |
| PRs com mais de 24h até a primeira revisão | 6 | #233 (91h), #213 (50h), #215 (46h); #216, #268 e #269 pouco acima de 24h. Sprint 1: 7 |
| PRs mergeados sem revisão | 1 em `develop` (#191) e 1 em `main` (#192) | por bypass registrado; depois de 22/10, nenhum. Sprint 1: 2 |
| Dailies registradas / dias úteis | 15 / 15 | as de 20/10 e 09/11 registram que não houve daily |
| Regressões abertas (`regressao`) | 0 | |
| Lacunas de participação (ES09) | nenhuma | fonte: [contribuicao.md](contribuicao.md) |
| Nota estimada (`/auditar 2`, 09/11) | 55,5 a 59,5 de 61 com o fechamento executado | |
| Nota dada pelo time (1 a 5) | 4 em quatro respostas e 5 em uma | "entregamos os 118 pontos, mas concentrados em poucas mãos e na reta final" (@travensolli) |

## 2. O que manter

- **Checks obrigatórios e revisão sem bypass** ([#164](https://github.com/DEVassos/ecopulse-app/issues/164), [#168](https://github.com/DEVassos/ecopulse-app/issues/168)): depois do #191, em 22/10, nenhum PR entrou sem revisão (@travensolli, @viniciusaugusto1997, @LUCASAMR23, @DeaTuribio, @henriqueptbd-cell).
- **Uma branch e um PR por issue, com testes e evidências**, como em #20, #173 e #6 (@LUCASAMR23, @viniciusaugusto1997).
- **Contrato comentado na issue e aprovado antes do código**: na #176, o backend aprovou intervalos, padrão e JWT em 03/11, e o PR #270 entrou sem retrabalho de formato (@DeaTuribio, @LUCASAMR23).
- **Fila de revisão combinada no fechamento**: os 10 PRs do pacote visual (#276 a #285), abertos em 05/11 à noite, tiveram a primeira revisão em até 22h (@DeaTuribio).
- **Backend falso no frontend** (`npm run mock`): as telas de Emissões e de resumo andaram antes de as rotas estarem prontas (@DeaTuribio).
- **Ata em todo dia útil** e **aceite do PO executando o roteiro numa stack isolada** (#45, #48, #49, #50), com todo o feedback da Review 1 atendido (#159 a #166) (@travensolli).
- **Cobranças dentro do time** (@henriqueptbd-cell).

## 3. O que parar

- **Concentrar entregas numa pessoa**: @travensolli foi autor de 40 dos 70 PRs mergeados até o congelamento, e de 11 dos 15 merges de 06/11. A revisão caiu sobre todos de uma vez, na véspera do congelamento (@travensolli).
- **Aceitar escopo depois do checkpoint sem regra de corte**: o escopo foi de 31 para 118 pontos (@travensolli, @viniciusaugusto1997, @LUCASAMR23).
- **Deixar revisões acumularem perto do congelamento**: o #233 esperou 91h e o #215, 46h (@viniciusaugusto1997, @LUCASAMR23, @henriqueptbd-cell).
- **Começar sem a aprovação registrada da outra área**: o contrato de `GET /api/services/summary` da #175 não foi aprovado na issue, a rota saiu com outro formato e o alinhamento virou a #234, que passou para a Sprint 3 (@DeaTuribio).
- **Abrir PRs grandes**: #200 (+1.591 linhas), #216 (+807) e #288 (+694) (@DeaTuribio).
- **Aprovar sem a frase "DoD verificada"**: 12 aprovações ficaram sem ela (@travensolli).
- **Ficar sem avisar se vai trabalhar e deixar a daily para depois**: houve dias sem comentário e registros publicados depois da data (@henriqueptbd-cell, @LUCASAMR23, @viniciusaugusto1997).

## 4. O que começar

Propostas feitas para a Sprint 3:

- **Regra de corte depois do checkpoint**: só entra o que corrige regressão ou responde a feedback do cliente, cabe em até 3 pontos e já tem revisor combinado; cada entrada vai para o histórico do plano no mesmo dia (@travensolli, com apoio de @DeaTuribio, @LUCASAMR23 e @viniciusaugusto1997).
- **Primeiro commit só depois do "aprovado" escrito na issue por quem é da outra área**, e contrato que inclua os requisitos técnicos da rubrica, como a parametrização de SQL que gerou a correção #294 (@DeaTuribio, @LUCASAMR23, @viniciusaugusto1997).
- **Dividir PRs acima de 400 linhas antes de abrir** (@DeaTuribio).
- **Tempo reservado para revisar e aviso quando uma revisão passar de 24h** (@viniciusaugusto1997, @LUCASAMR23); o SM puxa menos código e fica com a revisão diária (@travensolli).
- **Daily publicada no mesmo dia**, com a ata listando quem não respondeu (@travensolli, @LUCASAMR23, @viniciusaugusto1997).
- **Review com a aplicação rodando ao vivo, com volume de dados e o cálculo de ponta a ponta** (@henriqueptbd-cell, @viniciusaugusto1997, @travensolli), e um olhar mais crítico sobre a qualidade (@henriqueptbd-cell).

## 5. Revisão das ações da Sprint 1

| Ação | Resultado na Sprint 2 | O que as respostas dizem | Encaminhamento |
|---|---|---|---|
| [#167](https://github.com/DEVassos/ecopulse-app/issues/167) — contrato de integração na issue antes do primeiro commit | Parcialmente atingida: de 10 issues com mais de uma área, 3 tiveram contrato antes do código e aprovado pela outra área, 3 tiveram contrato sem aprovação registrada, 2 tiveram contrato depois do primeiro commit e 2 ficaram sem contrato ([apuração de 07/11](https://github.com/DEVassos/ecopulse-app/issues/167#issuecomment-6710791932)) | manter, nas cinco respostas; falta a aprovação escrita | A issue fecha com este registro. A prática continua, com o "aprovado" escrito antes do primeiro commit |
| [#168](https://github.com/DEVassos/ecopulse-app/issues/168) — revisão cruzada com "DoD verificada" e rulesets sem bypass | Concluída em 22/10 ([comentário](https://github.com/DEVassos/ecopulse-app/issues/168#issuecomment-6353867183)) | concluir e manter como rotina | Fechada na Sprint 2 |
| [#169](https://github.com/DEVassos/ecopulse-app/issues/169) — daily por texto respondida até as 21h, com @ nos impedimentos | Não atingida no registro: 19 de 58 respostas no prazo, 33% ([apuração de 07/11](https://github.com/DEVassos/ecopulse-app/issues/169#issuecomment-6710790383)). O @ em quem precisa agir foi cumprido | manter, com ajuste: a ata lista quem não respondeu | A issue fecha com este registro, sem ter atingido a meta |

Na Sprint 3, o ajuste da #169 foi aplicado: cada ata tem as linhas "Ausentes" e "Registros tardios". A meta continuou sem ser atingida. De 10 a 20/11, as 9 [atas](../sprint-3/dailies/) registram pelo menos um integrante sem resposta na issue da daily no próprio dia: em 8 delas alguém ficou sem registro, e em 11/11 duas respostas chegaram depois do dia.

## 6. O que aconteceu com as propostas na Sprint 3

Nenhuma das propostas da seção 4 virou issue `tipo:processo`, porque esta consolidação não foi publicada a tempo.

| Proposta | O que os registros da Sprint 3 mostram |
|---|---|
| Regra de corte depois do checkpoint | Não foi seguida. O escopo foi de 97 pontos no checkpoint de 17/11 para 141 em 21/11 ([burndown](../sprint-3/burndown.md)). As entradas de #394, #395 a #404, #406 e #410 estão no [histórico do plano](../../plano-de-entregas.md#histórico-de-alterações-do-plano) com a data de 21/11; as de #408, #434, #436 e #438 ainda não tinham registro em 23/11 |
| "Aprovado" escrito antes do primeiro commit | @DeaTuribio relata na resposta dela que já aplicava a regra nas issues #319, #320 e #326 |
| Dividir PRs acima de 400 linhas | Aplicada na #322, que virou os PRs #343, #345 e #355 (@DeaTuribio) |
| Daily no mesmo dia | Ver a seção 5: a ata passou a listar quem não respondeu, e as ausências continuaram |

A avaliação do time sobre esses pontos fica para a retrospectiva da Sprint 3, com as respostas da [#440](https://github.com/DEVassos/ecopulse-app/issues/440).

## 7. Melhorias no kit (agilekit)

Problemas de ferramenta relatados nas respostas:

- **`evidencias.sh` saía só com o cabeçalho**: o `grep` vazio derrubava o script pelo `pipefail`, a comparação de e-mail diferenciava maiúsculas e as áreas saíam repetidas. Corrigido no kit (agilekit#32) (@travensolli).
- **`teste-avaliador.sh` não roda com a stack local no ar**, porque as portas 3000 e 5173 são fixas no `compose.yaml`. Contorno: um `compose.override.yaml` com outras portas (@travensolli, @DeaTuribio).
- **`check-commit-msg.sh` no Git Bash sem locale UTF-8 conta bytes**: um assunto de 71 caracteres com acento aparece como 73. Com `LC_ALL=C.UTF-8` e no CI, passa (@travensolli, @DeaTuribio).
- **Assunto de commit errado obriga a refazer a branch**, porque o force-push é proibido. Aconteceu duas vezes em 03 e 04/11 (@DeaTuribio).
- **Workflow `board` falhou no passo de rota nos PRs da release** (#306 e #309), e o #214 ficou em "Backlog" depois do merge até ser movido à mão em 09/11 (@travensolli).
- **Ambiente local**: falta de memória com Docker, WSL2 e VS Code juntos, e falha `renderer_ready_timeout` ao iniciar o Codex (@viniciusaugusto1997).
