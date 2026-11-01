# Backend EcoPulse

API REST em Node.js com Express 5 e TypeScript estrito, persistência no PostgreSQL pelo driver `pg` (SQL escrito à mão, sem ORM) e imagem Docker em `node:24-alpine` ([Docker](#docker)). Na Sprint 1 o backend:

- descobre os serviços no agregador de métricas e coleta as métricas de cada um (worker, #19);
- consulta a intensidade de carbono por região e calcula energia e CO₂e por coleta (#17, #133);
- grava o histórico no PostgreSQL (#14, #19);
- expõe `GET /health`, `GET /api/services` e `GET /api/collections` (#8, #111, #112), com CORS liberado para o dashboard (#118). Na Sprint 2, `GET /api/collections/series` passou a devolver a série temporal de um serviço em intervalos (#189).

`POST /api/auth/login` e `GET /api/auth/me` já autenticam administradores com bcrypt e JWT. A área de configuração (`/monitoring-settings`) continua pendente na Sprint 2.

## Organização

```
src/
├── app.ts                  monta o Express: CORS, JSON, rotas por módulo, 404 e error-handler por último
├── server.ts               lê o ambiente, cria o pool, abre o HTTP e só então inicia o coletor; encerra limpo em SIGINT/SIGTERM
├── config/env.ts           único lugar que lê process.env; valida tudo no boot
├── db/                     connection.ts (pool único do pg) e transaction.repository.ts (BEGIN/COMMIT/ROLLBACK na mesma conexão)
├── integrations/           metrics-api.ts (agregador) e carbon-api.ts (intensidade de carbono), com tipos *.types.ts
├── domain/                 carbon-calculator.ts — potência, energia e CO₂e de uma coleta
├── jobs/collector.ts       descoberta, reconciliação e coleta periódica (worker)
├── middlewares/            auth.ts (JWT), cors.ts e error-handler.ts
├── modules/                health, services, collections e usuarios em routes/controller/service/repository
└── shared/                 errors.ts (AppError e subclasses) e persistence.types.ts (tipos das linhas do banco)
```

SQL só existe nos arquivos `*.repository.ts`, sempre com parâmetros `$1…$n`. `modules/usuarios/` contém repository, service, controller e rotas de autenticação; `middlewares/auth.ts` exporta o middleware JWT reutilizável pelas futuras rotas protegidas.

O `tsconfig.json` usa ES2022, Node16 para módulo e resolução, `strict`, `rootDir` `src` e `outDir` `dist`. Sem `type=module`, o build emite CommonJS. Os testes ficam fora de `src`.

## Rotas

Contrato completo, com exemplos e erros, em [`docs/api.md`](../docs/api.md).

| Método e caminho | O que faz | Respostas |
|---|---|---|
| `GET /health` | consulta o PostgreSQL a cada chamada | 200 `{"status":"ok","db":"ok"}`; 500 `DATABASE_ERROR` |
| `GET /api/services` | lista os serviços com estado, região e a última coleta (métricas, energia e CO₂e) ([#111](https://github.com/DEVassos/greener-app/issues/111), [#133](https://github.com/DEVassos/greener-app/issues/133)) | 200 `{ services, period }`; 500 `DATABASE_ERROR` |
| `GET /api/collections` | histórico de coletas, com filtros `service_id`, `from`, `to` e `limit` (1–500, padrão 50) ([#112](https://github.com/DEVassos/greener-app/issues/112)) | 200 `{ collections, period }`; 400 `VALIDATION_ERROR`; 404 `NOT_FOUND`; 500 |
| `POST /api/auth/login` | valida e-mail e senha com bcrypt e emite JWT HS256 | 200 `{ token }`; 400 `VALIDATION_ERROR`; 401 `UNAUTHORIZED`; 500 |
| `GET /api/auth/me` | devolve o administrador autenticado pelo JWT | 200 `{ id, email }`; 401 `UNAUTHORIZED`; 500 |
| `GET /api/collections/series` | série temporal de um serviço: agrupa as coletas do período em intervalos, com contagem, energia e CO₂e por intervalo e o total do período; parâmetros obrigatórios `service_id`, `from`, `to` (período de até 31 dias) e `bucket` (`15min`, `1h` ou `1d`) ([#189](https://github.com/DEVassos/greener-app/issues/189)) | 200 `{ serviceId, from, to, bucket, buckets, totals }`; 400 `VALIDATION_ERROR`; 404 `NOT_FOUND`; 500 |

JSON inválido no corpo devolve 400; rota inexistente, 404; erro inesperado, 500 `INTERNAL_ERROR` sem stack. Todo erro sai no formato `{"error":{"code","message"}}`, produzido só pelo `error-handler`.

## Ambiente e execução

| Variável | Padrão | Regra |
|---|---|---|
| `PORT` | `3000` | inteiro de 1 a 65535. No compose a porta é fixa em 3000; a variável vale para execução fora do Docker |
| `DATABASE_URL` | sem padrão | URL `postgres://` ou `postgresql://` com host e nome do banco; obrigatória. No compose é montada a partir de `POSTGRES_*`, com o host `postgres` |
| `METRICS_API_URL` | `https://metrics.unilaunch.org` | URL http(s) da API agregadora; a barra final é removida |
| `CARBON_API_URL` | `https://carbon.unilaunch.org` | base http(s), sem credenciais, query ou fragmento; vazia usa o padrão oficial |
| `POLLING_INTERVAL_MS` | `30000` | inteiro de 1 a 2147483647 ms; intervalo da descoberta e prazo inicial e de recuperação da coleta. O `compose.yaml` ainda não repassa esta variável ao container, então no Docker vale o padrão de 30 s |
| `CORS_ORIGIN` | `http://localhost:5173` | origens http(s) separadas por vírgula, sem caminho; só elas recebem `Access-Control-Allow-Origin`, e o preflight `OPTIONS` responde 204 |
| `JWT_SECRET` | sem padrão | obrigatória; ao menos 16 caracteres; assina os JWTs |
| `JWT_EXPIRES_IN` | `8h` | inteiro positivo com unidade `s`, `m`, `h` ou `d` |

Só `config/env.ts` lê `process.env`, e não há leitura automática de `.env`: o ambiente é fornecido ao processo (no caminho oficial, pelo `compose.yaml` a partir do `.env` da raiz). Ambiente inválido impede o boot com mensagem clara. `JWT_SECRET` é obrigatório e tem ao menos 16 caracteres; `JWT_EXPIRES_IN` é positivo e usa unidade, como `8h` ou `7d`. Não registre URLs com credenciais em logs.

Caminho oficial: `docker compose up --build` na raiz. O serviço `backend` usa o Dockerfile deste módulo (#26) e só sobe depois do healthcheck do `postgres` (#27).

Comandos do módulo, com Node 20 ou superior e ambiente já fornecido (atalhos de desenvolvimento, não substituem o compose):

```bash
cd backend
npm ci
npm run typecheck
npm test
npm run build
npm start
# desenvolvimento com recarga:
npm run dev
```

A imagem fixa `node:24-alpine`, alinhada ao frontend (ADR 0005); o CI usa Node 22 e o mínimo suportado pelos comandos acima é Node 20.

## Docker

`backend/Dockerfile` é multi-stage sobre `node:24-alpine`:

- **build**: `npm ci` pelo `package-lock.json`, cópia de `tsconfig.json` e `src/`, `npm run build` (tsc) e `npm prune --omit=dev`;
- **runtime**: só `dist/`, `node_modules` de produção e `package.json`; executa `node dist/server.js` como o usuário `node` (sem root) e expõe a porta 3000.

`backend/.dockerignore` deixa fora do contexto `node_modules/`, `dist/`, `coverage/`, `.env*`, `tests/` e os metadados do repositório.

```bash
docker compose up --build -d
curl -i http://localhost:3000/health
docker compose logs backend
```

Esperado: `200` e `{"status":"ok","db":"ok"}`; no log, `API disponível na porta 3000.`. O healthcheck do container também consulta `/health` (`docker compose ps` mostra `healthy`).

## Coleta e cálculo (worker)

`jobs/collector.ts` é iniciado pelo `server.ts` depois que o HTTP abre e parado no SIGTERM. A cada ciclo:

1. **Descoberta:** `GET /services` no agregador. A lista inteira é validada; se vier fora do formato, o ciclo é descartado e o cadastro e os estados ficam como estavam.
2. **Reconciliação**, numa transação: upsert por `external_id`, preservando o ID e a primeira descoberta; quem saiu da lista vira `removido` e volta a `ativo` quando reaparece. Lista vazia válida marca todos como removidos, sem fabricar coleta.
3. **Coleta por prazo:** `GET /metrics/{id}` de cada serviço vencido, com o HTTP fora das transações. O próximo prazo segue o `collection_interval_seconds` da própria métrica; em caso de falha, vale o último intervalo válido, ou `POLLING_INTERVAL_MS` se ainda não houver um. O dispatcher agenda o próximo ciclo só depois de terminar o atual, sem sobreposição.
4. **Cálculo** (#133): para coleta válida, consulta a intensidade de carbono da região e calcula potência, energia e CO₂e com o `CarbonCalculator` (`domain/carbon-calculator.ts`). Fórmula, constantes, unidades e exemplos em [`docs/calculos.md`](../docs/calculos.md); decisão em [ADR 0006](../docs/adr/0006-modelo-potencia-fatores-emissao.md).
5. **Gravação**, numa transação: a coleta e o novo estado do serviço entram juntos; falha desfaz os dois e o ciclo segue para os demais serviços.

Resultado por serviço:

| Situação | Coleta (`collections.status`) | Serviço (`services.status`) | Cálculo (`calculation_status`) |
|---|---|---|---|
| métrica válida e fator de carbono disponível | `ok` | `ativo` | `disponivel`, com intensidade, potência, energia e CO₂e |
| métrica válida, mas carbono indisponível (API fora, 404 da região ou região ausente) | `ok` | `ativo` | `indisponivel`, campos ambientais `NULL` e mensagem própria; nunca valor estimado ou zero substituto |
| 404 do agregador para serviço ainda listado | `sem_metricas` | `sem_metricas` | `nao_calculado` |
| falha externa ou observação inválida | `erro` | `indisponivel` | `nao_calculado`, medidas `NULL` e diagnóstico |

Antes do INSERT, as medidas são validadas contra as faixas das colunas e arredondadas à escala delas (a API manda resíduo de float, como `51.248000000000005` → `51.25`); o valor original fica no JSON bruto (`metrics`). Depois de um reinício, os prazos em memória são reconstruídos com uma coleta inicial, sem compensar o histórico.

## Clientes das APIs auxiliares

**Agregador de métricas (#15, #97)** — `integrations/metrics-api.ts`, contrato em [`docs/especificacao-api.md`](../docs/especificacao-api.md), seção 1:

- **Tipos:** `metrics-api.types.ts` separa o JSON da API (`Raw*`, snake_case) dos tipos usados no sistema (camelCase). Toda resposta é validada antes da conversão.
- **Estados:** em `GET /metrics/{id}`, 404 vira `sem_metricas` e 500 vira `indisponivel`, sem exceção, para que um serviço não interrompa os outros.
- **JSON bruto e cancelamento:** no caso `ok`, `raw` devolve o corpo original já parseado. `listServices(signal?)` e `getServiceMetrics(id, signal?)` aceitam `AbortSignal`.
- **Falhas:** sem conexão, mais de 10 s sem resposta, outro HTTP de erro ou corpo fora do formato lançam `ExternalApiError` (502, mensagem em pt-BR, causa em `cause`). Falha de rede e timeout ganham mais uma tentativa; respostas HTTP não são repetidas.

**Intensidade de carbono (#17)** — `integrations/carbon-api.ts`, `getIntensity(regionCode)` para `GET /regions/{code}/carbon-intensity`, chamado pelo coletor a cada coleta válida:

- **Decisão do PO na [#17](https://github.com/DEVassos/greener-app/issues/17#issuecomment-6157652891):** cache em memória por região e instância por 1 hora; uma tentativa; timeout de 10 s cobrindo requisição e corpo. Ler o cache não renova o prazo, e falha nunca devolve fator antigo nem zero substituto.
- **Resposta válida:** `status: 'ok'`, `factor` (região, intensidade em gCO₂e/kWh, renováveis), `source: 'api' | 'cache'`, `fetchedAt` e `expiresAt`. 404 devolve `{ status: 'region_not_found', regionCode }`.
- **Falhas:** rede, timeout, HTTP inesperado ou resposta inválida lançam erro tipado com causa e não entram no cache; o coletor transforma isso em cálculo `indisponivel`.

## Repositories e transações (#14)

- `ServiceRepository` (`modules/services`): lista com a última coleta, busca por ID, upsert por `external_id`, atualização de estado e marcação de ausentes como removidos.
- `CollectionRepository` (`modules/collections`): insere coletas (com os campos de cálculo) e lista o histórico com filtros; `findSeries` agrupa as coletas de um serviço por `date_bin` e devolve os intervalos e o total do período na mesma consulta, com `GROUPING SETS`.
- `UserRepository` (`modules/usuarios`): busca por e-mail sem distinção de caixa; o hash é interno, nunca vai para resposta HTTP nem log.
- `withTransaction(database, async tx => { ... })` (`db/transaction.repository.ts`) executa BEGIN/COMMIT/ROLLBACK na mesma conexão; os repositories do callback são criados com `tx`, nunca com o pool. Erros do PostgreSQL viram `DatabaseError` com a causa preservada.

Os tipos em `shared/persistence.types.ts` mantêm `bigint` e `numeric` como strings, datas como `Date` e ausência como `null`. Não há DELETE de serviços ou coletas, nem UPDATE de coletas: o histórico só cresce.

## Boot, saúde e falhas

- **Boot:** antes de abrir o HTTP, o backend valida o ambiente e consulta o PostgreSQL. Se falhar, encerra com código diferente de zero e fecha o pool.
- **Saúde:** cada `GET /health` faz uma consulta nova, sem cache. Falha em runtime devolve 500 `DATABASE_ERROR` e mantém o HTTP no ar; a chamada seguinte pode recuperar.
- **Timeouts:** conexão e statement, 3 s; query, 4 s.
- **Encerramento:** SIGINT/SIGTERM param o coletor (sem novos ciclos, HTTP externo cancelado, transação ativa concluída), depois fecham o HTTP e o pool, com limite de 10 s.

## Como verificar

Com o compose da raiz (`cp .env.example .env && docker compose up --build -d`):

1. `curl -i http://localhost:3000/health` → 200 e `{"status":"ok","db":"ok"}`.
2. Depois de um ciclo (~30 s): `curl http://localhost:3000/api/services` → serviços com `status`, região e, nos ativos com fator disponível, `energyKwh` e `emissionsG` numéricos.
3. `curl "http://localhost:3000/api/collections?limit=3"` → as coletas mais recentes; `curl -i "http://localhost:3000/api/collections?limit=0"` → 400 `VALIDATION_ERROR`.
4. Série do dia em intervalos de 1 h (troque a data pela de hoje, em UTC): `curl "http://localhost:3000/api/collections/series?service_id=1&from=2026-10-23T00:00:00Z&to=2026-10-24T00:00:00Z&bucket=1h"` → 200 com `serviceId`, `from`, `to` e `bucket` ecoados, `buckets` em ordem crescente de `start` (só os intervalos com coleta) e `totals.collections` igual à soma das `collections` dos intervalos; com `bucket=7min` → 400 `VALIDATION_ERROR`; com `service_id=999` → 404 `NOT_FOUND`.
5. Queda da API de carbono: `CARBON_API_URL=http://127.0.0.1:9 docker compose up -d --force-recreate backend`. As coletas seguintes ficam com `calculation_status = indisponivel`, e `GET /api/services` devolve `energyKwh: null` e `emissionsG: null` com o serviço `ativo`. Para restaurar: `docker compose up -d --force-recreate backend`.
6. Banco fora: `docker compose stop postgres` → `/health` responde 500 `DATABASE_ERROR` e o backend continua no ar; `docker compose start postgres` → volta a 200.
7. `curl -i http://localhost:3000/inexistente` → 404 `NOT_FOUND`.

## Testes

`npm test` (Vitest) cobre configuração, boot e encerramento, rotas e erros HTTP, CORS, os dois clientes de API (sucesso, formato inválido, 404, 500, rede, timeout, cancelamento e cache), o coletor (descoberta, prazos, isolamento de falhas, rollback e cálculo disponível ou indisponível) e o `CarbonCalculator`. O job `backend` do CI roda `npx tsc --noEmit` e `npm test` a cada PR com um PostgreSQL 16 descartável, então as suítes de integração também executam e nenhum teste fica pulado (#162). O job `compose` constrói a imagem, o que executa o build.

As suítes de integração com PostgreSQL real (`tests/repositories.integration.test.ts` e `tests/collector.integration.test.ts`) leem `REPOSITORY_TEST_DATABASE_URL` e `WORKER_TEST_DATABASE_URL` e são puladas sem elas. Cada uma precisa de um banco próprio, novo e descartável, com `database/schema.sql` aplicado; a fixture fica no próprio teste (`tests/*-test.repository.ts`): IDs de `services` acima de `Number.MAX_SAFE_INTEGER` e, na de repositories, um usuário com hash sintético só no formato exigido pelo CHECK, não credencial. No CI, o job `backend` cria os bancos `repositories_test` e `worker_test` e define as duas variáveis. Para rodar localmente, a partir de `backend/`:

```bash
docker run -d --rm --name ecopulse-testes -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:16
docker exec ecopulse-testes sh -c 'until pg_isready -h 127.0.0.1 -U postgres -q; do sleep 1; done'
for db in repositories_test worker_test; do
  docker exec ecopulse-testes psql -U postgres -qc "CREATE DATABASE $db"
  docker exec -i ecopulse-testes psql -U postgres -d "$db" -v ON_ERROR_STOP=1 -q < ../database/schema.sql
done
REPOSITORY_TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:55432/repositories_test \
WORKER_TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:55432/worker_test npm test
docker stop ecopulse-testes   # o --rm apaga o container e os dois bancos
```

Esperado: `tests/repositories.integration.test.ts (7 tests)` e `tests/collector.integration.test.ts (1 test)` na lista e o resumo `Tests` só com `passed`, sem `skipped`. Para repetir, recrie o container: as suítes deixam dados nos bancos. Se a porta 55432 estiver ocupada, troque-a no `-p` e nas duas URLs.

As variáveis de teste pertencem só ao processo de testes, não à configuração do backend, e as suítes alteram dados. A suíte de repositories voltou a passar em 28/10 (7/7, #175): as coletas de teste ganharam os campos de cálculo que o #139 tornou obrigatórios, e um caso cobre `findSummary` com 2 serviços e várias coletas cada.

Verificações registradas na Sprint 1: 31/31 testes com PostgreSQL descartável em 11/10 (#94), 82/82 e o snapshot combinado 125/125 em 13/10 (#99), e o compose integrado com persistência após restart em 14/10 (#113). Detalhes em [`docs/sprints/sprint-1.md`](../docs/sprints/sprint-1.md) § Verificações realizadas.
