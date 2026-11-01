# `<frontend | backend>` — EcoPulse

<!-- Template do agilekit (repo/docs/templates/README-modulo.md). Destino: frontend/README.md ou backend/README.md. Criado no PR que cria o módulo e atualizado no mesmo PR de cada mudança relevante (pasta nova, variável nova, comando novo). Apague as linhas que não se aplicam ao módulo. Substitua os campos `<...>`. -->

`<Uma frase: o que este módulo faz dentro do EcoPulse.>` Stack: `<React + TypeScript (Vite) | Node.js + TypeScript (<framework HTTP>) + pg>`.

## Organização das pastas

| Pasta / arquivo | Responsabilidade |
|---|---|
| `src/pages/` | telas (`ServicesPage`, `DashboardPage`, `RankingPage`, `SettingsPage`) — frontend |
| `src/components/` | componentes reutilizáveis (`ServiceCard`, `StatusBadge`, `LastUpdated`) — frontend |
| `src/services/` | chamadas HTTP ao backend (`api.ts`, `services.service.ts`) — frontend |
| `src/hooks/` | `usePolling`, `useServices` — frontend |
| `src/contexts/` · `src/providers/` | `MonitoringContext` e `MonitoringProvider` (estado global, última atualização, erros) — frontend |
| `src/app.ts` · `src/server.ts` | configuração do servidor e inicialização do coletor — backend |
| `src/db/connection.ts` | pool do `pg` — backend |
| `src/integrations/` | clientes das APIs auxiliares (`metrics-api.ts`, `carbon-api.ts`) — backend |
| `src/domain/` | classes do domínio (cálculo de energia e CO₂e, estados) — backend |
| `src/modules/<recurso>/` | `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts` — backend |
| `src/shared/` · `src/middlewares/` | erros tipados, handler global, autenticação JWT — backend |
| `Dockerfile` | imagem do módulo usada pelo `compose.yaml` |

## Variáveis de ambiente

| Variável | Obrigatória | Padrão (`.env.example`) | Descrição |
|---|---|---|---|
| `<VITE_API_URL>` | sim | `http://localhost:3000` | base da API — frontend |
| `<VITE_REFRESH_INTERVAL_MS>` | não | `30000` | intervalo de atualização do dashboard — frontend |
| `<DATABASE_URL>` | sim | `postgres://ecopulse:ecopulse@postgres:5432/ecopulse` | conexão — backend |
| `<METRICS_API_URL>` / `<CARBON_API_URL>` | sim | `https://metrics.unilaunch.org` / `https://carbon.unilaunch.org` | APIs auxiliares — backend |
| `<COLLECT_INTERVAL_MS>` | não | `60000` | intervalo de coleta — backend |
| `<JWT_SECRET>` | sim | — | segredo dos tokens; nunca versionar o valor real — backend |

## Comandos

```bash
npm ci                 # instalar dependências
npm run dev            # desenvolvimento com recarga (<porta>)
npm run build          # compilar (tsc / vite build)
npm test               # testes
npm run lint           # lint
docker compose up --build <frontend|backend>   # pelo compose, na raiz do repositório
```

## Integração

- **Com o backend (frontend):** todas as chamadas HTTP ficam em `src/services/`; nenhum componente chama `fetch` diretamente. Erros da API viram estado `error` no `MonitoringProvider` e aviso na tela; o polling continua.
- **Com as APIs auxiliares (backend):** `src/integrations/` encapsula URL, timeout (`<ms>`), validação da resposta e erros tipados (`MetricsApiError`, `CarbonApiError`). Falha de uma API não derruba o processo: o serviço fica `unavailable` e a coleta seguinte tenta de novo.
- **Com o PostgreSQL (backend):** só `*.repository.ts` executa SQL, sempre com placeholders (`$1`…); o esquema vem de `database/schema.sql` (ver `database/README.md`).

## Como verificar este módulo isoladamente

1. `<comando ou URL>` → `<resultado esperado>`
2. `<comando ou URL>` → `<resultado esperado>`
