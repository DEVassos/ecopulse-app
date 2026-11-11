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

## Exemplos sem arredondamento intermediário

CPU 50%; RAM 2 GB; disco 10 GB; rede 1 GB; 60 s; intensidade 85 gCO₂e/kWh:

```text
P = 50 + 0,75 + 0,10 + 0,02 = 50,87 W
E = 50,87 × 60 / 3.600.000 = 0,000847833333… kWh
C = E × 85 = 0,072065833333… gCO₂e
```

O PDF aproxima 60/3600 h para 0,0167 h, chegando a aproximadamente 0,0008495 kWh e 0,0722 g. Aqui usamos segundos exatos. Emissão deve ser calculada com intermediários completos; não usar energia arredondada para persistência nem arredondar potência intermediária antes de derivar energia.

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

A intensidade em seis casas também pode perder valores inferiores a 0,0000005 g/kWh; os exemplos documentados 85 e 0,1 são representáveis. Potência persistida é arredondada para seis casas, mas o `CarbonCalculator` usa o intermediário completo para calcular energia e emissão: o arredondamento só acontece na persistência. Verificar limites antes de gravar; falha de precisão/faixa não é medição zero. O fator externo não possui limite universal documentado.

## Agregação de coletas pequenas

1.000 coletas de 0,00000015 kWh somam 0,00015 kWh. Com intensidade 85, emissão total 0,01275 g; com intensidade 0,1, total 0,000015 g. SUM em PostgreSQL opera sobre numeric, sem converter para float; a soma pode superar a faixa de uma coluna individual e não deve ser forçada de volta ao mesmo typmod sem verificar overflow.

No exemplo oficial periódico, 1.000 linhas de energia já persistida somam 0,847833333 kWh, contra 0,847833333333… do cálculo sem quantização. O desvio aproximado 0,000000000333… kWh está abaixo do limite de 0,0000000005 kWh para 1.000 linhas. É um teste de armazenamento/agrupamento, não entrega de ranking/comparação da Sprint 3.

## Consultas agregadas por período

O ranking, a comparação, o resumo e o gráfico de um serviço agregam `collections` por período. As consultas estão em `backend/src/modules/services/services.repository.ts` (`findSummary`, `compareByIds`, `rankByPeriod`) e em `backend/src/modules/collections/collections.repository.ts` (`findSeries`), sempre dentro de um `*.repository.ts` e sempre com o período recebido como parâmetro (`$1`–`$3`), nunca interpolado no texto do SQL.

### Período: fechado no início, aberto no fim

```text
collected_at >= $from  AND  collected_at < $to      -- [from, to)
```

`from` e `to` chegam como ISO 8601 com offset (`2026-11-08T00:00:00-03:00`) e o driver converte para `timestamptz`; o banco não guarda hora local em lugar nenhum. As duas pontas são validadas na borda: `from < to` e no máximo 31 dias de janela — acima disso a resposta é 400, não uma agregação truncada. Sem `from`/`to`, `GET /api/services/summary` usa as últimas 24 h a partir do instante do pedido.

O intervalo é **aberto no fim** por três razões: dois períodos consecutivos somam exatamente o período maior (sem a coleta contada duas vezes na virada), a coleta que cai exatamente em `to` pertence ao dia seguinte e não ao anterior, e a soma dos totais diários de 08/11 e 09/11 reconstrói o total de 08/11→09/11. `BETWEEN` nas duas pontas quebraria a primeira e a terceira propriedades.

`GET /api/collections` (lista de coletas cruas, sem agregação) é a **exceção conhecida**: usa `collected_at >= $from AND collected_at <= $to`, inclusivo no fim, e aceita `from = to`. A diferença de um único instante na borda é pequena, mas é uma inconsistência real entre a lista e as agregações, registrada aqui para ser decidida por Lucas (backend) e Vinicius (db); enquanto não for decidida, quem comparar a lista com o ranking encontra uma linha de diferença quando existe coleta exatamente em `to`.

### Fórmula de cada agregação

| Campo da resposta | Fórmula SQL | Conta | Não conta |
|---|---|---|---|
| `collections` | `COUNT(c.id)` | toda coleta no período, inclusive com falha | serviço sem nenhuma coleta no período entra com `0` |
| `failed` | `COUNT(c.id) FILTER (WHERE c.status <> 'ok')` | `erro` e `sem_metricas` | — |
| `notCalculated` | `COUNT(c.id) FILTER (WHERE c.calculation_status <> 'disponivel')` | `nao_calculado` | — |
| `energyKwh` | `SUM(c.energy_kwh) FILTER (WHERE c.calculation_status = 'disponivel')` | só coleta com energia calculada | coleta sem cálculo, mesmo com `status = 'ok'` |
| `co2eGrams` | `SUM(c.co2e_grams) FILTER (WHERE c.calculation_status = 'disponivel')` | só coleta com emissão calculada | idem |
| `avgCpuPercent` | `AVG(c.cpu_percent) FILTER (WHERE c.status = 'ok')` | coleta com métrica lida | coleta com falha (que não tem CPU) |
| `avgMemoryGb`, `avgDiskGb`, `avgNetworkGb` | idem, cada coluna com o mesmo filtro | idem | idem |
| `carbonIntensity…` (série) | `AVG(c.carbon_intensity_gco2e_per_kwh) FILTER (WHERE c.calculation_status = 'disponivel')` | média simples da intensidade, não ponderada pela energia | coleta sem cálculo |

As três colunas de contagem usam `COUNT(c.id)` com `LEFT JOIN`, então serviço sem coleta no período aparece com `0` e `NULL` (não some da resposta) — é o que permite à interface distinguir "sem dado no período" de "serviço inexistente".

### Os dois filtros não são o mesmo, e é de propósito

A soma usa `calculation_status` e a média usa `status`. Uma coleta com `status = 'ok'` e `calculation_status = 'nao_calculado'` (a API de métricas respondeu, o cálculo falhou) entra no `avgCpuPercent` — a métrica existe — e fica fora do `energyKwh`, porque não há energia calculada. Misturar os dois filtros somaria energia que não existe ou descartaria CPU que foi medida.

`findSeries` soma `co2e_grams` **sem** `FILTER`, enquanto as outras três somam com `FILTER (WHERE calculation_status = 'disponivel')`. Hoje os dois são idênticos porque `co2e_grams` e `energy_kwh` só são gravados quando `calculation_status = 'disponivel'` (conferido no banco: 15.182 linhas `disponivel` com valor, 88 `nao_calculado` com `NULL` nas duas colunas). A igualdade é uma invariante da escrita, não da consulta: qualquer rotina futura que marque `nao_calculado` mantendo o valor faz o gráfico divergir do ranking. O ajuste é acrescentar o `FILTER` na série, sem mudar nenhum número.

### Ordem do ranking

```text
ORDER BY
  CASE WHEN $3::text = 'energy' THEN SUM(c.energy_kwh) FILTER (...) ELSE SUM(c.co2e_grams) FILTER (...) END DESC NULLS LAST,
  s.name ASC, s.id ASC
```

A métrica escolhida é um **valor de parâmetro**, não texto de SQL: `metric` é validado na borda (`energy` ou `co2e`) e chega ao `CASE`. É a alternativa ao `ORDER BY` dinâmico — não existe caminho em que dado de requisição vire identificador de coluna. `NULLS LAST` põe serviço sem dado no fim da lista em vez de no topo, e o desempate por `s.name, s.id` mantém a ordem estável entre duas chamadas com totais iguais.

### Exemplo numérico conferido

Serviço 4 (`Inventory Sync`, região `ca-central`, intensidade 40 g CO₂e/kWh), janela de 08/11/2026 00:00 a 00:20 em `America/Sao_Paulo`:

| Grandeza | Valor | Como se confere |
|---|---|---|
| coletas | 22 | todas com `status = 'ok'` e `calculation_status = 'disponivel'` |
| `energyKwh` | 0,010455447016 | soma das 22 linhas, conferida fora do banco |
| `co2eGrams` | 0,418217880595 | soma das 22 linhas |
| `avgCpuPercent` | 41,1382 | média das 22 leituras |
| CO₂e médio por coleta | 0,019009903663 g | 0,418217880595 ÷ 22 |

Duas conferências que fecham a conta:

1. **Energia × intensidade.** 0,010455447016 kWh × 40 g/kWh = 0,418217880640 g, contra 0,418217880595 g somados — diferença de 4,5 × 10⁻¹¹ g. Ela existe porque o `CarbonCalculator` multiplica a energia **não arredondada** e o `SUM` usa a energia persistida com 12 casas (ver "Precisão SQL e limites"); não é erro de agregação e não cresce com o número de linhas de forma descontrolada.
2. **API × SQL.** `GET /api/services/compare?ids=4,1&from=2026-11-08T00:00:00-03:00&to=2026-11-08T00:20:00-03:00` devolve para o serviço 4 exatamente `collections: 22`, `avgCpuPercent: 41.13818181818182`, `energyKwh: 0.010455447016`, `co2eGrams: 0.418217880595` — os mesmos números do `SELECT` manual abaixo.

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

Executado em 10/11/2026 contra um banco com 15.238 coletas de 8 serviços, o resultado bate linha a linha com `GET /api/services/ranking?metric=co2e&from=2026-11-08T00:00:00-03:00&to=2026-11-09T00:00:00-03:00`: `Fraud Detector` 439,697261980482 g; `Checkout Worker` 427,330492644840; `Recommendation AI` 372,703075277339; `Audit Stream` 350,168079144919; `Billing API` 73,337305308002; `Email Dispatcher` 51,958362956387; `Reporting Batch` 32,992927302410; `Inventory Sync` 24,836959141307. As contagens (`1.327`, `1.366`, `1.320`, `1.320`, `1.323`, `1.370`, `1.369`, `1.365`) e as falhas também coincidem.

### O período muda o resultado

Mudar a janela muda os totais e eles continuam batendo com o `SELECT` manual: 08/11 00:00 → 09/11 00:00 soma 1.773,024463755686 g em 10.760 coletas; 07/11 00:00 → 09/11 00:00 soma 2.273,846990265378 g em 13.781 coletas. A diferença (500,822526509692 g e 3.021 coletas) é exatamente o dia 07/11, o que confirma que a janela é aplicada e que as bordas não se sobrepõem.

### EXPLAIN: por que o ranking não usa o índice

`EXPLAIN (ANALYZE, BUFFERS)` da consulta do ranking no período de um dia (10.760 de 15.238 linhas, 70 % da tabela):

```text
HashAggregate (actual time=29.136..29.150 rows=8 loops=1)
  Buffers: shared hit=691
  ->  Hash Right Join (actual time=1.374..17.931 rows=10760 loops=1)
        ->  Seq Scan on collections c (actual time=1.289..8.692 rows=10760 loops=1)
              Filter: ((collected_at >= '2026-11-08 03:00:00+00'::timestamptz) AND (collected_at < '2026-11-09 03:00:00+00'::timestamptz))
              Rows Removed by Filter: 4494
              Buffers: shared hit=690
        ->  Hash (rows=8) -> Seq Scan on services s (rows=8)
Execution Time: 29.838 ms
```

**É `Seq Scan`, e está correto.** Quando a janela cobre 70 % da tabela, ler a tabela inteira em ordem física custa menos que saltar por 10.760 posições de índice: forçando o índice (`SET enable_seqscan = off`) o plano vira `Index Scan using collections_collected_at_idx` e o tempo, medido em execuções seguidas com cache aquecido, sobe de 14,0 ms para 16,7 ms com a mesma saída. Os 29,838 ms do bloco acima são a primeira execução, com a tabela ainda fria; o que importa na comparação é o par 14,0 ms × 16,7 ms, medido nas mesmas condições. O índice que existe é `collections_collected_at_idx (collected_at DESC)`; `collections_service_collected_at_idx (service_id, collected_at DESC)` é feito para o outro padrão de acesso — filtrar por serviço — e não ajuda quando a consulta varre todos os serviços.

Com janela estreita o planejador troca sozinho: para 30 minutos do mesmo dia ele usa `Index Scan using collections_collected_at_idx` (252 linhas, 2,9 ms). Ou seja, o índice é usado quando a seletividade justifica, e a decisão de não usá-lo é do planejador com estatística atualizada, não uma ausência de índice.

**Uma correção pendente.** A consulta da última coleta por serviço (`findAllWithLastReading`, `LEFT JOIN LATERAL … ORDER BY collected_at DESC, id DESC LIMIT 1`) também não usa `collections_service_collected_at_idx`: o desempate `id DESC` não está no índice, então o plano prefere `collections_collected_at_idx` e filtra `service_id = s.id` linha a linha (12 linhas lidas e 10 descartadas por serviço, mais um `Incremental Sort`, para achar 1). Com `(service_id, collected_at DESC, id DESC)` o mesmo `ORDER BY` fica coberto e o plano vira `Index Only Scan` lendo 1 linha (`0,195 ms` contra `0,377 ms` por serviço, medido em 10/11/2026). Isso é alteração de `database/schema.sql`, com `database/README.md` e `docs/arquitetura.md` § Modelo de dados no mesmo PR — está proposto a Vinicius em #313 e **não foi aplicado**.

Nenhum índice foi criado ou alterado nesta tarefa: `database/schema.sql` continua com as mesmas definições, e a conferência de índices do roteiro reproduzível (`docs/arquitetura/verificacao-schema.md`) segue valendo sem alteração.

## Como verificar e migrar

[Roteiro reproduzível](arquitetura/verificacao-schema.md) usa PostgreSQL descartável: exemplos acima, agregações, limites, NULL, estados e índices. Schema inicial não migra banco populado: a versão anterior com escala seis é recusada pelo guard. Migração futura deverá ampliar os tipos explicitamente e preservar dados; não consegue recuperar energia já arredondada para zero sem entradas originais confiáveis. Nenhuma migração em banco do usuário foi executada.
