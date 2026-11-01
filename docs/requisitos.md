# Requisitos do desafio — EcoPulse

<!-- gerado pelo agilekit — edite em DEVassos/agilekit (repo/docs/requisitos.md). Fonte: "Desafio 2DSM - 2026-2" (versão 30/06/2026), transcrito em .agilekit/requisitos.json. -->

## Contexto do desafio

**Tema:** Plataforma para Estimativa do Impacto Ambiental de Aplicações de Software. **Produto:** EcoPulse (no edital do desafio: GreenER; repositório `DEVassos/greener-app`).

**Parceiro:** UniLaunch (contato: Otávio Abreu dos Santos Silva; ponto focal acadêmico: Prof. Rodrigo Silva Peres). O cliente disponibiliza duas APIs auxiliares que simulam um ambiente de serviços monitorados:

| API | Documentação | Uso no EcoPulse |
|---|---|---|
| Greener Metrics Aggregator API | https://metrics.unilaunch.org/docs | `GET /services` (descoberta dos serviços e localização) e `GET /metrics/{id_servico}` (métricas de uso por serviço; os valores mudam a cada chamada) |
| Greener Carbon Intensity API | https://carbon.unilaunch.org/docs | Intensidade de carbono (gCO₂e/kWh) por região, usada para converter energia estimada em emissão de CO₂e |

O EcoPulse descobre os serviços, coleta métricas periodicamente, estima o consumo energético e a emissão de CO₂e de cada serviço, armazena o histórico em PostgreSQL e apresenta os dados em um dashboard React que se atualiza sem recarregar a página. A configuração do monitoramento fica em uma área protegida por autenticação JWT no backend.

**Cronograma (datas a confirmar pelo cliente):** kickoff em 28/09/2026 às 20h; Sprint Reviews previstas para 19/10, 09/11 e 23/11/2026 às 19h30; apresentação final no fim do semestre, a definir. O calendário operacional do time (checkpoints, congelamentos, feriados) está em [`.github/calendario.json`](../.github/calendario.json) e resumido no [plano de entregas](plano-de-entregas.md).

**Como este arquivo é usado:** cada requisito é um título `### Código — Título`; o GitHub transforma cada título em âncora (ícone de corrente ao passar o mouse), e esse link é usado nas issues (junto com a label `RFxx`/`RNFxx`), no plano de entregas e nos ADRs. A linha "Critérios da rubrica" liga o requisito aos códigos avaliados (ES/DW/BD/TP) — primeira ponta da cadeia de rastreabilidade (ES04). A linha "Sprint prevista" reflete o plano atual e pode mudar pelo "Histórico de alterações do plano".

## Requisitos funcionais (RF)

### RF01 — Descoberta de serviços
- **Edital:** O sistema deve consultar o Agregador de Métricas para identificar os serviços disponíveis.
- **Critérios da rubrica:** DW02 (integração), DW03 (API REST `GET /services`).
- **Sprint prevista:** 1.

### RF02 — Monitoramento dinâmico
- **Edital:** O sistema deve reconhecer a inclusão, remoção, indisponibilidade e retorno de serviços durante sua execução, atualizando as informações apresentadas ao usuário.
- **Critérios da rubrica:** DW02, TP03 (tratamento de falhas), DW05 (atualização do dashboard).
- **Sprint prevista:** 2 (could na Sprint 1).

### RF03 — Coleta de métricas por serviço
- **Edital:** O sistema deve consultar periodicamente o endpoint `/metrics/{id_servico}` para cada serviço disponível.
- **Critérios da rubrica:** DW02, BD02 (inserção parametrizada), BD03 (persistência).
- **Sprint prevista:** 1.

### RF04 — Tratamento da variação das métricas
- **Edital:** O sistema deve considerar que os valores retornados pela API podem mudar a cada requisição.
- **Critérios da rubrica:** BD01 (modelo com histórico por coleta), BD02, BD04 (consultas por período).
- **Sprint prevista:** 1 (modelo e gravação); 3 (consultas de análise).

### RF05 — Detecção de indisponibilidade
- **Edital:** O sistema deve identificar e sinalizar quando um serviço monitorado não responder à consulta ou estiver indisponível.
- **Critérios da rubrica:** TP03, DW05.
- **Sprint prevista:** 2 (could na Sprint 1).

### RF06 — Detecção de ausência de métricas
- **Edital:** O sistema deve identificar quando um serviço estiver ativo, mas deixar de exportar métricas (listado em `/services`, mas sem métricas).
- **Critérios da rubrica:** TP03, DW05.
- **Sprint prevista:** 2 (could na Sprint 1).

### RF07 — Cálculo individual
- **Edital:** O sistema deve calcular consumo energético e emissão de CO₂e para cada serviço monitorado.
- **Critérios da rubrica:** TP01 (classes de domínio do cálculo), DW02 (intensidade de carbono), BD04.
- **Sprint prevista:** 2. Fórmulas e fatores documentados em `docs/calculos.md`.

### RF08 — Indicadores agregados
- **Edital:** O sistema deve calcular indicadores consolidados, como consumo total, emissão total, serviços ativos e serviços indisponíveis.
- **Critérios da rubrica:** BD04 (agregações), DW05.
- **Sprint prevista:** 2.

### RF09 — Dashboard operacional
- **Edital:** O sistema deve apresentar, para cada serviço, seu estado de monitoramento, localização, métricas disponíveis, consumo energético estimado e emissão estimada de CO₂e.
- **Critérios da rubrica:** DW04 (estrutura do frontend), DW05 (dashboard).
- **Sprint prevista:** 1 (parcial: estado de monitoramento e localização, atualizando sem recarregar); 2 (métricas, energia e CO₂e).

### RF10 — Histórico de coletas
- **Edital:** O sistema deve armazenar o histórico das coletas realizadas para permitir análise temporal.
- **Critérios da rubrica:** BD01, BD02, BD03.
- **Sprint prevista:** 1.

### RF11 — Atualização contínua
- **Edital:** O dashboard deve atualizar periodicamente suas informações, sem exigir que o usuário recarregue a página.
- **Critérios da rubrica:** DW05.
- **Sprint prevista:** 2 (o mecanismo de polling já nasce na tela da Sprint 1).

### RF12 — Localização dos serviços
- **Edital:** O sistema deve exibir país, região e, quando disponível, cidade onde o serviço está hospedado.
- **Critérios da rubrica:** DW04, DW05.
- **Sprint prevista:** 1.

### RF13 — Visualização geográfica
- **Edital:** O sistema PODERÁ apresentar em um mapa a posição aproximada dos serviços para os quais a API fornecer latitude e longitude. A ausência dessas coordenadas não deve impedir a visualização das demais informações.
- **Critérios da rubrica:** DW04.
- **Prioridade sugerida:** could (opcional no edital).
- **Sprint prevista:** 2 (could, puxado só se as histórias must fecharem até 06/11; se não sair, 3).

### RF14 — Ranking de impacto
- **Edital:** O sistema deve permitir ordenar os serviços por consumo energético estimado ou por emissão estimada de CO₂e, indicando o período considerado na comparação.
- **Critérios da rubrica:** BD04 (ordenação e agregação por período), DW03 (endpoint com parâmetros de query).
- **Sprint prevista:** 2 (antecipado por #159; BD04 avaliado na Sprint 3).

### RF15 — Comparação entre serviços
- **Edital:** O sistema deve permitir comparar dois ou mais serviços por métricas e indicadores ambientais referentes ao mesmo período.
- **Critérios da rubrica:** BD04, DW03.
- **Sprint prevista:** 2 (antecipado por #159; BD04 avaliado na Sprint 3).

## Requisitos não funcionais (RNF)

### RNF01 — Usabilidade e responsividade
- **Edital:** A interface deve ser simples, clara e responsiva, adequada ao uso em navegadores e dispositivos móveis.
- **Critérios da rubrica:** DW04.
- **Sprint prevista:** 3 (revisão final; a tela da Sprint 1 já nasce com layout fluido).

### RNF02 — Atualização em tempo real
- **Edital:** A coleta e a atualização da interface devem ocorrer em intervalos definidos pela aplicação. O projeto deve informar esses intervalos e a data e hora da última atualização exibida ao usuário.
- **Critérios da rubrica:** DW05.
- **Sprint prevista:** 2. Intervalos documentados em `docs/arquitetura.md` e no README.

### RNF03 — Desempenho
- **Edital:** O tempo de resposta da interface deve ser adequado para acompanhamento contínuo do ambiente monitorado.
- **Critérios da rubrica:** DW05, BD04 (consultas com índices e filtros por período).
- **Sprint prevista:** 3.

### RNF04 — Tolerância a falhas
- **Edital:** A indisponibilidade de um serviço monitorado ou de uma das APIs auxiliares não deve interromper o funcionamento da aplicação, devendo ser apresentada ao usuário de forma adequada.
- **Critérios da rubrica:** DW02 (tratamento de falhas na integração), TP03 (exceções).
- **Sprint prevista:** 2 (o backend da Sprint 1 já não derruba o processo em falha de API).

### RNF05 — Documentação técnica
- **Edital:** Instruções de execução, descrição da arquitetura, modelo de dados, documentação dos endpoints desenvolvidos e orientações para configurar o acesso às APIs auxiliares.
- **Critérios da rubrica:** ES08, DW07.
- **Sprint prevista:** todas (README, `database/README.md` e `docs/api.md` desde a Sprint 1; `docs/arquitetura.md` e `docs/calculos.md` na Sprint 2).

## Requisitos do projeto (RP) — restrições técnicas e de processo

### RP01 — Frontend
- **Edital:** Obrigatoriamente React com TypeScript.
- **Critérios da rubrica:** DW01, DW04.
- **Decisão do time:** Vite + React + TypeScript (`strict: true`), organizado em `pages`, `components`, `services`, `hooks`, `contexts` e `providers`.

### RP02 — Backend
- **Edital:** Obrigatoriamente Node.js com TypeScript, expondo endpoints HTTP para o frontend e organizando as funcionalidades em módulos, controllers e services.
- **Critérios da rubrica:** DW01, DW03.
- **Decisão do time:** módulos em `backend/src/modules/<recurso>/` com `*.routes.ts`, `*.controller.ts`, `*.service.ts` e `*.repository.ts`; integrações em `backend/src/integrations/`.

### RP03 — Banco de dados
- **Edital:** Obrigatoriamente PostgreSQL, com uso explícito de DDL e DML. Não será permitido o uso de ORM.
- **Critérios da rubrica:** BD01, BD02.
- **Decisão do time:** driver `pg` com SQL parametrizado nos repositories e `database/schema.sql` como fonte única do esquema — [ADR 0002](adr/0002-postgresql-pg-sem-orm.md). O check `pr` recusa dependências de ORM.

### RP04 — Execução containerizada
- **Edital:** A aplicação completa deve ser executada exclusivamente por meio de containers Docker.
- **Critérios da rubrica:** DW07, BD03.
- **Decisão do time:** `compose.yaml` único com frontend, backend e PostgreSQL (volume nomeado) e `.env.example` — [ADR 0003](adr/0003-docker-compose-unico-caminho.md).

### RP05 — MVP
- **Edital:** Escopo compatível com o semestre, priorizando um MVP funcional com navegação completa, respostas estruturadas e exibição de evidências documentais.
- **Critérios da rubrica:** ES01, ES08.
- **Decisão do time:** prioridades must/should/could no backlog; RF13 (mapa) como could; cada sprint entrega algo demonstrável de ponta a ponta.

### RP06 — Autenticação
- **Edital:** A autenticação da área de configuração deve ser implementada no backend utilizando JWT. Não será aceito controle de acesso realizado apenas no frontend.
- **Critérios da rubrica:** DW06.
- **Sprint prevista:** 2 (recurso `/monitoring-settings` protegido por middleware JWT; senhas com hash).

### RP07 — Gestão ágil do projeto
- **Edital:** Backlog priorizado com histórias/itens e critérios de aceitação. Em cada sprint review, demonstrar as funcionalidades concluídas, registrar o retorno recebido e atualizar o planejamento das entregas seguintes.
- **Critérios da rubrica:** ES01, ES02, ES03, ES06 (e, por extensão, ES04, ES05).
- **Decisão do time:** processo em [docs/processo/README.md](processo/README.md); registros em `docs/sprints/`; alterações de planejamento no "Histórico de alterações do plano".

## Matriz requisito → critérios da rubrica

| Requisito | Critérios | Sprint prevista |
|---|---|---|
| RF01 | DW02, DW03 | 1 |
| RF02 | DW02, TP03, DW05 | 2 (could em 1) |
| RF03 | DW02, BD02, BD03 | 1 |
| RF04 | BD01, BD02, BD04 | 1 e 3 |
| RF05 | TP03, DW05 | 2 (could em 1) |
| RF06 | TP03, DW05 | 2 (could em 1) |
| RF07 | TP01, DW02, BD04 | 2 |
| RF08 | BD04, DW05 | 2 |
| RF09 | DW04, DW05 | 1 (parcial) e 2 |
| RF10 | BD01, BD02, BD03 | 1 |
| RF11 | DW05 | 2 |
| RF12 | DW04, DW05 | 1 |
| RF13 (could) | DW04 | 2 (could; se não sair, 3) |
| RF14 | BD04, DW03 | 2 (BD04 avaliado na 3) |
| RF15 | BD04, DW03 | 2 (BD04 avaliado na 3) |
| RNF01 | DW04 | 3 |
| RNF02 | DW05 | 2 |
| RNF03 | DW05, BD04 | 3 |
| RNF04 | DW02, TP03 | 2 |
| RNF05 | ES08, DW07 | todas |
| RP01 | DW01, DW04 | todas |
| RP02 | DW01, DW03 | todas |
| RP03 | BD01, BD02 | 1 |
| RP04 | DW07, BD03 | 1 |
| RP05 | ES01, ES08 | todas |
| RP06 | DW06 | 2 |
| RP07 | ES01, ES02, ES03, ES06 | todas |

Todos os requisitos obrigatórios devem constar no planejamento das três entregas e estar concluídos até a Sprint 3 (regra da rubrica). A alocação por sprint é detalhada em [docs/plano-de-entregas.md](plano-de-entregas.md).
