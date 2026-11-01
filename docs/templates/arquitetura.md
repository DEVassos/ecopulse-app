# Arquitetura do EcoPulse

<!-- Template do agilekit (repo/docs/templates/arquitetura.md). Destino: docs/arquitetura.md. Criado quando frontend, backend e banco existirem em develop (previsto para a Sprint 2); descreve apenas o que está implementado. Substitua os campos `<...>` e remova seções que ainda não correspondem ao código. -->

## 1. Visão geral

O EcoPulse é composto por três partes executadas em containers Docker (`compose.yaml`) mais duas APIs auxiliares externas fornecidas pela UniLaunch.

| Parte | Tecnologia | Responsabilidade | Porta local |
|---|---|---|---|
| `frontend/` | React + TypeScript (Vite) | Dashboard: lista de serviços, indicadores, ranking/comparação, área de configuração; atualização periódica por polling | `5173` |
| `backend/` | Node.js + TypeScript (`<framework HTTP>`) | Descoberta e coleta periódica, cálculo de energia e CO₂e, API REST, autenticação JWT | `3000` |
| `database/` + container `postgres` | PostgreSQL `<versão>` | Histórico de coletas, serviços, estimativas, configurações e usuários; volume persistente `pgdata` | `5432` |
| Greener Metrics Aggregator API | externa (https://metrics.unilaunch.org/docs) | `GET /services` e `GET /metrics/{id}` | — |
| Greener Carbon Intensity API | externa (https://carbon.unilaunch.org/docs) | intensidade de carbono por região (gCO₂e/kWh) | — |

## 2. Fluxo de dados

```
APIs auxiliares ──(HTTP, a cada <X> s)──▶ backend/integrations ──▶ services (regras e cálculo)
                                                                      │
                                                   repositories (SQL parametrizado) ──▶ PostgreSQL
                                                                      │
frontend ◀──(GET /services, /collections, polling a cada <Y> s)── controllers/routes ◀──┘
```

1. **Descoberta:** o `collector` chama `GET /services` do agregador a cada `<X>` s, grava/atualiza `services` e marca os que sumiram como `unavailable`.
2. **Coleta:** para cada serviço ativo, chama `GET /metrics/{id}`; grava uma linha em `collections`; sem resposta → estado `unavailable`; resposta sem métricas → `no-metrics`.
3. **Cálculo:** `EnergyEstimate` converte métricas em kWh pelo modelo de `docs/calculos.md`; `CarbonCalculator` multiplica pela intensidade da região (`carbon-api`, com cache de `<Z>` min e fator padrão em caso de falha).
4. **Exposição:** controllers validam parâmetros, services aplicam regras, repositories executam SQL; respostas JSON padronizadas (`docs/api.md`).
5. **Apresentação:** `services/api.ts` no frontend consome a API; `hooks/usePolling` atualiza a cada `<Y>` s; `MonitoringProvider` guarda estado, última atualização e erros.

Intervalos (RNF02): coleta `<X>` s (`COLLECT_INTERVAL_MS`), atualização do dashboard `<Y>` s (`VITE_REFRESH_INTERVAL_MS`); a hora da última atualização é exibida no topo do dashboard.

## 3. Organização do código

| Pasta | Conteúdo |
|---|---|
| `backend/src/app.ts`, `server.ts` | configuração do servidor HTTP e inicialização do coletor |
| `backend/src/db/connection.ts` | pool do `pg` lendo `DATABASE_URL` |
| `backend/src/integrations/metrics-api.ts`, `carbon-api.ts` | clientes HTTP das APIs auxiliares com timeout e erros tipados |
| `backend/src/domain/` | classes do domínio (`Service`, `Collection`, `EnergyEstimate`, `CarbonCalculator`) |
| `backend/src/modules/<recurso>/` | `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts` |
| `backend/src/shared/errors.ts`, `middlewares/` | erros, handler global, autenticação JWT |
| `frontend/src/pages`, `components`, `services`, `hooks`, `contexts`, `providers` | telas, componentes reutilizáveis, chamadas HTTP, polling, estado global |
| `database/schema.sql` | DDL completo (fonte única do esquema) |

## 4. Modelo de dados

| Tabela | Finalidade | Colunas principais | Relações |
|---|---|---|---|
| `services` | serviços descobertos | `id`, `external_id` (único), `name`, `country`, `region`, `city`, `latitude`, `longitude`, `status`, `discovered_at`, `last_seen_at` | 1:N com `collections` |
| `collections` | uma linha por coleta | `id`, `service_id` (FK), `collected_at`, `cpu_percent`, `memory_mb`, `requests`, `status`, `raw` (jsonb) | N:1 com `services` |
| `estimates` | energia e CO₂e por coleta ou período | `id`, `collection_id` (FK), `energy_kwh`, `carbon_intensity`, `co2e_grams`, `period_start`, `period_end` | N:1 com `collections` |
| `monitoring_settings` | intervalos e parâmetros | `id`, `collect_interval_ms`, `refresh_interval_ms`, `updated_by`, `updated_at` | — |
| `users` | acesso à área de configuração | `id`, `email` (único), `password_hash`, `created_at` | — |

Diagrama e restrições completas: `database/README.md` e `database/schema.sql`.

## 5. Decisões de arquitetura

| ADR | Decisão |
|---|---|
| [0001](adr/0001-gitflow-commits-coautoria.md) | Git Flow, Conventional Commits em pt-BR, co-autoria restrita ao time |
| [0002](adr/0002-postgresql-pg-sem-orm.md) | PostgreSQL com driver `pg` e SQL explícito, sem ORM |
| [0003](adr/0003-docker-compose-unico-caminho.md) | Docker Compose como único caminho de execução |
| `<000N>` | `<polling vs SSE; modelo de potência e fatores; JWT>` |

## 6. Variáveis de ambiente

| Variável | Usada por | Exemplo (`.env.example`) | Descrição |
|---|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | postgres, backend | `ecopulse` / `ecopulse` / `ecopulse` | credenciais do banco local |
| `DATABASE_URL` | backend | `postgres://ecopulse:ecopulse@postgres:5432/ecopulse` | conexão do pool |
| `METRICS_API_URL` | backend | `https://metrics.unilaunch.org` | agregador de métricas |
| `CARBON_API_URL` | backend | `https://carbon.unilaunch.org` | intensidade de carbono |
| `COLLECT_INTERVAL_MS` | backend | `60000` | intervalo de coleta |
| `JWT_SECRET` | backend | `troque-este-valor` | assinatura dos tokens (nunca versionar o valor real) |
| `VITE_API_URL` | frontend | `http://localhost:3000` | base da API |
| `VITE_REFRESH_INTERVAL_MS` | frontend | `30000` | intervalo de atualização do dashboard |
