# `frontend` — EcoPulse

Interface web (dashboard EcoPulse) que mostra a energia estimada e as emissões de CO₂e dos serviços monitorados. Stack: React 19 + TypeScript 6.0 (Vite 8), react-router e Tailwind CSS 4; lint com ESLint.

## Requisitos

- Node.js 20.19+ ou 22.13+ (exigência do Vite 8 e do ESLint 10) e npm.

## Organização das pastas

| Pasta / arquivo | Responsabilidade |
|---|---|
| `src/main.tsx` | ponto de entrada: carrega os estilos globais e monta o React com o `BrowserRouter` |
| `src/App.tsx` | rotas: `/` (dashboard, público), `/emissoes` (emissões por estação, pública), `/comparacao` (comparação entre serviços, pública) e `/configuracao` (configuração do monitoramento; a proteção por login é escopo da #25); envolve tudo no `MonitoringProvider` |
| `src/pages/` | telas (`DashboardPage`, `EmissionsPage`, `ComparePage`, `SettingsPage`) |
| `src/components/` | componentes reutilizáveis e sem HTTP (`AppHeader`, `Brand`, `KpiPanel`, `MetricTile`, `ServicesTable`, `ServiceDetailsDialog`, `CollectionsHistoryTable`, `CpuHistoryChart`, `CompareChart`, `StatusBadge`, `LastUpdated`, `MissingValue`, `LoadingState`, `ErrorState`, `UpdateFailedBanner`, `EmptyState`), com `.css` próprio ou classes do Tailwind |
| `src/services/` | **único lugar com HTTP**: `api.ts` (cliente base, `VITE_API_URL`, erros → `ApiError`), `contract.ts` (conferência das respostas, ver [abaixo](#conferência-das-respostas-da-api-161)), `services.service.ts` (`GET /services`), `collections.service.ts` (`GET /collections` de um serviço), `emissions.service.ts` (série de emissões: `GET /collections` e `GET /collections/series`, com conferência da resposta), `compare.service.ts` (`GET /services/compare`); `demo-data.ts` e `emissions.demo.ts` com os dados ilustrativos do modo demonstração; testes em `*.test.ts` ao lado do arquivo testado (vitest) |
| `src/contexts/` · `src/providers/` | `MonitoringContext`/`MonitoringProvider`: intervalo da atualização automática |
| `src/hooks/` | `useMonitoring`, `usePolling` (atualização periódica sem recarregar a página), `useServices` (lista de serviços com polling, erro e atualizar agora), `useCollections` (histórico de coletas de um serviço, com o mesmo polling), `useEmissions` (série de emissões, com tempo real opcional), `useComparison` (comparação entre serviços, uma busca por filtro) |
| `src/utils/` | funções puras: formatação pt-BR (`format.ts`), contagem dos serviços por estado (`summary.ts`), trechos do gráfico da CPU (`cpu-chart.ts`) e datas do filtro, agrupamento, resumo e formatação das emissões (`emissions.ts`) |
| `src/styles/global.css` | ordem das camadas de CSS, Tailwind, tokens de cor e fonte e reset mínimo |
| `src/styles/layout.css` | estrutura comum das páginas (`.page`, `.content`, `.panel`) |
| `mock/server.mjs` | **backend falso** só para desenvolvimento e revisão (ver abaixo); não vai para produção |
| `Dockerfile` · `nginx.conf` · `.dockerignore` | imagem do container (ver [Execução em container](#execução-em-container)) |

## Variáveis de ambiente

Lidas do `.env` da **raiz** do repositório (modelo em `.env.example`; `envDir: '..'` no `vite.config.ts`).

| Variável | Obrigatória | Padrão (`.env.example`) | Descrição |
|---|---|---|---|
| `VITE_API_URL` | não | `http://localhost:3000/api` | base da API do backend, vista pelo navegador. **Sem ela o frontend roda em modo demonstração** (dados ilustrativos e faixa de aviso no topo). No container ela é embutida no bundle durante o build: depois de mudar, suba com `--build` |
| `VITE_REFRESH_INTERVAL_MS` | não | `30000` | intervalo da atualização automática do dashboard (mínimo `5000`; máximo `2147483647`, o limite do `setTimeout`). Como a `VITE_API_URL`, é embutida no bundle no build do container |

## Atualização em tempo real

- `usePolling` busca ao abrir a tela e de novo a cada intervalo, só depois que a busca anterior terminou.
- Com a aba oculta o polling pausa; ao voltar para a aba, busca na hora.
- Ao sair da tela, o timer é limpo e a requisição pendente é cancelada (`AbortController`).
- O cabeçalho mostra "Última atualização: dd/mm HH:MM:SS · intervalo: N s" e o botão **Atualizar agora**; antes da primeira busca bem-sucedida (inclusive se ela falhar), mostra "Aguardando a primeira atualização" com o intervalo e o botão.
- Durante uma busca o botão fica com `aria-disabled` (não `disabled`), para quem navega pelo teclado não perder o foco a cada ciclo. O selo não é `role="status"`: o horário não é anunciado a cada ciclo, e a falha é anunciada pelo aviso de erro.
- Se uma atualização falhar com dados na tela, eles continuam visíveis, o selo fica laranja ("Desatualizado desde…") e, acima dos cards, aparece a faixa compacta laranja `UpdateFailedBanner` (cerca de 40 px): a mensagem do erro, "Mostrando dados de HH:MM:SS." e **Tentar novamente**. A mensagem é a que o hook entrega: "Não foi possível conectar ao servidor…" quando a rede cai, ou a do corpo do erro num 500. O aviso grande (`ErrorState`) fica só para a falha sem nenhum dado.
- A faixa é `role="status"`, e não `alert`: a região viva fica montada enquanto há dados, e o leitor de tela anuncia a falha uma vez, e não a cada ciclo do polling.

## Conferência das respostas da API (#161)

- Os tipos do TypeScript somem no build ([erased types](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#erased-types)) e não garantem o formato que o servidor devolveu. Por isso `services.service.ts` e `collections.service.ts` pedem a resposta como `unknown` e a conferem contra [docs/api.md](../docs/api.md) antes de entregá-la aos hooks.
- A conferência usa os leitores de `src/services/contract.ts`, sem biblioteca. Cada campo é checado pelo tipo do contrato: id em texto não vazio, medidas como número finito ≥ 0 ou `null`, datas em ISO 8601 e estados só entre os valores conhecidos. Campo que aceita `null` precisa vir na resposta. Os campos de cálculo das coletas (#188) podem faltar.
- Um único item fora do contrato recusa a resposta inteira com `ApiError`. A tela segue o fluxo de falha que já tem: com dados na tela, eles continuam com "Desatualizado desde…" e a faixa com **Tentar novamente**; sem dados, aparece só o aviso grande. O item inválido nunca entra na tabela.
- A mensagem diz o primeiro campo recusado, para quem investiga saber onde olhar: "O servidor respondeu num formato inesperado (services[3].id). Avise a equipe do backend." Um 2xx com corpo que não é JSON gera a mesma mensagem, sem o campo.
- `fetchServicesSummary` e `compare.service.ts` ainda não conferem a resposta. A página Emissões confere a sua, mas deixa de fora só o item inválido e avisa quantos foram descartados.

## Cards de estado

- Acima da tabela, `KpiPanel` mostra quatro cards `MetricTile`: **Total**, **Ativos**, **Indisponíveis** e **Sem métricas**. As contagens vêm de `summarizeStatus` (`src/utils/summary.ts`), sobre a mesma lista de `GET /api/services` da tabela, e mudam no mesmo ciclo do polling.
- Os removidos não entram no total, porque saíram da lista do agregador. Quando há algum, o card do total diz "sem contar N removidos".
- Cada estado tem rótulo, ícone e a cor do `StatusBadge`: a cor nunca é a única pista. A cor só aparece com contagem maior que zero; com zero, o card fica neutro e sem nota, para não criar falso alarme. Com contagem, a nota ao lado do número dá a proporção ("14% do total").
- Os cards são compactos (cerca de 89 px de altura), para sobrar espaço para a tabela em telas de notebook.
- Os cards só aparecem depois da primeira busca bem-sucedida: sem dados, a tela mostra o carregamento ou o erro, nunca zeros. Se uma atualização falha, eles continuam com o último dado, com os números apagados (`--muted`), junto com o erro e o selo "Desatualizado desde…".
- `MetricTile` é genérico (rótulo, valor, unidade, nota, ícone e tom), para os cards de energia e CO₂e do painel de indicadores agregados.

## Indicadores agregados (RF08)

- `SummaryPanel`, abaixo dos cards de estado, mostra **Energia no período** (kWh, 4 casas) e **Emissões no período** (g CO₂e, 2 casas) das **últimas 24 h**, com o período no título em horário de Brasília (`timeZone: 'America/Sao_Paulo'`). O estado dos serviços fica só nos cards do `KpiPanel` (#21): o `services` de `GET /api/services/summary` é o estado **atual** e não depende do período, por isso o painel não o repete.
- O `DashboardPage` chama `GET /api/services/summary` (por `fetchServicesSummary`, em `src/services/services.service.ts`) a cada ciclo do polling, duas vezes: as últimas 24 h e as 24 h anteriores a elas. A nota de cada card é a variação "±N,N% vs. 24 h anteriores"; sem cálculo no período anterior, "Sem cálculo no período anterior"; com total anterior zero, "Sem base para comparação".
- Sem cálculo no período, o valor é o traço do `MissingValue` ("sem cálculo" para leitor de tela), nunca zero. Nos ciclos seguintes ao primeiro, a variação anterior continua na tela até chegar a nova resposta, sem piscar "Comparando período anterior…".
- Falha do resumo ou da comparação aparece como `ErrorState` abaixo da faixa de falha da lista (`UpdateFailedBanner`, #217), e os cards ficam com os números apagados até a próxima busca bem-sucedida.
- No modo demonstração (sem `VITE_API_URL`) o painel não aparece: não há dados de demonstração para o resumo.
- Com o backend falso (`npm run mock`, #239), o painel soma as coletas que o mock gera a cada 30 s. Como elas se repetem dia a dia, a variação contra as 24 h anteriores fica perto de zero.

## Energia e emissão na tabela

- As colunas "Energia (kWh)" e "Emissão (g CO₂e)" mostram o resultado da **última coleta** de cada serviço (cerca de 30 s de operação), calculado pelo backend desde o #139. Sem cálculo disponível (por exemplo, com a API de carbono fora), aparece "—", nunca zero.
- Energia e emissão têm resolução fixa por coluna (`formatFixed` em `src/utils/format.ts`): kWh com 5 casas e g com 3, nas mesmas unidades da API. As vírgulas ficam alinhadas e o número não muda de tamanho a cada leitura. 0,04 g aparece como **0,040** (antes, "0,0"). Um valor positivo menor que a resolução aparece como "< 0,001" (g) ou "< 0,00001" (kWh), nunca como zero; zero calculado aparece "0,000"; sem cálculo, continua "—".
- A tabela não repete o `period` de `GET /api/services`: a coluna **Última leitura** já diz de quando são os valores da linha: os da coleta, não um total.

## Página Emissões (#190)

- **Emissões**, no menu do topo, abre `/emissoes`: a emissão estimada de CO₂e de uma estação (serviço) ao longo do tempo. A estação e o período ficam na URL (`/emissoes?servico=<id>&de=<AAAA-MM-DD>&ate=<AAAA-MM-DD>`), então o link abre no mesmo filtro e o "voltar" do navegador desfaz a última troca. Sem `servico`, abre na primeira estação. `de` inválida ou no futuro cai em hoje; `ate` inválida, no futuro, antes de `de` ou a mais de 31 dias dela vale como o mesmo dia de `de` (são os casos que o formulário recusa).
- O período vai de 00:00 da data inicial até 24:00 da final (ou até agora, se for hoje), no fuso do navegador, que aparece no subtítulo: "horário de Brasília" em `America/Sao_Paulo`; nos outros fusos, o deslocamento do UTC naquele dia (ex.: "UTC−4"). Por isso o dia 23/10 em Brasília é pedido como `from=2026-10-23T03:00:00.000Z`.
- Filtros: estação, datas (até 31 dias), ◀ ▶ (período anterior/seguinte, do mesmo tamanho), **Atualizar**, **Tempo real** (período de hoje, buscado de novo no intervalo do `MonitoringProvider` e pausado com a aba oculta) e **Agrupar por**.
- Agrupamento automático pelo tamanho do período: até 2 h, **cada coleta**, por `GET /api/collections` (#188, paginado de 500 em 500); até 1 dia, **15 min**; mais que isso, **1 hora**, por `GET /api/collections/series` (#189), que soma no banco. A pessoa pode trocar.
- Resumo: emissão e energia no período, média por coleta calculada, pico de uma coleta (com horário e quantas vezes a média), intensidade da região e coletas (com falha, sem cálculo e tempo sem coleta), mais a **Leitura do período** em frases. Sem cálculo, os valores aparecem como "—", nunca zero.
- **Intensidade da região** é a média da intensidade das coletas calculadas no período, a regra de `totals.carbonIntensityGco2ePerKwh` da #189. Em **Cada coleta** a página faz a mesma média com as coletas recebidas, então o card não muda com o agrupamento.
- **Tempo sem coleta** (no card **Coletas** e na Leitura do período) soma os trechos sem nenhuma coleta registrada, com falha ou não, entre a primeira e a última coleta do período. O tempo antes da primeira e depois da última não conta, porque pode ser só o sistema desligado ou o período ainda em curso. Os trechos têm 15 min em períodos de até 1 dia e 1 hora nos maiores (ou no agrupamento por 1 hora), alinhados como o `date_bin` da #189; assim, **Cada coleta** e **15 min** dão o mesmo número. É ausência de registro, não indisponibilidade.
- O selo `LastUpdated` do cartão mostra "Última atualização: dd/mm HH:MM:SS" (com o intervalo, no **Tempo real**). Se uma busca falha, o resumo e a Leitura do período continuam com o último dado, com os números apagados (`--muted`), junto com o erro, **Tentar novamente** e o selo laranja "Desatualizado desde …", como no dashboard. Se a primeira busca do filtro falha, o selo fica em "Aguardando a primeira atualização" e só aparece o erro. Trocar a estação, o período ou o agrupamento limpa o resumo, o horário e o erro anteriores.
- A resposta é conferida em tempo de execução: envelope fora do formato vira erro amigável; item fora do formato fica de fora e a tela avisa quantos.
- Gráfico em SVG próprio (`EmissionsChart`, sem biblioteca): a linha é a emissão de cada coleta ou a **soma** de cada intervalo, desenhada no meio dele. No agrupado, uma faixa clara mostra onde a soma estaria se todas as coletas fossem a menor ou a maior do intervalo, para o pico de uma coleta não sumir na soma. Também tem linha de média (ciano), maior ponto em neon e uma faixa vermelha ou cinza abaixo do eixo nos pontos com falha ou sem cálculo. A linha é interrompida onde não há cálculo ou onde a coleta parou.
- **Por coleta / Por intervalo** × **Acumulado**: o acumulado termina no total de "Emissão no período". O intervalo ainda em andamento (hoje) aparece como um ponto vazado fora da linha, porque a soma dele é parcial.
- Tooltip: horário (ou intervalo), emissão, acumulado, energia, menor e maior coleta do intervalo e quantas coletas entraram (com falha e sem cálculo).
- A janela de detalhes do serviço tem o botão **Ver emissões deste serviço**, que abre `/emissoes?servico=<id>`.

## Comparação entre serviços (#194)

- **Comparação**, no menu do topo, abre `/comparacao`: de 2 a 10 serviços no mesmo período (até 31 dias), por `GET /api/services/compare` (#193). Serviços e datas ficam na URL (`/comparacao?servicos=<id>,<id>&de=<AAAA-MM-DD>&ate=<AAAA-MM-DD>`); as datas seguem as regras da página Emissões, e ids que não estão na lista de serviços são ignorados.
- Uma coluna por serviço e uma linha por métrica: coletas (com falha e sem cálculo), CPU, memória, disco e rede médios, energia (kWh) e CO₂e (g) somados no período. Acima do nome do serviço, "↓ menor CO₂e" (verde) e "↑ maior CO₂e" (laranja, o tom de alerta) destacam os extremos do período, com texto e cor, quando ao menos dois serviços têm cálculo e não empatam todos. As linhas alternam de cor. O período ecoado pela API aparece acima da tabela.
- Serviço sem coletas no período aparece como "sem coletas", e as métricas como "—", nunca zero. Com menos de dois serviços, a tela explica o que falta e não busca.
- Abaixo da tabela, o `CompareChart` (#218) mostra a energia (kWh) e o CO₂e (g) de cada serviço em barras horizontais, em SVG e sem biblioteca, com os valores e as casas da tabela, na mesma ordem das colunas. Cada grandeza tem a sua escala: a barra mais longa é o maior valor dela no período. No CO₂e, o menor fica em verde com "↓" e o maior em laranja com "↑", os mesmos da tabela, e a legenda explica as setas. Serviço sem coletas ou sem cálculo mostra só o texto ("sem coletas" ou "sem cálculo"), sem barra; um zero calculado mostra o trilho vazio e o valor. Cada gráfico é uma imagem acessível (`role="img"`) com título e descrição que lista o valor de cada serviço. Em telas estreitas, os dois gráficos ficam um embaixo do outro, e o nome longo é cortado com "…" antes do valor.
- Uma busca por filtro, sem polling. Se ela falha, aparece só o erro com **Tentar novamente**, sem a comparação anterior.
- O backend falso (`npm run mock`) também responde a rota (#239), com os ids dele (`fraud-detector`, `audit-stream`…). **Inventory Sync** aparece como "sem coletas", porque o mock não gera coletas de serviço sem métricas. Um período de 31 dias com muitos serviços leva cerca de 2 s no mock.

## Detalhes e histórico do serviço

- Clicar numa linha da tabela abre `ServiceDetailsDialog`, um `<dialog>` nativo aberto com `showModal()`. Pelo teclado, o nome do serviço é um botão. O `<dialog>` já prende o foco na janela, fecha com Esc e escurece o fundo; ela fecha também pelo botão × ou por um clique fora, e o foco volta para a tabela.
- A janela mostra os dados da linha (status, região, cidade/país, última leitura, CPU) e as 50 coletas mais recentes de `GET /collections?service_id=<id>&limit=50`, da mais recente para a mais antiga, com o período exibido na legenda.
- Acima da tabela, `CpuHistoryChart` desenha a CPU (%) dessas coletas numa linha, da mais antiga para a mais recente, com eixo de 0 a 100% e os horários de início e fim. É SVG puro, sem biblioteca, e o componente recebe as coletas por props, sem HTTP. A linha é interrompida nas coletas com erro (×) ou sem métricas (anel), marcadas abaixo do eixo e contadas na legenda. Passar o mouse, tocar ou usar as setas, Home e End com o gráfico em foco mostra o valor, o horário e o erro de cada coleta. Com menos de 2 coletas com CPU, aparece um texto no lugar do gráfico. A lógica dos trechos fica em `src/utils/cpu-chart.ts`.
- O histórico usa o mesmo `usePolling` e o mesmo intervalo do dashboard, com selo "Última atualização" próprio. Se uma busca falhar, as coletas anteriores continuam na tela com "Desatualizado desde…" e **Tentar novamente**. Um serviço sem coletas mostra um aviso no lugar da tabela.
- A janela só fica montada enquanto está aberta: fechar cancela o polling do histórico.

## Execução em container

Caminho oficial ([ADR 0003](../docs/adr/0003-docker-compose-unico-caminho.md)); o modo de execução do container está no [ADR 0005](../docs/adr/0005-frontend-nginx-build-producao.md). Na raiz do repositório:

```bash
cp .env.example .env
docker compose up --build      # frontend em http://localhost:5173
```

- `Dockerfile` multi-stage: o estágio `build` (`node:24-alpine`) roda `npm ci` e `npm run build`, então **um erro de TypeScript derruba o build da imagem**. O estágio final (`nginxinc/nginx-unprivileged:1.30-alpine`) leva só o `dist/` e roda o nginx sem root, na porta 8080 do container (publicada como 5173).
- `nginx.conf`: rotas desconhecidas devolvem o `index.html` (fallback da SPA, então `/configuracao` funciona ao recarregar); `/assets/*` (arquivos com hash) com cache de um ano; `index.html` sem cache; gzip e cabeçalhos `X-Content-Type-Options`, `X-Frame-Options` e `Referrer-Policy`.
- `VITE_API_URL` e `VITE_REFRESH_INTERVAL_MS` chegam como argumentos de build pelo `compose.yaml`, lidos do `.env` da raiz (mudou no `.env`, suba com `--build`). O container do frontend não recebe o `.env` inteiro, então segredos do backend (`JWT_SECRET`, `DATABASE_URL`) não chegam a ele.
- O container tem healthcheck (`wget` em `http://127.0.0.1:8080/`): `docker compose ps` mostra `healthy`.
- Não há recarga automática dentro do container: para desenvolver com recarga continue usando `npm run dev` fora dele (atalho opcional, ver ADR 0005).

## Backend falso (`npm run mock`)

O backend real já expõe `GET /api/services` e `GET /api/collections` (#111, #112), e o caminho oficial é o compose. O `mock/server.mjs` continua como atalho de desenvolvimento sem Docker: (Node puro, sem dependências) responde em `http://localhost:3000` o **contrato provisório** que o frontend espera, com ou sem o prefixo `/api`. É a referência para o backend implementar a rota de verdade; quando ela estiver documentada, o contrato aqui é ajustado. (`docs/especificacao-api.md` descreve as APIs **externas** — agregador e intensidade de carbono —, não a API do EcoPulse.)

| Rota | Pedido | Resposta |
|---|---|---|
| `GET /api/services` | — | `200 { "services": [...], "period" }` (campos em `src/services/services.types.ts`); CPU e energia variam a cada chamada |
| `GET /api/collections` | `service_id` (id do serviço no mock, ex.: `fraud-detector`), `limit` (1 a 500; padrão 50) e `from`/`to` opcionais (ISO 8601 com hora) | `200 { "collections": [...], "period" }` (campos em `src/services/collections.types.ts`, com os de cálculo da #188), uma coleta a cada 30 s até `to` (padrão: agora), com números fixos por horário; serviço indisponível tem as 10 mais recentes com erro e serviço sem métricas devolve lista vazia; `service_id` desconhecido → 404, `limit` inválido → 400 |
| `GET /api/collections/series` | `service_id`, `from`, `to` (ISO 8601 com hora, até 31 dias) e `bucket` (`15min`, `1h` ou `1d`) | `200 { serviceId, from, to, bucket, buckets: [...], totals }` (contrato da #189), com as mesmas coletas da rota acima somadas por intervalo e `totals.carbonIntensityGco2ePerKwh` como média das coletas calculadas; período fechado em `from` e aberto em `to`; parâmetro inválido → 400, serviço desconhecido → 404 |
| `GET /api/services/summary` | `from` e `to` juntos (ISO 8601 com hora, até 31 dias) ou nenhum (últimas 24 h) | `200 { period, energyKwh, co2eGrams, services }` (contrato de `docs/api.md`, #239), com a soma das coletas calculadas de todos os serviços no período `[from, to)` e a contagem pelo estado atual; sem coleta calculada, energia e CO₂e vêm `null`; parâmetro inválido → 400 |
| `GET /api/services/compare` | `ids` (2 a 10 ids do mock, distintos, separados por vírgula), `from` e `to` (ISO 8601 com hora, até 31 dias) | `200 { from, to, services: [...] }` (contrato de `docs/api.md`, #239), na ordem dos ids, com coletas, falhas, sem cálculo, médias das métricas e somas de energia e CO₂e no período `[from, to)`; serviço sem coletas vem com `0` e `null`; parâmetro inválido → 400, id desconhecido → 404 |

- `MOCK_SERVICES=vazio` ou `MOCK_SERVICES=erro` faz `GET /api/services` devolver lista vazia ou HTTP 500 com `{ "error": { "code", "message" } }`, o formato de erro do backend (Git Bash: `MOCK_SERVICES=vazio npm run mock`; PowerShell: `$env:MOCK_SERVICES='vazio'; npm run mock`).
- `MOCK_SERVICES=sem-id` e `MOCK_SERVICES=cpu-texto` respondem 200 **fora do contrato** (#161): o **Checkout Worker** vem sem `id`, ou a CPU do **Fraud Detector** vem em texto (`"68"`). Servem para ver a tela tratar a resposta como falha.
- O terminal do mock mostra cada requisição recebida.

## Estilos (Tailwind CSS)

- **Tailwind CSS 4.3**, integrado pelo plugin `@tailwindcss/vite` em `vite.config.ts`. Não há `tailwind.config.js`: a configuração fica no próprio `global.css`.
- Os tokens de [`docs/identidade-visual.md`](../docs/identidade-visual.md) ficam em `:root` (`src/styles/global.css`) e são a fonte única das cores.
- O Tailwind expõe os mesmos tokens como classes (`@theme inline`): `bg-surface`, `text-muted`, `border-border`, `text-primary`, `text-primary-hover`, `text-warning`, `text-error`, `text-danger`, `font-display`. Use só essas classes de token: a paleta padrão do Tailwind (`slate-950`, `emerald-500`…) continua no build, mas não entra nos componentes, para as cores seguirem o guia (#180). Exemplo:

  ```tsx
  <section className="panel p-6">
    <h1 className="font-display text-2xl text-text">Configuração</h1>
    <p className="text-sm text-muted">Texto de apoio em --muted.</p>
  </section>
  ```

- **Controles comuns** ficam em `src/styles/controls.css`: `.btn-outline` é o botão vazado das ações secundárias (ex.: **Tentar novamente**, **Atualizar agora**). O verde fica só em ações e destaques, e o `--neon` só no que pede atenção (#180; regras no guia).

- **Preflight desligado:** `global.css` importa só `tailwindcss/theme.css` e `tailwindcss/utilities.css` (e não o `preflight.css`), para o reset do Tailwind não alterar os componentes que têm CSS próprio. O reset mínimo do projeto fica na camada `base`.
- **Camadas:** a prioridade é `theme < base < components < utilities`. O CSS de componentes e de layout fica dentro de `@layer components { … }`, então uma classe utilitária (`p-4`, `text-muted`) sempre vence o CSS do componente. CSS fora de camada venceria as utilities; por isso todo CSS novo entra numa camada.
- `main.tsx` importa `global.css` antes do `App`, porque é ele que declara a ordem das camadas.
- Cor nova entra primeiro no guia (`docs/identidade-visual.md`) e depois como token em `global.css`; nada de valor hexadecimal solto em componente.

## Comandos

```bash
npm ci              # instalar dependências
npm run dev         # desenvolvimento com recarga (http://localhost:5173)
npm run typecheck   # checagem de tipos (tsc --noEmit)
npm run lint        # ESLint: regras recomendadas de JavaScript, TypeScript e React Hooks (aviso também reprova)
npm test            # testes de unidade (vitest), também no CI
npm run build       # checagem de tipos + build de produção em dist/
npm run preview     # serve o build de produção
npm run mock        # backend falso em http://localhost:3000 (desenvolvimento)
```

## Como verificar este módulo isoladamente

1. `npm ci && npm run lint && npm test && npm run build` → termina sem erros de lint nem de TypeScript, e o vitest mostra todos os testes passando.
2. Sem `.env`: `npm run dev` e abrir http://localhost:5173 → faixa "demonstração com dados ilustrativos" e a tabela **Serviços monitorados** com 7 serviços; o link **Configuração** abre `/configuracao`.
3. Estreitar a janela para menos de 960 px (ou usar o modo dispositivo do navegador) → o menu continua visível, numa segunda linha abaixo da marca, e só a tabela rola na horizontal: a página não ganha rolagem lateral, nem com energia e emissão vazias (serviço sem cálculo disponível).
4. Na raiz, `cp .env.example .env`. Em um terminal `npm run mock`; em outro `npm run dev` → a faixa some e a tabela mostra os serviços de `GET /api/services` (o terminal do mock registra a chamada como `GET /services`, sem o prefixo `/api`). Abaixo dos cards de estado, o painel **Energia e emissões nas últimas 24 h** mostra os totais do mock com a variação, sem nenhum aviso de erro.
5. Na tabela: cada serviço aparece com região, cidade/país e status (Ativo, Indisponível, Sem métricas); sem métrica aparece "—". Localização mostra só as partes informadas (sem ", null"); sem nenhuma, aparece "—" e o serviço fica no fim ao ordenar por Localização. Com o backend real há um quarto status, **Removido**: o serviço saiu da lista de `GET /services` do agregador na última descoberta do worker e volta a Ativo quando reaparece. O backend falso não tem esse caso.
6. Digitar "check" na busca → só **Checkout Worker**; buscar algo inexistente → "Nenhum serviço com … no nome".
7. Ao abrir, a tabela já vem ordenada por gravidade: Status do mais grave para o menos grave (Indisponível, Sem métricas, Ativo, Removido), com desempate pela maior emissão. O título **Status** mostra ↑ (`aria-sort="ascending"`), e as duas primeiras linhas são **Email Dispatcher** (Indisponível) e **Inventory Sync** (Sem métricas). Clicar nos títulos das colunas (Serviço, Status, CPU, Energia, Emissão, Última leitura, Localização) → ordena; clicar de novo inverte; serviços sem métrica ficam sempre no fim. Localização ordena pela região (depois país e cidade).
8. `MOCK_SERVICES=vazio npm run mock` e recarregar → "Nenhum serviço monitorado ainda".
9. `MOCK_SERVICES=erro npm run mock` e recarregar → sem nenhum dado na tela, aparecem dois avisos grandes "Falha simulada no backend falso." (a mensagem vem do corpo do erro) com **Tentar novamente**: o da lista de serviços e o do painel de indicadores, que também falha, como no backend real com o banco fora do ar. Nenhum card nem tabela.
10. Com dados carregados, o cabeçalho mostra o selo **"Última atualização: dd/mm HH:MM:SS"** com um ponto verde pulsando (sistema ativo); com "reduzir movimento" ligado no sistema, o ponto fica parado. A cada horário novo no selo, o logo pulsa uma vez: a folha vira uma linha de batimento com brilho neon e volta (cerca de 2,4 s). Ele não pulsa quando a atualização falha, em **Configuração** (sem polling) nem com "reduzir movimento", e dois cliques seguidos em **Atualizar agora** não reiniciam o pulso no meio.
11. Com o mock no ar, carregar o dashboard, depois subir o mock com `MOCK_SERVICES=erro` e clicar em **Atualizar agora** → os dados continuam na tela, o selo fica laranja (**"Desatualizado desde …"**) e, acima dos cards, aparece a faixa compacta laranja "Falha simulada no backend falso. Mostrando dados de HH:MM:SS." com **Tentar novamente**, no lugar do aviso grande.
12. Com `VITE_REFRESH_INTERVAL_MS=5000` no `.env` e o mock no ar: a cada 5 s o horário do selo muda e o terminal do mock registra um novo `GET /services`; os valores de CPU e energia mudam na tabela **sem recarregar a página**. O selo mostra "intervalo: 5 s".
13. Clicar em **Atualizar agora** (ícone ao lado do selo) → busca na hora, sem esperar o intervalo.
14. Trocar de aba por alguns segundos → o terminal do mock para de registrar chamadas; ao voltar, chega uma chamada imediata.
15. Parar o mock com a tela aberta → na próxima atualização o selo fica laranja ("Desatualizado desde …"), aparece a faixa compacta "Não foi possível conectar ao servidor… Mostrando dados de HH:MM:SS." e a tabela continua visível. Recarregar a página com o mock parado → só o aviso grande, sem cards nem tabela. Subir o mock de novo → a tela volta ao normal na atualização seguinte.
16. Na raiz, `docker compose up --build frontend` → `docker compose ps` mostra o frontend `healthy`; `curl -I http://localhost:5173/configuracao` → `200 OK` (fallback da SPA). Com `npm run mock` rodando no host, http://localhost:5173 mostra a tabela vinda do backend falso.
17. Sem `.env`, clicar na linha de **Fraud Detector** → abre a janela com status, região, cidade/país, última leitura, CPU e a tabela **Histórico de coletas** com 50 coletas, da mais recente para a mais antiga; a legenda mostra o período ("de dd/mm HH:MM:SS a dd/mm HH:MM:SS").
18. Na janela de **Email Dispatcher** → as coletas mais recentes aparecem com status **Erro**, "—" nas métricas e a observação "Serviço indisponível (HTTP 500)."; na de **Inventory Sync** → "Nenhuma coleta registrada para este serviço ainda".
19. Fechar a janela com Esc, com o botão × e com um clique fora → as três formas fecham. Com Tab até o nome de um serviço e Enter → a janela abre; ao fechar, o foco volta para o nome.
20. Com o mock no ar e `VITE_REFRESH_INTERVAL_MS=5000`, abrir um serviço → o terminal do mock registra `GET /collections` a cada 5 s, e o selo da janela e a CPU das coletas mudam sem recarregar. Parar o mock → a janela mostra o erro e "Desatualizado desde …" e mantém as coletas.
21. Estreitar a janela do navegador para 375 px com os detalhes abertos → a página não ganha rolagem lateral; só a tabela do histórico rola na horizontal.
22. Na janela de **Fraud Detector**, acima da tabela → gráfico **CPU (%)** com eixo de 0 a 100% e os horários da primeira e da última coleta da legenda; "última" é a CPU da primeira linha da tabela. Passar o mouse sobre o gráfico → linha vertical e caixa com a CPU e o horário da coleta mais próxima, iguais aos da tabela. Com Tab até o gráfico, as setas, Home e End percorrem as coletas.
23. Na janela de **Email Dispatcher** → a linha para onde começam os erros, as coletas com erro aparecem como × abaixo do eixo e a legenda diz "A linha é interrompida nas coletas sem CPU: N com erro". Com o cursor sobre um ×, a caixa mostra "Erro na coleta" e a observação da coleta.
24. Com 375 px de largura → o gráfico ocupa a largura da janela, sem rolagem lateral, e os rótulos continuam legíveis.
25. Sem `.env` → acima da tabela, os cards mostram **Total 7**, **Ativos 5** (71% do total), **Indisponíveis 1** e **Sem métricas 1** (14% do total cada), em verde, vermelho e laranja, as mesmas contagens da coluna Status. Com 375 px, ficam em 2 colunas, sem rolagem lateral.
26. Com o backend real: `curl -s http://localhost:3000/api/services | jq '.services | group_by(.status) | map({(.[0].status): length}) | add'` → cada card bate com a contagem do seu status, e o total é a soma sem os `removido`. Com todos ativos, **Indisponíveis** e **Sem métricas** mostram 0 sem cor e sem nota.
27. Com o dashboard aberto, `docker compose stop backend` e esperar um intervalo → os cards continuam com os últimos números, apagados, com o erro e o selo "Desatualizado desde…". Recarregar a página com o backend parado → nenhum card, só o erro. `docker compose start backend` → no ciclo seguinte, os cards e o selo voltam ao normal.
28. Sem `.env`, clicar em **Emissões** no menu → abre `/emissoes`, sem parâmetros na URL, na primeira estação (**Fraud Detector**), com hoje, "Automático (15 min)" e o resumo do dia; a URL só ganha `?servico=…` ao trocar a estação. **Email Dispatcher** mostra coletas "com falha" no card **Coletas** (as dos últimos 21 min). **Inventory Sync** mostra todas as coletas com falha ("N · N com falha"), "—" em emissão, energia, média, pico e intensidade, e o aviso "Há coletas no período, mas nenhuma com emissão calculada…": o modo demonstração registra as coletas desse serviço com falha, como o backend real faz com as coletas `sem_metricas`.
29. Trocar a estação e clicar em ◀ → a URL muda (`servico`, `de`, `ate`) e o resumo é do dia anterior; o botão voltar do navegador volta ao filtro anterior. Abrir o link copiado numa aba nova → mesmo filtro.
30. Em **Agrupar por**, escolher **Cada coleta** → o total de emissão e de coletas, a intensidade da região e o tempo sem coleta (quando houver) são os mesmos do agrupamento por 15 min; o pico passa a mostrar o horário exato da coleta.
31. Com o mock no ar (`npm run mock`), abrir `/emissoes` → o terminal do mock registra `GET /collections/series`; com **Cada coleta**, registra `GET /collections` (várias páginas para um dia inteiro). **Inventory Sync** → "Nenhuma coleta desta estação no período escolhido" (o backend falso não devolve coletas de serviço sem métricas). Abrir `/emissoes?de=lixo` → cai em hoje. Abrir `/emissoes?servico=fraud-detector&de=2026-08-01&ate=2026-10-20` (81 dias) → abre só 01/08/2026, sem erro.
32. **Tempo real** com `VITE_REFRESH_INTERVAL_MS=5000` → o selo "Última atualização" muda a cada 5 s, com "intervalo: 5 s", e o logo pulsa; trocar de aba pausa as chamadas no terminal do mock.
33. Com o resumo na tela, parar o mock e clicar em **Atualizar** → aparece o erro com **Tentar novamente**, o selo fica laranja ("Desatualizado desde …") e os números do resumo e da Leitura do período ficam apagados. Ainda com o mock parado, trocar a estação → "Aguardando a primeira atualização" e o erro, sem resumo. Subir o mock e clicar em **Tentar novamente** → a tela volta ao normal.
34. O subtítulo do cartão mostra o fuso depois da data: "(horário de Brasília)" com o navegador em `America/Sao_Paulo`. Com outro fuso no sistema (ou no DevTools, em Sensors → Location, campo Timezone ID), mostra o deslocamento, ex.: "(UTC−4)" em Nova York, e o `from` da busca muda junto.
35. Em `/emissoes`, passar o mouse (ou tocar) no gráfico → o tooltip mostra o intervalo de 15 min, a soma, a energia, a menor e a maior coleta e "30 coleta(s)"; em **Email Dispatcher**, a faixa vermelha abaixo do eixo marca os intervalos com falha. Pelo teclado: Tab até o gráfico abre o último ponto, ←/→/Home/End percorrem os pontos e Esc fecha o detalhe.
36. Clicar em **Acumulado** → a curva sobe até o fim do período, e o tooltip do último ponto mostra "Acumulado" igual a **Emissão no período**.
37. No dashboard, abrir um serviço e clicar em **Ver emissões deste serviço** → abre `/emissoes?servico=<id>` com essa estação; o voltar do navegador retorna ao dashboard.
38. Sem `.env`, clicar em **Comparação** no menu → abre `/comparacao` sem serviços marcados e com "Escolha pelo menos dois serviços". Marcar só um e clicar em **Comparar** → "Escolha pelo menos dois serviços para comparar.", sem busca.
39. Marcar **Fraud Detector**, **Reporting Batch** e **Inventory Sync** e clicar em **Comparar** → a URL ganha `servicos`, `de` e `ate`, e a tabela mostra os três lado a lado, com o período escrito acima. **Fraud Detector** aparece com "maior CO₂e" e **Reporting Batch** com "menor CO₂e", acima do nome; **Inventory Sync**, com todas as coletas com falha e "—" nas métricas. O botão voltar do navegador volta à tela sem escolha. Com o `.env` do passo 4 e `npm run mock` no ar, a mesma escolha compara os dados do backend falso, sem erro; **Inventory Sync** aparece como "sem coletas".
40. Com o backend real, escolher uma data sem coletas (ex.: anterior à primeira subida do banco) → cada serviço aparece como "sem coletas", sem destaque de menor ou maior CO₂e. Parar o backend e clicar em **Comparar** → só o erro com **Tentar novamente**, sem tabela.
41. Com 375 px de largura → a página não ganha rolagem lateral; só a tabela rola na horizontal.
42. Na comparação do passo 39 → abaixo da tabela, os gráficos **Energia (kWh)** e **CO₂e (g)**, com os três serviços na ordem das colunas e os mesmos valores da tabela. No CO₂e, **Fraud Detector** tem a barra laranja e "↑" antes do nome, e **Reporting Batch**, a verde com "↓"; a legenda abaixo dos gráficos explica as setas. **Inventory Sync** aparece como "sem cálculo", sem barra, nos dois gráficos.
43. Com o backend real, na data sem coletas do passo 40 → os dois gráficos mostram "sem coletas" em cada serviço, sem trilho nem barra, e a legenda fica sem as setas. Com dados, conferir os valores com `curl -s "http://localhost:3000/api/services/compare?ids=1,2&from=<início em ISO>&to=<fim em ISO>" | jq '.services[] | {name, energyKwh, co2eGrams}'` → os gráficos mostram os mesmos números arredondados como na tabela (4 casas em kWh e 2 em g).
44. Com 375 px de largura → os dois gráficos ficam um embaixo do outro, na largura da tela, sem rolagem lateral da página. Com um leitor de tela (ou no DevTools, em Accessibility), cada gráfico é uma imagem com título ("Energia (kWh) por serviço") e descrição com o valor de cada serviço.
45. Com o `.env` do passo 4, `MOCK_SERVICES=sem-id npm run mock` e recarregar o dashboard → a tabela e os cards de estado não aparecem; aparece o aviso grande "O servidor respondeu num formato inesperado (services[3].id). Avise a equipe do backend." com **Tentar novamente**, e o selo fica em "Aguardando a primeira atualização". O painel de indicadores vem de outra rota, `GET /services/summary`, e não depende desta resposta.
46. Com o mock normal no ar, carregar o dashboard; depois parar o mock, subir `MOCK_SERVICES=cpu-texto npm run mock` e clicar em **Atualizar agora** → a tabela continua com os dados anteriores, o selo fica laranja ("Desatualizado desde …") e a faixa laranja diz "O servidor respondeu num formato inesperado (services[0].cpuPercent). Avise a equipe do backend. Mostrando dados de HH:MM:SS.". A linha do **Fraud Detector** mantém a CPU da busca anterior, sem o texto. Subir o mock normal e clicar em **Tentar novamente** → a faixa some e o selo volta a "Última atualização".
