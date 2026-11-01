# EcoPulse — Plataforma para Estimativa do Impacto Ambiental de Aplicações de Software

<!-- Template do agilekit (repo/docs/templates/README-raiz.md). Destino: README.md da raiz de DEVassos/greener-app. O README fica em `main` e descreve a versão entregue (tag sprint-N); desenvolvimento acontece em `develop`. A seção "Funcionalidades implementadas" começa explícita ("nenhuma ainda") e só ganha linhas depois do merge do PR correspondente. Substitua os campos `<...>`. -->

[![checks](https://github.com/DEVassos/greener-app/actions/workflows/checks.yml/badge.svg)](https://github.com/DEVassos/greener-app/actions) · Projeto ABP 2DSM 2026-2 (FATEC) · Parceiro: UniLaunch · Status: **Sprint `<N>`** (`<dd/mm>` a `<dd/mm/aaaa>`) · Última release: `<nenhuma / sprint-N>`

## Problema e solução

Aplicações de software consomem energia e geram emissões de CO₂e que quase nunca são visíveis para quem as opera. O **EcoPulse** descobre os serviços disponíveis em um agregador de métricas, coleta periodicamente o uso de cada um, estima o consumo energético e a emissão de CO₂e com base na intensidade de carbono da região onde o serviço roda, guarda o histórico em PostgreSQL e apresenta tudo em um dashboard que se atualiza sozinho, com ranking e comparação entre serviços.

## Funcionalidades implementadas

Nenhuma funcionalidade foi integrada ainda: o repositório está na fase de preparação do processo e da infraestrutura. Esta lista ganha uma linha a cada PR mergeado em `develop` e é consolidada na release de cada sprint.

| Funcionalidade | Requisito | PR | Sprint |
|---|---|---|---|
| `<ex.: Descoberta de serviços no agregador>` | RF01 | #`<pr>` | 1 |

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React `<v>` + TypeScript, Vite |
| Backend | Node.js `<v>` + TypeScript, `<framework HTTP>`, driver `pg` (SQL explícito, sem ORM) |
| Banco de dados | PostgreSQL `<v>` com `database/schema.sql` |
| Execução | Docker Compose (`compose.yaml`) |
| APIs auxiliares | Greener Metrics Aggregator API · Greener Carbon Intensity API (UniLaunch) |

## Integrantes

| Integrante | GitHub | Papel |
|---|---|---|
| Henrique Camargo | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) | Product Owner |
| Gabriel Travensolli | [@travensolli](https://github.com/travensolli) | Scrum Master |
| Andrea Turibio | [@DeaTuribio](https://github.com/DeaTuribio) | Desenvolvedora — frontend |
| Lucas Amorim | [@LUCASAMR23](https://github.com/LUCASAMR23) | Desenvolvedor — backend |
| Vinicius Augusto | [@viniciusaugusto1997](https://github.com/viniciusaugusto1997) | Desenvolvedor — banco de dados |

## Como executar

Pré-requisitos: Docker Desktop (ou Docker Engine + Compose v2) e Git.

```bash
git clone https://github.com/DEVassos/greener-app.git
cd greener-app
cp .env.example .env            # ajuste URLs das APIs auxiliares se necessário
docker compose up --build
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (API) | http://localhost:3000 — `GET /health` |
| PostgreSQL | `localhost:5432` (credenciais em `.env`) |

Parar: `docker compose down` (os dados ficam no volume `pgdata`; `docker compose down -v` apaga). Verificação completa pelo avaliador: `bash .agilekit/scripts/teste-avaliador.sh` (quando o kit estiver instalado) ou os passos de `docs/sprints/sprint-N.md` → "Verificações realizadas".

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/plano-de-entregas.md](docs/plano-de-entregas.md) | Plano das três sprints: critérios, entregas, responsáveis, evidências |
| [docs/requisitos.md](docs/requisitos.md) | Requisitos do desafio (RF/RNF/RP) |
| [docs/arquitetura.md](docs/arquitetura.md) | Partes, fluxo de dados e modelo de dados |
| [docs/api.md](docs/api.md) | Endpoints desenvolvidos |
| [docs/calculos.md](docs/calculos.md) | Fórmulas de energia e CO₂e |
| [docs/sprints/](docs/sprints/) | Registro de cada sprint, atas e participação |
| [docs/processo/README.md](docs/processo/README.md) | Como trabalhamos (Scrum, DoD, quadro) |
| [docs/adr/](docs/adr/README.md) | Decisões de arquitetura |
| [frontend/README.md](frontend/README.md) · [backend/README.md](backend/README.md) · [database/README.md](database/README.md) | Módulos |
| [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) | Branches, commits, PRs |

## Status da sprint

**Sprint `<N>`** — objetivo: `<objetivo>`. Itens concluídos: `<x>`/`<y>`. Próxima review: `<dd/mm/aaaa>` 19h30 (a confirmar). Detalhes em [docs/sprints/sprint-`<N>`.md](docs/sprints/).
