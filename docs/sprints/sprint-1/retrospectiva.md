# Retrospectiva — Sprint 1

| Campo | Valor |
|---|---|
| Data | 20/10/2026, 19h45–20h20, na aula |
| Presentes | @henriqueptbd-cell, @travensolli, @DeaTuribio e @LUCASAMR23, na aula; @viniciusaugusto1997 de forma assíncrona, pela resposta escrita na #158 |
| Facilitação | @travensolli |
| Formato | manter / parar / começar, a partir das respostas individuais publicadas antes da reunião na [#158](https://github.com/DEVassos/greener-app/issues/158) |

Respostas individuais: [@travensolli](https://github.com/DEVassos/greener-app/issues/158#issuecomment-6300583297) · [@viniciusaugusto1997](https://github.com/DEVassos/greener-app/issues/158#issuecomment-6301712368) (enviada por mensagem e registrada por @travensolli a pedido dele) · [@DeaTuribio](https://github.com/DEVassos/greener-app/issues/158#issuecomment-6301786538) · [@henriqueptbd-cell](https://github.com/DEVassos/greener-app/issues/158#issuecomment-6303708754) · [@LUCASAMR23](https://github.com/DEVassos/greener-app/issues/158#issuecomment-6303764386). Os números abaixo vêm de [`sprint-1.md` § 9](../sprint-1.md#9-métricas), que é a fonte principal das métricas da sprint.

## 1. Métricas da sprint

| Métrica | Valor | Comentário |
|---|---|---|
| Itens planejados / concluídos | 19 issues no replanejamento de 05/10; 67 na milestone em 20/10, das quais 65 fechadas | abertas: #153 (entrega) e #158 (esta retrospectiva) |
| Story Points: escopo inicial / final / concluídos | 66 / 108 / 107 | o escopo cresceu com oito tarefas abertas no meio da sprint (#80, #97, #104, #106, #111, #112, #118 e #120) |
| PRs mergeados em `develop` | 56, de 06/10 a 18/10 | concentrados em 08–09/10 e em 14/10 |
| PRs com mais de 24h até a primeira revisão | 7 | #30, #32, #33, #57, #89, #91 e #136; além disso, #60 e #110 foram mergeados sem revisão |
| WIP máximo observado por pessoa | não medido na Sprint 1 | limite acordado: 2 |
| Dailies registradas / dias úteis | 14 / 15 | falta 12/10 (feriado); 19/10 foi o dia da review |
| Regressões abertas (`regressao`) | 0 | |
| Lacunas de participação (ES09) | nenhuma | fonte: [contribuicao.md](contribuicao.md) |
| Nota estimada (`/auditar 1`, 18/10) | 71 a 74 / 79 | |
| Nota dada pelo time (1 a 5) | 4 nas cinco respostas | atraso no início, base consistente no fim |

## 2. O que manter

- **Divisão de tarefas por área**, que permitiu o trabalho em paralelo e deixou claro quem podia ajudar em cada demanda (@travensolli, @viniciusaugusto1997, @LUCASAMR23).
- **Documentação coerente com a rubrica**, que serve de referência nas dúvidas (@travensolli, @viniciusaugusto1997, @henriqueptbd-cell).
- **Uma branch por tarefa e PRs pequenos em sequência**, revisáveis sozinhos, como #62 → #69 → #89 → #100 (@DeaTuribio, @LUCASAMR23, @viniciusaugusto1997).
- **PRs com testes e "Como verificar" executado de verdade**: no #99, a execução contra a API real mostrou que floats como `51.248000000000005` faziam toda coleta virar erro (@DeaTuribio, @LUCASAMR23).
- **Backend falso no frontend** (`npm run mock`), que permitiu fazer a tabela e o polling antes de existir `GET /api/services` (@DeaTuribio).
- **Comunicação assíncrona e ajuda entre colegas** (@travensolli, @henriqueptbd-cell).

## 3. O que parar

- **Uma pessoa desenvolver a tarefa inteira e outra só aprovar no fim** (@travensolli).
- **Mergear sem aprovação para destravar**: o #82 entrou em 13/10 com mudanças pedidas e gerou a #104 (@DeaTuribio). O #60 e o #110 foram mergeados sem revisão.
- **Deixar PR de outra área parado com o revisor**: o #82 esperou 4 dias pela revisão (@DeaTuribio).
- **Implementar sobre um contrato ainda não fechado**: o formato de `GET /api/services` e o CORS só foram definidos na integração, em 14/10 (#111, #115, #118) (@viniciusaugusto1997, @DeaTuribio).
- **Deixar integrações e tarefas novas para os últimos dias**: o cálculo de energia e emissão (#133) entrou em 16/10, com pouco tempo para testar (@LUCASAMR23); mudanças de escopo sem avaliar as dependências (@viniciusaugusto1997).
- **Verificações além do necessário no início**, quando ainda havia pouco para testar (@henriqueptbd-cell).

## 4. O que começar

- **Contrato da rota antes do código**: exemplo de JSON, formato de erro e CORS aprovados pelas duas áreas antes do primeiro commit (@viniciusaugusto1997, @DeaTuribio, @LUCASAMR23).
- **Revisor definido na abertura do PR**, com a primeira revisão em até 24h (@viniciusaugusto1997).
- **Integração geral pelo compose** antes do congelamento e antes de abrir PR que depende de outra área (@LUCASAMR23, @DeaTuribio).
- **"Como verificar" mais simples e claro** (@LUCASAMR23).
- **Daily por texto respondida no mesmo dia**, com @ de quem precisa agir em cada impedimento (@travensolli, @LUCASAMR23, @viniciusaugusto1997, @DeaTuribio).
- **Mais troca de ideias de todos sobre UI e usabilidade**, agora que a Sprint 2 é de telas (@travensolli), e comunicação ainda mais próxima (@henriqueptbd-cell).

## 5. Ações

| Ação | Dono | Prazo | Issue `tipo:processo` | Situação |
|---|---|---|---|---|
| Contrato de integração na issue antes do primeiro commit, começando pelo login JWT na US07 ([#48](https://github.com/DEVassos/greener-app/issues/48)) | @DeaTuribio | 23/10 | [#167](https://github.com/DEVassos/greener-app/issues/167) | aberta |
| Revisão cruzada em todo PR: revisor do par na abertura, aprovação "DoD verificada" com o que foi executado e rulesets sem bypass ([#164](https://github.com/DEVassos/greener-app/issues/164)) | @travensolli | 30/10 | [#168](https://github.com/DEVassos/greener-app/issues/168) | aberta |
| Daily por texto respondida até as 21h do mesmo dia, com @ de quem precisa agir em cada impedimento | @travensolli | 30/10 | [#169](https://github.com/DEVassos/greener-app/issues/169) | aberta |

Regras: no máximo 3 ações por sprint; cada ação tem um único dono; as ações são revisadas no início da retrospectiva da Sprint 2 (concluída, mantida ou descartada, com o motivo). Esta é a primeira retrospectiva do projeto, então não há ações anteriores a revisar.

## 6. Melhorias no kit (agilekit)

Problemas de ferramenta relatados na Sprint 1, a levar ao `DEVassos/agilekit` pelo SM:

- **`board-route.sh` fecha issue citada com `Refs`**: a regex `RE_PR_CLOSES` de `.github/scripts/lib/conventions.sh` inclui `Refs #n`. O merge do PR #136 em `develop` fechou a #134, que precisou ser reaberta (@DeaTuribio).
- **Workflow `board` falha em evento de issue sem label nova**: nos eventos da #158, terminou com "nenhuma label a adicionar" e exit 1 (run 39346351032).
- **`evidencias.sh` para com e-mail em maiúsculas**: a busca usa o e-mail em minúsculas, e o `grep` vazio derruba o script por causa do `set -e`/`pipefail`. O [contribuicao.md](contribuicao.md) foi gerado com uma cópia corrigida (§ Observações).
- **`check-commit-msg.sh` local conta errado com acento**: acusa "assunto > 72" quando o shell está sem locale UTF-8; com `LC_ALL=C.UTF-8`, como no CI, passa (@DeaTuribio).
- **Jobs do CI travados**: algumas execuções ficaram presas e precisaram ser reexecutadas (@travensolli). O run não foi anotado; na próxima ocorrência, o link do run entra na daily.
- **PowerShell no Windows**: `bash` abre o WSL, e não o Git Bash, e as skills do repositório só funcionam pelo Git Bash (@DeaTuribio).
