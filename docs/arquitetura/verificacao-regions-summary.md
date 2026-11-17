# Verificação regional — #320

RF13/RF14, BD04/DW03. Evidência local, sem merge ou aceite no GitHub. Contrato: [API](../api.md#get-apiregionssummary); fórmulas, exemplo e trechos do EXPLAIN: [cálculos](../calculos.md#agregação-regional-por-período).

## Escopo e preservação

A execução inicial de 11/11/2026 usou a base `802a9de` e registrou 272 testes aprovados em 19 arquivos, sem ignorados, em 16,88 s. Foram conferidos totais, SQL independente e EXPLAIN (0,311 ms), com typecheck/build e tipagem estrita aprovados. Esses números são históricos.

Em 13/11, com autorização de Vinicius, os 14 arquivos locais foram copiados para backup externo e conferidos por SHA-256. O stash com arquivos novos foi preservado; a branch avançou por fast-forward para `dd5fa78183486a23db235034be3b266b5288ab00` e as alterações foram reaplicadas. Não houve commit de trabalho, push ou PR. A #313 não foi modificada.

Os conflitos em `app.ts`/`server.ts` foram resolvidos preservando a #319: `CarbonApi` continua no oitavo argumento de `createApp`, e `RegionsSummaryRepository` ocupa o nono. A mesma Carbon API atende o coletor e a listagem; o resumo não a consulta. Um teste verifica as duas rotas na mesma aplicação, com o JWT aplicado antes delas.

## Conferências de dados

A fixture transacional contém seis serviços: dois na região A (ativo/indisponível), um sem métricas em B, um ativo sem região, um removido em região própria e um ativo sem coletas. Inclui zero calculado, NULL, energia parcial 500 sem fator, uma coleta antes de `from` e uma de 999/999 exatamente em `to`; as três últimas não entram nas somas. O snapshot regional da coleta difere do cadastro para comprovar o agrupamento pelo cadastro atual.

Os testes comparam o HTTP regional, o resumo geral e `manualRegions` (SELECT independente no helper `regions-summary-test.repository.ts`). Mesmos limites UTC e mesma transação: dois dias deram 7,75 kWh/40 g; um dia, 5,5 kWh/17 g; período sem cálculo, NULL/NULL. A diferença foi zero nos valores conhecidos. NULL não é convertido em zero.

`COUNT(DISTINCT s.id)` impede duplicar estados pelo JOIN. Histórico de removidos entra nas somas, mas não nos estados: região só com removidos tem contagens zero e `worstStatus: null`. Existe no máximo um grupo `code: null`. Sem serviços, a lista é vazia; serviços sem coletas preservam estados e somas nulas. A coluna real é `co2e_grams`, embora a issue mencione `emissions_g` no texto SQL.

O EXPLAIN usa o SQL capturado de `RegionsSummaryRepository.summarize`, os parâmetros de 01/04 a 03/04/2026, 6.000 coletas fora da janela e `ANALYZE collections`, sem alterar índices ou o planejador. Em 13/11: GroupAggregate → Sort → Hash Left Join; índice `collections_collected_at_idx` leu 9 linhas; services pequena recebeu Seq Scan. Planning Time: 0,918 ms; Execution Time: 0,230 ms. O plano e sua interpretação estão em `docs/calculos.md`.

## Reprodução e resultado de 13/11

Container Node 24 Alpine, código montado somente para leitura e copiado para o filesystem descartável. PostgreSQL 16 do projeto isolado `ecopulse-review337-4345895`, com bancos novos `repositories320`/`worker320`, schema e migração aplicados. Nenhum volume preexistente ou banco de outro projeto foi alterado ou apagado. Não apontar as variáveis de teste para banco real: as suítes preexistentes exigem bancos descartáveis vazios.

Com `REPOSITORY_TEST_DATABASE_URL` e `WORKER_TEST_DATABASE_URL` configuradas nesse ambiente, na pasta backend:

```bash
npm ci
npm run typecheck
npm run build
npx tsc --noEmit --strict --esModuleInterop --skipLibCheck --target ES2022 --module Node16 tests/regions-summary.test.ts tests/regions-summary-test.repository.ts
npm test -- --maxWorkers=1
```

Typecheck, build e checagem estrita passaram. **278 testes aprovados em 19 arquivos, nenhum ignorado; 22,96 s**: 15 casos regionais, integrações de repositories/coletor/configuração e testes da #319. Os quatro critérios da #320 foram executados: totais manuais, igualdade com resumo geral, pior estado e `from` sem `to` → 400; também JWT ausente/inválido/expirado, período padrão, limites inválidos, erro tipado do banco e coexistência das rotas.

Na rodada final antes da publicação, o projeto isolado `ecopulse-publish320-20261113` subiu pelo Compose com os três serviços saudáveis. Bancos novos `repositories_publish320`/`worker_publish320`: novamente 278 testes, 19 arquivos, nenhum ignorado, 14,54 s; typecheck/build e tipagem estrita passaram. O EXPLAIN regional usou o mesmo índice, em 0,472 ms. As duas rotas responderam 200 com JWT e 401 sem JWT; `from` sem `to` deu 400. O SELECT por região, a soma regional e o resumo geral coincidiram: 2,39317604414 g, diferença zero, na mesma janela de 24 h.

## Publicação do contrato

A confirmação à Andrea sobre removidos e `code: null` foi [publicada na #320 em 13/11/2026](https://github.com/DEVassos/ecopulse-app/issues/320#issuecomment-6867733226), antes do primeiro commit. A seção regional em `docs/calculos.md` preserva a #334 e não copia a seção por serviço do PR #337.
