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

**EcoPulse** é o nome do produto. No edital do desafio ele aparece como **GreenER**; o repositório continua `DEVassos/greener-app`.

---

## 1. Problema

Empresas operam dezenas ou centenas de aplicações distribuídas em várias regiões. Métricas de CPU, memória, armazenamento e rede são usadas para desempenho e disponibilidade, mas quase nunca para entender o **impacto ambiental** dessas aplicações. Gestores têm pouca visibilidade sobre o consumo energético dos sistemas e as emissões de carbono associadas.

## 2. Solução

O **EcoPulse** é uma plataforma web de observabilidade socioambiental (**GreenOps**) que monitora continuamente aplicações e microsserviços a partir de duas APIs do parceiro — o [Agregador de Métricas](https://metrics.unilaunch.org/docs) e o [Serviço de Intensidade de Carbono](https://carbon.unilaunch.org/docs). Ela traduz métricas de infraestrutura (**CPU, memória, disco e rede**) em **consumo energético (kWh)** e **pegada de carbono estimada (gCO₂e)**, ponderada pela intensidade de carbono da matriz elétrica da região onde cada serviço está hospedado. O ambiente monitorado é dinâmico: serviços surgem, ficam indisponíveis, deixam de exportar métricas e voltam, e a plataforma se adapta sem intervenção manual.

> 💡 **Princípio central:** software não consome energia diretamente, mas o hardware que o executa sim. O EcoPulse é uma ponte analítica entre a infraestrutura de TI e as metas corporativas de sustentabilidade e ESG.

Requisitos completos (RF01–RF15, RNF01–RNF05, RP01–RP07): [docs/requisitos.md](docs/requisitos.md).

Setup do backend: [organização e validação](backend/README.md) e [contrato da API](docs/api.md). Frontend, backend e PostgreSQL sobem juntos pelo `compose.yaml` (#26, #27).

## 3. Funcionalidades implementadas

O desenvolvimento acontece na branch `develop`; cada funcionalidade entra nesta lista quando o Pull Request correspondente é mergeado, com o requisito e o número do PR. A Sprint 1 foi encerrada em 20/10/2026 e está publicada na tag [`sprint-1`](https://github.com/DEVassos/greener-app/releases/tag/sprint-1); o registro completo, com a review e o retorno do cliente, está em [docs/sprints/sprint-1.md](docs/sprints/sprint-1.md).

**Vídeo da Sprint 1 (cerca de 3 min):** [EcoPulse - ABP FATEC 2DSM](https://youtu.be/3Hx4kzuudSw), com o produto como foi entregue na Sprint 1.

- **RF09, RF12 — Tabela operacional de serviços (#69):** dashboard com cada serviço monitorado, CPU, energia, emissão, última leitura, localização (região, cidade e país) e status (ativo, indisponível, sem métricas ou removido, quando o serviço sai da lista do agregador), com busca por nome e ordenação por coluna. A tela consome `GET /api/services` (#115) pela base definida em `VITE_API_URL`; sem ela (variável vazia), o frontend sobe em modo demonstração com dados ilustrativos (`npm run mock`) — como executar em [frontend/README.md](frontend/README.md).

  ![Tabela de serviços monitorados com o backend real](docs/img/sprint-2-dashboard-backend-real.png)

  _Tabela ligada ao backend real (`docker compose`) em 27/10/2026, numa janela de 1366×657: ordem inicial por gravidade, status logo depois do nome, energia e emissão com casas fixas (kWh com 5, g com 3) e as 8 linhas visíveis sem rolar (#203)._

- **RF08, RF09 — Cards de estado dos serviços (#21, PR #202):** acima da tabela, cards com o total de serviços monitorados e quantos estão ativos, indisponíveis e sem métricas, contados na mesma resposta de `GET /api/services` e atualizados no mesmo ciclo. Os removidos ficam fora do total, e a cor só aparece quando há serviços naquele estado. Sem dados, os cards não aparecem; numa falha, mantêm o último dado, apagado, com "Desatualizado desde …".

  ![Cards de estado acima da tabela de serviços](docs/img/sprint-2-kpis.png)

  _Dashboard com o backend real (`docker compose`) em 22/10/2026: os 8 serviços ativos, e Indisponíveis e Sem métricas zerados, sem cor._

- **RF08 — Indicadores agregados e comparação por período (#175, PR #215):** abaixo dos cards de estado, o dashboard mostra a energia (kWh) e o CO₂e (g) das últimas 24 h, com o período em horário de Brasília, e a variação contra as 24 h anteriores. Sem cálculo no período, o valor é "—", nunca zero; com total anterior zero, a tela informa que não há base para a variação. A API usa `GET /api/services/summary?from=&to=`, documentada em [docs/api.md](docs/api.md).

  ![Indicadores agregados com comparação às 24 h anteriores](docs/img/sprint-2-indicadores-agregados.png)

  _Dashboard com o backend real (`docker compose`) em 28/10/2026, 19h32: 0,2620 kWh e 64,61 g CO₂e nas últimas 24 h. O compose ficou desligado nas 24 h anteriores, então os cards dizem "Sem cálculo no período anterior" em vez de uma variação._

- **RNF02 — Indicador de última atualização (#89):** selo no cabeçalho com o horário da última busca bem-sucedida e um ponto verde pulsando enquanto os dados estão em dia; se uma busca falha, ele fica laranja e passa a dizer "Desatualizado desde …", sem apagar os dados da tela.

  ![Selo de última atualização no cabeçalho](docs/img/sprint-2-ultima-atualizacao.png)

- **RNF04 — Resposta da API conferida antes de aparecer na tela (#161):** o frontend confere o formato de `GET /api/services` e `GET /api/collections` contra o contrato de [docs/api.md](docs/api.md) a cada busca. Um item sem `id` ou com CPU em texto faz a busca ser tratada como falha: os dados anteriores continuam com "Desatualizado desde …" e **Tentar novamente**, e o item inválido não aparece. Atende ao apontamento do cliente na review da Sprint 1. Como verificar em [frontend/README.md](frontend/README.md#conferência-das-respostas-da-api-161).

  ![Dashboard depois de uma resposta com a CPU em texto](docs/img/sprint-2-resposta-fora-do-contrato.png)

  _Backend falso com `MOCK_SERVICES=cpu-texto` em 30/10/2026, 11h50: a faixa laranja aponta o campo recusado e a tabela mantém os dados de 11:50:47. O aviso "Rota não existe no backend falso." é do painel de indicadores: nessa data, o backend falso ainda não respondia `GET /services/summary` (#239)._

  _Selo em 21/10/2026, com o backend real (`docker compose`)._

- **RF11, RNF02 — Atualização automática sem recarregar (#100, #114):** o dashboard busca os dados de novo a cada intervalo (`VITE_REFRESH_INTERVAL_MS`, padrão 30 s), pausa com a aba oculta e tem o botão **Atualizar agora**; se uma atualização falha, os dados anteriores continuam na tela e aparece o erro com **Tentar novamente**.

  ![Dashboard depois de uma atualização com falha](docs/img/sprint-2-atualizacao-automatica.png)

  _Backend parado em 27/10/2026 (mesmo efeito de `docker compose stop backend`): depois de um intervalo, a faixa laranja compacta diz "Mostrando dados de 13:46:28" e oferece **Tentar novamente**, as 8 linhas da tabela continuam visíveis e o selo fica laranja ("Desatualizado desde …") (#203). Sem nenhum dado na tela, aparece o aviso de erro grande._

- **RF01, RF02, RF03, RF04 — Descoberta e coleta periódica (#95, #98, #99):** o backend descobre os serviços no agregador de métricas, consulta `/metrics/{id}` e grava o histórico no PostgreSQL; o _worker_ roda em segundo plano e reconcilia serviços que aparecem, ficam indisponíveis ou voltam a exportar métricas.

- **RF10 — API dos serviços e histórico de coletas (#115, #116, #119):** `GET /api/services` devolve os serviços monitorados com a última leitura, e `GET /api/collections?service_id=&from=&to=&limit=` devolve o histórico de coletas (com `limit` de 1 a 500), com CORS liberado para o dashboard. `GET /api/collections/series?service_id=&from=&to=&bucket=` (#207) agrupa as coletas de um serviço em intervalos de 15 min, 1 h ou 1 dia, com contagem, energia e CO₂e por intervalo e o total do período. Contrato completo em [docs/api.md](docs/api.md).

- **RF09, RF10 — Detalhes e histórico do serviço (#135):** clicar num serviço da tabela abre uma janela com status, localização, última leitura, CPU e as 50 coletas mais recentes do serviço (`GET /api/collections`), com o período exibido na legenda. Acima da tabela, um gráfico de linha mostra a evolução da CPU nessas coletas, interrompido nas coletas com erro ou sem métricas (#132, PR #201). O histórico se atualiza no mesmo intervalo do dashboard; se uma busca falha, as coletas continuam na tela com "Desatualizado desde …". Como verificar em [frontend/README.md](frontend/README.md).

  ![Janela de detalhes de um serviço com o gráfico da CPU e o histórico de coletas](docs/img/sprint-2-detalhe-servico.png)

  _Janela do Checkout Worker em 22/10/2026, com o backend real (`docker compose`) e o cursor sobre uma coleta do gráfico._

- **RF07, RF09, RF10 — Página Emissões (#190, PRs #200 e #216):** o item **Emissões** do menu abre `/emissoes`, com a emissão estimada de CO₂e e a energia de uma estação no período escolhido. A estação e as datas ficam na URL, então o link abre no mesmo filtro. O agrupamento é automático pelo tamanho do período: cada coleta até 2 h (`GET /api/collections`), 15 min até 1 dia e 1 hora acima disso (`GET /api/collections/series`). O resumo mostra emissão, energia, média por coleta, pico, intensidade da região e coletas com falha, sem cálculo e tempo sem coleta. **Tempo real** busca de novo no intervalo do dashboard. Sem cálculo aparece "—", nunca zero, e numa falha o resumo fica apagado, com "Desatualizado desde …". O gráfico em SVG mostra a faixa da menor e da maior coleta, a média, o maior ponto e as falhas, e dá para alternar para o modo acumulado. A janela de detalhes do serviço leva direto à página. Como verificar em [frontend/README.md](frontend/README.md#página-emissões-190); print em [docs/img/sprint-2-emissoes.png](docs/img/sprint-2-emissoes.png).

- **RF15 — Comparação entre serviços (#193, PR #214; #194, PR #219; #218):** o item **Comparação** do menu abre `/comparacao`, com 2 a 10 serviços lado a lado no mesmo período (até 31 dias): coletas, médias de CPU, memória, disco e rede, e energia e CO₂e somados, por `GET /api/services/compare`. O menor e o maior CO₂e ficam destacados, o período aparece acima da tabela, e serviço sem coletas aparece como "sem coletas", nunca zero. Abaixo da tabela, barras de energia e de CO₂e por serviço, cada grandeza na sua escala, com os mesmos valores e destaques. Serviços e datas ficam na URL. Como verificar em [frontend/README.md](frontend/README.md#comparação-entre-serviços-194).

  ![Comparação de quatro serviços com o backend real](docs/img/sprint-2-comparacao.png)

  _Quatro serviços comparados com o backend real (`docker compose`) no dia 22/10/2026: Recommendation AI gastou mais energia (0,7758 kWh), mas Fraud Detector emitiu mais CO₂e (268,97 g), porque a região dele tem intensidade de carbono maior; Inventory Sync teve o menor CO₂e (15,06 g)._

- **RNF05, DW07 — Execução com Docker (#91, #113, #81):** backend, frontend (nginx) e PostgreSQL sobem juntos por `docker compose up --build`, com volume persistente para o banco e todas as variáveis documentadas em [.env.example](.env.example) (#82). Passo a passo no [README](#8-como-executar).

- **RF07 — Cálculo socioambiental por coleta (#133, PR #139):** métricas válidas são convertidas em potência, energia e emissão de CO₂e com o fator regional da API de carbono. Se o fator não estiver disponível, a métrica continua registrada e o cálculo fica indisponível, sem criar valor estimado. As colunas "Energia (kWh)" e "Emissão (g CO₂e)" da tabela mostram o resultado da última coleta, com cerca de 30 s de operação, em resolução fixa (kWh com 5 casas, g com 3): uma emissão de 0,04 g aparece como 0,040, e não como 0,0 (#203) ([detalhes](frontend/README.md#energia-e-emissão-na-tabela)).

- **RNF01 — Fundo azul, verde nos destaques e logo pulsante (#180, PR #184):** a base da paleta voltou ao azul-escuro e o verde ficou só em ações e destaques (botão vazado nas ações secundárias, item ativo do menu, neon no que pede atenção), em resposta ao feedback da Sprint Review 1. O logo pulsa uma vez a cada atualização bem-sucedida dos dados, como sinal de "ao vivo", e fica parado em falha ou com "reduzir movimento". Regras e contrastes em [docs/identidade-visual.md](docs/identidade-visual.md).

  ![Dashboard com fundo azul-escuro](docs/img/sprint-2-fundo-azul.png)

- **DW06 / RP06 — Login administrativo JWT (#20, PR #208):** `POST /api/auth/login` confere a senha com bcrypt e emite JWT HS256; `GET /api/auth/me` valida o token no middleware reutilizável do backend. A área de configuração protegida continua pendente.

## 4. Escopo planejado

> Planejado, **ainda não implementado**. O andamento real está no [quadro do projeto](https://github.com/orgs/DEVassos/projects/6) e no [plano de entregas](docs/plano-de-entregas.md).

- **Dashboard em três níveis:** visão executiva (kWh total, gCO₂e, serviços ativos e indisponíveis, com atualização sem recarregar), análise comparativa (ranking e distribuição geográfica) e investigação detalhada (histórico por serviço).
- **Área de configuração autenticada:** usa o login JWT já disponível no backend; tela e rotas de configuração seguem pendentes.
- **Prioridade apontada pelo cliente na review da Sprint 1:** comparar serviços e analisar os dados já coletados, para ver o que compensa fazer ([#159](https://github.com/DEVassos/greener-app/issues/159)).
- **Diferenciais em estudo:** simulação de migração para regiões com matriz mais limpa ([US12, #53](https://github.com/DEVassos/greener-app/issues/53)) e exportação de relatórios em PDF/CSV ([US13, #54](https://github.com/DEVassos/greener-app/issues/54)), previstas para a Sprint 3.

## 5. Tecnologias

| Camada | Tecnologia (obrigatória pelo desafio, RP01–RP06) |
|---|---|
| Frontend | React + TypeScript (Vite, Tailwind CSS) |
| Backend | Node.js + TypeScript, API REST em módulos (routes, controllers, services, repositories) |
| Banco de dados | PostgreSQL com DDL e DML explícitos via driver `pg`, sem ORM |
| Segurança | Login JWT no backend e bcrypt para senhas ([#20](https://github.com/DEVassos/greener-app/issues/20), PR #208); área de configuração protegida continua pendente |
| Execução | Docker Compose (frontend, backend e PostgreSQL com volume persistente) |

## 6. Equipe (DEVassos)

| | Integrante | Papel | GitHub |
| :---: | :--- | :--- | :---: |
| <img src="https://github.com/henriqueptbd-cell.png" width="60" alt="Henrique Camargo" /> | **Henrique Camargo** | Product Owner | [@henriqueptbd-cell](https://github.com/henriqueptbd-cell) |
| <img src="https://github.com/travensolli.png" width="60" alt="Gabriel Travensolli" /> | **Gabriel Travensolli** | Scrum Master | [@travensolli](https://github.com/travensolli) |
| <img src="https://github.com/DeaTuribio.png" width="60" alt="Andrea Turibio" /> | **Andrea Turibio** | Desenvolvedora (frontend) | [@DeaTuribio](https://github.com/DeaTuribio) |
| <img src="https://github.com/LUCASAMR23.png" width="60" alt="Lucas Amorim" /> | **Lucas Amorim** | Desenvolvedor (backend) | [@LUCASAMR23](https://github.com/LUCASAMR23) |
| <img src="https://github.com/viniciusaugusto1997.png" width="60" alt="Vinicius Augusto" /> | **Vinicius Augusto** | Desenvolvedor (backend e banco de dados) | [@viniciusaugusto1997](https://github.com/viniciusaugusto1997) |

## 7. Sprints

| Sprint | Período | Review | Objetivo | Situação |
|---|---|---|---|---|
| 1 | 29/09 → 19/10/2026 | 19/10 às 19h30 (realizada) | Pipeline de coleta persistido em Docker e primeira tela do dashboard (serviços com estado e localização, atualizando sem recarregar) | Concluída: tag [`sprint-1`](https://github.com/DEVassos/greener-app/releases/tag/sprint-1) |
| 2 | 20/10 → 09/11/2026 | 09/11 às 19h30 (a confirmar) | Dashboard completo com energia, CO₂e, tolerância a falhas e área de configuração protegida por JWT | Começa em 20/10 |
| 3 | 10/11 → 23/11/2026 | 23/11 às 19h30 (a confirmar) | Ranking de impacto, comparação entre serviços, mapa e repositório pronto como portfólio | Planejada |

Critérios previstos, responsáveis e evidências de cada sprint: [docs/plano-de-entregas.md](docs/plano-de-entregas.md).

## 8. Como executar

Pré-requisitos: [Docker](https://www.docker.com/get-started) com Docker Compose e [Git](https://git-scm.com/).

```bash
git clone https://github.com/DEVassos/greener-app.git
cd greener-app
cp .env.example .env
docker compose up --build
```

| Serviço | URL | Situação |
|---|---|---|
| Frontend (dashboard) | http://localhost:5173 | no `compose.yaml` |
| Backend (API e `/health`) | http://localhost:3000/health | no `compose.yaml`; sobe depois que o PostgreSQL fica saudável |
| PostgreSQL 16 | `localhost:5433` (`POSTGRES_HOST_PORT`) | no `compose.yaml`, volume `pgdata`; acesso com `docker compose exec postgres psql -U ecopulse -d ecopulse_db` |

Na primeira subida o PostgreSQL aplica [`database/schema.sql`](database/schema.sql) sozinho; detalhes em [database/README.md](database/README.md). Com `VITE_API_URL` apontando para `http://localhost:3000/api` (como no `.env.example`), o dashboard mostra os serviços que o backend coletou: a lista começa vazia e é preenchida pelo coletor que o backend inicia junto com a API (descoberta no agregador a cada 30 s; no compose vale esse padrão, porque `POLLING_INTERVAL_MS` ainda não é repassado ao container); sem acesso ao agregador, a lista para de mudar e mostra o que já está no banco; o aviso "Desatualizado desde …" aparece quando o próprio backend não responde. Deixando `VITE_API_URL` vazia, o frontend sobe em modo demonstração com dados ilustrativos e faixa de aviso; `npm run mock` sobe um backend falso para desenvolvimento. Detalhes da imagem do frontend em [frontend/README.md](frontend/README.md#execução-em-container).

`docker compose down` para os containers e mantém os dados; `docker compose down -v` também apaga o volume `pgdata` (banco zerado na próxima subida).

### Modelo de configuração (variáveis de ambiente)

Os valores de configuração vivem em um `.env` na raiz do repositório, que **não** é versionado ([`.gitignore`](.gitignore)). O que vai para o Git é o **modelo** em [`.env.example`](.env.example), com valores de **exemplo** para desenvolvimento: na raiz do repositório, `cp .env.example .env`.

São exemplos, não um preset universal: `DATABASE_URL` depende do banco, das credenciais e do host de cada ambiente — dentro de um container, `localhost` aponta para o próprio container, não para a máquina nem para o serviço do PostgreSQL. Revise os valores em cada instalação.

O `compose.yaml` lê o `.env` e repassa as variáveis aos containers ([#27](https://github.com/DEVassos/greener-app/issues/27)). Dentro do compose, a `DATABASE_URL` do backend é montada a partir de `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` com o host `postgres`; a `DATABASE_URL` do `.env` só vale para rodar o backend fora do Docker. O compose repassa só as variáveis declaradas nele, e `POLLING_INTERVAL_MS` ainda não está entre elas. Sem `.env`, o PostgreSQL não inicializa porque `ADMIN_EMAIL` e `ADMIN_PASSWORD` são obrigatórios para o seed; o backend também exige `JWT_SECRET`, e o frontend é construído sem `VITE_API_URL` e entra em modo demonstração. Por isso, rode sempre `cp .env.example .env` antes da primeira subida.

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
| `METRICS_API_URL` | `https://metrics.unilaunch.org` | base da API agregadora de métricas do parceiro |
| `POLLING_INTERVAL_MS` | `30000` | intervalo da descoberta de serviços e prazo inicial/de recuperação da coleta (30 s); o prazo normal vem de `collection_interval_seconds`. Vale para o backend fora do Docker; no compose fica o padrão |
| `CORS_ORIGIN` | `http://localhost:5173` | origem(ns) do dashboard liberadas pelo backend para chamar a API pelo navegador (CORS), separadas por vírgula |
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
| [docs/especificacao-api.md](docs/especificacao-api.md) | Contrato das APIs auxiliares do parceiro (Métricas e Intensidade de Carbono) |
| [docs/abp-2026-2.md](docs/abp-2026-2.md) | Raciocínio técnico: reconciliação dinâmica de serviços, estrutura de dados, perguntas ao parceiro |
| [docs/arquitetura/modelagem-uml.md](docs/arquitetura/modelagem-uml.md) | Modelagem UML (casos de uso, classes, sequências) |
| [docs/backlog/historias-de-usuario.md](docs/backlog/historias-de-usuario.md) | Histórias de usuário US01–US14 com critérios de aceite |
| [docs/plano-de-entregas.md](docs/plano-de-entregas.md) | Plano das sprints, critérios da rubrica, responsáveis e evidências |
| [docs/sprints/](docs/sprints/) | Registro de cada sprint: planejamento ([Sprint 1](docs/sprints/sprint-1/planning.md)), dailies, review, retrospectiva, participação |
| [docs/produto/](docs/produto/) | Protótipo HTML do dashboard e [protótipo navegável no Figma](docs/produto/prototipo-figma.md) (dashboard, login e cadastro, desktop e celular) |
| [docs/adr/](docs/adr/) | Decisões de arquitetura (ADRs) |
| [docs/processo/](docs/processo/) | Como o time trabalha |
| [docs/contexto/](docs/contexto/) | Documentos do desafio (edital, documentação estendida, apresentação do kickoff, rubrica) |

Documentação técnica: [arquitetura](docs/arquitetura.md), [API](docs/api.md), [cálculos](docs/calculos.md) e os READMEs de [`frontend/`](frontend/README.md), [`backend/`](backend/README.md) e [`database/`](database/README.md). Cada uma é atualizada no mesmo PR do código que descreve.

## 11. Status

**Sprint 1** (29/09 → 19/10/2026): **concluída** em 20/10/2026, tag [`sprint-1`](https://github.com/DEVassos/greener-app/releases/tag/sprint-1).

- **Entrega:** 56 Pull Requests mergeados em `develop` entre 06/10 e 18/10, levados a `main` pela `release/sprint-1`.
- **Review (19/10, videochamada):** o cliente aprovou a coleta, a persistência dos dados e a interface. Ele reforçou que o foco é comparar serviços e analisar os dados ([#159](https://github.com/DEVassos/greener-app/issues/159)).
- **Critérios** (pelo [plano de entregas](docs/plano-de-entregas.md)): concluídos ES01–ES06, ES08, ES09, DW01–DW04, DW07, BD01–BD03 e TP02. ES07 está **parcial**, porque #60, #82 e #110 entraram sem aprovação válida e houve aprovações de uma linha.

Situação por critério, verificações, feedback e participação estão em [docs/sprints/sprint-1.md](docs/sprints/sprint-1.md).

**Sprint 2** (20/10 → 09/11/2026): começa em 20/10.

---

<div align="center">
Desenvolvido com 💚 pela equipe <strong>DEVassos</strong> · FATEC Jacareí 2026 · Licença <a href="LICENSE">MIT</a>
</div>
