# ADR 0003 — Docker Compose como único caminho de execução

| Campo | Valor |
|---|---|
| Status | aceito · execução do frontend no container substituída pelo [ADR 0005](0005-frontend-nginx-build-producao.md) |
| Data | 2026-10-05 |
| Decisores | @viniciusaugusto1997 (db), @LUCASAMR23 (backend), @DeaTuribio (frontend), @travensolli (SM); validado pelo time |
| Rastreabilidade | requisito RP04 (execução exclusivamente em containers) · critérios DW07 (execução containerizada), BD03 (persistência após reinício), ES08 (reprodutibilidade) |

## Contexto e problema

O edital determina que a aplicação completa seja executada **exclusivamente** por containers Docker (RP04). A rubrica confere Dockerfiles, Compose, `.env.example` e README (DW07) e verifica que registros gravados continuam disponíveis após reinicialização dos containers (BD03). O avaliador precisa subir a aplicação em uma máquina limpa, seguindo o README, sem instalar Node ou PostgreSQL. O time trabalha em Windows, macOS e Linux, com versões diferentes de Node, e já perdeu tempo no passado com "na minha máquina funciona".

## Fatores de decisão

- Um único comando reproduzível para o avaliador e para o `teste-avaliador.sh`.
- Persistência dos dados entre reinícios sem passos manuais.
- Mesmo ambiente para os cinco integrantes e para o CI.
- Segredos fora do repositório, mas configuração de exemplo completa.
- Desenvolvimento com recarga automática sem sair do compose.

## Opções consideradas

1. **`compose.yaml` único na raiz com `frontend`, `backend` e `postgres` (volume nomeado), `.env.example` versionado e `.env` local.**
2. Execução local (`npm run dev`) com PostgreSQL em container avulso; Docker só para "entrega".
3. Dois arquivos compose (desenvolvimento e produção) com Dockerfiles multi-stage distintos.

## Decisão

Adotamos a **opção 1**:

- `compose.yaml` na raiz define três serviços: `postgres` (imagem oficial `postgres:<versão>`, volume nomeado `pgdata` em `/var/lib/postgresql/data`, `database/` montado em `/docker-entrypoint-initdb.d/`, `healthcheck` com `pg_isready`), `backend` (build de `backend/Dockerfile`, `depends_on: postgres: condition: service_healthy`, porta `3000`) e `frontend` (build de `frontend/Dockerfile`, porta `5173`).
- **`.env.example`** versionado com todas as variáveis e valores de desenvolvimento; `.env` real é local e está no `.gitignore` (o check `pr` recusa `.env` versionado). O README instrui `cp .env.example .env && docker compose up --build`.
- Recarga em desenvolvimento via bind mount do código-fonte e `npm run dev` dentro do container (perfil padrão); a imagem de entrega usa o mesmo Dockerfile com estágio de build — um único arquivo compose, sem variantes.
- `teste-avaliador.sh` e o `ci.yml` reproduzem o caminho do avaliador: clone limpo → `docker compose up --build` → `GET /health` → coleta → `docker compose down && up` → contagem de `collections` preservada → `schema.sql` em banco vazio.
- Nenhum README documenta execução fora do compose como caminho oficial; `npm` direto fica como atalho opcional para quem desenvolve um módulo isolado.

## Consequências

**Positivas**
- DW07 e BD03 verificáveis com dois comandos; ES08 fica alinhado com o que roda de fato.
- Ambiente idêntico para o time, o CI e o avaliador; versões de Node e PostgreSQL fixadas nas imagens.
- Persistência garantida pelo volume nomeado; `docker compose down -v` é o único jeito de apagar dados.
- Sem segredos no repositório e sem variável "esquecida": `.env.example` é a lista completa.

**Negativas / custos**
- Exige Docker Desktop com WSL 2 no Windows e consome mais memória — documentado em [onboarding.md](../processo/onboarding.md).
- Build inicial mais lento que `npm run dev` local — mitigado por cache de camadas e bind mounts.
- Scripts de inicialização do PostgreSQL só rodam na primeira criação do volume; mudanças de esquema exigem migração numerada ou recriar o volume em desenvolvimento (documentado em `database/README.md`).

## Prós e contras das opções

### Opção 2 — execução local com Docker só na entrega
- Bom: ciclo de desenvolvimento rápido.
- Ruim: viola RP04; divergência entre o que o time testa e o que o avaliador executa; `.env` e versões de Node divergem entre máquinas.

### Opção 3 — dois composes
- Bom: imagens de produção menores.
- Ruim: dois caminhos para manter e documentar; risco de o avaliador usar o errado; complexidade sem ganho para o escopo do semestre.

## Links

- Requisito: [RP04](../requisitos.md) · Critérios DW07/BD03 no [plano de entregas](../plano-de-entregas.md)
- Modelos: [`docs/templates/README-raiz.md`](../templates/README-raiz.md) · [`docs/templates/database-README.md`](../templates/database-README.md)
- Documentação: https://docs.docker.com/compose/
