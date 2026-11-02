# API — backend

Contrato do backend. A execução integrada usa os containers backend e PostgreSQL do `compose.yaml` (#26/#27): `docker compose up --build`.

## CORS

O dashboard roda em outra origem (`http://localhost:5173`) e chama a API pelo navegador. O backend envia `Access-Control-Allow-Origin` só para as origens de `CORS_ORIGIN` (padrão `http://localhost:5173`, lista separada por vírgula) e responde o preflight `OPTIONS` com `204`, liberando `Content-Type` e `Authorization`. Outra origem não recebe o cabeçalho, e o navegador bloqueia a resposta. Chamadas sem navegador (`curl`) não são afetadas.

## GET /api/services

Sem autenticação, parâmetros ou corpo. O prefixo `/api` corresponde ao padrão de `VITE_API_URL=http://localhost:3000/api` usado pelo frontend; `/health` permanece na raiz.

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
    "lastReadingAt": "2026-10-14T20:00:00.000Z"
  }],
  "period": "última leitura (intervalo de coleta)"
}
```

Os números do exemplo são o exemplo OpenAPI de [`docs/calculos.md`](calculos.md): CPU 62,67%, RAM 3,17 GB, disco 19,26 GB, rede 0,45 GB, 27 s e fator 85 gCO₂e/kWh. `energyKwh` e `emissionsG` são da última coleta, que cobre um intervalo de cerca de 30 s, e não acumulados.

`status` do serviço: `ativo` (última métrica válida), `indisponivel` (falha do agregador ou métrica inválida), `sem_metricas` (404 do agregador para um serviço ainda listado) ou `removido` (saiu da lista do agregador; volta a `ativo` quando reaparece).

Se a descoberta global em `/services` do agregador falhar, o coletor preserva o cadastro e grava diagnóstico `erro` para os conhecidos não removidos, marcando-os `indisponivel`. Isso indica impossibilidade de monitorar pelo agregador, sem afirmar que cada aplicação caiu. As medidas dessa coleta são nulas; serviços já removidos permanecem removidos. A falha não remove cadastros nem apaga o histórico. Ao recuperar a descoberta e obter métricas válidas no próximo prazo, o serviço volta a `ativo`.

Falha de banco retorna 500 no envelope global, sem stack ou SQL:

```json
{"error":{"code":"DATABASE_ERROR","message":"Não foi possível acessar o banco de dados."}}
```

## GET /api/services/summary

Indicadores agregados do dashboard (RF08, #175), sem autenticação.

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

Histórico de coletas, sem autenticação nem corpo. Parâmetros opcionais:

- `service_id`: inteiro positivo;
- `from` e `to`: data **com hora** em ISO 8601, como `2026-10-18T00:00:00Z` ou `2026-10-18T00:00:00-03:00`. Só a data (`2026-10-18`) devolve 400, e `from` precisa ser anterior ou igual a `to`;
- `limit`: de 1 a 500, padrão 50.

A lista sai sempre da coleta mais recente para a mais antiga. `status` da coleta: `ok`, `erro` (falha do agregador ou métrica inválida, com `errorMessage`) ou `sem_metricas`.

Cada coleta traz o resultado do cálculo de energia e CO₂e ([fórmulas](calculos.md)), com `calculationStatus` em:

| `calculationStatus` | Significado | `energyKwh`, `co2eGrams`, `carbonIntensityGco2ePerKwh` |
|---|---|---|
| `disponivel` | as quatro métricas (CPU, memória, disco e rede) e a intensidade de carbono foram obtidas | número ≥ 0 (zero é resultado válido) |
| `nao_calculado` | a coleta foi gravada sem que o cálculo fosse executado. Coletas `erro` e `sem_metricas` ficam sempre assim, e não há recálculo depois | `null` |
| `indisponivel` | o cálculo foi tentado e não houve intensidade válida (região não informada; região sem fator na API de carbono, que respondeu 404; falha da API de carbono, por erro HTTP ou tempo esgotado; resposta fora do contrato) ou um valor saiu da faixa no cálculo. O motivo fica gravado em `collections.calculation_error_message` | `co2eGrams` e `carbonIntensityGco2ePerKwh`: sempre `null`. `energyKwh`: hoje `null`, porque o coletor não grava energia sem intensidade; o schema aceita energia gravada nesse estado e, nesse caso, a rota devolve o valor gravado |

`null` nessas três chaves significa **não calculado**, nunca zero: `energyKwh: 0` é uma coleta calculada que resultou em zero. As colunas são `numeric`, que o driver `pg` devolve como string; a conversão para número é feita na borda da API, então os valores saem em JSON numérico e não em string.

```json
{"collections":[{"id":"2","serviceId":"1","collectedAt":"2026-10-14T20:00:00.000Z","status":"ok","cpuPercent":42.5,"memoryGb":1.2,"diskGb":10,"networkGb":0.3,"errorMessage":null,"calculationStatus":"disponivel","energyKwh":0.000480452625,"co2eGrams":0.040838473125,"carbonIntensityGco2ePerKwh":85},{"id":"1","serviceId":"1","collectedAt":"2026-10-14T19:45:00.000Z","status":"ok","cpuPercent":40,"memoryGb":1.1,"diskGb":10,"networkGb":0.2,"errorMessage":null,"calculationStatus":"indisponivel","energyKwh":null,"co2eGrams":null,"carbonIntensityGco2ePerKwh":null}],"period":{"from":"2026-10-14T00:00:00.000Z","to":"2026-10-14T23:59:59.999Z"}}
```

O limite `to` é **inclusivo** (`collected_at <= to`): quem precisa de um período com fim aberto deve recuar 1 ms no parâmetro.

Parâmetro inválido devolve 400 `VALIDATION_ERROR`; `service_id` inexistente devolve 404 `NOT_FOUND`; falha de banco devolve 500 no envelope global, sem stack ou SQL.

## GET /api/collections/series

Série temporal de um serviço: agrupa as coletas do período em intervalos e devolve, por intervalo, a contagem e os totais de energia e CO₂e. Sem autenticação nem corpo. Diferente de `GET /api/collections`, aqui **todos os parâmetros são obrigatórios**:

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

Compara de 2 a 10 serviços no mesmo período, sem autenticação.

`GET /api/services/compare?ids=1,2&from=2026-10-20T00:00:00Z&to=2026-10-21T00:00:00Z`

- `ids`: ids inteiros positivos, distintos e separados por vírgula;
- `from` e `to`: instantes ISO 8601 obrigatórios, com intervalo `[from, to)` de até 31 dias.

Resposta 200 ecoa `from` e `to` e traz, por serviço, contagens de coletas, falhas e coletas sem cálculo, médias de CPU/memória/disco/rede e somas de energia e CO₂e. Um serviço sem coleta permanece na resposta com `collections: 0` e métricas agregadas `null`; um id inexistente devolve 404. Entrada inválida devolve 400 `VALIDATION_ERROR`.

```json
{"from":"2026-10-20T00:00:00.000Z","to":"2026-10-21T00:00:00.000Z","services":[{"id":"1","name":"Demo","region":"Sul","collections":12,"failed":0,"notCalculated":0,"avgCpuPercent":42.5,"avgMemoryGb":2.1,"avgDiskGb":10,"avgNetworkGb":0.3,"energyKwh":0.01,"co2eGrams":0.85}]}
```

## POST /api/auth/login

Autentica o administrador sem expor senha ou hash. Use as credenciais `ADMIN_EMAIL` e `ADMIN_PASSWORD` definidas no `.env`; o `.env.example` contém apenas valores de desenvolvimento. Corpo JSON obrigatório:

```json
{"email":"admin@ecopulse.local","password":"admin1234"}
```

Com credenciais válidas, devolve `200`; e-mail inexistente e senha incorreta devolvem o mesmo `401 UNAUTHORIZED`; corpo sem `email` ou `password` devolve `400 VALIDATION_ERROR`. O token é assinado com HS256 usando `JWT_SECRET` e expira conforme `JWT_EXPIRES_IN`.

```json
{"token":"<JWT>"}
```

## GET /api/auth/me

Rota mínima protegida para verificar o middleware. Envie `Authorization: Bearer <JWT>`; token ausente, inválido ou expirado devolve `401 UNAUTHORIZED`. Com token válido, devolve `200` com o `id` e o `email` do usuário autenticado.

```json
{"id":"1","email":"admin@ecopulse.local"}
```

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
| 400 | VALIDATION_ERROR | JSON inválido com Content-Type application/json; parâmetro inválido em `GET /api/collections`, `GET /api/collections/series`, `GET /api/services/summary`, `GET /api/services/compare` ou no login |
| 401 | UNAUTHORIZED | credenciais inválidas, token ausente, inválido ou expirado |
| 404 | NOT_FOUND | rota não registrada, incluindo métodos não registrados; `service_id` inexistente em `GET /api/collections` e em `GET /api/collections/series` |
| 500 | DATABASE_ERROR | falha de conexão ou de consulta no PostgreSQL |
| 500 | INTERNAL_ERROR | erro inesperado, sem detalhes internos |

Envelope único, sem stack, credenciais ou consulta SQL:

```json
{"error":{"code":"VALIDATION_ERROR","message":"JSON inválido no corpo da requisição."}}
```

Roteiro de verificação, configuração e scripts: [backend/README.md](../backend/README.md). A autenticação está em `POST /api/auth/login` e `GET /api/auth/me`; as rotas de configuração e de auditoria de entradas continuam previstas para a Sprint 2.
