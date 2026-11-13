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

- **RNF01 — Tema claro alternável com o escuro (#265, PR #280):** o botão de tema no cabeçalho e na tela de login troca o atributo `data-theme` da página e guarda a escolha no navegador; os tokens de cor são redefinidos para o tema claro com o mesmo contraste mínimo, e as duas aparências valem para todas as páginas e gráficos.

- **RNF01 — Acessibilidade: leitura do período, placeholder, alvos e teclado (#262, PR #278):** link **Pular para o conteúdo** no primeiro Tab, alvos de toque de pelo menos 24 px nos botões de ordenação e de atualizar, placeholder dos campos com contraste de texto pequeno, período do painel lido pelo leitor de tela e resumo do gráfico de Emissões sem anúncio a cada ciclo; **Atualizar agora** com 44 px.

- **RNF01 — Números em algarismos tabulares (#266, PR #281):** CPU, energia, emissão, horários, eixos e a matriz da comparação usam a fonte de texto com `tabular-nums` no lugar da fonte mono, então vírgulas e casas ficam alinhadas sem mudar a família tipográfica.

- **RNF04 / TP03 — Erros tipados e tratamento de falhas no backend (#174, PR #233):** `shared/errors.ts` define `AppError` e as subclasses (400, 401, 404, 500 e 502) e `middlewares/error-handler.ts` converte qualquer falha no envelope `{"error":{"code","message"}}`, sem stack nem SQL; falhas da API de métricas, da API de carbono e do banco viram estado visível para o frontend em vez de resultado inválido.

- **RF05/RF06 — Motivo seguro da indisponibilidade ([#251](https://github.com/DEVassos/ecopulse-app/issues/251)):** `GET /api/services` inclui `statusReason` da última coleta somente para `indisponivel`, normalizado para não expor detalhes internos; demais estados recebem `null`. [Contrato](docs/api.md#get-apiservices). Na tela, o motivo aparece com a #176, abaixo.

- **RF11 — Contrato backend da configuração ([#250](https://github.com/DEVassos/ecopulse-app/issues/250)):** GET público e PUT com JWT para intervalo de atualização da tela (15/30/60 s, padrão 30). A interface é a da #176, abaixo. [Contrato e verificação HTTP](docs/api.md#get-apimonitoring-settings); [migração sem apagar volumes](database/README.md#configuração-de-monitoramento-250).

- **RF05, RF06, RF11 — Intervalo configurável e estado com motivo (#176):** na **Configuração**, o administrador escolhe o intervalo da atualização automática (15, 30 ou 60 s) e salva com `PUT /api/monitoring-settings`. O dashboard lê `GET /api/monitoring-settings` a cada ciclo, então a troca vale em todas as abas e navegadores no ciclo seguinte, sem recarregar; sem resposta, usa `VITE_REFRESH_INTERVAL_MS` como reserva. Na tabela e na janela de detalhes, um serviço **Indisponível** mostra o motivo seguro (`statusReason`) abaixo do selo. Como verificar em [frontend/README.md](frontend/README.md#estado-com-motivo-176).

  ![Configuração com o intervalo de 15 s salvo](docs/img/sprint-2-configuracao-intervalo.png)

  _Backend real (`docker compose`) em 04/11/2026: depois de salvar 15 s, o dashboard buscou `GET /api/services` aos 13, 28 e 43 s._

O desenvolvimento acontece na branch `develop`; cada funcionalidade entra nesta lista quando o Pull Request correspondente é mergeado, com o requisito e o número do PR. A Sprint 1 foi encerrada em 20/10/2026 e está publicada na tag [`sprint-1`](https://github.com/DEVassos/ecopulse-app/releases/tag/sprint-1); o registro completo, com a review e o retorno do cliente, está em [docs/sprints/sprint-1.md](docs/sprints/sprint-1.md).

**Vídeo da Sprint 1 (cerca de 3 min):** [EcoPulse - ABP FATEC 2DSM](https://youtu.be/3Hx4kzuudSw), com o produto como foi entregue na Sprint 1.

**Vídeo da Sprint 2:** [EcoPulse — Sprint 2 | DEVassos (FATEC Jacareí) — De Monitoramento a Investigação de Emissões](https://youtu.be/an9g07c_nIs), com o produto como foi entregue na Sprint 2 (`release/sprint-2`).

- **RF09, RF12 — Tabela operacional de serviços (#69):** dashboard com cada serviço monitorado, CPU, energia, emissão, última leitura, localização (código da região na célula; cidade, país e nome da região ao passar o mouse) e status (ativo, indisponível, sem métricas ou removido, quando o serviço sai da lista do agregador), com busca por nome e ordenação por coluna. A coluna **Fator da região (gCO₂e/kWh)** mostra a intensidade de carbono usada na última coleta, que explica por que CPU alta em região limpa emite menos que CPU baixa em região suja; potência estimada, RAM, disco e rede ficam no tooltip da CPU, o intervalo no da última leitura, e a janela de detalhes repete tudo (#298). Só o problema ganha cor: o selo Ativo e o card Ativos ficam neutros, e a linha indisponível ou sem métricas tem o botão **Ver histórico** ao lado do status (#272). A tela consome `GET /api/services` (#115) pela base definida em `VITE_API_URL`; sem ela (variável vazia), o frontend sobe em modo demonstração com dados ilustrativos (`npm run mock`) — como executar em [frontend/README.md](frontend/README.md).

  ![Tabela de serviços com a coluna Fator da região e a localização pelo código](docs/img/sprint-2-tabela-fator.png)

  _Tabela ligada ao backend real (`docker compose`) em 07/11/2026, 17h08, num banco novo com poucos minutos de coletas, em 1366 px: a coluna **Fator da região (gCO₂e/kWh)** vai de 40 (ca-central) a 465 (jp-east), e é ela que explica a emissão: o Audit Stream, com 64% de CPU, emite mais que o Recommendation AI, com 86%, porque a região dele tem fator maior. Os cabeçalhos quebram em duas linhas para as nove colunas caberem sem rolagem (#298)._

  ![Tabela de serviços monitorados com o backend real](docs/img/sprint-2-dashboard-backend-real.png)

  _Tabela ligada ao backend real (`docker compose`) em 06/11/2026, numa janela de 1366×657 e com a sessão aberta ("Olá, admin" e **Sair**, #257): ordem inicial por gravidade, status logo depois do nome com o selo Ativo neutro (#272), energia (Wh) e emissão (mg CO₂e) da última leitura numa unidade só por coluna, indicada no cabeçalho (#271), e seis linhas visíveis sem rolar (#259)._

- **RF08, RF09 — Cards de estado dos serviços (#21, PR #202):** entre os indicadores do período e a tabela, cards compactos com o total de serviços monitorados e quantos estão ativos, indisponíveis e sem métricas, contados na mesma resposta de `GET /api/services` e atualizados no mesmo ciclo. Os removidos ficam fora do total, e a cor só aparece quando há serviços naquele estado. Sem dados, os cards não aparecem; numa falha, mantêm o último dado, apagado, com "Desatualizado desde …".

  ![Cards de estado entre os indicadores do período e a tabela de serviços](docs/img/sprint-2-kpis.png)

  _Dashboard com o backend real (`docker compose`) em 06/11/2026: 7 serviços ativos, sem contar 1 removido, e Indisponíveis e Sem métricas zerados, nos cards compactos abaixo dos indicadores do período (#259). Nenhum card tem cor: Ativos é estado saudável e fica neutro, e os outros dois só ganham cor com contagem acima de zero (#272)._

- **RF08 — Indicadores agregados e comparação por período (#175, PR #215):** no topo do dashboard, logo abaixo do cabeçalho (#259), a tela mostra a energia e o CO₂e das últimas 24 h, na unidade que o valor pede (Wh ou kWh, mg ou g), com o período em horário de Brasília, e a variação contra as 24 h anteriores: ▲ em laranja quando subiu, ▼ em verde quando caiu e ±0% em cinza (#271). Sem cálculo no período, o valor é "—", nunca zero; sem base para a variação, a nota é "—" e o motivo fica no tooltip. A API usa `GET /api/services/summary?from=&to=`, documentada em [docs/api.md](docs/api.md).

  ![Indicadores agregados com comparação às 24 h anteriores](docs/img/sprint-2-indicadores-agregados.png)

  _Dashboard com o backend real (`docker compose`) em 06/11/2026, 10h02: 1,05 kWh e 258 g CO₂e nas últimas 24 h, na unidade que o valor pede, com "▼ 21,4%" e "▼ 22,1%" em verde, porque energia e CO₂e caíram em relação às 24 h anteriores (#271)._

- **RF14 — Quem pesa mais no CO₂e (#260):** a tabela de serviços mostra a parte de cada serviço no CO₂e das últimas 24 h, com barra (o 1º lugar em neon e com o rótulo "1º"), e a frase acima dela diz quem respondeu por mais. Dentro de cada estado, a ordem segue o período e não muda a cada leitura. As partes exibidas somam 100,0%, e a coluna e a frase ficam em cinza quando a última busca falha. A API é `GET /api/services/ranking?metric=co2e&from=&to=`, com o contrato aprovado na #50 e implementada na #287 (PR #291).

  ![Coluna Parte do CO₂e e frase "Quem pesa mais" no dashboard](docs/img/sprint-2-ranking-co2e.png)

  _Dashboard com o backend real (`docker compose`) em 07/11/2026, 14h25, num banco novo com poucos minutos de coletas do agregador: o Fraud Detector respondeu por 27,6% do CO₂e das últimas 24 h, e a coluna soma 100,0%._

- **RNF02 — Indicador de última atualização (#89):** selo no cabeçalho com o horário da última busca bem-sucedida e um ponto verde pulsando enquanto os dados estão em dia; se uma busca falha, ele fica laranja e passa a dizer "Desatualizado desde …", sem apagar os dados da tela.

  ![Selo de última atualização no cabeçalho](docs/img/sprint-2-ultima-atualizacao.png)

- **RNF04 — Resposta da API conferida antes de aparecer na tela (#161):** o frontend confere o formato de `GET /api/services` e `GET /api/collections` (#161), e também de `GET /api/services/summary` e `GET /api/services/compare` (#237, PR [#252](https://github.com/DEVassos/ecopulse-app/pull/252)), contra o contrato de [docs/api.md](docs/api.md) a cada busca. Um item sem `id` ou com CPU em texto faz a busca ser tratada como falha: os dados anteriores continuam com "Desatualizado desde …" e **Tentar novamente**, e o item inválido não aparece. Atende ao apontamento do cliente na review da Sprint 1. Como verificar em [frontend/README.md](frontend/README.md#conferência-das-respostas-da-api-161).

  ![Dashboard depois de uma resposta com a CPU em texto](docs/img/sprint-2-resposta-fora-do-contrato.png)

  _Backend falso com `MOCK_SERVICES=cpu-texto` em 30/10/2026, 11h50: a faixa laranja aponta o campo recusado e a tabela mantém os dados de 11:50:47. O aviso "Rota não existe no backend falso." é do painel de indicadores: nessa data, o backend falso ainda não respondia `GET /services/summary` (#239)._

  _Selo em 21/10/2026, com o backend real (`docker compose`)._

- **RF11, RNF02 — Atualização automática sem recarregar (#100, #114):** o dashboard busca os dados de novo a cada intervalo (`VITE_REFRESH_INTERVAL_MS`, padrão 30 s), pausa com a aba oculta e tem o botão **Atualizar agora**; se uma atualização falha, os dados anteriores continuam na tela e aparece o erro com **Tentar novamente**.

  ![Dashboard depois de uma atualização com falha](docs/img/sprint-2-atualizacao-automatica.png)

  _Backend parado em 04/11/2026 (mesmo efeito de `docker compose stop backend`): na atualização seguinte, a faixa laranja compacta diz "Mostrando dados de 01:47:03" e oferece **Tentar novamente**, o selo fica laranja ("Desatualizado desde …") e a tabela continua na tela com os números em cinza, como os cards, para não parecerem atuais (#203, #261). Sem nenhum dado na tela, aparece o aviso de erro grande._

- **RF01, RF02, RF03, RF04 — Descoberta e coleta periódica (#95, #98, #99):** o backend descobre os serviços no agregador de métricas, consulta `/metrics/{id}` e grava o histórico no PostgreSQL; o _worker_ roda em segundo plano e reconcilia serviços que aparecem, ficam indisponíveis ou voltam a exportar métricas.

- **RF10 — API dos serviços e histórico de coletas (#115, #116, #119):** `GET /api/services` devolve os serviços monitorados com a última leitura, e `GET /api/collections?service_id=&from=&to=&limit=` devolve o histórico de coletas (com `limit` de 1 a 500), com CORS liberado para o dashboard. `GET /api/collections/series?service_id=&from=&to=&bucket=` (#207) agrupa as coletas de um serviço em intervalos de 15 min, 1 h ou 1 dia, com contagem, energia e CO₂e por intervalo e o total do período. Contrato completo em [docs/api.md](docs/api.md).

- **RF09, RF10 — Detalhes e histórico do serviço (#135):** clicar num serviço da tabela abre uma janela com status, localização, última leitura, CPU e até 100 coletas mais recentes do serviço (`GET /api/collections`), com o período exibido na legenda. Acima da tabela, um gráfico de linha mostra a evolução da CPU nessas coletas, interrompido nas coletas com erro ou sem métricas (#132, PR #201). O histórico se atualiza no mesmo intervalo do dashboard; se uma busca falha, as coletas continuam na tela com "Desatualizado desde …". Como verificar em [frontend/README.md](frontend/README.md). Buracos maiores que o intervalo normal aparecem como “Sem coleta por …”, indicando ausência de registro — não prova de indisponibilidade. A janela exibe até 100 coletas recentes.

  ![Janela de detalhes de um serviço com o gráfico da CPU e o histórico de coletas](docs/img/sprint-2-detalhe-servico.png)

  _Janela do Checkout Worker em 22/10/2026, com o backend real (`docker compose`) e o cursor sobre uma coleta do gráfico._

- **RF07, RF09, RF10 — Página Emissões (#190, PRs #200 e #216):** o item **Emissões** do menu abre `/emissoes`, com a emissão estimada de CO₂e e a energia de um serviço no período escolhido. O período se escolhe numa pílula com ‹ ›, atalhos (Hoje, Ontem, Últimos 7 e 30 dias) e um calendário próprio, com as datas em DD/MM/AAAA (#273). O serviço e as datas ficam na URL, então o link abre no mesmo filtro. O agrupamento é automático pelo tamanho do período: cada coleta até 2 h (`GET /api/collections`), 15 min até 1 dia e 1 hora acima disso (`GET /api/collections/series`). O resumo mostra emissão, energia, média, pico (os mesmos do chip do gráfico, #271), com a etiqueta **estimado** e o método no tooltip (#272), intensidade da região e coletas com falha, sem cálculo e tempo sem coleta. **Tempo real** busca de novo no intervalo do dashboard. Sem cálculo aparece "—", nunca zero, e numa falha o resumo fica apagado, com "Desatualizado desde …". O gráfico em SVG mostra a faixa da menor e da maior coleta, a média, o maior ponto com o chip "pico · N× média", os trechos sem coleta hachurados e as falhas (#272), e dá para alternar para o modo acumulado. A janela de detalhes do serviço leva direto à página. Como verificar em [frontend/README.md](frontend/README.md#página-emissões-190); print em [docs/img/sprint-2-emissoes.png](docs/img/sprint-2-emissoes.png).

- **RF15 — Comparação entre serviços (#193, PR #214; #194, PR #219; #218):** o item **Comparação** do menu abre `/comparacao`, com 2 a 10 serviços lado a lado no mesmo período (até 31 dias): coletas, médias de CPU, memória, disco e rede, e energia e CO₂e somados, por `GET /api/services/compare`. O menor e o maior CO₂e ficam destacados, o período aparece acima da tabela, e serviço sem coletas aparece como "sem coletas", nunca zero. Abaixo da tabela, barras de energia e de CO₂e por serviço, cada grandeza na sua escala, com os mesmos valores e destaques. Serviços e datas ficam na URL, e o período usa o mesmo seletor de Emissões (#273). Como verificar em [frontend/README.md](frontend/README.md#comparação-entre-serviços-194).

  ![Comparação de quatro serviços com o backend real](docs/img/sprint-2-comparacao.png)

  _Quatro serviços comparados com o backend real (`docker compose`) no dia 05/11/2026, escolhido no seletor de período (#273): Recommendation AI gastou mais energia (170 Wh), mas Fraud Detector emitiu mais CO₂e (60,7 g), porque a região dele tem intensidade de carbono maior; Inventory Sync teve o menor CO₂e (3,3 g). Energia em ciano e CO₂e em verde, com só o maior CO₂e em laranja (#274)._

- **RNF05, DW07 — Execução com Docker (#91, #113, #81):** backend, frontend (nginx) e PostgreSQL sobem juntos por `docker compose up --build`, com volume persistente para o banco e todas as variáveis documentadas em [.env.example](.env.example) (#82). Passo a passo no [README](#8-como-executar).

- **RF07 — Cálculo socioambiental por coleta (#133, PR #139):** métricas válidas são convertidas em potência, energia e emissão de CO₂e com o fator regional da API de carbono. Se o fator não estiver disponível, a métrica continua registrada e o cálculo fica indisponível, sem criar valor estimado. As colunas "Energia" e "Emissão" da tabela mostram o resultado da última coleta, com cerca de 30 s de operação, numa unidade só por coluna, a do maior valor, indicada no cabeçalho: uma energia de 0,00091 kWh aparece como 0,91 na coluna "Energia (Wh)", e um valor positivo pequeno demais aparece como "< 0,01", nunca como zero (#203, #271) ([detalhes](frontend/README.md#energia-e-emissão-na-tabela)).

- **RNF01 — Dashboard no celular sem esconder energia e CO₂e (#263):** abaixo de 600 px, a emissão da última leitura aparece também sob o nome de cada serviço, e a tabela de serviços e a matriz da Comparação mostram uma sombra na borda direita enquanto há colunas escondidas. O menu rola até o item da página aberta, e o selo de atualização não quebra o horário nem o intervalo no meio.

  ![Dashboard no celular com a emissão sob o nome de cada serviço](docs/img/sprint-3-dashboard-celular.png)

  _Dashboard com o backend real (`docker compose`) em 06/11/2026, numa tela de 390 px e com a sessão aberta: o botão **Menu** e o **Sair** na linha da marca (#274) e, em cada serviço, a emissão da última leitura sob o nome (Checkout Worker, 525 mg CO₂e) (#263). O Fraud Detector, que saiu da lista do agregador, aparece como Removido, no fim da tabela e com os números apagados (#261)._

- **RF09, RNF01 — Eixo de Emissões ajustado ao trecho com dados (#332, PR #344):** quando o monitoramento de um serviço começa depois de 20% do período escolhido, o gráfico de Emissões marca o início ("monitoramento começou entre 19:30 e 19:45") e oferece **Ajustar ao trecho com dados**, que encurta o eixo; KPIs e totais continuam sendo do período inteiro, e o texto sob o título avisa isso ([detalhes](frontend/README.md#página-emissões-190)).

  ![Emissões de ontem com a marca do início do monitoramento](docs/img/sprint-3-emissoes-eixo.png)

  _Página Emissões com o backend real (`docker compose`) em 12/11/2026, em 1280 px, com o período "Ontem" (11/11) do Audit Stream: o monitoramento começou entre 19:30 e 19:45, e a linha tracejada marca o início; à esquerda dela, quase todo o dia ficou sem dados. O botão **Ajustar ao trecho com dados** fica acima do gráfico._

- **RNF01 — Fundo azul, verde nos destaques e logo pulsante (#180, PR #184):** a base da paleta voltou ao azul-escuro e o verde ficou só em ações e destaques (botão vazado nas ações secundárias, item ativo do menu, neon no que pede atenção), em resposta ao feedback da Sprint Review 1. O logo pulsa uma vez a cada atualização bem-sucedida dos dados, como sinal de "ao vivo", e fica parado em falha ou com "reduzir movimento". Regras e contrastes em [docs/identidade-visual.md](docs/identidade-visual.md).

  ![Dashboard com fundo azul-escuro](docs/img/sprint-2-fundo-azul.png)

- **DW06 / RP06 — Login administrativo JWT (#20, PR #208):** `POST /api/auth/login` confere a senha com bcrypt e emite JWT HS256; `GET /api/auth/me` valida o token no middleware reutilizável do backend.

- **DW06 / RP06 — Tela de login e área restrita (#25, PR #243):** `/login` confere o formulário antes de chamar o backend e mostra "E-mail ou senha incorretos." quando o `POST /api/auth/login` responde 401. Com o login, o token fica no `sessionStorage` da aba e toda chamada leva `Authorization: Bearer`; um 401 com sessão aberta encerra a sessão e volta para `/login`. `/configuracao` só abre com sessão e confirma o login em `GET /api/auth/me`; **Sair** apaga o token. Nesta entrega o dashboard, Emissões e Comparação ainda eram públicos; a #257, abaixo, passou a exigir login em todas as páginas.

  ![Tela de login depois de uma senha errada](docs/img/sprint-2-login.png)

  _Backend real (`docker compose`) em 01/11/2026: o backend respondeu 401 e a tela continua em `/login`, com a mensagem acima dos campos._

  ![Área de configuração com a sessão confirmada](docs/img/sprint-2-configuracao.png)

  _Depois do login com o administrador do seed, em 01/11/2026: `GET /api/auth/me` devolveu o e-mail lido no token, e o cabeçalho mostra **Sair**._

- **DW06 / RP06 / RNF05 — Aplicação inteira com login (#257):** o backend exige `Authorization: Bearer <JWT>` em `/api/services` e `/api/collections` e responde 401 sem token válido; `/health`, o login e `GET /api/monitoring-settings` continuam públicos. No frontend, `/login` é a única página aberta sem sessão: o dashboard, Emissões, Comparação e Configuração levam ao login e, depois dele, voltam para a mesma tela, com os filtros da URL. Sem sessão não há busca nem polling; um token expirado encerra a sessão e o login avisa "Sua sessão expirou.". O modo demonstração, sem backend, continua abrindo direto com dados ilustrativos ([ADR 0009](docs/adr/0009-aplicacao-inteira-com-login.md)).

## 4. Escopo planejado

> Planejado, **ainda não implementado**. O andamento real está no [quadro do projeto](https://github.com/orgs/DEVassos/projects/6) e no [plano de entregas](docs/plano-de-entregas.md).

- **Dashboard em três níveis:** visão executiva (kWh total, gCO₂e, serviços ativos e indisponíveis, com atualização sem recarregar), análise comparativa (ranking e distribuição geográfica) e investigação detalhada (histórico por serviço).
- **Prioridade apontada pelo cliente na review da Sprint 1:** comparar serviços e analisar os dados já coletados, para ver o que compensa fazer ([#159](https://github.com/DEVassos/ecopulse-app/issues/159)).
- **Diferenciais em estudo:** simulação de migração para regiões com matriz mais limpa ([US12, #53](https://github.com/DEVassos/ecopulse-app/issues/53)) e exportação de relatórios em PDF/CSV ([US13, #54](https://github.com/DEVassos/ecopulse-app/issues/54)), previstas para a Sprint 3.

## 5. Tecnologias

| Camada | Tecnologia (obrigatória pelo desafio, RP01–RP06) |
|---|---|
| Frontend | React + TypeScript (Vite, Tailwind CSS) |
| Backend | Node.js + TypeScript, API REST em módulos (routes, controllers, services, repositories) |
| Banco de dados | PostgreSQL com DDL e DML explícitos via driver `pg`, sem ORM |
| Segurança | Login JWT no backend e bcrypt para senhas ([#20](https://github.com/DEVassos/ecopulse-app/issues/20), PR #208); tela de login no frontend ([#25](https://github.com/DEVassos/ecopulse-app/issues/25), PR #243); `PUT /api/monitoring-settings` protegido ([#250](https://github.com/DEVassos/ecopulse-app/issues/250), PR #253); todas as páginas e as rotas de dados exigem login ([#257](https://github.com/DEVassos/ecopulse-app/issues/257)) |
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
| 1 | 29/09 → 19/10/2026 | 19/10 às 19h30 (realizada) | Pipeline de coleta persistido em Docker e primeira tela do dashboard (serviços com estado e localização, atualizando sem recarregar) | Concluída: tag [`sprint-1`](https://github.com/DEVassos/ecopulse-app/releases/tag/sprint-1) |
| 2 | 20/10 → 09/11/2026 | 09/11 às 19h30 (a confirmar) | Dashboard completo com energia, CO₂e, tolerância a falhas e área de configuração protegida por JWT | Em fechamento: congelamento em 08/11 às 20h; 67 PRs mergeados em `develop` de 20/10 a 08/11; situação por critério no [plano](docs/plano-de-entregas.md) após a verificação do PO |
| 3 | 10/11 → 23/11/2026 | 23/11 às 19h30 (a confirmar) | Ranking de impacto, comparação entre serviços, mapa e repositório pronto como portfólio | Planejada |

Critérios previstos, responsáveis e evidências de cada sprint: [docs/plano-de-entregas.md](docs/plano-de-entregas.md).

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

**Sprint 1** (29/09 → 19/10/2026): **concluída** em 20/10/2026, tag [`sprint-1`](https://github.com/DEVassos/ecopulse-app/releases/tag/sprint-1).

- **Entrega:** 56 Pull Requests mergeados em `develop` entre 06/10 e 18/10, levados a `main` pela `release/sprint-1`.
- **Review (19/10, videochamada):** o cliente aprovou a coleta, a persistência dos dados e a interface. Ele reforçou que o foco é comparar serviços e analisar os dados ([#159](https://github.com/DEVassos/ecopulse-app/issues/159)).
- **Critérios** (pelo [plano de entregas](docs/plano-de-entregas.md)): concluídos ES01–ES06, ES08, ES09, DW01–DW04, DW07, BD01–BD03 e TP02. ES07 está **parcial**, porque #60, #82 e #110 entraram sem aprovação válida e houve aprovações de uma linha.

Situação por critério, verificações, feedback e participação estão em [docs/sprints/sprint-1.md](docs/sprints/sprint-1.md).

**Sprint 2** (20/10 → 09/11/2026): em fechamento. Congelamento em 08/11/2026 às 20h, review em 09/11 às 19h30 (a confirmar).

- **Entrega:** 67 Pull Requests mergeados em `develop` de 20/10 a 08/11 e 71 issues fechadas na milestone, cobrindo RF02, RF04 a RF15, RNF01, RNF02, RNF04 e RNF05: energia e CO₂e por coleta e por período, página Emissões, comparação entre serviços, ranking de CO₂e das 24 h, fator da região na tabela, login JWT na aplicação inteira, intervalo de atualização configurável, erros tipados no backend e o pacote visual (tema claro, acessibilidade, celular).
- **Critérios** (DW05, DW06, TP01, TP03 e os ES01–ES09 e DW01 de toda sprint): a situação de cada um é verificada pelo PO no fechamento e fica só no [plano de entregas](docs/plano-de-entregas.md); até 08/11, TP01 está **concluído** e os demais aguardam a verificação.

Situação por critério, verificações, feedback e participação ficam em [docs/sprints/sprint-2.md](docs/sprints/sprint-2.md) ao fim da sprint.

---

<div align="center">
Desenvolvido com 💚 pela equipe <strong>DEVassos</strong> · FATEC Jacareí 2026 · Licença <a href="LICENSE">MIT</a>
</div>
