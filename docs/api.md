# API — backend

Contrato do backend. A execução integrada usa os containers backend e PostgreSQL do `compose.yaml` (#26/#27): `docker compose up --build`.

## CORS

O dashboard roda em outra origem (`http://localhost:5173`) e chama a API pelo navegador. O backend envia `Access-Control-Allow-Origin` só para as origens de `CORS_ORIGIN` (padrão `http://localhost:5173`, lista separada por vírgula) e responde o preflight `OPTIONS` com `204`, liberando `Content-Type` e `Authorization`. Outra origem não recebe o cabeçalho, e o navegador bloqueia a resposta. Chamadas sem navegador (`curl`) não são afetadas.

As rotas de dados abaixo exigem `Authorization: Bearer <JWT>` obtido em `POST /api/auth/login`. Token ausente, inválido ou expirado devolve `401 UNAUTHORIZED`. Permanecem públicas `GET /health`, `POST /api/auth/login`, `GET /api/monitoring-settings` (o `PUT` exige JWT), `GET /api/invitations/:token` e `POST /api/auth/register` (estas duas exigem um convite válido).

### Papéis (#196)

Cada conta tem o papel `admin` ou `usuario`, que vai no JWT emitido pelo login. As duas leem todas as rotas de dados. Só `admin` altera o que é compartilhado: `PUT /api/monitoring-settings` e `POST /api/invitations` devolvem `403 FORBIDDEN` para `usuario`. Token emitido antes da #196, sem papel, é recusado com `401` e a pessoa entra de novo.

Os dois papéis alteram a própria conta (#400): o nome em [`PATCH /api/auth/me`](#patch-apiauthme) e a senha em [`PUT /api/auth/me/password`](#put-apiauthmepassword). O e-mail e o papel não mudam por essas rotas.

## GET /api/services

Requer autenticação; sem token válido devolve `401 UNAUTHORIZED`. Não recebe parâmetros ou corpo. O prefixo `/api` corresponde ao padrão de `VITE_API_URL=http://localhost:3000/api` usado pelo frontend; `/health` permanece na raiz.

Devolve os serviços persistidos, o estado atual de monitoramento e a coleta mais recente de cada um. A consulta usa `LEFT JOIN LATERAL`, portanto um serviço sem coleta continua aparecendo com `lastReadingAt` e `cpuPercent` como `null`. Localização ausente no cadastro também permanece `null`. `energyKwh` e `emissionsG` são calculados a partir do intervalo da própria coleta e do fator regional; se o cálculo estiver indisponível, permanecem `null` sem invalidar as métricas.

Resposta 200:

```json
{
  "services": [{
    "id": "1",
    "name": "Demo",
    "country": "BR",
    "region": "Sul",
    "city": "Porto Alegre",
    "cpuPercent": 62.67,
    "energyKwh": 0.000480452625,
    "emissionsG": 0.040838473125,
    "status": "ativo",
    "statusReason": null,
    "lastReadingAt": "2026-10-14T20:00:00.000Z",
    "regionCode": "br-sul",
    "collectionIntervalSeconds": 27,
    "memoryGb": 3.17,
    "diskGb": 19.26,
    "networkGb": 0.45,
    "powerWatts": 64.06035,
    "carbonIntensityGco2ePerKwh": 85,
    "powerBreakdown": {
      "cpuW": 62.67,
      "memoryW": 1.18875,
      "diskW": 0.1926,
      "networkW": 0.009
    }
  }],
  "period": "última leitura (intervalo de coleta)"
}
```

Os números do exemplo são o exemplo OpenAPI de [`docs/calculos.md`](calculos.md): CPU 62,67%, RAM 3,17 GB, disco 19,26 GB, rede 0,45 GB, 27 s e fator 85 gCO₂e/kWh.

Campos da última coleta (#297), todos da mesma linha de `collections` que dá `lastReadingAt`, `cpuPercent`, `energyKwh` e `emissionsG`:

| Campo | Origem | Tipo | `null` quando |
|---|---|---|---|
| `regionCode` | `services.region_code` (cadastro); `region` continua sendo o nome | texto ou `null` | cadastro sem região |
| `collectionIntervalSeconds` | `collection_interval_seconds`, em s | inteiro ≥ 1 ou `null` | sem coleta, ou última coleta com erro ou sem métricas |
| `memoryGb`, `diskGb`, `networkGb` | `memory_gb`, `disk_gb`, `network_gb`, em GB | número ≥ 0 ou `null` | idem |
| `powerWatts` | `power_watts`, em W | número ≥ 0 ou `null` | cálculo não disponível |
| `carbonIntensityGco2ePerKwh` | `carbon_intensity_gco2e_per_kwh`, o fator efetivamente usado, em gCO₂e/kWh | número ≥ 0 ou `null` | cálculo não disponível (sem região, região sem fator, API de carbono fora) |
| `powerBreakdown` | parcelas da potência calculadas dos quatro recursos, em W, cada uma arredondada a seis casas | objeto com `cpuW`, `memoryW`, `diskW` e `networkW`, ou `null` | sem potência calculada ou sem algum recurso |

Invariantes úteis na verificação: `emissionsG ≈ energyKwh × carbonIntensityGco2ePerKwh`, `powerWatts ≈ energyKwh × 3 600 000 ÷ collectionIntervalSeconds` e a soma das quatro parcelas de `powerBreakdown` coincide com `powerWatts` à precisão de seis casas ([`docs/calculos.md`](calculos.md)). O fator é o mesmo de `GET /api/collections?service_id=<id>&limit=1` → `collections[0].carbonIntensityGco2ePerKwh`. `energyKwh` e `emissionsG` são da última coleta, que cobre um intervalo de cerca de 30 s, e não acumulados.

`status` do serviço: `ativo` (última métrica válida), `indisponivel` (falha do agregador ou métrica inválida), `sem_metricas` (404 do agregador para um serviço ainda listado) ou `removido` (saiu da lista do agregador; volta a `ativo` quando reaparece).

Se a descoberta global em `/services` do agregador falhar, o coletor preserva o cadastro e grava diagnóstico `erro` para os conhecidos não removidos, marcando-os `indisponivel`. Isso indica impossibilidade de monitorar pelo agregador, sem afirmar que cada aplicação caiu. As medidas dessa coleta são nulas; serviços já removidos permanecem removidos. A falha não remove cadastros nem apaga o histórico. Ao recuperar a descoberta e obter métricas válidas no próximo prazo, o serviço volta a `ativo`.

Falha de banco retorna 500 no envelope global, sem stack ou SQL:

```json
{"error":{"code":"DATABASE_ERROR","message":"Não foi possível acessar o banco de dados."}}
```

`statusReason` (#251) usa `error_message` somente da coleta mais recente, com desempate por `collected_at DESC, id DESC`. É `null` para estados diferentes de `indisponivel` ou ausência de mensagem. Diagnósticos conhecidos são apresentados sem URLs, caminhos, stack ou SQL; mensagens arbitrárias viram "Não foi possível obter as métricas deste serviço.". Exemplo: `"statusReason":"Serviço indisponível (HTTP 500)."`. Não se procura erro antigo quando a última coleta não tem mensagem.

## GET /api/monitoring-settings

Público, sem parâmetros ou corpo; não exige nem valida token Bearer. Resposta 200:

```json
{"refreshIntervalSeconds":30,"allowedIntervalsSeconds":[15,30,60],"updatedAt":null}
```

Sem registro, esse é o padrão e nenhuma linha é inserida. Tabela ausente ou banco indisponível retorna 500 `DATABASE_ERROR`, nunca o padrão como sucesso. A configuração controla o polling da tela; não altera o worker ou a frequência de coleta por serviço.

## PUT /api/monitoring-settings

Exige `Authorization: Bearer <JWT>` de uma conta `admin` (#196). Corpo JSON:

```json
{"refreshIntervalSeconds":60}
```

Somente números inteiros 15, 30 ou 60 são aceitos. Campo ausente, string, booleano, nulo, decimal ou valor fora da lista retorna 400. Upsert de `id=1`, sem `updated_by`; a última escrita concluída prevalece. Resposta 200, no mesmo formato do GET:

```json
{"refreshIntervalSeconds":60,"allowedIntervalsSeconds":[15,30,60],"updatedAt":"2026-11-03T12:00:00.000Z"}
```

| HTTP | Código | Situação |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Corpo ou intervalo inválido |
| 401 | `UNAUTHORIZED` | PUT sem JWT, inválido ou expirado |
| 403 | `FORBIDDEN` | conta com papel `usuario` |
| 500 | `DATABASE_ERROR` | Falha no banco, inclusive migração não aplicada |

Erros seguem `{"error":{"code":"VALIDATION_ERROR","message":"refreshIntervalSeconds deve ser 15, 30 ou 60."}}`; respostas não expõem SQL ou stack. Aplicação em volumes existentes: [migração do banco](../database/README.md#configuração-de-monitoramento-250).

## GET /api/regions

Lista as regiões fornecidas pela Carbon API para o mapa (RF13, #319). Requer autenticação; sem token válido devolve `401 UNAUTHORIZED`.

`GET /api/regions`

Cada região sempre traz coordenadas, intensidade de carbono e percentual renovável válidos. `monitoredServices` é a quantidade atual de serviços com o mesmo `code` e estado diferente de `removido`; uma região sem serviço monitorado aparece com `0`. `source: "cache"` informa que a Carbon API falhou e a resposta veio do último cache disponível; por uma hora ele é usado sem nova requisição e, vencido, ainda é a alternativa segura se a atualização falhar.

```json
{"regions":[{"code":"us-east","country":"United States","region":"Virginia","city":"Ashburn","latitude":39.04,"longitude":-77.49,"carbonIntensityGco2ePerKwh":378,"renewableSharePercent":22,"monitoredServices":2}],"source":"api","fetchedAt":"2026-11-12T13:00:00.000Z"}
```

| HTTP | Código | Situação |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT ausente, inválido ou expirado |
| 502 | `EXTERNAL_API_ERROR` | Carbon API indisponível ou resposta fora do contrato e não há cache válido/anterior |
| 500 | `DATABASE_ERROR` | falha ao contar os serviços monitorados |

## GET /api/services/summary

Indicadores agregados do dashboard (RF08, #175). Requer autenticação; sem token válido devolve `401 UNAUTHORIZED`.

`GET /api/services/summary?from=2026-10-20T00:00:00Z&to=2026-10-21T00:00:00Z`

| Parâmetro | Obrigatório | Regra |
|---|---|---|
| `from` | não | instante ISO 8601 com hora (`2026-10-20T00:00:00Z` ou `2026-10-20T00:00:00-03:00`); enviado junto com `to` |
| `to` | não | igual a `from` e posterior a ele; o período `[from, to)` tem até 31 dias |

Regras:

- Sem `from` e `to`, o período são as **últimas 24 h** até o instante da requisição. Enviar só um dos dois devolve 400.
- O período é fechado no início e aberto no fim: entra a coleta de `from` e fica de fora a de `to`, como em `GET /api/collections/series` e `GET /api/services/compare`.
- `energyKwh` e `co2eGrams` somam **só as coletas com cálculo disponível** no período. Sem nenhuma, vêm `null` ("não calculado"), nunca `0`; `0` é um total calculado igual a zero.
- `services` é o **estado atual** de cada serviço, contado uma vez por serviço, e **não depende do período**.
- O dashboard chama a rota duas vezes por ciclo: as últimas 24 h e as 24 h anteriores a elas, para a variação percentual.

Resposta 200:

```json
{"period":{"from":"2026-10-20T00:00:00.000Z","to":"2026-10-21T00:00:00.000Z"},"energyKwh":0.0124,"co2eGrams":1.05,"services":{"active":3,"unavailable":0,"withoutMetrics":0,"removed":1}}
```

Sem coleta calculada no período:

```json
{"period":{"from":"2026-10-20T00:00:00.000Z","to":"2026-10-21T00:00:00.000Z"},"energyKwh":null,"co2eGrams":null,"services":{"active":3,"unavailable":0,"withoutMetrics":0,"removed":1}}
```

Erros:

| HTTP | Código | Situação |
|---|---|---|
| 400 | VALIDATION_ERROR | só `from` ou só `to`; data sem hora, inexistente (30/02) ou texto; `from` igual ou posterior a `to`; período acima de 31 dias |
| 500 | DATABASE_ERROR | falha de conexão ou de consulta no PostgreSQL |

```json
{"error":{"code":"VALIDATION_ERROR","message":"from deve ser anterior a to."}}
```

O formato desta rota (`period{}` e `services{}`) é diferente do de `GET /api/collections/series` e `GET /api/services/compare` (`from`/`to` no topo, contagens `collections`/`failed`/`notCalculated`). O alinhamento ao contrato combinado na #175 ficou para a Sprint 3.

## GET /api/collections

Histórico de coletas. Requer autenticação; sem token válido devolve `401 UNAUTHORIZED`. Não recebe corpo. Parâmetros opcionais:

- `service_id`: inteiro positivo;
- `from` e `to`: data **com hora** em ISO 8601, como `2026-10-18T00:00:00Z` ou `2026-10-18T00:00:00-03:00`. Só a data (`2026-10-18`) devolve 400, e `from` precisa ser anterior a `to`;
- `limit`: de 1 a 500, padrão 50.

A lista sai sempre da coleta mais recente para a mais antiga. `status` da coleta: `ok`, `erro` (falha do agregador ou métrica inválida, com `errorMessage`) ou `sem_metricas`.

Cada coleta traz o resultado do cálculo de energia e CO₂e ([fórmulas](calculos.md)), com `calculationStatus` em:

| `calculationStatus` | Significado | `energyKwh`, `co2eGrams`, `carbonIntensityGco2ePerKwh` |
|---|---|---|
| `disponivel` | as quatro métricas (CPU, memória, disco e rede) e a intensidade de carbono foram obtidas | número ≥ 0 (zero é resultado válido) |
| `nao_calculado` | a coleta foi gravada sem que o cálculo fosse executado. Coletas `erro` e `sem_metricas` ficam sempre assim, e não há recálculo depois | `null` |
| `indisponivel` | o cálculo foi tentado e não houve intensidade válida (região não informada; região sem fator na API de carbono, que respondeu 404; falha da API de carbono, por erro HTTP ou tempo esgotado; resposta fora do contrato) ou um valor saiu da faixa no cálculo. O motivo fica gravado em `collections.calculation_error_message` | `co2eGrams` e `carbonIntensityGco2ePerKwh`: sempre `null`. `energyKwh`: hoje `null`, porque o coletor não grava energia sem intensidade; o schema aceita energia gravada nesse estado e, nesse caso, a rota devolve o valor gravado |

`null` nessas três chaves significa **não calculado**, nunca zero: `energyKwh: 0` é uma coleta calculada que resultou em zero. As colunas são `numeric`, que o driver `pg` devolve como string; a conversão para número é feita na borda da API, então os valores saem em JSON numérico e não em string.

`collectionIntervalSeconds` é o intervalo informado pela API de métricas naquela coleta, em segundos; é `null` quando a coleta não trouxe métricas (`erro` ou `sem_metricas`). O dashboard usa esse valor para distinguir o intervalo normal entre coletas de um período sem nenhum registro.

```json
{"collections":[{"id":"2","serviceId":"1","collectedAt":"2026-10-14T20:00:00.000Z","status":"ok","collectionIntervalSeconds":27,"cpuPercent":42.5,"memoryGb":1.2,"diskGb":10,"networkGb":0.3,"errorMessage":null,"calculationStatus":"disponivel","energyKwh":0.000480452625,"co2eGrams":0.040838473125,"carbonIntensityGco2ePerKwh":85},{"id":"1","serviceId":"1","collectedAt":"2026-10-14T19:45:00.000Z","status":"erro","collectionIntervalSeconds":null,"cpuPercent":null,"memoryGb":null,"diskGb":null,"networkGb":null,"errorMessage":"Timeout","calculationStatus":"nao_calculado","energyKwh":null,"co2eGrams":null,"carbonIntensityGco2ePerKwh":null}],"period":{"from":"2026-10-14T00:00:00.000Z","to":"2026-10-15T00:00:00.000Z"}}
```

O período é fechado no início e aberto no fim (`collected_at >= from AND collected_at < to`), igual às agregações. Uma coleta exatamente em `to` não aparece; `from` precisa ser anterior a `to`.

Parâmetro inválido devolve 400 `VALIDATION_ERROR`; `service_id` inexistente devolve 404 `NOT_FOUND`; falha de banco devolve 500 no envelope global, sem stack ou SQL.

## GET /api/collections/series

Série temporal de um serviço: agrupa as coletas do período em intervalos e devolve, por intervalo, a contagem e os totais de energia e CO₂e. Requer autenticação; sem token válido devolve `401 UNAUTHORIZED`. Não recebe corpo. Diferente de `GET /api/collections`, aqui **todos os parâmetros são obrigatórios**:

| Parâmetro | Obrigatório | Regra |
|---|---|---|
| `service_id` | sim | inteiro positivo; serviço inexistente devolve 404 |
| `from` | sim | data **com hora** em ISO 8601 (`2026-10-23T00:00:00Z`); só a data devolve 400 |
| `to` | sim | igual a `from`, e precisa ser **posterior** a ele (400 se for igual ou anterior) |
| `bucket` | sim | `15min`, `1h` ou `1d`; qualquer outro valor devolve 400 |

O período máximo é de **31 dias**. O intervalo `bucket` é enviado como parâmetro para o banco (`date_bin` recebe `$4::interval`): o valor é traduzido a partir de uma lista fechada no controller, nunca montado dentro do texto SQL.

Regras que a resposta segue:

- o período é **aberto no fim**: entram coletas com `collected_at >= from` e `collected_at < to`;
- `buckets` vem em ordem crescente de `start`, e intervalos sem nenhuma coleta são **omitidos** (não aparecem com zeros);
- `bucket: "1d"` corta o dia à **00:00 UTC** (21:00 de Brasília), porque a origem do agrupamento é o epoch;
- `energyKwh`, `co2eGrams`, `co2eMinGrams` e `co2eMaxGrams` são `null` quando nenhuma coleta do intervalo está com `calculation_status = "disponivel"` — `null` significa "não calculado", não "zero";
- `failed` conta as coletas com `status <> "ok"`, ou seja, `erro` e `sem_metricas`; `notCalculated` conta as coletas com `status = "ok"` que ainda não têm cálculo, então `collections - failed - notCalculated` é sempre o número de coletas calculadas do intervalo.

```json
{"serviceId":"1","from":"2026-10-23T00:00:00.000Z","to":"2026-10-24T00:00:00.000Z","bucket":"15min","buckets":[{"start":"2026-10-23T01:30:00.000Z","collections":12,"failed":0,"notCalculated":0,"energyKwh":0.007480167692,"co2eGrams":0.635814253804,"co2eMinGrams":0.007808506456,"co2eMaxGrams":0.089094607769},{"start":"2026-10-23T01:45:00.000Z","collections":6,"failed":0,"notCalculated":0,"energyKwh":0.003277217910,"co2eGrams":0.278563522361,"co2eMinGrams":0.010893330720,"co2eMaxGrams":0.072805363338}],"totals":{"collections":18,"failed":0,"notCalculated":0,"energyKwh":0.010757385602,"co2eGrams":0.914377776165,"co2eMaxGrams":0.089094607769,"carbonIntensityGco2ePerKwh":85}}
```

Quando o intervalo não tem nenhuma coleta calculada, os campos de cálculo saem como `null` e `notCalculated` conta as coletas sem cálculo:

```json
{"serviceId":"1","from":"2026-10-22T09:00:00.000Z","to":"2026-10-22T11:00:00.000Z","bucket":"15min","buckets":[{"start":"2026-10-22T10:00:00.000Z","collections":1,"failed":0,"notCalculated":1,"energyKwh":null,"co2eGrams":null,"co2eMinGrams":null,"co2eMaxGrams":null}],"totals":{"collections":1,"failed":0,"notCalculated":1,"energyKwh":null,"co2eGrams":null,"co2eMaxGrams":null,"carbonIntensityGco2ePerKwh":null}}
```

Período sem nenhuma coleta devolve `buckets` vazio e `totals` zerado nas contagens:

```json
{"serviceId":"1","from":"2025-01-01T00:00:00.000Z","to":"2025-01-02T00:00:00.000Z","bucket":"1h","buckets":[],"totals":{"collections":0,"failed":0,"notCalculated":0,"energyKwh":null,"co2eGrams":null,"co2eMaxGrams":null,"carbonIntensityGco2ePerKwh":null}}
```

`totals` cobre o período inteiro e é calculado na **mesma consulta** dos intervalos, então nunca divergem: soma das energias e emissões, maior valor de CO₂e entre as coletas e média da intensidade de carbono apenas das coletas calculadas (`null` se nenhuma estiver calculada).

Parâmetro inválido devolve 400 `VALIDATION_ERROR`; `service_id` inexistente devolve 404 `NOT_FOUND`; falha de banco devolve 500 no envelope global. O cálculo de energia e CO₂e está em [calculos.md](calculos.md).

## GET /api/services/compare

Compara de 2 a 10 serviços no mesmo período. Requer autenticação; sem token válido devolve `401 UNAUTHORIZED`.

`GET /api/services/compare?ids=1,2&from=2026-10-20T00:00:00Z&to=2026-10-21T00:00:00Z`

- `ids`: ids inteiros positivos, distintos e separados por vírgula;
- `from` e `to`: instantes ISO 8601 obrigatórios, com intervalo `[from, to)` de até 31 dias.

Resposta 200 ecoa `from` e `to` e traz, por serviço, contagens de coletas, falhas e coletas sem cálculo, médias de CPU/memória/disco/rede ponderadas por `collection_interval_seconds`, a decomposição `avgPowerBreakdown` dessas médias, somas de energia e CO₂e e o tempo monitorado (`monitoredSeconds`, #329). As médias usam as coletas com `status = 'ok'`; `avgPowerBreakdown` é `null` quando não há as quatro médias. Um serviço sem coleta permanece na resposta com `collections: 0` e métricas agregadas `null`; um id inexistente devolve 404. Entrada inválida devolve 400 `VALIDATION_ERROR`.

`monitoredSeconds` (#329) é a soma dos `collection_interval_seconds` das **mesmas coletas** que entram em `energyKwh` e `co2eGrams` (`calculation_status = 'disponivel'`): inteiro ≥ 0, ou `null` quando nenhuma coleta do período foi calculada. Com ele e `energyKwh` sai a potência média do período em W, `energyKwh × 3 600 000 ÷ monitoredSeconds` — a eficiência energética e de carbono descrita em [calculos.md](calculos.md#eficiência-energética-e-de-carbono). Essa média **não** é `AVG(power_watts)` (conjunto diferente de coletas, só `status = 'ok'`) nem a carga de trabalho do serviço.

```json
{"from":"2026-10-20T00:00:00.000Z","to":"2026-10-21T00:00:00.000Z","services":[{"id":"1","name":"Demo","region":"Sul","collections":12,"failed":0,"notCalculated":0,"avgCpuPercent":42.5,"avgMemoryGb":2.1,"avgDiskGb":10,"avgNetworkGb":0.3,"avgPowerBreakdown":{"cpuW":42.5,"memoryW":0.7875,"diskW":0.1,"networkW":0.006},"energyKwh":0.01,"co2eGrams":0.85,"monitoredSeconds":43200}]}
```

## GET /api/services/ranking

Ordena os serviços pelo consumo de energia ou pelas emissões de CO₂e no período. Esta rota exige `Authorization: Bearer <JWT>` emitido por `POST /api/auth/login`; essa proteção não altera a política das outras rotas.

`GET /api/services/ranking?metric=co2e&from=2026-11-02T00:00:00-03:00&to=2026-11-03T00:00:00-03:00`

| Parâmetro | Obrigatório | Regra |
|---|---|---|
| `metric` | sim | `energy` ou `co2e`; a seleção da coluna SQL usa whitelist fixa |
| `from` | não | instante ISO 8601 com hora; deve vir junto com `to` |
| `to` | não | instante posterior a `from`; o período `[from,to)` tem até 31 dias |

Sem limites, usa as últimas 24 horas até o instante da consulta. A resposta ecoa o período em UTC. Inclui os serviços atuais; um serviço removido só aparece se tiver ao menos uma coleta no período, e seu estado atual é mantido.

As duas somas são sempre devolvidas, junto do tempo monitorado `monitoredSeconds` (#329): a soma dos `collection_interval_seconds` das mesmas coletas com `calculation_status = 'disponivel'`, inteiro ≥ 0 ou `null` quando nenhuma foi calculada. `energyKwh × 3 600 000 ÷ monitoredSeconds` é a potência média do período em W ([calculos.md](calculos.md#eficiência-energética-e-de-carbono)), usada na coluna "Potência média (W)" da lista de serviços. Entram apenas coletas com `calculation_status = 'disponivel'`; `null` significa que não houve cálculo disponível, enquanto zero é um total calculado. `collections` conta todas as coletas no período, `failed` conta status diferente de `ok` e `notCalculated` conta cálculo diferente de `disponivel` (essas duas contagens podem se sobrepor, conforme `/api/services/compare`).

A ordenação usa a métrica escolhida em ordem decrescente, com desempate por `name` crescente e depois `id` crescente. Valores `null` ficam ao final com `position: null`; os demais recebem posições sequenciais. IDs são strings para preservar `bigint`.

```json
{
  "metric": "co2e",
  "from": "2026-11-02T03:00:00.000Z",
  "to": "2026-11-03T03:00:00.000Z",
  "services": [
    { "position": 1, "id": "3", "name": "Fraud Detector", "region": "us-east", "status": "ativo", "energyKwh": 1.712, "co2eGrams": 645.4, "monitoredSeconds": 172800, "collections": 2880, "failed": 0, "notCalculated": 0 },
    { "position": null, "id": "7", "name": "Inventory Sync", "region": "ca-central", "status": "sem_metricas", "energyKwh": null, "co2eGrams": null, "monitoredSeconds": null, "collections": 2880, "failed": 0, "notCalculated": 2880 }
  ]
}
```

| HTTP | Código | Situação |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `metric` ausente/inválida; só `from` ou `to`; data inválida ou sem hora; `from >= to`; período acima de 31 dias |
| 401 | `UNAUTHORIZED` | JWT ausente, inválido ou expirado |
| 500 | `DATABASE_ERROR` | falha de conexão ou consulta no PostgreSQL |

Exemplo de erro de validação: `{"error":{"code":"VALIDATION_ERROR","message":"metric deve ser energy ou co2e."}}`.

## GET /api/regions/summary

Resumo ambiental regional da #320. Exige `Authorization: Bearer <JWT>`. Não consulta a Carbon API nem depende da lista de regiões da #319.

| Parâmetro | Obrigatório | Regra |
|---|---|---|
| `from`, `to` | juntos, ou ambos ausentes | ISO 8601 com hora, `from < to`, até 31 dias; sem ambos, últimas 24 horas |

O período `[from,to)` é ecoado em UTC. Agrupa por **services.region_code atual**, incluindo o histórico de removidos nas somas, como `/api/services/summary`. Só `calculation_status = 'disponivel'` entra em `energyKwh` (kWh) e `co2eGrams` (g); ausência de cálculo é `null`, zero calculado é `0`. `collections` conta todas as coletas da janela; `failed` conta `status <> 'ok'`; `notCalculated` conta `calculation_status <> 'disponivel'` (as contagens podem se sobrepor).

Contagens de serviços são distintas e consideram o estado **atual**, sem removidos. Precedência: `indisponivel > sem_metricas > ativo`; sem serviços nesses estados, `worstStatus: null`. Região só com removidos pode aparecer, com contagens zeradas e histórico preservado. Um único grupo `code: null` reúne serviços sem região. Região com serviço mas sem coletas tem somas nulas e contagens de coletas zero; região sem serviço cadastrado não é inventada. Sem serviços, `regions: []`. Ordem por `code` crescente, com `null` ao final.

Exemplo 200 (ilustrativo):

```json
{"from":"2026-04-01T00:00:00.000Z","to":"2026-04-03T00:00:00.000Z","regions":[{"code":"us-east","energyKwh":7,"co2eGrams":35,"collections":4,"failed":0,"notCalculated":1,"services":{"ativo":1,"indisponivel":1,"sem_metricas":0},"worstStatus":"indisponivel"}]}
```

| HTTP | Código | Situação |
|---|---|---|
| 400 | `VALIDATION_ERROR` | limite ausente, data inválida/sem hora, início igual/posterior ao fim ou janela maior que 31 dias |
| 401 | `UNAUTHORIZED` | JWT ausente, inválido ou expirado |
| 500 | `DATABASE_ERROR` | falha de consulta ou conexão PostgreSQL |

Erros seguem o envelope global `{"error":{"code":"VALIDATION_ERROR","message":"from deve ser anterior a to."}}`. A soma regional e o resumo geral devem ser comparados com **os mesmos instantes** e dados estáveis, incluindo NULL quando não há cálculo; snapshots de requisições durante a coleta podem diferir. Testes, SQL independente e EXPLAIN: [verificação da #320](arquitetura/verificacao-regions-summary.md).

## POST /api/auth/login

Autentica uma conta sem expor senha ou hash. O administrador inicial usa as credenciais `ADMIN_EMAIL` e `ADMIN_PASSWORD` definidas no `.env`; o `.env.example` contém apenas valores de desenvolvimento. Contas criadas por convite entram com o e-mail do convite e a senha escolhida no cadastro. Corpo JSON obrigatório:

```json
{"email":"admin@ecopulse.local","password":"admin1234"}
```

Com credenciais válidas, devolve `200`; e-mail inexistente e senha incorreta devolvem o mesmo `401 UNAUTHORIZED`; corpo sem `email` ou `password` devolve `400 VALIDATION_ERROR`. Em volume criado antes da #196, sem a coluna `role`, o login devolve `500 DATABASE_ERROR` com a mensagem que aponta a migração `003-users-role-invitations.sql`, em vez de emitir um token sem papel. O token é assinado com HS256 usando `JWT_SECRET`, leva o e-mail e o papel (`role`) e expira conforme `JWT_EXPIRES_IN`. A resposta traz também a conta, sem hash de senha (#196):

```json
{"token":"<JWT>","user":{"id":"1","email":"admin@ecopulse.local","name":"Administrador","role":"admin"}}
```

## GET /api/auth/me

Confirma a sessão no banco. Envie `Authorization: Bearer <JWT>`; token ausente, inválido ou expirado devolve `401 UNAUTHORIZED`, e conta que não existe mais também. Com token válido, devolve `200` com a conta lida do banco: `id`, `email`, `name` e `role` (#196).

```json
{"id":"1","email":"admin@ecopulse.local","name":"Administrador","role":"admin"}
```

## PATCH /api/auth/me

Altera o nome da própria conta (#400), para os papéis `admin` e `usuario`. Exige `Authorization: Bearer <JWT>`. Corpo JSON:

```json
{"name":"Ana Souza"}
```

`name` segue a regra do cadastro: de 1 a 100 caracteres, sem os espaços das pontas. O e-mail e o papel não mudam por esta rota, porque o e-mail identifica a conta e vai dentro do JWT, e o papel vem do convite; campos `email` ou `role` no corpo são ignorados. A alteração grava `users.updated_at`. Resposta `200` com a conta atualizada, sem hash; a partir daí `GET /api/auth/me` devolve o nome novo, e o JWT da sessão continua valendo.

```json
{"id":"2","email":"usuario@ecopulse.local","name":"Ana Souza","role":"usuario"}
```

| HTTP | Código | Situação |
|---|---|---|
| 400 | `VALIDATION_ERROR` | corpo sem `name` ou com `name` que não é texto (`Informe name.`); nome vazio ou com mais de 100 caracteres |
| 401 | `UNAUTHORIZED` | JWT ausente, inválido ou expirado; conta que não existe mais |
| 500 | `DATABASE_ERROR` | falha no PostgreSQL |

## PUT /api/auth/me/password

Troca a senha da própria conta (#400), para os papéis `admin` e `usuario`. Exige `Authorization: Bearer <JWT>`. Corpo JSON:

```json
{"currentPassword":"usuario1234","newPassword":"nova12345"}
```

A nova senha segue a regra do cadastro (8 a 72 caracteres, com pelo menos uma letra e um número), precisa ser diferente da atual e é gravada com bcrypt (10 rounds), junto com `updated_at`. Resposta `204`, sem corpo; a partir daí o login aceita só a senha nova.

- **Senha atual errada responde `400`, não `401`.** O `401` quer dizer sessão inválida, e o frontend encerra a sessão quando o recebe; quem só errou a senha atual continua logado e vê o erro no campo. A resposta é a mesma se outra solicitação mudar a senha entre a conferência e a gravação.
- **Trocar a senha não encerra as outras sessões.** O JWT não tem lista de revogação: os tokens emitidos antes da troca, o desta sessão e os de outros navegadores, continuam valendo até expirar (`JWT_EXPIRES_IN`, padrão 8 h). Encerrar todas as sessões antes disso exige trocar `JWT_SECRET` e reiniciar o backend, o que vale para todas as contas.

| HTTP | Código | Situação |
|---|---|---|
| 400 | `VALIDATION_ERROR` | corpo sem `currentPassword` ou `newPassword`; nova senha fora da regra; senha atual errada (`A senha atual não confere.`); nova igual à atual (`A nova senha deve ser diferente da atual.`) |
| 401 | `UNAUTHORIZED` | JWT ausente, inválido ou expirado; conta que não existe mais |
| 500 | `DATABASE_ERROR` | falha no PostgreSQL |

## POST /api/invitations

Emite um convite de cadastro (#196). Exige `Authorization: Bearer <JWT>` de uma conta `admin`. Corpo JSON, com `role` igual a `admin` ou `usuario`:

```json
{"email":"ana@exemplo.com","role":"usuario"}
```

O e-mail é gravado em minúsculas. O token do link tem 32 bytes aleatórios (`crypto.randomBytes`, base64url); o banco guarda só o SHA-256 dele. O link usa a primeira origem de `CORS_ORIGIN` e vale `INVITATION_TTL_HOURS` horas (padrão 72). Sem envio de e-mail: o administrador copia o link. Resposta `201`:

```json
{"inviteUrl":"http://localhost:5173/cadastro?convite=jav-t9mhiWzKLvkFREXj6hyLzCcvzrf8dGCLAxrFQpY","expiresAt":"2026-11-24T03:05:31.492Z"}
```

| HTTP | Código | Situação |
|---|---|---|
| 400 | `VALIDATION_ERROR` | e-mail ausente ou inválido; `role` diferente de `admin` e `usuario` |
| 401 | `UNAUTHORIZED` | JWT ausente, inválido ou expirado |
| 403 | `FORBIDDEN` | conta com papel `usuario` |
| 409 | `CONFLICT` | já existe conta com esse e-mail |
| 500 | `DATABASE_ERROR` | falha no PostgreSQL |

## GET /api/invitations/:token

Público: quem abre o link ainda não tem conta. `:token` é o valor de `convite=` do link. Devolve o que a tela de cadastro mostra em somente leitura:

```json
{"email":"ana@exemplo.com","role":"usuario","expiresAt":"2026-11-24T03:05:31.492Z"}
```

| HTTP | Código | Situação |
|---|---|---|
| 404 | `NOT_FOUND` | convite inexistente ou token fora do formato |
| 410 | `GONE` | convite já usado (`Este convite já foi usado.`) ou expirado |
| 500 | `DATABASE_ERROR` | falha no PostgreSQL |

## POST /api/auth/register

Cria uma conta a partir de um convite (#196). Público, mas sem convite válido não há cadastro. Corpo JSON:

```json
{"token":"jav-t9mhiWzKLvkFREXj6hyLzCcvzrf8dGCLAxrFQpY","name":"Ana","password":"senha1234"}
```

O e-mail e o papel vêm do convite; campos `email` ou `role` no corpo são ignorados. `name` tem de 1 a 100 caracteres (espaços nas pontas são removidos). A senha tem de 8 a 72 caracteres, com pelo menos uma letra e um número, e é gravada com bcrypt (10 rounds). A conta é criada e o convite é marcado como usado na mesma transação: duas tentativas simultâneas com o mesmo link criam uma conta só. Resposta `201`, sem hash:

```json
{"id":"2","email":"ana@exemplo.com","name":"Ana","role":"usuario"}
```

| HTTP | Código | Situação |
|---|---|---|
| 400 | `VALIDATION_ERROR` | corpo sem `token`, `name` ou `password`; nome vazio ou longo; senha fora da regra |
| 404 | `NOT_FOUND` | convite inexistente |
| 409 | `CONFLICT` | o e-mail do convite ganhou conta depois da emissão (o convite continua disponível) |
| 410 | `GONE` | convite já usado ou expirado |
| 500 | `DATABASE_ERROR` | falha no PostgreSQL |

## GET /health

Sem autenticação, parâmetros ou corpo. Fica na raiz, sem o prefixo `/api` dos recursos. Consulta o PostgreSQL a cada chamada, sem cache.

Resposta 200, Content-Type application/json, somente após verificação real:

```json
{"status":"ok","db":"ok"}
```

Falha de conexão/consulta: 500 (DatabaseError conforme Agilekit), sem encerrar HTTP. Após recuperação do banco, nova consulta pode retornar 200.

```json
{"error":{"code":"DATABASE_ERROR","message":"Não foi possível acessar o banco de dados."}}
```

Health comprova conectividade, não valida existência de tabelas, persistência, APIs externas ou coleta. No boot, indisponibilidade impede a abertura HTTP e encerra o processo com código não zero.

## Erros globais

| HTTP | Código | Situação |
|---|---|---|
| 400 | VALIDATION_ERROR | JSON inválido com Content-Type application/json; parâmetro inválido em `GET /api/collections`, `GET /api/collections/series`, `GET /api/services/summary`, `GET /api/services/compare`, `GET /api/services/ranking` ou no login; corpo inválido ou senha atual errada em `PATCH /api/auth/me` e `PUT /api/auth/me/password` |
| 401 | UNAUTHORIZED | credenciais inválidas no login; token ausente, inválido, expirado ou sem papel nas rotas de dados, em `GET /api/auth/me` e nas rotas de alteração |
| 403 | FORBIDDEN | conta `usuario` em `PUT /api/monitoring-settings` ou `POST /api/invitations` |
| 404 | NOT_FOUND | rota não registrada, incluindo métodos não registrados; `service_id` inexistente em `GET /api/collections` e em `GET /api/collections/series`; convite inexistente |
| 409 | CONFLICT | e-mail que já tem conta em `POST /api/invitations` ou `POST /api/auth/register` |
| 410 | GONE | convite já usado ou expirado |
| 500 | DATABASE_ERROR | falha de conexão ou de consulta no PostgreSQL |
| 500 | INTERNAL_ERROR | erro inesperado, sem detalhes internos |

Envelope único, sem stack, credenciais ou consulta SQL:

```json
{"error":{"code":"VALIDATION_ERROR","message":"JSON inválido no corpo da requisição."}}
```

Roteiro de verificação, configuração e scripts: [backend/README.md](../backend/README.md). A autenticação está em `POST /api/auth/login` e protege as rotas de dados e `GET /api/auth/me`; a autenticação das rotas de configuração e de auditoria de entradas continua prevista para a Sprint 2.
