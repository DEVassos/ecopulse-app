# Cálculos e unidades do modelo

Contrato de dados do RF07, previsto para a Sprint 2 (#18) e adiantado na issue #133 (PR #139). O motor de cálculo está em `backend/src/domain/carbon-calculator.ts` e é chamado pelo coletor (`backend/src/jobs/collector.ts`) a cada coleta válida; os resultados ficam gravados na própria coleta. Decisão do modelo em [ADR 0006](adr/0006-modelo-potencia-fatores-emissao.md).

## Fonte e fórmula

Fonte original: [documentação do desafio](contexto/greener-documentacao-do-desafio.pdf), pp. 5–7. Modelo simplificado padronizado, não medição elétrica direta. Constantes usadas no exemplo oficial: CPU_MAX_WATTS = 100 W; RAM_WATTS_PER_GB = 0,375 W/GB; DISK_WATTS_PER_GB = 0,01 W/GB; NETWORK_WATTS_PER_GB = 0,02 W/GB. Sem versionamento/configuração de coeficientes nesta tarefa.

```text
P (W) = (cpu_percent / 100) × 100
      + memory_gb × 0,375
      + disk_gb × 0,01
      + network_gb × 0,02
E (kWh) = P × collection_interval_seconds / 3.600.000
C (gCO₂e) = E × carbon_intensity_gco2e_per_kwh
```

As métricas de entrada são as mesmas gravadas na coleta, já arredondadas à escala das colunas (CPU com 2 casas, GB com 9); o valor original fica no JSON bruto. O fator de carbono vem da API de intensidade com cache de 1 h por região (decisão do PO na #17): coletas da mesma região dentro dessa hora usam o mesmo fator, e a intensidade efetivamente usada fica gravada em `carbon_intensity_gco2e_per_kwh`. Sem fator válido, o cálculo fica `indisponivel` com energia e emissão `NULL`, nunca zero.

Tempo é o intervalo positivo da API por coleta, não o polling da tela. Memória/disco/rede são GB declarados pelo contrato, sem definição decimal/binária: não presumir GiB nem converter para bytes. Rede não é reinterpretada como taxa por segundo. Snapshot regional e intensidade utilizada são preservados na coleta. JSON bruto preserva a entrada original, sem copiar manualmente os resultados/fatores. Desconhecido é NULL; zero é conhecido.

## Exemplo numérico e precisão

CPU 50%; RAM 2 GB; disco 10 GB; rede 1 GB; 60 s; intensidade 85 gCO₂e/kWh:

```text
P = 50 + 0,75 + 0,10 + 0,02 = 50,87 W
E = 50,87 × 60 / 3.600.000 = 0,000847833333… kWh
C = E × 85 = 0,072065833333… gCO₂e
```

Cada parcela de potência é arredondada a seis casas antes de compor `P`; energia e emissão são derivadas dessa soma, e apenas seus valores persistidos são arredondados a 12 casas. Neste exemplo, a quantização das parcelas não altera `P`. O PDF aproxima 60/3600 h para 0,0167 h, chegando a aproximadamente 0,0008495 kWh e 0,0722 g; aqui usamos segundos exatos e a energia completa para calcular a emissão.

OpenAPI: CPU 62,67%; RAM 3,17 GB; disco 19,26 GB; rede 0,45 GB; 27 s; fator 85. P = 64,06035 W; E = 0,000480452625 kWh; C = 0,040838473125 g.

Carga pequena: CPU/RAM/disco zero, rede 1 GB → P = 0,02 W. Em 27 s: E = 0,00000015 kWh. Com fator 85: C = 0,00001275 g; com fator 0,1: C = 0,000000015 g. Todos esses resultados positivos são preservados nas novas escalas.

## Precisão SQL e limites

A regra local pede numeric com escala definida e cita numeric(14,6) como convenção, sem proibição explícita de outras escalas. A precisão foi ampliada a pedido de Vinicius, depois da revisão do schema; a regra do kit não foi alterada. Energia numeric(20,12) mantém oito dígitos inteiros; emissão numeric(24,12) mantém doze, ampliando a faixa para o produto pelo fator regional. A escala da emissão evita perder valores pequenos em regiões com fator baixo. Intensidade e potência permanecem numeric(14,6); GB numeric(20,9); CPU numeric(5,2).

| Campo | Tipo | Resolução | Maior valor positivo |
|---|---|---|---|
| energy_kwh | numeric(20,12) | 0,000000000001 kWh | 99.999.999,999999999999 kWh |
| co2e_grams | numeric(24,12) | 0,000000000001 g | 999.999.999.999,999999999999 g |
| power_watts e intensidade | numeric(14,6) | 0,000001 na unidade do campo | 99.999.999,999999 |

| Exemplo | Valor antes da persistência | Valor persistido |
|---|---|---|
| Energia oficial, segundos exatos | 0,000847833333… | 0,000847833333 |
| Emissão oficial | 0,072065833333… | 0,072065833333 |
| Energia OpenAPI | 0,000480452625 | 0,000480452625 |
| Emissão OpenAPI | 0,040838473125 | 0,040838473125 |
| Energia 0,02 W em 27 s | 0,00000015 | 0,000000150000 |
| Emissão dessa carga, fator 85 | 0,00001275 | 0,000012750000 |
| Emissão dessa carga, fator 0,1 | 0,000000015 | 0,000000015000 |

Quantização final de energia/emissão: até 0,0000000000005 na unidade por linha. Para N coletas, soma dos erros de armazenamento limitada a N × 0,0000000000005, sem considerar erros das entradas, fator/modelo ou cálculo anterior. Valores positivos abaixo de meia unidade de resolução ainda podem virar zero; valores na fronteira da faixa podem causar overflow ao arredondar. Não prometemos precisão universal nem suporte ao produto de todos os máximos possíveis de energia e intensidade.

A intensidade em seis casas também pode perder valores inferiores a 0,0000005 g/kWh; os exemplos documentados 85 e 0,1 são representáveis. Cada parcela de potência é arredondada para seis casas, `powerWatts` é a soma dessas parcelas e energia/emissão usam essa soma antes de persistir seus valores com 12 casas. Verificar limites antes de gravar; falha de precisão/faixa não é medição zero. O fator externo não possui limite universal documentado.

## Agregação de coletas pequenas

1.000 coletas de 0,00000015 kWh somam 0,00015 kWh. Com intensidade 85, emissão total 0,01275 g; com intensidade 0,1, total 0,000015 g. SUM em PostgreSQL opera sobre numeric, sem converter para float; a soma pode superar a faixa de uma coluna individual e não deve ser forçada de volta ao mesmo typmod sem verificar overflow.

No exemplo oficial periódico, 1.000 linhas de energia já persistida somam 0,847833333 kWh, contra 0,847833333333… do cálculo sem quantização. O desvio aproximado 0,000000000333… kWh está abaixo do limite de 0,0000000005 kWh para 1.000 linhas. É um teste de armazenamento/agrupamento, não entrega de ranking/comparação da Sprint 3.

## Consultas agregadas por período

O ranking, a comparação, o resumo e o gráfico de um serviço agregam `collections` por período. As consultas estão em `backend/src/modules/services/services.repository.ts` (`findSummaryTotals`, `countServicesByStatus`, `compareByIds`, `rankByPeriod`) e em `backend/src/modules/collections/collections.repository.ts` (`findSeries`), sempre dentro de um `*.repository.ts` e sempre com o período recebido como parâmetro (`$1`–`$3`), nunca interpolado no texto do SQL.

### Período: fechado no início, aberto no fim

```text
collected_at >= $from  AND  collected_at < $to      -- [from, to)
```

`from` e `to` chegam como ISO 8601 com offset (`2026-11-08T00:00:00-03:00`) e o controller (`summaryPeriod`, em `services.controller.ts`) os converte para `Date`; o driver envia esse `Date` como parâmetro `timestamptz`. O banco não guarda hora local em lugar nenhum. As duas pontas são validadas na borda: `from < to` e no máximo 31 dias de janela — acima disso a resposta é 400, não uma agregação truncada. Sem `from`/`to`, `GET /api/services/summary` e `GET /api/services/ranking` usam as últimas 24 h a partir do instante do pedido (o ranking tem janela padrão própria, a mesma função `summaryPeriod`).

O intervalo é **aberto no fim** por três razões: dois períodos consecutivos somam exatamente o período maior (sem a coleta contada duas vezes na virada), a coleta que cai exatamente em `to` pertence ao dia seguinte e não ao anterior, e a soma dos totais diários de 08/11 e 09/11 reconstrói o total de 08/11→09/11. `BETWEEN` nas duas pontas quebraria a primeira e a terceira propriedades.

`GET /api/collections` (lista de coletas cruas, sem agregação) também usa `[from, to)`: `collected_at >= $from AND collected_at < $to`, com `from < to`. Uma coleta exatamente em `to` fica fora, como nas agregações; a rota só consulta o histórico e não altera as coletas gravadas.

### Fórmula de cada agregação

| Campo da resposta | Fórmula SQL | Conta | Não conta |
|---|---|---|---|
| `collections` | `COUNT(c.id)` | toda coleta no período, inclusive com falha | serviço sem nenhuma coleta no período entra com `0` |
| `failed` | `COUNT(c.id) FILTER (WHERE c.status <> 'ok')` | `erro` e `sem_metricas` | — |
| `notCalculated` | `COUNT(c.id) FILTER (WHERE c.calculation_status <> 'disponivel')` | `nao_calculado` (inclui as coletas com falha) e `indisponivel` | — |
| `energyKwh` | `SUM(c.energy_kwh) FILTER (WHERE c.calculation_status = 'disponivel')` | só coleta com energia calculada | coleta sem cálculo, mesmo com `status = 'ok'` |
| `co2eGrams` | `SUM(c.co2e_grams) FILTER (WHERE c.calculation_status = 'disponivel')` (na série, `SUM(co2e_grams) FILTER (WHERE calculation_status = 'disponivel')`) | só coleta com emissão calculada | idem |
| `avgCpuPercent` | `SUM(c.cpu_percent * c.collection_interval_seconds) FILTER (WHERE c.status = 'ok') / SUM(c.collection_interval_seconds) FILTER (WHERE c.status = 'ok')` | média ponderada pelo tempo das coletas com métrica lida | coleta com falha (que não tem CPU) |
| `avgMemoryGb`, `avgDiskGb`, `avgNetworkGb` | mesma fórmula ponderada, usando cada coluna e o mesmo filtro | idem | idem |
| `notCalculated` (série) | `COUNT(*) FILTER (WHERE status = 'ok' AND calculation_status <> 'disponivel')` | `nao_calculado` e `indisponivel` de coleta com métrica lida | coleta com falha, que a série já conta em `failed` |
| `carbonIntensity…` (série) | `AVG(c.carbon_intensity_gco2e_per_kwh) FILTER (WHERE c.calculation_status = 'disponivel')` | média simples da intensidade, não ponderada pela energia | coleta sem cálculo |

No ranking e na comparação, as três colunas de contagem usam `COUNT(c.id)` sobre `LEFT JOIN`, então serviço sem coleta no período aparece com `0` e `NULL` — é o que permite à interface distinguir "sem dado no período" de "serviço inexistente". Com uma exceção no ranking: `WHERE s.status <> 'removido' OR c.id IS NOT NULL` tira da resposta o serviço `removido` sem nenhuma coleta na janela, e ele só aparece com `0` se tiver ao menos uma coleta no período. `compareByIds` sempre devolve os `ids` pedidos (`s.id = ANY($1::bigint[])`), com `0` quando não há coleta. `findSeries` é outro caso: usa `COUNT(*)` sobre a CTE `ranged` (já filtrada por `service_id` e período) com `GROUPING SETS ((bucket_start), ())`, então período sem coleta devolve **uma** linha de total com `0` e nenhum bucket.

### Os dois filtros não são o mesmo, e é de propósito

A soma usa `calculation_status` e a média usa `status`. Uma coleta com `status = 'ok'` e `calculation_status = 'indisponivel'` — a API de métricas respondeu e o cálculo de emissões falhou, e é o que `unavailableCalculation` grava em `backend/src/jobs/collector.ts` — entra no `avgCpuPercent`, porque a métrica existe, e fica fora do `energyKwh`. `ok` com `nao_calculado` só acontece quando o coletor roda **sem** `carbonApi` configurada; com a calculadora presente, toda coleta `ok` sem fator termina em `indisponivel`. Misturar os dois filtros somaria energia que não existe ou descartaria CPU que foi medida.

`findSeries` também soma `co2e_grams` com `FILTER (WHERE calculation_status = 'disponivel')`, como as outras agregações. O filtro explicita o contrato de leitura, embora os valores não mudem hoje: a `CHECK collections_calculation_state_valid` (`database/schema.sql`) exige `co2e_grams IS NULL` nas duas situações sem cálculo. `nao_calculado` exige `carbon_intensity_gco2e_per_kwh`, `power_watts`, `energy_kwh`, `co2e_grams` e `calculation_error_message` todos `NULL`; `indisponivel` exige `co2e_grams IS NULL` com `calculation_error_message` preenchido. A igualdade atual também é garantida pelo schema, não apenas pela escrita.

Em `energy_kwh` essa garantia não existe: `indisponivel` aceita `power_watts` e `energy_kwh` preenchidos (as duas colunas juntas, nunca uma só), com `co2e_grams` NULL. Por isso, o `FILTER` na soma de energia afeta os valores e o de CO₂e documenta explicitamente a regra, mesmo sem alterar os resultados atuais.

### Ordem do ranking

```text
ORDER BY
  CASE WHEN $3::text = 'energy' THEN SUM(c.energy_kwh) FILTER (...) ELSE SUM(c.co2e_grams) FILTER (...) END DESC NULLS LAST,
  s.name ASC, s.id ASC
```

A métrica escolhida é um **valor de parâmetro**, não texto de SQL: `metric` é validado na borda (`energy` ou `co2e`) e chega ao `CASE`. É a alternativa ao `ORDER BY` dinâmico — não existe caminho em que dado de requisição vire identificador de coluna. `NULLS LAST` põe serviço sem dado no fim da lista em vez de no topo, e o desempate por `s.name, s.id` mantém a ordem estável entre duas chamadas com totais iguais.

### Exemplo numérico conferido

Serviço 4 (`Inventory Sync`, `region_code` `ca-central` — `Ontario` no campo `region` da API —, intensidade 40 g CO₂e/kWh), janela de 08/11/2026 00:00 a 00:20 em `America/Sao_Paulo`:

| Grandeza | Valor | Como se confere |
|---|---|---|
| coletas | 22 | todas com `status = 'ok'` e `calculation_status = 'disponivel'` |
| `energyKwh` | 0,010455447016 | soma das 22 linhas, conferida fora do banco |
| `co2eGrams` | 0,418217880595 | soma das 22 linhas |
| `avgCpuPercent` | média ponderada por `collection_interval_seconds` | `Σ(cpu × intervalo) ÷ Σ(intervalo)` nas coletas `ok` |
| CO₂e médio por coleta | 0,019009903663 g | 0,418217880595 ÷ 22 |

Duas conferências que fecham a conta:

1. **Energia × intensidade.** 0,010455447016 kWh × 40 g/kWh = 0,418217880640 g, contra 0,418217880595 g somados — diferença de 4,5 × 10⁻¹¹ g. Ela existe porque o `CarbonCalculator` multiplica a energia **não arredondada** e o `SUM` usa a energia persistida com 12 casas (ver "Precisão SQL e limites"); não é erro de agregação e não cresce com o número de linhas de forma descontrolada.
2. **API × SQL.** `GET /api/services/compare?ids=4,1&from=2026-11-08T00:00:00-03:00&to=2026-11-08T00:20:00-03:00` devolve para o serviço 4 `collections: 22`, as quatro médias ponderadas por intervalo, `avgPowerBreakdown` derivado delas, `energyKwh: 0.010455447016` e `co2eGrams: 0.418217880595`. A fórmula das médias é `SUM(recurso × collection_interval_seconds) FILTER (WHERE status = 'ok') / SUM(collection_interval_seconds) FILTER (WHERE status = 'ok')`.

### Conferência manual do período

Uma única consulta reproduz o ranking inteiro. O comentário marcador na primeira linha do bloco é o que o "Como verificar" da issue usa para extraí-lo — por isso ele precisa continuar sendo a primeira linha entre o marcador e o ponto e vírgula final:

```sql
-- conferência BD04: totais manuais do período 08/11/2026 (America/Sao_Paulo), para comparar com o ranking
SELECT s.id, s.name,
  COUNT(c.id) AS coletas,
  COUNT(c.id) FILTER (WHERE c.status <> 'ok') AS falhas,
  to_char(SUM(c.energy_kwh) FILTER (WHERE c.calculation_status = 'disponivel'), 'FM999990.000000000000') AS energia_kwh,
  to_char(SUM(c.co2e_grams) FILTER (WHERE c.calculation_status = 'disponivel'), 'FM999990.000000000000') AS co2e_grams,
  to_char(AVG(c.cpu_percent) FILTER (WHERE c.status = 'ok'), 'FM9990.0000') AS cpu_medio
FROM services AS s
LEFT JOIN collections AS c ON c.service_id = s.id
  AND c.collected_at >= timestamptz '2026-11-08T00:00:00-03:00'
  AND c.collected_at <  timestamptz '2026-11-09T00:00:00-03:00'
WHERE s.status <> 'removido' OR c.id IS NOT NULL
GROUP BY s.id, s.name
ORDER BY SUM(c.co2e_grams) FILTER (WHERE c.calculation_status = 'disponivel') DESC NULLS LAST, s.name, s.id;
```

Executado em 10/11/2026 contra o banco de desenvolvimento do PO, com **15.238 coletas de 8 serviços** acumuladas pelo coletor. Não é um conjunto reproduzível: em um clone limpo do avaliador o mesmo bloco roda sem erro, mas devolve as 8 linhas com `0` coletas e `NULL`, porque a janela é uma data fixa. O que é reproduzível é o método — o mesmo `SELECT` rodado na janela de 5 minutos dos passos 2 e 3 do "Como verificar" da #313 dá o mesmo resultado da API. Com esses dados, o resultado bate linha a linha com `GET /api/services/ranking?metric=co2e&from=2026-11-08T00:00:00-03:00&to=2026-11-09T00:00:00-03:00`: `Fraud Detector` 439,697261980482 g; `Checkout Worker` 427,330492644840; `Recommendation AI` 372,703075277339; `Audit Stream` 350,168079144919; `Billing API` 73,337305308002; `Email Dispatcher` 51,958362956387; `Reporting Batch` 32,992927302410; `Inventory Sync` 24,836959141307. As contagens (`1.327`, `1.366`, `1.320`, `1.320`, `1.323`, `1.370`, `1.369`, `1.365`) e as falhas também coincidem.

### O período muda o resultado

Mudar a janela muda os totais e eles continuam batendo com o `SELECT` manual (mesmo banco do exemplo anterior): 08/11 00:00 → 09/11 00:00 soma 1.773,024463755686 g em 10.760 coletas; 07/11 00:00 → 09/11 00:00 soma 2.273,846990265378 g em 13.781 coletas. A diferença (500,822526509692 g e 3.021 coletas) é exatamente o dia 07/11, o que confirma que a janela é aplicada e que as bordas não se sobrepõem.

### EXPLAIN: por que o ranking não usa o índice

`EXPLAIN (ANALYZE, BUFFERS)` da consulta do ranking no período de um dia (10.760 de 15.254 linhas, 71 % da tabela), medido em 11/11/2026. O bloco é o **plano resumido**: só os nós que sustentam a leitura. A saída literal traz ainda o `Sort` do `ORDER BY` como nó raiz e o `Filter: ((s.status <> 'removido'::text) OR (c.id IS NOT NULL))` do `Hash Right Join`, que não mudam a conclusão.

```text
HashAggregate (actual time=29.136..29.150 rows=8 loops=1)
  Buffers: shared hit=691
  ->  Hash Right Join (actual time=1.374..17.931 rows=10760 loops=1)
        ->  Seq Scan on collections c (actual time=1.289..8.692 rows=10760 loops=1)
              Filter: ((collected_at >= '2026-11-08 03:00:00+00'::timestamp with time zone) AND (collected_at < '2026-11-09 03:00:00+00'::timestamp with time zone))
              Rows Removed by Filter: 4494
              Buffers: shared hit=690
        ->  Hash (rows=8) -> Seq Scan on services s (rows=8)
Execution Time: 29.838 ms
```

**É `Seq Scan`, e está correto.** Quando a janela cobre 71 % da tabela, ler a tabela inteira em ordem física custa menos que saltar por 10.760 posições de índice: forçando o índice (`SET enable_seqscan = off`) o plano vira `Index Scan using collections_collected_at_idx` e o tempo, medido em execuções seguidas com cache aquecido, sobe de 14,0 ms para 16,7 ms com a mesma saída. O par 14,0 ms × 16,7 ms é o que sustenta a conclusão, porque foi medido nas mesmas condições; o bloco acima é uma execução única e mostra apenas `shared hit=691`, sem `read=`, ou seja, com a relação já em cache. A conta das linhas fecha o total: 10.760 devolvidas mais 4.494 removidas pelo filtro dão 15.254 linhas na tabela no instante da medição — 16 a mais que as 15.238 do `SELECT` manual, que é o coletor gravando entre uma medição e outra. O índice que existe é `collections_collected_at_idx (collected_at DESC)`; `collections_service_collected_at_idx (service_id, collected_at DESC)` é feito para o outro padrão de acesso — filtrar por serviço — e não ajuda quando a consulta varre todos os serviços.

Com janela estreita o planejador troca sozinho: para 30 minutos do mesmo dia ele usa `Index Scan using collections_collected_at_idx` (252 linhas, 2,9 ms). Ou seja, o índice é usado quando a seletividade justifica, e a decisão de não usá-lo é do planejador com estatística atualizada, não uma ausência de índice.

### Última coleta: índice com desempate por ID (#346)

`ServiceRepository.findAllWithLastReading()` usa `WHERE service_id = s.id ORDER BY collected_at DESC, id DESC LIMIT 1` em `LEFT JOIN LATERAL`. O índice `collections_service_collected_at_idx` passa de `(service_id, collected_at DESC)` para `(service_id, collected_at DESC, id DESC)`, mantendo o nome e a quantidade de índices. A consulta e suas colunas projetadas não mudam. O índice de `collections` não otimiza `countMonitoredByRegion`, que agrupa a tabela `services`.

**Medição reexecutada em 17/11/2026 (America/Sao_Paulo), sobre develop `88688cd` com o diff local da #346.** PostgreSQL 16.15 (`postgres:16-alpine`, Alpine 15.2.0), Docker no WSL2, projeto exclusivo `ecopulse-346-final-20261117`, sem portas publicadas. Foram inseridos 8 serviços e 200.000 coletas (25.000 por serviço) dentro de `BEGIN … ROLLBACK`, com CPU 10%, intervalo 30 s, memória/disco/rede 100 GB e estado inicial `nao_calculado`. Datas fixas: `2026-11-07T19:40:00Z` a `2026-11-16T11:59:30Z`. O protocolo usa `ANALYZE` e a consulta integral do repository, sem parâmetros de período e sem alterar os parâmetros do planejador (`enable_seqscan`, `enable_indexscan`, `enable_bitmapscan`, `enable_incremental_sort` permaneceram `on`).

O SQL integral e a massa estão em [`database/verification/346-last-reading.sql`](../database/verification/346-last-reading.sql). A verificação é manual: o entrypoint não percorre `verification/`. Execute somente em banco exclusivo **sem serviços**, chamado `ecopulse_346` (o script verifica isso antes de alterar o índice). Em Git Bash/WSL, na raiz de uma cópia da branch:

```bash
# Confira previamente que 5547 está livre e que este projeto/volume é exclusivo.
export POSTGRES_DB=ecopulse_346 POSTGRES_HOST_PORT=5547
# Não executar down -v em projeto habitual: este nome separa rede e volume.
docker compose --env-file .env.example -p ecopulse-346-revisao-20261117 up --build -d --wait postgres
docker compose --env-file .env.example -p ecopulse-346-revisao-20261117 exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/verification/346-last-reading.sql'
```

No ambiente desta medição foi usado um Compose local somente com PostgreSQL, sem porta publicada, montando a mesma pasta `database/` e um volume exclusivo. O comando acima usa o serviço PostgreSQL do Compose oficial para reproduzir o mesmo SQL. A massa e a substituição experimental dos índices são revertidas; valores de sequências IDENTITY podem avançar mesmo após `ROLLBACK`. O script confirma zero serviços/coletas no fim. Reexecuções podem variar estatísticas, cache e o índice escolhido no cenário antigo.

**Antes, definição antiga recriada dentro da transação:**

```text
 Sort  (cost=9.95..9.97 rows=8 width=295) (actual time=0.179..0.180 rows=8 loops=1)
   Sort Key: s.name, s.id
   Sort Method: quicksort  Memory: 25kB
   Buffers: shared hit=25
   ->  Nested Loop Left Join  (cost=0.75..9.83 rows=8 width=295) (actual time=0.054..0.118 rows=8 loops=1)
         Buffers: shared hit=25
         ->  Seq Scan on services s  (cost=0.00..1.08 rows=8 width=153) (actual time=0.006..0.008 rows=8 loops=1)
               Buffers: shared hit=1
         ->  Limit  (cost=0.75..1.07 rows=1 width=150) (actual time=0.012..0.013 rows=1 loops=8)
               Buffers: shared hit=24
               ->  Incremental Sort  (cost=0.75..8123.36 rows=25000 width=150) (actual time=0.012..0.012 rows=1 loops=8)
                     Sort Key: collections.collected_at DESC, collections.id DESC
                     Presorted Key: collections.collected_at
                     Full-sort Groups: 8  Sort Method: quicksort  Average Memory: 25kB  Peak Memory: 25kB
                     Buffers: shared hit=24
                     ->  Index Scan using collections_collected_at_idx on collections  (cost=0.29..7297.30 rows=25000 width=150) (actual time=0.007..0.009 rows=2 loops=8)
                           Filter: (service_id = s.id)
                           Rows Removed by Filter: 10
                           Buffers: shared hit=24
 Planning:
   Buffers: shared hit=119 read=1
 Planning Time: 1.971 ms
 Execution Time: 0.272 ms
```

**Depois, mesmo nome e massa, com `id DESC`:**

```text
 Sort  (cost=8.65..8.67 rows=8 width=295) (actual time=0.290..0.292 rows=8 loops=1)
   Sort Key: s.name, s.id
   Sort Method: quicksort  Memory: 25kB
   Buffers: shared hit=19 read=14
   ->  Nested Loop Left Join  (cost=0.42..8.53 rows=8 width=295) (actual time=0.079..0.246 rows=8 loops=1)
         Buffers: shared hit=19 read=14
         ->  Seq Scan on services s  (cost=0.00..1.08 rows=8 width=153) (actual time=0.009..0.011 rows=8 loops=1)
               Buffers: shared hit=1
         ->  Limit  (cost=0.42..0.91 rows=1 width=150) (actual time=0.028..0.028 rows=1 loops=8)
               Buffers: shared hit=18 read=14
               ->  Index Scan using collections_service_collected_at_idx on collections  (cost=0.42..12273.78 rows=25000 width=150) (actual time=0.027..0.027 rows=1 loops=8)
                     Index Cond: (service_id = s.id)
                     Buffers: shared hit=18 read=14
 Planning:
   Buffers: shared hit=5 read=1
 Planning Time: 0.490 ms
 Execution Time: 0.395 ms
```

| Métrica observada | Antes | Depois |
|---|---|---|
| Índice em collections | `collections_collected_at_idx` | `collections_service_collected_at_idx` |
| Acesso | `Index Scan`, filtro por serviço | `Index Scan`, `Index Cond: (service_id = s.id)` |
| Incremental Sort | sim, pré-ordenado por collected_at | não |
| Linhas por execução do scan | 2 devolvidas + 10 descartadas, média arredondada, loops=8 | 1 devolvida, sem descarte por filtro, loops=8 |
| Execution Time | 0,272 ms | 0,395 ms |
| Buffers de execução, nó raiz | shared hit=25 | shared hit=19 read=14 |

A evidência é a eliminação da ordenação adicional por serviço e do filtro residual, não ganho de tempo: **esta execução não demonstra redução de duração**. São execuções únicas sequenciais, com índice novo recém-construído e cache diferente (14 leituras no segundo plano); não constituem benchmark estatístico. O `Sort` raiz por `s.name, s.id` permanece e é independente do `Incremental Sort` eliminado.

A projeção completa lê CPU, energia, emissão, erros, intervalo, recursos, potência e intensidade, ausentes no índice: há acesso ao heap (`Index Scan`), sem alegação de `Index Only Scan`. Com pouca massa, outro plano pode ser legítimo; não se desabilitou seqscan, bitmapscan ou sort para obter este resultado.

O script compara as respostas completas antes/depois por `EXCEPT ALL` nos dois sentidos e valida coleta única, múltiplas datas, empate de timestamp pelo maior ID e serviço sem coleta (campos de leitura `NULL`). Os quatro serviços adicionais e cinco coletas desses casos são criados **depois** das medições; as respostas completas desses casos também são comparadas com as duas definições do índice, e tudo termina em `ROLLBACK`. Resultado: `RESULTADOS_IGUAIS_E_CASOS_FUNCIONAIS_OK`.

A definição nova em `schema.sql` vale para banco vazio. Banco já inicializado exige a migração transacional `002-collections-last-reading-index.sql`, com backup e janela de manutenção; `CREATE INDEX IF NOT EXISTS` sozinho não atualiza um índice antigo. Procedimento e limites no [README do banco](../database/README.md#índice-da-última-coleta-346).

## Intensidade de carbono por região

`GET https://carbon.unilaunch.org/regions` devolve as regiões com `code`, `country`, `region`, `city`, `latitude`, `longitude`, `carbon_intensity_gco2e_per_kwh` e `renewable_share_percent`. Retrato consultado em 11/11/2026 (`jq '.total'` → 5):

| `code` | Cidade | Intensidade (g CO₂e/kWh) | Renovável (%) | Rede limpa (≤ 100 g/kWh) |
|---|---|---|---|---|
| `ca-central` | Toronto | 40 | 89 | sim |
| `br-sudeste` | São Paulo | 85 | 83 | sim |
| `eu-west` | Dublin | 295 | 38 | não |
| `us-east` | Ashburn | 378 | 26 | não |
| `jp-east` | Tokyo | 465 | 22 | não |

É um retrato: a API é externa e pode mudar sem aviso. O fator que vale para uma coleta continua sendo o gravado em `collections.carbon_intensity_gco2e_per_kwh` no momento da coleta, com cache de 1 h por região; esta tabela serve para comparar regiões e para a simulação, nunca para substituir o fator já persistido. A ordem "mais limpa primeiro" usada nas telas é a desta tabela; empate desempata por `code` em ordem alfabética.

## Simulação de migração regional

A pergunta é qual o impacto de mover um serviço para uma região mais limpa. A simulação troca **somente** o fator regional: carga de trabalho, hardware e intervalo de coleta ficam iguais, então a energia do período é preservada.

```text
E_período (kWh)    = SUM(energy_kwh)  das coletas com calculation_status = 'disponivel' no período
CO₂e_real (g)      = SUM(co2e_grams)  mesmo filtro
CO₂e_simulado (g)  = E_período × intensidade_destino (g/kWh)
redução (g)        = CO₂e_real − CO₂e_simulado
redução (%)        = 100 × redução ÷ CO₂e_real, quando CO₂e_real > 0
```

O `CO₂e_real` é a **soma do que foi gravado**, não `E_período × intensidade_atual`: com cache de 1 h, um período mais longo que 1 h pode ter mais de uma intensidade, e refazer a conta com o fator de agora daria um número que nunca foi medido.

`redução` é **com sinal**. Destino mais sujo que a origem resulta negativo e a tela mostra "aumento de X g (Y %)", nunca uma "redução" negativa. O destino padrão é a região de **menor intensidade entre todas as regiões da API** (hoje `ca-central`, 40 g/kWh), inclusive as que não têm serviço. Serviço cuja região não está na lista da API não tem "atual" para comparar: a tela lista as demais como destino e não promete redução.

Ressalvas que a tela declara ao lado do número: a estimativa não considera latência, custo de nuvem, disponibilidade, mudança de hardware ou de arquitetura, nem a energia gasta para mover os dados. É ordem de grandeza para decisão, não medição.

Sem dado, não há número: sem energia ou sem `CO₂e_real` no período a tela mostra "sem dado no período". Região de destino sem fator fica indisponível na lista, nunca com 0 g. `CO₂e_real = 0` não tem percentual — mostra a redução em gramas e "percentual não calculável".

Exemplo conferível à mão — serviço em `us-east` (378 g/kWh) com `E_período` = 0,050 kWh:

| Destino | Intensidade | CO₂e simulado | Redução | Resultado na tela |
|---|---|---|---|---|
| (origem) `us-east` | 378 | 0,050 × 378 = 18,90 g | — | `CO₂e_real` = 18,90 g |
| `ca-central` | 40 | 0,050 × 40 = 2,00 g | 16,90 g | redução de 89,42 % |
| `br-sudeste` | 85 | 0,050 × 85 = 4,25 g | 14,65 g | redução de 77,51 % |
| `jp-east` | 465 | 0,050 × 465 = 23,25 g | −4,35 g | aumento de 23,02 % |

Percentual arredondado a 2 casas só na exibição: 16,90 ÷ 18,90 = 0,894179…, 14,65 ÷ 18,90 = 0,775132…, 4,35 ÷ 18,90 = 0,230158…

## Eficiência energética e de carbono

Sem dado de carga de trabalho (requisições, jobs, usuários), eficiência aqui significa **quanta potência o serviço gasta para estar no ar** — e é isso que a tela precisa dizer, em vez de sugerir eficiência por unidade de trabalho.

```text
segundos monitorados  = SUM(collection_interval_seconds) das mesmas coletas de E_período
                        (calculation_status = 'disponivel'), não das coletas com status = 'ok'
P_média (W)           = E_período (kWh) × 3 600 000 ÷ segundos monitorados
eficiência de carbono = intensidade da região (g CO₂e/kWh), menor é melhor
```

`P_média` é a média **ponderada pelo tempo**, não `AVG(power_watts)`: como `E = P × Δt ÷ 3 600 000`, somando as coletas `Σ P·Δt = E × 3 600 000` e `P_média = Σ P·Δt ÷ Σ Δt`. Com intervalos iguais as duas contas coincidem; com intervalos diferentes, só a ponderada está certa — e é por isso que a rota precisa devolver os segundos monitorados, coisa que nenhuma rota faz hoje.

Numerador e denominador têm de sair do **mesmo conjunto de coletas**, e o conjunto é o de `E_período` (`calculation_status = 'disponivel'`). Somar o tempo das coletas `status = 'ok'` e a energia das calculadas mistura dois conjuntos: uma coleta `ok` sem fator tem energia `NULL`, entra no tempo e não entra na energia. Com 1 h da API de carbono fora em 24 h a 20 W, a conta misturada dá 0,46 × 3 600 000 ÷ 86 400 = 19,17 W em vez de 20 W — o serviço parece mais eficiente exatamente quando a medição falhou.

Exemplos conferíveis à mão:

- 0,48 kWh em 24 h monitoradas: 0,48 × 3 600 000 ÷ 86 400 = **20 W**.
- De volta ao exemplo oficial: 1.000 coletas de 60 s com P = 50,87 W dão `E` = 0,847833333 kWh e 60 000 s; 0,847833333 × 3 600 000 ÷ 60 000 = **50,87 W**, a potência de origem.
- Eficiência de carbono, com o exemplo da seção de simulação (`us-east`, `E_período` 0,050 kWh, `CO₂e_real` 18,90 g): 18,90 ÷ 0,050 = **378 g CO₂e/kWh**, o fator da região. O mesmo serviço em `br-sudeste` daria 4,25 ÷ 0,050 = **85 g CO₂e/kWh**.

`segundos monitorados = 0` (período só com coletas `erro` ou `sem_metricas`) não é potência zero: é "sem dado no período".

### Por que W por % de CPU foi descartado

A razão `P ÷ cpu_percent` foi considerada e recusada. No modelo oficial `P = cpu_percent × 1 W + RAM·0,375 + disco·0,01 + rede·0,02`, logo `P ÷ cpu_percent = 1 + (demais recursos) ÷ cpu_percent`: é **1 W por ponto percentual mais um resíduo**, que no exemplo do OpenAPI vale 1,39035 ÷ 62,67 = 0,0222 — ou seja 1,0222 W por ponto, praticamente igual para todo serviço de CPU dominante. Uma métrica que dá ≈ 1 para todos não ordena nada. Ela ainda quebra em `cpu_percent = 0` (divisão por zero), o que acontece em serviço ocioso. A potência média em W não tem nenhum dos dois problemas, é a mesma grandeza que a coleta já grava em `power_watts` e responde à pergunta sem inventar uma razão.

## Composição da potência por recurso

Os mesmos coeficientes da seção "Fonte e fórmula", decompostos. Exemplo do OpenAPI (CPU 62,67 %; RAM 3,17 GB; disco 19,26 GB; rede 0,45 GB):

| Recurso | Entrada | Coeficiente | Potência (W) | Parcela |
|---|---|---|---|---|
| CPU | 62,67 % | 100 W a 100 % → 1 W por ponto | 62,67 | 97,83 % |
| RAM | 3,17 GB | 0,375 W/GB | 1,18875 | 1,86 % |
| Disco | 19,26 GB | 0,01 W/GB | 0,1926 | 0,30 % |
| Rede | 0,45 GB | 0,02 W/GB | 0,009 | 0,01 % |
| **Total** | | | **64,06035** | **100,00 %** |

A soma das parcelas arredondadas a seis casas reproduz a potência da seção principal (64,06035 W). A soma dos percentuais exibidos fecha 100,00 após arredondar cada parcela; a tela não soma esses percentuais arredondados.

### A composição de um período usa médias ponderadas

Cada parcela é **linear** no recurso, então a composição parte das médias ponderadas dos quatro recursos:

```text
avgPowerBreakdown = powerBreakdown({
  cpuPercent: avgCpuPercent,
  memoryGb: avgMemoryGb,
  diskGb: avgDiskGb,
  networkGb: avgNetworkGb
})
avg(x) = Σ(x × collection_interval_seconds) ÷ Σ(collection_interval_seconds)
```

`GET /api/services/compare` devolve as quatro médias ponderadas pelo intervalo das coletas com `status = 'ok'` e `avgPowerBreakdown`, com uma parcela em W por recurso. A função aplica os mesmos coeficientes oficiais e arredonda cada parcela a seis casas. Não é necessária coluna ou migration.

As médias de recursos usam `status = 'ok'`, enquanto `energyKwh` soma apenas as coletas com `calculation_status = 'disponivel'`. Portanto uma métrica válida cuja emissão não pôde ser calculada entra nas médias e fica fora da energia; `avgPowerBreakdown` não deve ser interpretado como potência média inferida da energia total. A rota ainda não devolve o tempo monitorado necessário para reconciliar esses conjuntos; esse ajuste fica fora da #327.

Enquanto `cpu_percent = 0` for valor válido, a parcela de CPU é 0 W e a de RAM pode ser a maior: a barra não pode assumir CPU dominante.

## Limite de "rede limpa"

O limite é o mesmo nos dois casos — 100 g CO₂e/kWh —, mas a intensidade vem de fontes diferentes:

```text
região  (fator de agora)    selo quando a intensidade de GET /api/regions ≤ 100
serviço (fator do período)  selo quando CO₂e_real ÷ E_período ≤ 100, com E_período > 0
```

O caso **região** olha o fator atual e vale mesmo sem coleta no período; é o que a coluna "Rede limpa (≤ 100 g/kWh)" da tabela de regiões marca, inclusive `ca-central`, que não tem serviço. O caso **serviço** usa o fator que as coletas gravaram e responde "este serviço rodou em rede limpa no período?" — um serviço que migrou de região no meio do período pode ter os dois resultados.

A #324 usa o caso **região**: o selo da tabela de serviços e o do painel do mapa vêm de `GET /api/regions` (via `utils/regions.ts`), com a intensidade de agora. O caso serviço ainda não tem rota; a fórmula fica aqui para quando ela existir.

A justificativa é a distribuição das cinco regiões da API, não um número da documentação do desafio: 40, 85, 295, 378 e 465 g CO₂e/kWh, mediana 295. O corte em 100 fica **entre a segunda mais limpa (85) e a terceira (295)**, separando exatamente as duas regiões com ≥ 83 % de renovável das três com ≤ 38 %, e está longe dos cinco valores — uma atualização pequena da API não muda o resultado. É **decisão de produto**, registrada no histórico do plano, e não constante do modelo: quem discordar do número muda o limite, não a fórmula.

Verificação em um comando — `curl -s https://carbon.unilaunch.org/regions | jq -r '.regions[] | "\(.code) \(.carbon_intensity_gco2e_per_kwh)"'` — precisa mostrar valores abaixo de 100 para `ca-central` e `br-sudeste`, e acima de 100 para `eu-west`, `us-east` e `jp-east` (a saída traz os valores como `40.0`, `85.0`, `295.0`, `378.0` e `465.0`). A API devolve as regiões na ordem dela, não em ordem alfabética de `code`; para ordenar, use `jq -r '.regions | sort_by(.code)[] | "\(.code) \(.carbon_intensity_gco2e_per_kwh)"'`.

Sem intensidade não há selo: no caso região, região fora de `GET /api/regions`; no caso serviço, `E_período = 0`, `CO₂e_real` nulo ou região sem fator — os dois casos mostram "sem dado no período", nunca "rede limpa". No caso serviço, um período com mais de uma intensidade (cache de 1 h) usa a intensidade ponderada pela energia, `CO₂e_real ÷ E_período`, que é igual ao fator da região quando ele não mudou no período.

## Agregação regional por período

`RegionsSummaryRepository.summarize`, em `backend/src/modules/regions/regions-summary.repository.ts` (#320, RF13/RF14), agrupa pelo `services.region_code` atual. O `LEFT JOIN` filtra `collected_at >= $1 AND collected_at < $2`; as somas de `energy_kwh` (kWh) e `co2e_grams` (g) usam `FILTER (WHERE calculation_status = 'disponivel')`, como o resumo geral. Sem cálculo disponível, a soma é `NULL`; zero calculado continua sendo zero.

O histórico de serviços removidos entra nas somas, mas não nas contagens de estado atual. `COUNT(DISTINCT s.id) FILTER (...)` evita multiplicar serviços pelo número de coletas. O pior estado é `indisponivel`, depois `sem_metricas`, depois `ativo`; com as três contagens zeradas, é `null`. Uma região só com removidos pode aparecer com histórico e estado nulo. Serviços sem região formam no máximo um grupo `code: null`; regiões sem serviço cadastrado não são inventadas.

### Conferência numérica e plano regional

Reexecutado em 13/11/2026 com PostgreSQL 16 e fixtures transacionais, na base `dd5fa78183486a23db235034be3b266b5288ab00`. O teste `backend/tests/regions-summary.test.ts` compara cada região com um SELECT independente e a soma regional com `GET /api/services/summary`, usando os mesmos limites e a mesma transação. Duas janelas UTC com os mesmos serviços deram:

| Período [início, fim) | Energia regional = resumo = SELECT | CO₂e regional = resumo = SELECT |
|---|---|---|
| 01/04/2026 → 03/04/2026, 00h | 7,75 kWh | 40 g |
| 01/04/2026 → 02/04/2026, 00h | 5,5 kWh | 17 g |
| 01/01/2025 → 02/01/2025, 00h, sem cálculo | NULL | NULL |

O helper `regionalPlan` captura o SQL real do repository e executa `EXPLAIN (ANALYZE, BUFFERS)` com `$1 = 2026-04-01T00:00:00Z` e `$2 = 2026-04-03T00:00:00Z`. A fixture acrescenta 6.000 coletas fora da janela e executa `ANALYZE collections`; não altera índices nem desabilita planos. Trechos literais da execução de 13/11:

```text
GroupAggregate  (cost=31.72..51.34 rows=200 width=288) (actual time=0.113..0.130 rows=6 loops=1)
Seq Scan on services s  (cost=0.00..12.50 rows=250 width=72) (actual time=0.006..0.008 rows=36 loops=1)
Index Scan using collections_collected_at_idx on collections c  (cost=0.28..8.30 rows=1 width=50) (actual time=0.013..0.017 rows=9 loops=1)
Planning Time: 0.918 ms
Execution Time: 0.230 ms
```

O plano completo também contém Sort e Hash Left Join. A janela seletiva favoreceu o índice de data; a tabela de serviços pequena recebeu Seq Scan. O tempo é uma observação local, não garantia de latência. Nenhuma alteração de schema foi necessária. [Evidência e reprodução regional](arquitetura/verificacao-regions-summary.md) registram a massa, o SELECT independente e os comandos para rodar com bancos descartáveis.

## Como verificar e migrar

[Roteiro reproduzível](arquitetura/verificacao-schema.md) usa PostgreSQL descartável: exemplos acima, agregações, limites, NULL, estados e índices. Schema inicial não migra banco populado: a versão anterior com escala seis é recusada pelo guard. Migração futura deverá ampliar os tipos explicitamente e preservar dados; não consegue recuperar energia já arredondada para zero sem entradas originais confiáveis. Nenhuma migração em banco do usuário foi executada.

## Equivalências

O card "Emissões no período" traduz o CO₂e acumulado em duas unidades do dia a dia (#333). A equivalência é **só de apresentação**: não entra na coleta, não é gravada e não substitui o valor em gramas, que continua sendo o número principal do card. É uma ordem de grandeza, derivada de médias nacionais dos Estados Unidos, não uma medição do serviço monitorado.

| Unidade familiar | Fator | Como se chega nele | Fonte (consultada em 13/11/2026) |
|---|---|---|---|
| km de carro a gasolina | 244,2 g CO₂e/km | 8.887 g CO₂/gal ÷ 22,8 mpg combinado (2022, IPCC 2006) = 389,8 g CO₂/mi; ÷ 0,994 (razão CO₂/CO₂e da EPA) = 392 g CO₂e/mi, que a EPA publica arredondado em 3,93×10⁻⁴ t CO₂e/mi (393 g/mi); ÷ 1,609344 km/mi = 244,2 g CO₂e/km | [EPA, Greenhouse Gas Equivalencies Calculator — Calculations and References](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references) (FHWA, *Highway Statistics 2022*, publicado em 2024; EPA, *Inventory of U.S. GHG Emissions* 2024, cap. 3) |
| cargas de celular | 12,4 g CO₂/carga | 0,0194 kWh por carga (28,446 Wh − 22 h × 0,411 W em standby, sem arredondar) × 1.405,3 lb CO₂/MWh; o fator da EPA é só de CO₂, sem o CO₂e, e é aceito aqui por ser ordem de grandeza | [mesma página](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references) (U.S. DOE/Jeremy Dommu, comunicação de 04/10/2024; EPA eGRID 2024a) |

```text
km de carro    = co2e_grams / 244,2
cargas de celular = co2e_grams / 12,4
```

Exibição: dois algarismos significativos no padrão brasileiro (`1,0565` → "1,1"; `20,8` → "21"); abaixo de 0,01 a unidade familiar não diz nada e o texto é "< 0,01", nunca zero. O card mostra as duas unidades numa linha (`≈ 1,1 km de carro a gasolina · ≈ 21 cargas de celular`) com o aviso "(ordem de grandeza)"; o tooltip traz o fator, a fonte e a data de consulta de cada uma. Sem CO₂e calculado (`NULL`) a linha não aparece — como no resto da tela, desconhecido não vira zero; com total zero também não aparece, porque a equivalência não diria nada.

Exemplo numérico (o mesmo do critério de aceite da #333): 258 g CO₂e no período → 258 / 244,2 = 1,0565 → "≈ 1,1 km de carro a gasolina"; 258 / 12,4 = 20,806 → "≈ 21 cargas de celular".

Onde isso vive: `frontend/src/utils/equivalents.ts` (fatores, arredondamento e texto), com teste em `frontend/src/utils/equivalents.test.ts`, e a linha no card em `frontend/src/components/IndicatorsPanel.tsx`. Mudou um fator aqui, mude lá — o teste fixa a conta dos dois lados.

Como verificar: `cd frontend && npx vitest run src/utils/equivalents.test.ts` e, com o dashboard aberto, conferir que o card "Emissões no período" mostra a linha de equivalências coerente com o valor em gramas formatado acima dela.
