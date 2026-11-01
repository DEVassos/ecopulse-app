# API REST do EcoPulse — endpoints desenvolvidos pela equipe

<!-- Template do agilekit (repo/docs/templates/api.md). Destino: docs/api.md. Nasce no PR da primeira rota e é atualizado NO MESMO PR de cada rota nova (DoD-PR item 5; o check `docs` falha se existir *.routes.ts sem docs/api.md). Documente apenas o que está em develop. Substitua os campos `<...>`. -->

Base URL local: `http://localhost:3000`. Formato: JSON (`Content-Type: application/json; charset=utf-8`). Os endpoints identificam recursos (`/services`, `/collections`, `/monitoring-settings`); `GET` consulta, `POST` cria, `PUT`/`PATCH` altera, `DELETE` exclui quando previsto.

## Convenções

| Tema | Regra |
|---|---|
| Erro padrão | `{ "error": { "code": "<CODIGO_EM_MAIUSCULAS>", "message": "<texto compreensível>", "details": <opcional> } }` |
| Códigos HTTP | `200` sucesso · `201` criado · `204` sem conteúdo · `400` parâmetro inválido · `401` sem token ou token inválido · `404` recurso inexistente · `502` API auxiliar indisponível · `500` erro interno |
| Datas | ISO 8601 em UTC (`2026-10-19T22:30:00.000Z`) |
| Paginação | `?limit=<n>&offset=<n>` quando o recurso retorna listas grandes |
| Autenticação | `Authorization: Bearer <jwt>` apenas nos endpoints marcados "exige token" |

## Sumário

| Verbo HTTP | URL | Descrição | Autenticação | Sprint |
|---|---|---|---|---|
| GET | `/health` | Estado do backend e da conexão com o banco | não | 1 |
| GET | `/services` | Lista os serviços descobertos | não | 1 |
| GET | `/services/:id` | Detalhe de um serviço | não | 1 |
| GET | `/collections?serviceId=<id>` | Histórico de coletas de um serviço | não | 1 |

## GET /services

Lista os serviços descobertos no agregador, com o estado de monitoramento mais recente e a localização.

**Parâmetros**

| Onde | Nome | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| query | `status` | `active` · `unavailable` · `no-metrics` | não | filtra pelo estado atual |

**Resposta 200**

```json
[
  {
    "id": 1,
    "externalId": "svc-001",
    "name": "<nome do serviço>",
    "status": "active",
    "location": { "country": "BR", "region": "sa-east-1", "city": "São Paulo" },
    "lastCollectionAt": "2026-10-19T22:30:00.000Z"
  }
]
```

**Erros:** `400` (`INVALID_STATUS`) quando `status` não está entre os valores aceitos; `500` (`INTERNAL_ERROR`).

## GET /services/:id

**Parâmetros:** rota `id` (inteiro > 0).

**Resposta 200:** mesmo objeto da lista, acrescido de `metrics` (última coleta) e `estimates` (`energyKwh`, `co2eGrams`, `periodStart`, `periodEnd`) quando disponíveis.

**Erros:** `400` (`INVALID_ID`) para id não numérico; `404` (`SERVICE_NOT_FOUND`).

```json
{ "error": { "code": "SERVICE_NOT_FOUND", "message": "Serviço 999 não encontrado" } }
```

## GET /collections

**Parâmetros**

| Onde | Nome | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| query | `serviceId` | inteiro | sim | serviço cujo histórico será retornado |
| query | `from` / `to` | ISO 8601 | não | período considerado (padrão: últimas 24h) |
| query | `limit` | inteiro ≤ 500 | não | padrão 100 |

**Resposta 200**

```json
{
  "serviceId": 1,
  "period": { "from": "2026-10-18T22:30:00.000Z", "to": "2026-10-19T22:30:00.000Z" },
  "items": [
    { "collectedAt": "2026-10-19T22:30:00.000Z", "cpuPercent": 42.5, "memoryMb": 512, "requests": 1200, "status": "active" }
  ]
}
```

**Erros:** `400` (`MISSING_SERVICE_ID`, `INVALID_PERIOD`); `404` (`SERVICE_NOT_FOUND`).

## `<VERBO HTTP> <URL do próximo endpoint>`

`<descrição>` — exige token: `<sim/não>`.

**Parâmetros:** `<rota / query / corpo com tipos e obrigatoriedade>`

**Corpo da requisição (quando houver)**

```json
{ "<campo>": "<valor>" }
```

**Respostas:** `200`/`201` `<exemplo>`; `400` `<código de erro>`; `401` `UNAUTHORIZED` (se exige token); `404` `<código>`; `500` `INTERNAL_ERROR`.

## Como verificar

```bash
docker compose up --build -d
curl -s http://localhost:3000/health
curl -s http://localhost:3000/services | jq .
curl -s "http://localhost:3000/collections?serviceId=1" | jq '.items | length'
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/services/999   # 404
```
