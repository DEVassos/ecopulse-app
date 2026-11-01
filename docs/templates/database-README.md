# Banco de dados — EcoPulse (PostgreSQL)

<!-- Template do agilekit (repo/docs/templates/database-README.md). Destino: database/README.md. Criado no PR do primeiro schema.sql e atualizado no mesmo PR de cada tabela ou script novo (DoD-PR item 5). Substitua os campos `<...>`. -->

Banco **PostgreSQL `<versão>`**, criado exclusivamente por SQL explícito (DDL em `schema.sql`, DML nos repositories do backend). Sem ORM e sem migrações geradas por ferramenta (RP03).

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `schema.sql` | DDL completo: tabelas, tipos, chaves primárias e estrangeiras, restrições, índices. Fonte única do esquema |
| `seeds/<nome>.sql` | dados iniciais (ex.: `emission_factors.sql`, usuário administrador de desenvolvimento) |
| `migrations/NNN-<slug>.sql` | evolução do esquema a partir da Sprint 2, numerada e idempotente (`IF NOT EXISTS`), quando houver |

## Ordem de aplicação em um banco vazio

Pelo compose (caminho normal): o container `postgres` monta `database/` em `/docker-entrypoint-initdb.d/` e executa os scripts em ordem alfabética **na primeira inicialização do volume**.

```bash
docker compose down -v          # apaga o volume para recriar do zero (só em desenvolvimento)
docker compose up --build postgres
```

Manualmente, com `psql`:

```bash
psql "postgres://ecopulse:ecopulse@localhost:5432/ecopulse" -f database/schema.sql
psql "postgres://ecopulse:ecopulse@localhost:5432/ecopulse" -f database/seeds/<nome>.sql
psql "postgres://ecopulse:ecopulse@localhost:5432/ecopulse" -f database/migrations/001-<slug>.sql   # se existir
```

Conferir: `psql ... -c '\dt'` lista `<services, collections, ...>`; `psql ... -c '\d collections'` mostra FK para `services` e índice `<nome>`.

## Modelo de dados

| Tabela | Finalidade | Chave primária | Chaves estrangeiras | Restrições e índices |
|---|---|---|---|---|
| `services` | serviços descobertos | `id serial` | — | `external_id UNIQUE`, `status CHECK IN ('active','unavailable','no-metrics')` |
| `collections` | uma linha por coleta | `id bigserial` | `service_id → services(id) ON DELETE CASCADE` | índice `(service_id, collected_at DESC)` |
| `<tabela>` | `<finalidade>` | `<pk>` | `<fk>` | `<restrições>` |

Diagrama (texto): `services 1 ─── N collections 1 ─── N estimates`; `monitoring_settings` e `users` independentes.

## Convenções

- Nomes em inglês, `snake_case`, tabelas no plural; chaves `id`; FKs `<tabela_singular>_id`.
- Timestamps `timestamptz` em UTC; `created_at DEFAULT now()`.
- Tipos numéricos: `numeric(12,4)` para energia/CO₂e, `integer`/`bigint` para contadores.
- Toda mudança de esquema vem acompanhada da atualização desta página e do `docs/arquitetura.md` (modelo de dados).

## Onde estão as consultas DML

Toda operação de leitura e escrita está nos repositories do backend, com placeholders `$1…$n` e valores enviados separadamente ao driver `pg`:

| Operação | Arquivo | Função |
|---|---|---|
| upsert de serviço descoberto | `backend/src/modules/services/services.repository.ts` | `upsertService` |
| listar serviços com último estado | `backend/src/modules/services/services.repository.ts` | `findAll` |
| inserir coleta | `backend/src/modules/collections/collections.repository.ts` | `insertCollection` |
| histórico por serviço e período | `backend/src/modules/collections/collections.repository.ts` | `findByServiceAndPeriod` |
| `<agregações para ranking/comparação>` | `<arquivo>` | `<função>` |

Verificação rápida: `grep -rn '\$1' backend/src/modules/*/*.repository.ts` e `bash .github/scripts/check-forbidden.sh` (recusa ORM e interpolação em `query(`).

## Como verificar a persistência após reinício

```bash
docker compose up --build -d
sleep 90                                   # aguarda ao menos uma coleta
docker compose exec postgres psql -U ecopulse -d ecopulse -c "SELECT count(*) FROM collections;"   # anote o valor
docker compose down                        # sem -v: o volume pgdata permanece
docker compose up -d
docker compose exec postgres psql -U ecopulse -d ecopulse -c "SELECT count(*) FROM collections;"   # igual ou maior
```

O volume está declarado em `compose.yaml` (`volumes: pgdata:`), montado em `/var/lib/postgresql/data`.
