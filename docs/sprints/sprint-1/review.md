# Sprint Review — Sprint 1

| Campo | Valor |
|---|---|
| Data e horário | 19/10/2026 19h30, cerca de 7 min |
| Local | videochamada |
| Participantes do time | @henriqueptbd-cell (PO), @travensolli (SM, escriba), @DeaTuribio, @LUCASAMR23; @viniciusaugusto1997 em ausência programada (viagem combinada com o professor e a equipe; volta na Sprint 2) |
| Cliente / avaliadores | Otávio Abreu dos Santos Silva (UniLaunch, cliente) e Prof. Arley Souza (Fatec Jacareí, avaliação da entrega) |
| Versão demonstrada | `main` em [`1f5cf18`](https://github.com/DEVassos/greener-app/commit/1f5cf18), o merge da `release/sprint-1` (PR [#154](https://github.com/DEVassos/greener-app/pull/154), 19/10 às 12h04). A release foi cortada de `develop` depois dos PRs de documentação da Sprint 1, e nenhuma funcionalidade entrou após o congelamento de 18/10/2026 20h. Roteiro ensaiado em `develop` no commit [`16d520f`](https://github.com/DEVassos/greener-app/commit/16d520f1008c629e4a5f8b5a9f519da1881d3626) |
| Ambiente | `docker compose up --build` neste clone (containers `ecopulse-*`, PostgreSQL 16); ensaio em 18/10/2026 |
| Vídeo da demonstração | [EcoPulse - ABP FATEC 2DSM](https://youtu.be/3Hx4kzuudSw) (YouTube, canal DEVassos, cerca de 3 min): o produto como está na Sprint 1, preparado pelo PO (@henriqueptbd-cell) |

## 1. Objetivo da sprint e resultado

**Objetivo:** pipeline de coleta persistido em Docker e primeira tela apresentável do dashboard — o backend descobre os serviços no agregador, coleta métricas e grava o histórico no PostgreSQL; o frontend lista os serviços com estado e localização, atualizando sem recarregar a página; a aplicação inteira sobe com `docker compose up --build`.

**Resultado apurado no ensaio de 18/10/2026:** o fluxo de ponta a ponta funciona — 8 serviços descobertos e coletados, energia e CO₂e calculados para todos e dashboard atualizando a cada 30 s. Situação dos critérios previstos no fechamento de 20/10/2026, conforme o [plano de entregas](../../plano-de-entregas.md#sprint-1): ES01–ES06, ES08, ES09, DW01–DW04, DW07, BD01–BD03 e TP02 concluídos; ES07 parcial, pelas exceções à DoD-PR registradas em [`sprint-1.md` § 6](../sprint-1.md#6-verificações-realizadas). O retorno do cliente está nas seções 3 a 5.

## 2. Roteiro da demonstração (por requisito)

| Ordem | Requisito | O que será mostrado | Como (URL, comando, consulta) | Quem demonstra | Tempo |
|---|---|---|---|---|---|
| 1 | RF01 | Serviços descobertos no agregador | `GET http://localhost:3000/api/services` | @LUCASAMR23 | 3 min |
| 2 | RF10 | Histórico de coletas persistido | clique na linha do serviço em `http://localhost:5173`; `SELECT ... FROM collections` | @LUCASAMR23 | 3 min |
| 3 | RF09, RF12 | Tela de serviços com estado e localização atualizando sozinha | `http://localhost:5173` (cabeçalho "Última atualização" e intervalo) | @DeaTuribio | 4 min |
| 4 | RF07 | Energia (kWh) e Emissão (g CO₂e) estimadas por serviço | colunas `Energia (kWh)` e `Emissão (g CO₂e)` em `http://localhost:5173`; `GET /api/services` | @henriqueptbd-cell | 4 min |
| 5 | — | Backlog, plano de entregas e próximos passos | issues e `docs/plano-de-entregas.md` | @henriqueptbd-cell | 3 min |
| 6 | — | Processo: quadro, atas e DoD aplicada | GitHub Project e `docs/sprints/` | @travensolli | 3 min |

Regra: cada integrante presente demonstra ≥1 item (@viniciusaugusto1997 está em ausência programada).

### 2.1 Resultado observado no ensaio de 18/10/2026

1. **Subida.** `docker compose up --build` terminou com `backend`, `frontend` e `postgres` em `Up (healthy)`; `GET http://localhost:3000/health` respondeu `{"status":"ok","db":"ok"}`.
2. **Descoberta e coleta (RF01).** `GET /api/services` devolveu 8 serviços; o primeiro, `Audit Stream`, com `energyKwh: 0.000535939903`, `emissionsG: 0.24921205505`, `status: "ativo"` e `lastReadingAt: "2026-10-18T11:05:02.371Z"`.
3. **Dashboard (RF09, RF12).** `http://localhost:5173` exibiu os 8 serviços, todos `Ativo`, com "Última atualização: 18/10 08:05:27 · intervalo: 30 s"; a tabela mostra `Energia (kWh)` e `Emissão (g CO₂e)` preenchidas. Print em [`docs/img/sprint-1-dashboard-energia-co2e.png`](../../img/sprint-1-dashboard-energia-co2e.png) — dashboard de 18/10/2026 com os 8 serviços coletados, as colunas de energia e emissão preenchidas e o intervalo de atualização visível.
4. **Histórico (RF10).** `GET /api/collections?service_id=5&limit=3` devolveu a coleta de `2026-10-18T11:05:02.371Z` com `status: "ok"`, `cpuPercent: 53.61`, `memoryGb: 3.108928`, `diskGb: 33.18784` e `networkGb: 0.87604`; `SELECT count(*) FROM collections` = 9 depois de ~1 min.
5. **Falha da API de carbono.** Com `CARBON_API_URL=http://127.0.0.1:9 docker compose up -d --force-recreate backend`, a coleta seguinte manteve `status: "ok"` e `calculation_status: "indisponivel"`, com `energy_kwh` e `co2e_grams` `NULL` e a mensagem "Não foi possível obter uma intensidade de carbono válida para a região."; `GET /api/services` devolveu `energyKwh: null` e `emissionsG: null` com `status: "ativo"`. Restaurado o backend com o `.env` normal, a coleta seguinte voltou a `calculation_status: "disponivel"` com energia e emissão preenchidas (ex.: `0.000308407976` kWh e `0.012336319053` g).

### 2.2 Como foi a reunião de 19/10/2026

A review foi uma videochamada de cerca de 7 minutos e teve três momentos:

1. a equipe se apresentou;
2. exibiu o [vídeo de 3 min](https://youtu.be/3Hx4kzuudSw) com o produto da Sprint 1;
3. respondeu às perguntas do cliente e do professor.

O vídeo foi preparado pelo PO e mostra o produto como entregue na Sprint 1. O roteiro ao vivo da seção 2 não foi executado na reunião. A verificação de ponta a ponta dessa versão é o ensaio de 18/10 (seção 2.1).

## 3. Feedback do cliente (item a item)

Registro do SM (@travensolli) a partir da reunião, com as falas resumidas.

| Item demonstrado | Comentário do cliente | Classificação | Ação |
|---|---|---|---|
| RF01, RF03, RF10: coleta e persistência | Gostou de já ver o consumo e a persistência dos dados da API dele | aceito | nenhuma |
| Produto da Sprint 1 como um todo | Para uma primeira sprint está bom: mesmo sem JWT e login inicial, já há algo para manusear e usar no dia a dia | aceito | nenhuma; a autenticação JWT (DW06) segue planejada para a Sprint 2 |
| RF09, RF11, RF12: interface | Gostou da interface e ficou curioso para ver as próximas implementações | aceito | nenhuma |
| Direção do produto (RF14, RF15) | O intuito é trabalhar com o que já temos; o foco principal é poder comparar serviços para ver o que compensa fazer; a intenção é analisar dados | nova prioridade | [#159](https://github.com/DEVassos/greener-app/issues/159) |
| Repositório | O cliente ia analisar o repositório e enviar apontamentos até 20/10. Eles não descontam pontos na Sprint 1, mas o cumprimento será exigido a partir da Sprint 2 | ajustar | recebidos em 20/10: seção 3.1 |

### 3.1 Apontamentos escritos do cliente (20/10/2026)

Depois da reunião, o cliente analisou o repositório e enviou os apontamentos por escrito em 20/10. Eles não descontam pontos na Sprint 1 e passam a ser exigidos a partir da Sprint 2.

| Tema | Apontamento (resumo) | Classificação | Ação |
|---|---|---|---|
| Design | Simples, técnico, claro e competente. Acha a interface "verde demais", mas, por ser subjetivo, diz que não é necessário mudar | aceito | nenhuma |
| Design e produto | As visualizações trazem o estado atual, mas "parecem meio vazias de significado": agregar valor ao dado para que vire informação e a interface ajude na tomada de decisão, olhando o problema pelos olhos do usuário. Autenticação, indicadores consolidados e comparação entre serviços devem aproximar a implementação do protótipo no Figma | nova prioridade | complemento na [#159](https://github.com/DEVassos/greener-app/issues/159) |
| Design | As dúvidas do time sobre o objetivo da aplicação devem ir ao cliente de forma estruturada, por e-mail | ajustar | [#166](https://github.com/DEVassos/greener-app/issues/166) |
| Qualidade de código | Destaque para a cobertura de testes: até agora, o grupo que mais se atentou a isso | aceito | nenhuma |
| Qualidade de código | O frontend tem typecheck e build, mas não tem lint (ESLint) | ajustar | [#160](https://github.com/DEVassos/greener-app/issues/160) |
| Qualidade de código | O cliente HTTP do frontend converte `response.json()` direto para o tipo esperado; validar as respostas nas fronteiras da aplicação | ajustar | [#161](https://github.com/DEVassos/greener-app/issues/161) |
| Qualidade de código | Sete testes de integração ficam pulados no CI por falta de PostgreSQL; rodar os testes de repositories e do coletor com um *service container* | ajustar | [#162](https://github.com/DEVassos/greener-app/issues/162) |
| Qualidade de código | O `npm audit` aponta alertas no Vitest, que é dependência de desenvolvimento (as de produção não têm alertas); atualizar o Vitest | ajustar | [#163](https://github.com/DEVassos/greener-app/issues/163) |
| Processos | Processo "extremamente organizado": Git Flow documentado, convenção de branches, rulesets, template de PR, entrega integrada pelo [#154](https://github.com/DEVassos/greener-app/pull/154), ADRs e exceções registradas | aceito | nenhuma |
| Processos | A tag `sprint-1` ainda não existia | ajustar | tag e GitHub Release criadas no fechamento, pela [#153](https://github.com/DEVassos/greener-app/issues/153) |
| Processos | Os rulesets exigem só os checks `commits`, `pr` e `docs`; exigir também os jobs `backend`, `frontend`, `compose` e `schema` | ajustar | [#164](https://github.com/DEVassos/greener-app/issues/164) |
| Processos | [#60](https://github.com/DEVassos/greener-app/pull/60) e [#110](https://github.com/DEVassos/greener-app/pull/110) entraram sem revisão e [#82](https://github.com/DEVassos/greener-app/pull/82) com pedido de mudanças: manter a validação cruzada em todos os PRs | ajustar | [#164](https://github.com/DEVassos/greener-app/issues/164): rulesets sem bypass de admin e com aprovação do último push |
| Documentação | Documentação "excelente e muito acima do esperado" para a primeira sprint | aceito | nenhuma |
| Documentação | Usar permalinks com SHA na Evidência do plano (o `check-docs.sh` dava 13 avisos) e manter uma fonte principal por assunto, com links nos demais documentos | ajustar | [#165](https://github.com/DEVassos/greener-app/issues/165) |
| Documentação | Finalizar os itens "Em andamento" ou "Parcial" e registrar o feedback da review | ajustar | feito no fechamento ([#153](https://github.com/DEVassos/greener-app/issues/153)): Situação final de cada critério no plano, com ES07 `Parcial` e o motivo, e o feedback nesta ata |
| Produto | Base de lógica de negócio sólida e propósito bem compreendido; gostou do cuidado com disponibilidade, histórico, estados incompletos e atualização sem apagar os dados anteriores | aceito | nenhuma |
| Produto | Manter visível a distinção entre o que já funciona e o que está planejado, porque o protótipo tem funções ainda não implementadas | aceito | prática mantida: nada é anunciado antes do merge |

## 4. Decisões e alterações no backlog

| Decisão | Issue criada ou alterada | Label | Milestone |
|---|---|---|---|
| Priorizar a comparação entre serviços e a análise dos dados. Na planning da Sprint 2, o PO decide se antecipa a US09, ranking ([#50](https://github.com/DEVassos/greener-app/issues/50)), e a US11, comparação ([#52](https://github.com/DEVassos/greener-app/issues/52)), hoje previstas para a Sprint 3, e reavalia os diferenciais US12 e US13 | [#159](https://github.com/DEVassos/greener-app/issues/159) | `feedback-cliente`, `RF14`, `RF15` | Sprint 2 |
| Nenhum critério muda de sprint na review: o denominador da Sprint 1 continua 79 e a autenticação JWT (DW06) segue na Sprint 2 | — | — | — |

Registrado no "Histórico de alterações do plano" em 20/10/2026, no fechamento da Sprint 1 ([#153](https://github.com/DEVassos/greener-app/issues/153)).

## 5. Pendências e perguntas em aberto

| Pendência | Quem | Prazo |
|---|---|---|
| Atender os apontamentos escritos do cliente (seção 3.1), exigidos a partir da Sprint 2: [#160](https://github.com/DEVassos/greener-app/issues/160), [#161](https://github.com/DEVassos/greener-app/issues/161), [#162](https://github.com/DEVassos/greener-app/issues/162), [#163](https://github.com/DEVassos/greener-app/issues/163), [#164](https://github.com/DEVassos/greener-app/issues/164), [#165](https://github.com/DEVassos/greener-app/issues/165) e [#166](https://github.com/DEVassos/greener-app/issues/166) | responsável de cada issue | Sprint 2 |
| Decidir a priorização de ranking e comparação ([#159](https://github.com/DEVassos/greener-app/issues/159)) | @henriqueptbd-cell | 21/10 |

## 6. Encaminhamentos pós-review (≤24h)

- [x] Feedback, decisões e pendências registrados nas seções 3 a 5 (@travensolli, 20/10)
- [x] Issue `feedback-cliente` criada na milestone Sprint 2: [#159](https://github.com/DEVassos/greener-app/issues/159) (20/10)
- [x] Apontamentos escritos do cliente registrados na seção 3.1 e transformados em issues `feedback-cliente` na milestone Sprint 2 (@travensolli, 20/10)
- [x] Seção Review de `docs/sprints/sprint-1.md` e "Histórico de alterações do plano" atualizados (@travensolli, 20/10), com a Situação de cada critério verificada pelo PO na revisão do PR de fechamento
- [x] Participação consolidada em [contribuicao.md](contribuicao.md) e backlog e burndown finais exportados (20/10)

O merge da `release/sprint-1` em `main`, a tag `sprint-1` e a GitHub Release são feitos logo depois deste registro, pela [#153](https://github.com/DEVassos/greener-app/issues/153).
