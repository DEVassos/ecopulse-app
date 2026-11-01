# Product Backlog Geral - EcoPulse

> Backlog de produto consolidado por User Stories, distribuído entre as sprints do semestre. Complementa `visao-do-produto.md` (visão e personas), `abp-2026-2.md` (raciocínio técnico) e `sprints/sprint-1.md` (planejamento detalhado da Sprint 1).

## Situação vigente (18/10/2026)

As seções por sprint abaixo guardam a **proposta inicial do PO** (04/10), anterior ao replanejamento de 05/10. A distribuição vigente está nas milestones do GitHub e no [plano de entregas](../plano-de-entregas.md); quando as duas fontes divergem, vale esta tabela. O retrato completo das issues está em [product-backlog.md](product-backlog.md).

| História | Issue | Milestone atual | Situação |
|---|---|---|---|
| US01 — Descoberta e ingestão dinâmica de serviços | [#42](https://github.com/DEVassos/greener-app/issues/42) | Sprint 1 | sub-issues entregues; aceite do PO pendente |
| US02 — Motor de cálculo ambiental | [#43](https://github.com/DEVassos/greener-app/issues/43) | Sprint 2 | cálculo por coleta adiantado na [#133](https://github.com/DEVassos/greener-app/issues/133) (PR #139); domínio (TP01) e indicadores na Sprint 2 |
| US03 — Modelagem e persistência em PostgreSQL | [#44](https://github.com/DEVassos/greener-app/issues/44) | Sprint 1 | sub-issues entregues; aceite do PO pendente |
| US04 — Dashboard executivo e operacional | [#45](https://github.com/DEVassos/greener-app/issues/45) | Sprint 2 | tabela de serviços, atualização sem recarregar e detalhes já entregues na Sprint 1 (#69, #100, #135); KPIs na Sprint 2 |
| US05 — Infraestrutura e dockerização total | [#46](https://github.com/DEVassos/greener-app/issues/46) | Sprint 1 | sub-issues entregues; aceite do PO pendente |
| US06 — Gestão e documentação da sprint | [#47](https://github.com/DEVassos/greener-app/issues/47) | Sprint 1 | fechada (PR #123) |
| US07 — Autenticação segura JWT | [#48](https://github.com/DEVassos/greener-app/issues/48) | Sprint 2 | não iniciada em `develop` |
| US08 — Histórico de coletas e consultas de análise | [#49](https://github.com/DEVassos/greener-app/issues/49) | Sprint 2 | histórico gravado e `GET /api/collections` entregues na Sprint 1 (#99, #116); consultas de análise na Sprint 2 |
| US09 — Ranking de impacto | [#50](https://github.com/DEVassos/greener-app/issues/50) | Sprint 2 | não iniciada |
| US10 — Visualização geográfica (mapa) | [#51](https://github.com/DEVassos/greener-app/issues/51) | Sprint 2 | não iniciada |
| US11 — Comparação entre serviços | [#52](https://github.com/DEVassos/greener-app/issues/52) | Sprint 3 | não iniciada |
| US12 — Simulação de migração regional | [#53](https://github.com/DEVassos/greener-app/issues/53) | Sprint 3 | não iniciada |
| US13 — Exportação de relatórios (PDF e CSV) | [#54](https://github.com/DEVassos/greener-app/issues/54) | Sprint 3 | não iniciada |
| US14 — Polimento e documentação de portfólio | [#55](https://github.com/DEVassos/greener-app/issues/55) | Sprint 3 | não iniciada |

**Legenda de rastreabilidade:** `RF` = Requisito Funcional · `RNF` = Requisito Não-Funcional · `RP` = Restrição de Projeto (edital) · `Rubrica` = critérios Fatec (ES / DW / BD / TP).

---

## Sprint 1 (proposta inicial) — Arquitetura Base, Ingestão, Autenticação & MVP Operacional

**Objetivo:** Entregar o fluxo funcional de ponta a ponta (Coleta → Processamento → Banco → Tela Básica) em ambiente dockerizado, cobrindo o esqueleto da aplicação, a **autenticação JWT da área restrita** e a gestão do projeto.

### [US01] Descoberta e Ingestão Dinâmica de Serviços

- **Como** serviço de backend do EcoPulse,
- **Quero** consultar periodicamente a API do Agregador de Métricas,
- **Para** descobrir serviços ativos e coletar suas métricas de CPU, RAM, Disco e Rede em tempo real.

**Critérios de Aceitação:**

- Consultar `GET /services` no Agregador de Métricas para atualizar a lista de aplicações conhecidas.
- Executar polling contínuo em `GET /metrics/{id_servico}` para cada serviço ativo.
- Tratar exceções sem derrubar a aplicação: mapear HTTP `500` como `unavailable` e HTTP `404` como `metrics_missing`.

- **Atende aos Requisitos:** RF01, RF02, RF03, RF04, RF05, RF06, RNF04.
- **Rubrica Fatec:** DW02, TP03.

### [US02] Motor de Cálculo Ambiental

- **Como** motor de processamento,
- **Quero** aplicar as fórmulas e fatores oficiais sobre as métricas e regiões coletadas,
- **Para** registrar a potência (W), consumo energético (kWh) e pegada de carbono (gCO₂e) de cada coleta.

**Critérios de Aceitação:**

- Calcular a potência estimada considerando as constantes oficiais (CPU = 100 W, RAM = 0,375 W/GB, Disco = 0,01 W/GB, Rede = 0,02 W/GB).
- Consultar o fator regional na Carbon Intensity API (`GET /regions/{code}/carbon-intensity`).
- Converter potência em energia (kWh) pelo tempo decorrido do intervalo de coleta e multiplicar pela intensidade de carbono para obter gCO₂e.

- **Atende aos Requisitos:** RF07, RF12.
- **Rubrica Fatec:** DW02, TP01, TP02.

### [US03] Modelagem e Persistência em PostgreSQL (Pure SQL)

- **Como** desenvolvedor,
- **Quero** estruturar e utilizar o banco PostgreSQL via queries SQL nativas,
- **Para** armazenar cadastros, coletas e históricos com segurança sem o uso de ORM.

**Critérios de Aceitação:**

- Arquivo `database/schema.sql` criando tabelas (`servicos`, `coletas`, `usuarios`) com chaves primárias e estrangeiras válidas.
- Queries DML nos Repositories do Node.js/TS escritas em SQL puro parametrizado (uso obrigatório de placeholders/parâmetros separados para evitar SQL Injection).
- Proibição total do uso de ORM (Prisma, TypeORM, Sequelize, etc.).

- **Atende aos Requisitos:** RF10, RP03.
- **Rubrica Fatec:** BD01, BD02, BD03.

### [US04] Dashboard Executivo e Operacional em Tempo Real

- **Como** gestor de TI,
- **Quero** visualizar uma interface web responsiva com os KPIs consolidados e a lista de serviços,
- **Para** acompanhar o estado do sistema e a pegada de carbono em tempo real.

**Critérios de Aceitação:**

- Construído em React + TypeScript.
- Exibir KPIs de nível 1: Energia Total (kWh), Emissões Totais (gCO₂e), Qtd. de Serviços Ativos e Qtd. de Indisponíveis.
- Tabela com status, localização, consumo e horário do último update.
- Atualização periódica via polling do frontend sem necessidade de recarregar a página.

- **Atende aos Requisitos:** RF08, RF09, RF11, RNF01, RNF02, RP01.
- **Rubrica Fatec:** DW01, DW04, DW05.

### [US05] Infraestrutura e Dockerização Total

- **Como** avaliador/equipe,
- **Quero** subir toda a aplicação (Frontend, Backend e PostgreSQL) com um único comando Docker,
- **Para** garantir reprodutibilidade do ambiente e suporte à persistência.

**Critérios de Aceitação:**

- Dockerfile para frontend e backend + `compose.yaml` na raiz.
- Volume do PostgreSQL mapeado para não perder os dados ao reiniciar os containers.

- **Atende aos Requisitos:** RP04, RNF05.
- **Rubrica Fatec:** DW07, BD03.

### [US06] Gestão e Documentação da Sprint (Product Owner)

- **Como** PO do projeto,
- **Quero** publicar as diretrizes, backlog, DoD e papéis da equipe no repositório,
- **Para** atender às exigências organizacionais e garantir o cumprimento do plano.

**Critérios de Aceitação:**

- Versionar `docs/plano-de-entregas.md` com a matriz de rastreabilidade.
- Criar Issues e Pull Requests rastreáveis vinculando membros da equipe.
- Garantir evidências de contribuição para 100% dos integrantes.

- **Atende aos Requisitos:** RP05, RP07.
- **Rubrica Fatec:** ES01, ES02, ES03, ES04, ES05, ES06, ES07, ES08, ES09.

### [US07] Autenticação Segura JWT (Backend & Frontend)

- **Como** administrador,
- **Quero** realizar login com usuário e senha para acessar a área administrativa e alterar parâmetros do sistema,
- **Para** proteger a área de configuração contra acessos não autorizados.

**Critérios de Aceitação:**

- Rota `POST /login` no Node.js validando credenciais no banco PostgreSQL.
- Emissão de token JWT e middleware de proteção de rotas ativado no backend.
- Armazenamento seguro do token no frontend e redirecionamento para login quando expirado.
- Provisionamento do `JWT_SECRET` via `.env` (com default funcional no `.env.example`) e criação do usuário admin inicial via seed SQL com senha hasheada (bcrypt).

- **Atende aos Requisitos:** RP06.
- **Rubrica Fatec:** DW06.

> **Nota:** na proposta inicial esta história era antecipada para a Sprint 1. No replanejamento de 05/10 ela voltou para a Sprint 2 (DW06), onde está a milestone da [#48](https://github.com/DEVassos/greener-app/issues/48); a autenticação ainda não está em `develop`.

---

## Sprint 2 (proposta inicial) — Análises Avançadas, Histórico e Visualização

**Objetivo:** Evoluir a plataforma adicionando consultas temporais complexas, ranking de impacto e visualização geográfica sobre o pipeline de coleta e o dashboard da Sprint 1. (Na proposta inicial a autenticação vinha da Sprint 1; no replanejamento de 05/10 ela ficou na Sprint 2.)

### [US08] Histórico de Coletas e Consultas SQL de Análise

- **Como** gestor,
- **Quero** selecionar janelas temporais de análise (últimas horas, dias ou semanas),
- **Para** visualizar a evolução do consumo energético e emissões ao longo do tempo.

**Critérios de Aceitação:**

- Implementar queries SQL analíticas usando agregações (SUM, AVG, GROUP BY) e filtros de data.
- Endpoint backend `GET /collections` permitindo busca com parâmetros de intervalo.
- Gráficos de linha/área no frontend exibindo as tendências.

- **Atende aos Requisitos:** RF10.
- **Rubrica Fatec:** BD04, DW03.

### [US09] Ranking de Impacto e Eficiência Energética

- **Como** analista de ESG,
- **Quero** ordenar a lista de serviços por maior emissão de CO₂e ou maior consumo por recurso,
- **Para** identificar imediatamente quais aplicações são os "vilões" ecológicos da empresa.

**Critérios de Aceitação:**

- Filtros de ordenação dinâmica por gCO₂e total, kWh e eficiência relativa.
- Indicação visual da régua de impacto (baixo/médio/alto).

- **Atende aos Requisitos:** RF14.
- **Rubrica Fatec:** DW04, DW05, BD04.

### [US10] Visualização Geográfica por Bolhas (Mapa)

- **Como** gestor,
- **Quero** visualizar no mapa a distribuição espacial dos serviços monitorados,
- **Para** entender em quais regiões do mundo concentram-se nossas emissões de carbono.

**Critérios de Aceitação:**

- Renderização de mapa interativo usando a latitude/longitude aproximada das APIs.
- Dimensionamento visual das bolhas proporcional ao volume de CO₂e emitido na região.
- Fallback gracioso: serviços sem coordenadas continuam visíveis na lista sem quebrar a interface.

- **Atende aos Requisitos:** RF12, RF13.
- **Rubrica Fatec:** DW04.

---

## Sprint 3 (proposta inicial) — Comparações, Simulação de Migração, Relatórios e Polimento

**Objetivo:** Entregar os diferenciais de negócio, simulação de migração de região, exportação de relatórios (PDF/CSV) e refinamento para a apresentação final.

### [US11] Módulo de Comparação entre Serviços

- **Como** engenheiro de software,
- **Quero** selecionar duas ou mais aplicações e comparar suas métricas computacionais e impactos no mesmo período,
- **Para** identificar qual arquitetura ou versão é mais sustentável.

**Critérios de Aceitação:**

- Tela dedicada permitindo selecionar serviços do catálogo.
- Tabela e gráficos comparativos lado a lado de CPU vs. Energia vs. CO₂e.

- **Atende aos Requisitos:** RF15.
- **Rubrica Fatec:** DW04, BD04.

### [US12] Simulação e Comparação Regional (Migração Limpa)

- **Como** tomador de decisão,
- **Quero** simular a execução de um serviço em outra região geográfica cadastrada,
- **Para** estimar a redução em gCO₂e caso a aplicação seja migrada para uma região com matriz energética mais limpa.

**Critérios de Aceitação:**

- Seletor de região de destino com recálculo automático da pegada usando o fator da nova região.
- Exibição clara do percentual de carbono economizado na simulação.

- **Atende aos Requisitos:** RF15, Diferencial do Desafio.
- **Rubrica Fatec:** DW03, DW04.

### [US13] Exportação de Relatórios Gerenciais (PDF e CSV)

- **Como** auditor de ESG/TI,
- **Quero** exportar o resumo de métricas e indicadores do período selecionado em PDF e CSV,
- **Para** enviar relatórios formais à diretoria ou importar em ferramentas de BI (Power BI/Excel).

**Critérios de Aceitação:**

- Botão de exportação que gera arquivo `.csv` formatado com todos os registros filtrados.
- Botão de exportação que gera `.pdf` estilizado com cabeçalho corporativo, KPIs e resumo visual.

- **Atende aos Requisitos:** Diferencial do Desafio.
- **Rubrica Fatec:** DW04.

### [US14] Polimento, Validação de Carga e Documentação de Portfólio

- **Como** PO e equipe de desenvolvimento,
- **Quero** realizar a checagem final da aplicação, refinar a documentação e validar o ambiente sob simulação viva,
- **Para** garantir nota máxima em todos os critérios e apresentar uma solução impecável.

**Critérios de Aceitação:**

- Conferência final das diretrizes `docs/arquitetura.md`, `docs/calculos.md`, `docs/api.md` e `README.md` principal.
- Teste do comportamento dinâmico (com adição, remoção e queda repentina de serviços simulados).
- Projeto 100% pronto para publicação e inclusão no portfólio dos integrantes.

- **Atende aos Requisitos:** RP05, RNF03, RNF05.
- **Rubrica Fatec:** ES01 a ES09, DW01 a DW07, BD01 a BD04, TP01 a TP03.
