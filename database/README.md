# Banco de dados

SQL explícito no PostgreSQL, sem ORM (ADR 0002). O schema está em `database/schema.sql` (#5, #77) e o modelo em [`docs/arquitetura/modelagem-uml.md`](../docs/arquitetura/modelagem-uml.md). As consultas DML ficam nos repositories do backend: `services.repository.ts`, `collections.repository.ts`, `usuarios/usuarios.repository.ts` e `health.repository.ts`, com transações em `backend/src/db/transaction.repository.ts` (#14, #94). O worker de coleta grava o histórico só por inserção (#19, #99) e, desde o #139 (#133), preenche os campos de cálculo de energia e CO₂e. A tabela `users` já atende ao login JWT administrativo.

Decisões e fontes do modelo em [`integracao-modelagem-banco.md`](../docs/arquitetura/integracao-modelagem-banco.md); fórmulas e unidades em [`docs/calculos.md`](../docs/calculos.md); contratos dos repositories e fixture dos testes de integração no [README do backend](../backend/README.md#repositories-e-transações-14).

## Arquivos e ordem

`database/schema.sql` é a fonte única do modelo: services, users, collections e access_entries, constraints, índices e comentários em uma transação. Exige PostgreSQL 14 ou superior (numeric com valores especiais nos CHECKs); o compose usa `postgres:16-alpine`. Depois dele, `zz-seed-admin.sh` cria o administrador inicial usando `ADMIN_EMAIL` e `ADMIN_PASSWORD` do ambiente: a senha de cada instalação não é versionada nem gravada em texto puro; o `.env.example` contém apenas valores de desenvolvimento.

## Execução pelo compose (#27)

A execução oficial é exclusivamente Docker (RP04, ADR 0003). O serviço `postgres` do [`compose.yaml`](../compose.yaml):

- monta esta pasta em `/docker-entrypoint-initdb.d/` (somente leitura). Na **primeira** criação do volume, o entrypoint executa `schema.sql` e, depois, `zz-seed-admin.sh`; o script habilita `pgcrypto`, gera um hash bcrypt com custo 10 e insere um único administrador. Ele ignora o `README.md`;
- guarda os dados no volume nomeado `pgdata` (`/var/lib/postgresql/data`). Eles sobrevivem a `docker compose restart`, `stop` e `down`; só `docker compose down -v` apaga o volume (BD03);
- tem healthcheck `pg_isready`, e o backend só sobe depois dele (`depends_on: condition: service_healthy`);
- atende em `postgres:5432` dentro da rede do compose (é o endereço que o backend usa) e fica exposto no host na porta `POSTGRES_HOST_PORT` (padrão e exemplo: 5433, para não conflitar com um PostgreSQL local na 5432). Se a 5433 estiver ocupada, troque no `.env`; a porta interna não muda.

Para acessar do host (psql local, DBeaver): `psql -h localhost -p 5433 -U ecopulse -d ecopulse_db` (ou a porta definida em `POSTGRES_HOST_PORT`).

Usuário, senha e banco vêm de `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` no `.env` (padrão `ecopulse` / `ecopulse` / `ecopulse_db`, os mesmos do [`.env.example`](../.env.example)). Eles só valem na criação do volume: para trocar, `docker compose down -v`.

**Clone que já subiu o compose antes da #68 (15/10/2026).** Até então o projeto do compose tinha o nome da pasta do clone, em geral `greener-app`, e os containers antigos continuam ocupando as portas 5433, 3000 e 5173. Antes de subir: `docker compose ls -a` mostra o nome antigo; `docker compose -p greener-app down` para a stack antiga (sem `-v`, o volume `greener-app_pgdata` fica guardado; `docker volume rm greener-app_pgdata` o descarta); no `.env`, troque `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` e `DATABASE_URL` pelos valores do `.env.example` (ou rode `cp .env.example .env`, se o seu `.env` não tiver ajustes próprios). Se já subiu com o `.env` antigo, rode `docker compose down -v` antes de subir de novo.

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec postgres psql -U ecopulse -d ecopulse_db -c '\dt'
docker compose exec postgres psql -U ecopulse -d ecopulse_db -c 'SELECT count(*) FROM collections;'
```

Esperado: as quatro tabelas (`access_entries`, `collections`, `services`, `users`), a contagem do histórico e um único administrador. No log (`docker compose logs postgres`) aparecem `running /docker-entrypoint-initdb.d/schema.sql` e `running /docker-entrypoint-initdb.d/zz-seed-admin.sh` só na primeira subida.

```bash
docker compose exec postgres psql -U ecopulse -d ecopulse_db \
  -c "SELECT email, left(password_hash, 7) AS prefixo, count(*) OVER () AS total FROM users;"
```

Esperado: uma linha para `ADMIN_EMAIL`, prefixo `$2a$10$` ou `$2b$10$` e total `1`. O seed usa o índice único de e-mail sem distinguir maiúsculas/minúsculas.

### Reaplicar o seed

Em um volume já existente, inclua `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env` se ainda não estiverem definidos e execute o seed sem apagar o volume:

```bash
docker compose exec postgres sh /docker-entrypoint-initdb.d/zz-seed-admin.sh
```

Esperado: `INSERT 0 0` se o administrador já existe ou `INSERT 0 1` se ele ainda não existia; a consulta acima deve continuar mostrando uma única linha. O seed é idempotente. Alterar `ADMIN_PASSWORD` e reaplicar não troca a senha já cadastrada (`ON CONFLICT DO NOTHING`).

Em clones existentes, copiar as duas variáveis do `.env.example` para o `.env` e executar o comando acima preserva o volume e os demais dados. Não use `docker compose down -v` para atualizar as credenciais.

Persistência (BD03): insira um registro, reinicie e conte de novo.

```bash
docker compose exec postgres psql -U ecopulse -d ecopulse_db -c "INSERT INTO services (external_id, name) VALUES ('svc-persist', 'Persistência');"
docker compose restart
docker compose exec postgres psql -U ecopulse -d ecopulse_db -c 'SELECT count(*) FROM services;'
```

Esperado: a contagem continua `1` depois de `restart` e de `down` seguido de `up`. Depois de `docker compose down -v` e nova subida, volta a `0`, porque o schema é reaplicado num volume novo.

Mudar `schema.sql` não altera um volume que já existe (os scripts de init só rodam no volume vazio). Em desenvolvimento, recrie com `docker compose down -v`; em banco com dados, use migração numerada (ADR 0002).

## Verificação isolada do DDL

Para verificar somente o DDL em um container descartável, sem portas ou volumes e sem remover containers existentes, use Git Bash; neste ambiente o Docker fica no WSL. O nome abaixo deve estar livre e deve identificar somente o container criado por este procedimento.

```bash
wsl --exec docker run -d --rm --name ecopulse-schema-check --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16
wsl --exec docker exec ecopulse-schema-check pg_isready -U postgres
# Aguarde pg_isready informar accepting connections antes de aplicar.
wsl --exec docker exec -i ecopulse-schema-check psql -U postgres -v ON_ERROR_STOP=1 < database/schema.sql
wsl --exec docker exec ecopulse-schema-check psql -U postgres -c '\\dt'
wsl --exec docker exec ecopulse-schema-check psql -U postgres -c 'SELECT count(*) FROM collections;'
# Após a verificação, pare somente o container descartável criado acima.
wsl --exec docker stop ecopulse-schema-check
```

Sem rede/portas/volume, trust fica limitado a esse container temporário; não é configuração de produção nem muda .env.example. Esperado: quatro tabelas, histórico vazio e DDL sem erros; reaplicar o mesmo schema mantém dados existentes do mesmo modelo.

## Modelo de dados

| Tabela | Finalidade | Integridade |
|---|---|---|
| services | Cadastro descoberto e estado atual, incluindo region_code. | ID externo único; coordenadas válidas; timestamps. |
| collections | Histórico de métricas em GB, intervalo e contexto regional; resultados quando disponíveis. | FK RESTRICT; status de métricas separado do cálculo; métricas completas para ok; NULL para desconhecido. |
| users | Credenciais administrativas para configuração e consulta futura das entradas. | E-mail único sem diferenciar caixa; hash bcrypt. Sem quatro perfis ou tenants. |
| access_entries | IP e instante da primeira entrada por sessão da aba. | IP INET e horário TIMESTAMPTZ obrigatórios; índice temporal; sem FK de usuário ou dados HTTP. |

Os estados e nulabilidade completos constam na UML e nos CHECKs. Falha de carbono preserva métricas válidas; cálculo indisponível exige mensagem própria e não fabrica emissão zero. JSONB contém objeto bruto de /metrics; campos normalizados são a interface do modelo, e o JSON não substitui a validação feita no backend antes do INSERT.

Energia numeric(20,12) e emissão numeric(24,12) aumentam a resolução para 10⁻¹² sem reduzir a faixa inteira anterior. Exemplos e limites: docs/calculos.md. O schema possui quatro índices explícitos e cinco automáticos (quatro PKs e UNIQUE de services.external_id), totalizando nove. Roteiro reproduzível dos testes: [verificação do schema](../docs/arquitetura/verificacao-schema.md).

## Inicialização não é migração

IF NOT EXISTS não altera tabelas existentes. O guard rejeita collections da versão anterior com colunas bytes ou sem calculation_status, em vez de reinterpretar dados como GB. Não se executou migração nem se consultou banco do usuário para testes. Outros desvios de um esquema existente também exigem inspeção; reaplicação não certifica equivalência de um banco arbitrário.

Um banco criado com a revisão anterior em GB/escala seis também é recusado pelo guard e requer migração explícita para ampliar energy_kwh/co2e_grams. Alterar apenas este arquivo não modifica os tipos existentes nem recupera valores anteriormente arredondados para zero; não foi executada migração em banco real.

Evolução em banco populado exige script database/migrations/NNN-slug.sql conforme ADR 0002, documentação, backup e teste de preservação. Conversão de bytes exige comprovar unidade e origem; o nome da coluna não comprova o fator. Nenhuma conversão silenciosa ou DROP/TRUNCATE foi incluída.

## Onde ficam as consultas (DML)

Toda DML fica em `backend/src/modules/*/*.repository.ts`, com o driver `pg` e parâmetros `$1…$n`, sem interpolação de valores:

| Repository | Consultas |
|---|---|
| `services/services.repository.ts` | lista os serviços com a última coleta (métricas, energia e CO₂e), busca por ID, upsert por `external_id`, atualização de estado e marcação de ausentes como `removido` |
| `collections/collections.repository.ts` | insere a coleta (métricas, JSON bruto e campos de cálculo) e lista o histórico com filtros de serviço, período e limite |
| `usuarios/usuarios.repository.ts` | busca usuário por e-mail sem distinção de caixa (base da autenticação da Sprint 2) |
| `health/health.repository.ts` | `SELECT 1` do healthcheck |

Cada coleta é um INSERT novo; não há UPDATE nem DELETE de coletas. A FK `RESTRICT` protege serviços referenciados, mas não torna `collections` imutável tecnicamente. Os UPDATEs em `services` atribuem `updated_at = now()`, porque o default só atua na inserção; `users` ainda não tem UPDATE.

Para consultar o histórico pelo compose:

```bash
docker compose exec postgres psql -U ecopulse -d ecopulse_db -c "SELECT calculation_status, count(*) FROM collections GROUP BY 1;"
```

A tabela `access_entries` (IP e horário da primeira entrada por sessão) já existe no schema, mas ainda não é gravada nem consultada. A consulta autenticada por JWT, com filtros por período, entra junto com a área de configuração na Sprint 2.
