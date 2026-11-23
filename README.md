# 🌱 EcoPulse — Estimativa do Impacto Ambiental de Aplicações de Software

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Projeto de Aprendizagem Baseada em Projetos (ABP) — 2º semestre de Desenvolvimento de Software Multiplataforma**
**FATEC Jacareí · 2026-2 · Parceiro: UniLaunch · Focal point: Prof. Rodrigo Silva Peres · Equipe: DEVassos**

</div>

**EcoPulse** é o nome do produto. No edital do desafio ele aparece como **GreenER**; o repositório é `DEVassos/ecopulse-app` (renomeado de `greener-app` em 08/11/2026, #122; o nome antigo redireciona).

---

## 1. Problema

Empresas operam dezenas ou centenas de aplicações distribuídas em várias regiões. Métricas de CPU, memória, armazenamento e rede são usadas para desempenho e disponibilidade, mas quase nunca para entender o **impacto ambiental** dessas aplicações. Gestores têm pouca visibilidade sobre o consumo energético dos sistemas e as emissões de carbono associadas.

## 2. Solução

O **EcoPulse** é uma plataforma web de observabilidade socioambiental (**GreenOps**) que monitora continuamente aplicações e microsserviços a partir de duas APIs do parceiro — o [Agregador de Métricas](https://metrics.unilaunch.org/docs) e o [Serviço de Intensidade de Carbono](https://carbon.unilaunch.org/docs). Ela traduz métricas de infraestrutura (**CPU, memória, disco e rede**) em **consumo energético (kWh)** e **pegada de carbono estimada (gCO₂e)**, ponderada pela intensidade de carbono da matriz elétrica da região onde cada serviço está hospedado. O ambiente monitorado é dinâmico: serviços surgem, ficam indisponíveis, deixam de exportar métricas e voltam, e a plataforma se adapta sem intervenção manual.

> 💡 **Princípio central:** software não consome energia diretamente, mas o hardware que o executa sim. O EcoPulse é uma ponte analítica entre a infraestrutura de TI e as metas corporativas de sustentabilidade e ESG.

Requisitos completos (RF01–RF15, RNF01–RNF05, RP01–RP07): [docs/requisitos.md](docs/requisitos.md).

Setup do backend: [organização e validação](backend/README.md) e [contrato da API](docs/api.md). Frontend, backend e PostgreSQL sobem juntos pelo `compose.yaml` (#26, #27).

## 3. Funcionalidades implementadas

O que está entregue, por requisito do desafio, com as issues e os Pull Requests de cada entrega. O detalhe de cada item, com print e legenda, está em [docs/funcionalidades.md](docs/funcionalidades.md).

**Vídeo da Sprint 1 (cerca de 3 min):** [EcoPulse - ABP FATEC 2DSM](https://youtu.be/3Hx4kzuudSw), com o produto como foi entregue na Sprint 1.

**Vídeo da Sprint 2:** [EcoPulse — Sprint 2 | DEVassos (FATEC Jacareí) — De Monitoramento a Investigação de Emissões](https://youtu.be/an9g07c_nIs), com o produto como foi entregue na Sprint 2 (`release/sprint-2`).

**Vídeo da Sprint 3:** [EcoPulse — Sprint 3 | DEVassos (FATEC Jacareí) — Da Investigação à Decisão](https://youtu.be/l-femMC6UP4), com o produto como foi entregue na Sprint 3 (`release/sprint-3`).

| Requisito | O que o EcoPulse faz | Issues e PRs | Detalhe |
|---|---|---|---|
| RF01–RF04 — descoberta, monitoramento dinâmico e coleta | O backend descobre os serviços no agregador, consulta as métricas de cada um, grava o histórico no PostgreSQL e reconcilia os serviços que aparecem, ficam indisponíveis ou voltam a exportar métricas | #95, #98, #99 | [Coleta, cálculo e plataforma](docs/funcionalidades.md#10-coleta-cálculo-e-plataforma) |
| RF05, RF06 — indisponibilidade e ausência de métricas | Cada serviço aparece como ativo, indisponível, sem métricas ou removido; o indisponível mostra o motivo, e o Dashboard avisa quando um estado muda | #176, #251, #331 (PR #374) | [Dashboard](docs/funcionalidades.md#2-dashboard) · [Configuração e contas](docs/funcionalidades.md#8-configuração-e-contas) |
| RF07 — cálculo individual | Cada coleta válida vira potência, energia e CO₂e com o fator de carbono da região; sem o fator, a métrica fica registrada e o cálculo aparece como indisponível. Fórmulas em [docs/calculos.md](docs/calculos.md) | #133 (PR #139), #333 (PR #350) | [Coleta, cálculo e plataforma](docs/funcionalidades.md#10-coleta-cálculo-e-plataforma) · [Dashboard](docs/funcionalidades.md#2-dashboard) |
| RF08 — indicadores agregados | Cards com os serviços por estado, energia e CO₂e das últimas 24 h com a variação contra as 24 h anteriores, e o Relatório do período | #21 (PR #202), #175 (PR #215), #234 (PR #390), #402, #403 | [Dashboard](docs/funcionalidades.md#2-dashboard) · [Relatório e impressão](docs/funcionalidades.md#6-relatório-e-impressão) |
| RF09 — dashboard operacional | Tabela de serviços com energia e CO₂e das 24 h, CPU, última leitura, região e estado, com busca, ordenação e a janela de detalhes de cada serviço | #69, #330 (PR #368), #135 | [Dashboard](docs/funcionalidades.md#2-dashboard) |
| RF10 — histórico de coletas | `GET /api/collections` e a página Emissões, com o histórico de um serviço por período em barras por intervalo e zoom por botões, teclado e arrasto | #115, #116, #119, #190 (PRs #200 e #216), #396, #397, #410 | [Emissões](docs/funcionalidades.md#4-emissões) · [Coleta, cálculo e plataforma](docs/funcionalidades.md#10-coleta-cálculo-e-plataforma) |
| RF11 — atualização contínua | O Dashboard se atualiza sozinho, sem recarregar; o administrador escolhe o intervalo (15, 30 ou 60 s) na Configuração | #100, #114, #176, #250 | [Dashboard](docs/funcionalidades.md#2-dashboard) · [Configuração e contas](docs/funcionalidades.md#8-configuração-e-contas) |
| RF12 — localização dos serviços | Região de cada serviço na tabela, com o fator de carbono e o selo **Rede limpa** nas regiões de até 100 g CO₂e/kWh | #69, #324 (PR #367) | [Dashboard](docs/funcionalidades.md#2-dashboard) |
| RF13 — visualização geográfica | Mapa de bolhas por região e lista **Regiões por CO₂e**, com a seleção compartilhada entre os dois | #322, #342, #351 (PR #373) | [Regiões e mapa](docs/funcionalidades.md#3-regiões-e-mapa) |
| RF14 — ranking de impacto | **Quem pesa mais** no CO₂e das últimas 24 h, a parte de cada serviço na tabela e a eficiência energética e de carbono | #260, #330 (PR #368), #329 | [Dashboard](docs/funcionalidades.md#2-dashboard) · [Comparação](docs/funcionalidades.md#5-comparação) |
| RF15 — comparação entre serviços | Página Comparação com 2 a 10 serviços no mesmo período: matriz, barras, linhas de CO₂e, dispersão "Carga ou região?", ranking com ordenação e CSV, e a simulação de migração para uma região mais limpa | #193 (PR #214), #194 (PR #219), #399, #406, #431 (PR #433), US12 #53 (PRs #383 e #384) | [Comparação](docs/funcionalidades.md#5-comparação) · [Regiões e mapa](docs/funcionalidades.md#3-regiões-e-mapa) |
| RNF01 — usabilidade e responsividade | Página inicial de apresentação, tema claro e escuro, acessibilidade por teclado e Dashboard legível em 390 px | #438, #265 (PR #280), #262 (PR #278), #263 | [Página inicial e login](docs/funcionalidades.md#1-página-inicial-e-login) · [Interface](docs/funcionalidades.md#9-interface) · [Dashboard](docs/funcionalidades.md#2-dashboard) |
| RNF02 — atualização em tempo real | Selo **Última atualização** com o horário e o intervalo, e o aviso "Desatualizado desde …" quando o backend não responde | #89, #434 | [Dashboard](docs/funcionalidades.md#2-dashboard) |
| RNF03 — desempenho | Consultas agregadas por período e índice da última coleta, com o `EXPLAIN` registrado em [docs/calculos.md](docs/calculos.md#consultas-agregadas-por-período) | #313, #346 (PR #371) | — |
| RNF04 — tolerância a falhas | Erros tipados no backend e respostas da API conferidas no frontend antes de aparecerem na tela | #174 (PR #233), #161 | [Coleta, cálculo e plataforma](docs/funcionalidades.md#10-coleta-cálculo-e-plataforma) |
| RNF05 — documentação técnica | Página Ajuda com guia de leitura e fórmulas, exportação do período em CSV e PDF, e execução com `docker compose up --build` | #398, #404, US13 #54 (PRs #386 e #387), #91, #113, #81 | [Ajuda](docs/funcionalidades.md#7-ajuda) · [Emissões](docs/funcionalidades.md#4-emissões) · [Coleta, cálculo e plataforma](docs/funcionalidades.md#10-coleta-cálculo-e-plataforma) |
| RP06 — autenticação | Login com JWT e bcrypt em toda a aplicação, cadastro por convite com papéis e perfil para trocar o nome e a senha | #20 (PR #208), #25 (PR #243), #257, US15 #195 (PRs #392 e #393), #400, #401 | [Página inicial e login](docs/funcionalidades.md#1-página-inicial-e-login) · [Configuração e contas](docs/funcionalidades.md#8-configuração-e-contas) |
| Fora do edital | **Imprimir / PDF** no Dashboard e na Comparação | #408 | [Relatório e impressão](docs/funcionalidades.md#6-relatório-e-impressão) |

![Globo com as bolhas das regiões e a lista Regiões por CO₂e ao lado](docs/img/sprint-3-dashboard-regioes.png)

_Dashboard com o backend real (`docker compose`) em 22/11/2026, 9h17, em 1920 px, num banco novo com cerca de 20 min de coletas: Ashburn (`us-east`) emitiu mais (7,92 g) com dois serviços e a intensidade de 378 g CO₂e/kWh; Sao Paulo (`br-sudeste`, 85 g/kWh) e Toronto (`ca-central`, 40 g/kWh) têm o selo **Rede limpa** ao lado do nome. O crédito das imagens da EOX fica no canto do mapa (#351)._

![Página inicial no tema escuro, com a chamada sobre o vídeo e o fluxo métrica → kWh → CO₂e](docs/img/sprint-3-pagina-inicial.png)

_Build do `docker compose` em 22/11/2026, 1440 px, tema escuro._

## 4. Escopo planejado e entregue

- **Dashboard em três níveis:** entregue. A visão executiva está no Dashboard (energia, CO₂e, serviços por estado, atualização sem recarregar); a análise comparativa, na Comparação, no ranking e no mapa das regiões; e a investigação detalhada, na página Emissões e na janela de detalhes de cada serviço.
- **Prioridade apontada pelo cliente na review da Sprint 1** (comparar serviços e analisar os dados já coletados, [#159](https://github.com/DEVassos/ecopulse-app/issues/159)): atendida na Sprint 2 com a Comparação e a página Emissões, e ampliada na Sprint 3.
- **Diferenciais entregues na Sprint 3:** simulação de migração para regiões com matriz mais limpa ([US12, #53](https://github.com/DEVassos/ecopulse-app/issues/53)) e exportação de relatórios em PDF e CSV ([US13, #54](https://github.com/DEVassos/ecopulse-app/issues/54)).

O que cada sprint previa e a situação de cada critério estão no [plano de entregas](docs/plano-de-entregas.md); o backlog, no [quadro do projeto](https://github.com/orgs/DEVassos/projects/6).

## 5. Tecnologias

| Camada | Tecnologia (obrigatória pelo desafio, RP01–RP06) |
|---|---|
| Frontend | React + TypeScript (Vite, Tailwind CSS) |
| Backend | Node.js + TypeScript, API REST em módulos (routes, controllers, services, repositories) |
| Banco de dados | PostgreSQL com DDL e DML explícitos via driver `pg`, sem ORM |
| Segurança | Login JWT no backend e bcrypt para senhas ([#20](https://github.com/DEVassos/ecopulse-app/issues/20), PR #208); tela de login no frontend ([#25](https://github.com/DEVassos/ecopulse-app/issues/25), PR #243); `PUT /api/monitoring-settings` protegido ([#250](https://github.com/DEVassos/ecopulse-app/issues/250), PR #253); todas as páginas e as rotas de dados exigem login ([#257](https://github.com/DEVassos/ecopulse-app/issues/257)) |
| Execução | Docker Compose (frontend, backend e PostgreSQL com volume persistente) |
| Mapa | MapLibre GL JS 6.16.0, carregado só quando o mapa abre ([ADR 0010](docs/adr/0010-mapa-maplibre.md)). Imagens de satélite EOX Sentinel-2 cloudless 2025 sob CC BY-NC-SA 4.0, com o crédito no canto do mapa. **Aviso de uso comercial:** a licença das imagens é só para uso não comercial; uso comercial do EcoPulse exige a licença paga da EOX ou outra fonte de imagens |

## 6. Equipe (DEVassos)

| | Integrante | Papel | GitHub |
| :---: | :--- | :--- | :---: |
| <img src="https://github.com/henriqueptbd-cell.png" width="60" alt="Henrique Camargo" /> | **Henrique Camargo** | Product Owner | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) |
| <img src="https://github.com/travensolli.png" width="60" alt="Gabriel Travensolli" /> | **Gabriel Travensolli** | Scrum Master | [@travensolli](https://github.com/travensolli) |
| <img src="https://github.com/DeaTuribio.png" width="60" alt="Andrea Turibio" /> | **Andrea Turibio** | Desenvolvedora (frontend) | [@DeaTuribio](https://github.com/DeaTuribio) |
| <img src="https://github.com/LUCASAMR23.png" width="60" alt="Lucas Amorim" /> | **Lucas Amorim** | Desenvolvedor (backend) | [@LUCASAMR23](https://github.com/LUCASAMR23) |
| <img src="https://github.com/viniciusaugusto1997.png" width="60" alt="Vinicius Augusto" /> | **Vinicius Augusto** | Desenvolvedor (backend e banco de dados) | [@viniciusaugusto1997](https://github.com/viniciusaugusto1997) |

## 7. Sprints

| Sprint | Período | Review | Objetivo | Situação | Registro |
|---|---|---|---|---|---|
| 1 | 29/09 → 19/10/2026 | 19/10 às 19h30 (realizada) | Pipeline de coleta persistido em Docker e primeira tela do dashboard (serviços com estado e localização, atualizando sem recarregar) | Concluída: tag [`sprint-1`](https://github.com/DEVassos/ecopulse-app/releases/tag/sprint-1) | [sprint-1.md](docs/sprints/sprint-1.md) |
| 2 | 20/10 → 09/11/2026 | 09/11 às 19h30 (realizada) | Dashboard completo com energia, CO₂e, tolerância a falhas e área de configuração protegida por JWT | Concluída: tag [`sprint-2`](https://github.com/DEVassos/ecopulse-app/releases/tag/sprint-2) | [sprint-2.md](docs/sprints/sprint-2.md) |
| 3 | 10/11 → 23/11/2026 | 23/11 às 19h30 | Ranking de impacto, comparação entre serviços, mapa e repositório pronto como portfólio | Em fechamento: `release/sprint-3` criada em 23/11 | [sprint-3.md](docs/sprints/sprint-3.md) |

Critérios previstos, responsáveis, evidências e a situação de cada critério: [docs/plano-de-entregas.md](docs/plano-de-entregas.md). Verificações, review e participação de cada sprint ficam no registro da sprint.

## 8. Como executar

Pré-requisitos: [Docker](https://www.docker.com/get-started) com Docker Compose e [Git](https://git-scm.com/).

```bash
git clone https://github.com/DEVassos/ecopulse-app.git
cd ecopulse-app
cp .env.example .env
docker compose up --build
```

| Serviço | URL | Situação |
|---|---|---|
| Frontend (dashboard) | http://localhost:5173 | no `compose.yaml` |
| Backend (API e `/health`) | http://localhost:3000/health | no `compose.yaml`; sobe depois que o PostgreSQL fica saudável |
| PostgreSQL 16 | `localhost:5433` (`POSTGRES_HOST_PORT`) | no `compose.yaml`, volume `pgdata`; acesso com `docker compose exec postgres psql -U ecopulse -d ecopulse_db` |

Abra http://localhost:5173 e entre com `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env` (no `.env.example`, `admin@ecopulse.local` / `admin1234`): todas as páginas exigem login (#257). Na API, as rotas de dados também exigem o token; o exemplo com `curl` está em [backend/README.md](backend/README.md).

Na primeira subida o PostgreSQL aplica [`database/schema.sql`](database/schema.sql) sozinho; detalhes em [database/README.md](database/README.md). Com `VITE_API_URL` apontando para `http://localhost:3000/api` (como no `.env.example`), o dashboard mostra os serviços que o backend coletou: a lista começa vazia e é preenchida pelo coletor que o backend inicia junto com a API (descoberta no agregador a cada 30 s; no compose vale esse padrão, porque `POLLING_INTERVAL_MS` ainda não é repassado ao container); sem acesso ao agregador, a lista para de mudar e mostra o que já está no banco; o aviso "Desatualizado desde …" aparece quando o próprio backend não responde. Deixando `VITE_API_URL` vazia, o frontend sobe em modo demonstração com dados ilustrativos e faixa de aviso; `npm run mock` sobe um backend falso para desenvolvimento. Detalhes da imagem do frontend em [frontend/README.md](frontend/README.md#execução-em-container).

`docker compose down` para os containers e mantém os dados; `docker compose down -v` também apaga o volume `pgdata` (banco zerado na próxima subida).

### Modelo de configuração (variáveis de ambiente)

Os valores de configuração vivem em um `.env` na raiz do repositório, que **não** é versionado ([`.gitignore`](.gitignore)). O que vai para o Git é o **modelo** em [`.env.example`](.env.example), com valores de **exemplo** para desenvolvimento: na raiz do repositório, `cp .env.example .env`.

São exemplos, não um preset universal: `DATABASE_URL` depende do banco, das credenciais e do host de cada ambiente — dentro de um container, `localhost` aponta para o próprio container, não para a máquina nem para o serviço do PostgreSQL. Revise os valores em cada instalação.

O `compose.yaml` lê o `.env` e repassa as variáveis aos containers ([#27](https://github.com/DEVassos/ecopulse-app/issues/27)). Dentro do compose, a `DATABASE_URL` do backend é montada a partir de `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` com o host `postgres`; a `DATABASE_URL` do `.env` só vale para rodar o backend fora do Docker. O compose repassa só as variáveis declaradas nele, e `POLLING_INTERVAL_MS` ainda não está entre elas. Sem `.env`, o PostgreSQL não inicializa porque `ADMIN_EMAIL` e `ADMIN_PASSWORD` são obrigatórios para o seed; o backend também exige `JWT_SECRET`, e o frontend é construído sem `VITE_API_URL` e entra em modo demonstração. Por isso, rode sempre `cp .env.example .env` antes da primeira subida.

| Variável | Exemplo em `.env.example` | Para que serve |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `ecopulse` / `ecopulse` / `ecopulse_db` | usuário, senha e banco criados no PostgreSQL do compose na primeira subida do volume |
| `POSTGRES_HOST_PORT` | `5433` | porta do host em que o banco do compose fica acessível; dentro do Docker é sempre `postgres:5432`. 5433 evita conflito com um PostgreSQL local; troque se ela estiver em uso |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@ecopulse.local` / `admin1234` | credenciais de desenvolvimento do administrador inicial; o seed as usa só na primeira criação do usuário. Defina valores próprios em cada instalação |
| `PORT` | `3000` | porta HTTP da API quando o backend roda fora do Docker; no compose ela é fixa em 3000 |
| `DATABASE_URL` | `postgresql://ecopulse:ecopulse@localhost:5433/ecopulse_db` | conexão do PostgreSQL usada pelo driver `pg` fora do Docker (no compose ela é montada com `POSTGRES_*`) |
| `CARBON_API_URL` | `https://carbon.unilaunch.org` | base da API de intensidade de carbono do parceiro |
| `JWT_SECRET` | `dev-secret-change-me` | chave obrigatória (mínimo 16 caracteres) que assina os tokens JWT do login administrativo |
| `JWT_EXPIRES_IN` | `8h` | validade positiva com unidade (`s`, `m`, `h` ou `d`) do token emitido no login |
| `INVITATION_TTL_HOURS` | `72` | validade, em horas (1 a 720), do link de convite de cadastro emitido por um administrador |
| `METRICS_API_URL` | `https://metrics.unilaunch.org` | base da API agregadora de métricas do parceiro |
| `POLLING_INTERVAL_MS` | `30000` | intervalo da descoberta de serviços e prazo inicial/de recuperação da coleta (30 s); o prazo normal vem de `collection_interval_seconds`. Vale para o backend fora do Docker; no compose fica o padrão |
| `CORS_ORIGIN` | `http://localhost:5173` | origem(ns) do dashboard liberadas pelo backend para chamar a API pelo navegador (CORS), separadas por vírgula; a primeira também monta o link dos convites |
| `VITE_API_URL` | `http://localhost:3000/api` | base da API consumida pelo dashboard; vazia, o frontend entra em modo demonstração |
| `VITE_REFRESH_INTERVAL_MS` | `30000` | intervalo da atualização automática do dashboard em ms (mínimo 5000); entra no build do frontend |

Os valores de `ADMIN_EMAIL` e `ADMIN_PASSWORD` acima são apenas credenciais locais de desenvolvimento, não credenciais de produção. Cada instalação define valores próprios no `.env`; a senha não é versionada nem armazenada em texto puro. Para autenticação local, use as credenciais `ADMIN_*` do `.env` (valores de exemplo em [`.env.example`](.env.example)).

Nenhum segredo real entra no repositório (RP06): cada instalação tem banco, usuários e segredo próprios, então troque esses valores no `.env` antes de publicar.

## 9. Como trabalhamos

- **Git Flow:** `main` recebe uma release por sprint (tag `sprint-N`); `develop` integra o trabalho; cada issue vira uma branch `tipo/<nº>-slug` e um Pull Request revisado por outra pessoa do time.
- **Backlog em três níveis:** épico (tema de requisitos) → história de usuário (com critérios de aceite) → tarefa técnica, ligados por sub-issues no [quadro](https://github.com/orgs/DEVassos/projects/6).
- Processo Scrum, papéis, cerimônias e Definition of Done: [docs/processo/README.md](docs/processo/README.md).
- Padrões de branch, commit e PR: [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).

## 10. Documentação

| Documento | Conteúdo |
|---|---|
| [docs/visao-do-produto.md](docs/visao-do-produto.md) | Posicionamento, personas, jornada, metas e fronteira do MVP |
| [docs/requisitos.md](docs/requisitos.md) | Requisitos funcionais, não funcionais e restrições do desafio |
| [docs/funcionalidades.md](docs/funcionalidades.md) | Funcionalidades entregues, por tela, com requisito, PR e prints |
| [docs/especificacao-api.md](docs/especificacao-api.md) | Contrato das APIs auxiliares do parceiro (Métricas e Intensidade de Carbono) |
| [docs/abp-2026-2.md](docs/abp-2026-2.md) | Raciocínio técnico: reconciliação dinâmica de serviços, estrutura de dados, perguntas ao parceiro |
| [docs/arquitetura/modelagem-uml.md](docs/arquitetura/modelagem-uml.md) | Modelagem UML (casos de uso, classes, sequências) |
| [docs/backlog/historias-de-usuario.md](docs/backlog/historias-de-usuario.md) | Histórias de usuário US01–US14 com critérios de aceite |
| [docs/plano-de-entregas.md](docs/plano-de-entregas.md) | Plano das sprints, critérios da rubrica, responsáveis e evidências |
| [docs/sprints/](docs/sprints/) | Registro de cada sprint ([Sprint 1](docs/sprints/sprint-1.md), [Sprint 2](docs/sprints/sprint-2.md), [Sprint 3](docs/sprints/sprint-3.md)): planejamento, dailies, review, retrospectiva, participação |
| [docs/produto/](docs/produto/) | Protótipo HTML do dashboard e [protótipo navegável no Figma](docs/produto/prototipo-figma.md) (dashboard, login e cadastro, desktop e celular) |
| [docs/adr/](docs/adr/) | Decisões de arquitetura (ADRs) |
| [docs/processo/](docs/processo/) | Como o time trabalha |
| [docs/contexto/](docs/contexto/) | Documentos do desafio (edital, documentação estendida, apresentação do kickoff, rubrica) |

Documentação técnica: [arquitetura](docs/arquitetura.md), [API](docs/api.md), [cálculos](docs/calculos.md) e os READMEs de [`frontend/`](frontend/README.md), [`backend/`](backend/README.md) e [`database/`](database/README.md). Cada uma é atualizada no mesmo PR do código que descreve.

---

<div align="center">
Desenvolvido com 💚 pela equipe <strong>DEVassos</strong> · FATEC Jacareí 2026 · Licença <a href="LICENSE">MIT</a>
</div>
