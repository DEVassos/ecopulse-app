# Arquitetura

O EcoPulse tem três partes, que sobem juntas por `docker compose up --build` (#26, #27, #80): o **frontend** (React + TypeScript, servido por nginx), o **backend** (Node.js + TypeScript, Express) e o **PostgreSQL** (volume `pgdata`). O backend só sobe depois do healthcheck do PostgreSQL e se conecta a ele pelo host `postgres` da rede interna. O nome EcoPulse foi aplicado à documentação e às configurações na #68.

## Fluxo de dados

```
Metrics API ──(GET /services, GET /metrics/{id})──► worker (jobs/collector.ts) ──► repositories pg ──► PostgreSQL
Carbon API ───(GET /regions/{code}/carbon-intensity)──►  CarbonCalculator (energia e CO₂e por coleta)
PostgreSQL ──► GET /api/services · GET /api/collections ──(polling do navegador)──► dashboard
```

1. **Coleta** (#19, #99): `jobs/collector.ts` descobre os serviços no agregador, reconcilia o cadastro numa transação (novos, `removido`, reaparecidos) e coleta as métricas de cada serviço no prazo dado pelo intervalo da própria métrica. O HTTP externo fica fora das transações; a coleta e o estado do serviço são gravados juntos, e a falha de um serviço não interrompe os demais.
2. **Cálculo** (#133, #139): para cada coleta válida, o coletor consulta a intensidade de carbono da região (`integrations/carbon-api.ts`, com cache de 1 h por região, #17) e calcula potência, energia e CO₂e com o `CarbonCalculator` (`domain/carbon-calculator.ts`). Sem fator válido, a métrica é preservada e o cálculo fica `indisponivel`, sem valor estimado. Fórmulas em [cálculos](calculos.md); decisão em [ADR 0006](adr/0006-modelo-potencia-fatores-emissao.md).
3. **Consulta** (#111, #112): `GET /api/services` devolve os serviços com estado, localização e a última coleta (métricas, energia e CO₂e); `GET /api/collections` devolve o histórico com filtros. O CORS libera só as origens de `CORS_ORIGIN` (#118). Contrato em [api.md](api.md).
4. **Exibição** (#22, #23, #131): o dashboard repete as consultas no intervalo de `VITE_REFRESH_INTERVAL_MS`, sem recarregar a página, e mostra "Última atualização" e o intervalo.

## Backend

Camadas por módulo (`health`, `services`, `collections`, `usuarios`): **routes** só mapeiam a URL → **controller** valida a entrada e escolhe o status HTTP → **service** monta a resposta → **repository** tem o SQL (`pg`, parâmetros `$1…$n`, sem ORM). `config/env.ts` é o único ponto que lê o ambiente; `shared/errors.ts` define `AppError` e as subclasses, incluindo `UnauthorizedError` (401), além de 400, 404, 500 e 502; `middlewares/error-handler.ts` converte qualquer erro no envelope `{"error":{"code","message"}}`, sem stack. O boot valida o ambiente, consulta o banco, abre o HTTP e só então inicia o coletor; SIGTERM para o coletor e fecha HTTP e pool. Organização, variáveis e verificação no [README do backend](../backend/README.md).

O login administrativo usa JWT no backend e a tabela `users` (#20). Em volume PostgreSQL novo, `zz-seed-admin.sh` cria um administrador com `ADMIN_EMAIL` e hash bcrypt da senha fornecida em `ADMIN_PASSWORD` (#6); nenhum segredo ou hash fixo é versionado. A área de configuração e a consulta de entradas usarão o mesmo middleware quando forem implementadas. O intervalo externo de coleta vem de cada observação; o intervalo de atualização da tela é configuração independente do frontend (`VITE_REFRESH_INTERVAL_MS`).

## Frontend

React + TypeScript com Vite (ADR 0004), servido por nginx no compose (ADR 0005). Detalhes e passos de verificação no [README do frontend](../frontend/README.md).

- `pages/`: `DashboardPage` monta a tela de serviços e a janela de detalhes; `SettingsPage` é a rota reservada à configuração, que só ganha conteúdo com o login da Sprint 2. As páginas não fazem HTTP nem guardam timer; de `services/` importam só o indicador de modo demonstração.
- `components/`: `ServicesTable` (estado com texto, localização, CPU, energia, emissão e última leitura, com busca e ordenação), `ServiceDetailsDialog` e `CollectionsHistoryTable` (histórico do serviço, #131), `LastUpdated` (selo "Última atualização · intervalo"), `StatusBadge`, `MissingValue` e os estados de carregando, erro e vazio.
- `hooks/`: `useServices` e `useCollections` guardam dado, carregamento, erro e horário da última busca e repetem a busca por `usePolling`, que agenda a próxima só depois que a anterior termina, pausa com a aba oculta e cancela a requisição pendente ao sair (`AbortController`). `useMonitoring` lê o contexto.
- `services/`: único lugar com HTTP. `api.ts` (base `VITE_API_URL`; erros `{ error: { code, message } }` viram `ApiError`), `services.service.ts` (`GET /services`) e `collections.service.ts` (`GET /collections`). Esses dois conferem o JSON contra o contrato de `api.md` com os leitores de `contract.ts` antes de entregá-lo aos hooks (#161): resposta fora do contrato vira `ApiError` e segue o mesmo caminho de uma falha de rede. Sem `VITE_API_URL` no build, devolvem os dados de demonstração de `demo-data.ts`, e a tela mostra uma faixa avisando que são ilustrativos.
- `contexts/` e `providers/`: `MonitoringProvider` (em `App.tsx`, acima das rotas) lê `VITE_REFRESH_INTERVAL_MS` uma vez e entrega o intervalo pelo `MonitoringContext`: padrão 30 s, limitado entre 5 s e 2.147.483.647 ms (o maior atraso do `setTimeout`).

Fluxo de uma atualização: `usePolling` dispara → `useServices` chama `fetchServices` → backend `GET /api/services` → estado novo → a tabela e o selo "Última atualização" mudam sem recarregar a página. Uma falha mantém o último dado na tela, mostra o aviso com "Tentar novamente" e marca o selo como desatualizado.

## Modelo de dados

Fonte física: [schema.sql](../database/schema.sql). Modelos persistente/OO e sequências: [UML](arquitetura/modelagem-uml.md).

| Tabela | Responsabilidade | Relações |
|---|---|---|
| services | ID interno BIGINT, external_id textual único, cadastro, region_code e estado atual. | 1 serviço para 0..N coletas. |
| collections | Métricas normalizadas em GB, intervalo, snapshot regional, intensidade usada e resultados disponíveis. | service_id obrigatório, FK RESTRICT. |
| users | Email e hash bcrypt para o acesso administrativo futuro. | Sem propriedade de serviços/coletas. |
| access_entries | Somente ID técnico, IP e instante de entrada. | Sem FK de usuário. |

CPU, GB e intervalo positivo são obrigatórios quando status=ok. Status de métricas (ok/erro/sem_metricas) é independente de calculation_status (nao_calculado/disponivel/indisponivel). Sem cálculo, campos ambientais ficam nulos; falha de carbono preserva métricas e não usa emissão zero. Quando disponível, cálculo exige região histórica, intensidade e resultados completos. JSONB preserva a resposta bruta, sem duplicação manual de todo o modelo.

## Histórico e falhas

Energia usa numeric(20,12) e emissão numeric(24,12), mantendo 0,00000015 kWh por coleta e resolução de 10⁻¹² em ambas. Intensidade/potência permanecem numeric(14,6). Quatro índices explícitos somam-se aos cinco automáticos das quatro PKs e UNIQUE externo: nove no total. Casos de uso atuais constam na UML, com dashboard público e consulta/configuração autenticadas, sem ampliar a auditoria.

Cada coleta é uma nova linha. FK impede excluir serviço referenciado, mas somente inserção de coletas é regra dos repositories/permissões, não trigger implementado. Os UPDATEs de `services` atribuem `updated_at = now()`. Região e intensidade de cada coleta não são consultadas retrospectivamente no cadastro atual.

Falha de descoberta não autoriza remover todos os serviços. Semântica externa de 404/500 permanece ambígua; o contrato documentado foi corrigido para explicitar essa pendência. Ausência de coordenadas não invalida o serviço/métricas.

## Entrada simples e autorização

Primeira abertura por sessão de navegação em uma aba; reload e navegação interna não geram nova entrada. Sem polling ou worker. Backend observa IP considerando só proxies confiáveis e define horário; IP não equivale à identidade de pessoa. Consulta por responsáveis autorizados usa JWT administrativo, período/paginação e não cria outro evento de entrada. Sem perfis adicionais, tenants, logs HTTP ou tentativas de login. Tabela e fluxos modelados por solicitação de Vinicius; issue/sprint/retencão e mecanismo continuam pendentes, sem aprovação presumida do PO.

## Inicialização e evolução

Schema inicial em transação, reaplicável ao mesmo modelo. Banco anterior com bytes é recusado pelo guard; precisa de migração numerada conforme ADR 0002, sem conversão presumida nem remoção de dados. No `compose.yaml` (#27), o serviço `postgres` (16-alpine) aplica `schema.sql` e o seed idempotente do administrador na primeira criação do volume nomeado `pgdata`, que preserva os dados entre reinícios; só `docker compose down -v` os apaga. Comandos de validação isolada: [README do banco](../database/README.md). Precisão e fontes: [cálculos](calculos.md).
