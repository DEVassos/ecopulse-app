# GreenER — ABP 2026-2 (FATEC Jacareí / UniLaunch)

Documento de raciocínio técnico, construído ao longo das conversas iniciais sobre o desafio. Serve como base pra decisões de arquitetura e como referência pro kickoff.

---

## 1. Tema do desafio

Construir uma plataforma web (**GreenER**) que monitora continuamente aplicações de software, estima o **consumo energético** de cada uma e calcula a **emissão aproximada de CO₂ equivalente (CO₂e)**.

A lógica por trás disso (Green Software / Green Computing):

- Software não gasta energia diretamente — o **hardware que roda o software** sim.
- Métricas de infraestrutura (CPU, memória, disco, rede) funcionam como **proxy** de consumo energético. CPU é o principal indicador.
- Consumo estimado (kWh) × fator de intensidade de carbono da região (gCO₂/kWh) = **emissão estimada de CO₂e**.
- Isso existe de verdade no mercado: Cloud Carbon Footprint (AWS/GCP/Azure), Software Carbon Intensity (Green Software Foundation), dashboards de sustentabilidade corporativa (ESG).

O ambiente monitorado é **dinâmico**: serviços podem surgir, sumir, ficar indisponíveis ou parar de exportar métricas — o sistema precisa se adaptar sozinho, sem intervenção manual.

---

## 2. APIs auxiliares fornecidas pelo parceiro

### 2.1 Greener Metrics Aggregator API — `https://metrics.unilaunch.org`

Confirmada via `/openapi.json` real.

**Endpoints:**

| Método | Path | Descrição |
|---|---|---|
| GET | `/health` | Saúde do agregador (uptime, status) |
| GET | `/services` | Lista os serviços atualmente descobertos |
| GET | `/services/{id}` | Detalhes de um serviço específico |
| GET | `/metrics/{service_id}` | Coleta métricas de um serviço |
| GET | `/openapi.json` | Especificação OpenAPI |
| GET | `/docs` | Documentação local (Swagger UI) |

**`GET /services` retorna, por serviço:**
```json
{
  "id": "billing-api",
  "name": "Billing API",
  "location": {
    "region_code": "br-sudeste",
    "country": "Brazil",
    "region": "Sudeste",
    "city": "Sao Paulo",
    "latitude": -23.5505,
    "longitude": -46.6333
  },
  "metrics_path": "/metrics/billing-api"
}
```
- `location` já vem completa (país, região, cidade opcional, lat/long) → **resolve RF12 e RF13 sem geocodificação própria.**
- Repare: **não há campo `status` explícito** na resposta de `/services`. O status precisa ser inferido a partir do comportamento de `/metrics/{id}` (ver seção 3).

**`GET /metrics/{service_id}` retorna:**
```json
{
  "collection_interval_seconds": 27,
  "metrics": {
    "cpu_percent": 62.67,
    "memory_gb": 3.17,
    "disk_gb": 19.26,
    "network_gb": 0.45
  }
}
```

**Comportamento de erro documentado:**

| Situação | HTTP | Significado |
|---|---|---|
| Serviço listado, métricas ok | `200` | Normal |
| Serviço não existe no registro | `404` | Removido / não encontrado |
| Serviço listado mas indisponível/sem exportador | `500` | Indisponibilidade |

> ⚠️ **Ponto em aberto pro kickoff**: o schema define `ServiceStatus` como enum (`available`, `unavailable`, `metrics_missing`), mas esse campo não aparece no retorno real de `/services`. Confirmar com o parceiro se isso é intencional (status sempre inferido pelo cliente) ou se falta implementar/documentar.

### 2.2 Greener Carbon Intensity API — `https://carbon.unilaunch.org`

Ainda não testada/documentada nas conversas. Próximo passo: repetir o processo (`/openapi.json`) feito com a Metrics API.

---

## 3. Lógica de reconciliação (RF02, RF05, RF06)

Em vez de hardcodar nomes de serviços, o sistema deve tratar o `/services` como **fonte da verdade do momento** e comparar contra o estado salvo no banco a cada ciclo de coleta.

**Algoritmo, por ciclo (tick do poller):**

1. Chamar `GET /services` → lista de ids presentes **agora**.
2. Buscar no Postgres a lista de ids marcados como "conhecidos" na rodada anterior.
3. Comparar as duas listas (teoria de conjuntos, sem nomes fixos):
   - Id novo (está na lista atual, não estava na anterior) → **inserir** no banco (RF02 — inclusão).
   - Id que sumiu (estava na anterior, não está na atual) → **marcar como removido/inativo** (RF02 — remoção).
   - Id presente nas duas → segue pro passo 4.
4. Para cada id ainda existente, chamar `GET /metrics/{id}`:
   - `200` → status `available`, salvar métricas.
   - `500` → status `unavailable` (RF05).
   - `404`:
     - Se o id **ainda apareceu no `/services` desta rodada** → status `metrics_missing` (RF06 — listado mas sem métricas).
     - Se o id **não apareceu mais no `/services`** → já tratado no passo 3 como removido; não deveria nem chegar a chamar `/metrics/{id}`.

**Por que isso funciona independente de quantos/quais serviços existirem:**
- Nunca há `if id == "algum-nome-fixo"` no código — o sistema só reage ao conjunto de ids retornado a cada chamada.
- Serviço novo com nome diferente amanhã? Funciona sem alteração de código.
- Serviço some e reaparece depois? O ciclo trata automaticamente.
- Cada rodada é uma "foto" do estado → alimenta o histórico (RF10) de graça.

---

## 4. Estrutura de dados sugerida (Postgres, sem ORM)

Duas tabelas principais:

- **`services`** — uma linha por id, sempre atualizada. Reflete o **estado atual** (nome, localização, status, última vez visto).
- **`service_readings`** (ou `metrics_history`) — uma linha por coleta, **somente inserção** (nunca update). Guarda cada leitura com timestamp. Alimenta:
  - Histórico temporal (RF10)
  - Ranking de impacto (RF14)
  - Comparação entre serviços (RF15)

---

## 5. Perguntas levantadas pro kickoff

### APIs
- APIs já estão no ar hoje ou só liberam após o kickoff?
- Precisa de autenticação/API key?
- `/services` retorna sempre os mesmos serviços ou muda entre equipes/sessões?
- Existe rate limit nas chamadas?
- O fator de intensidade de carbono é estático (cacheável) ou varia em tempo real?
- **Confirmar se 404 em `/metrics/{id}` pode ocorrer mesmo com o serviço ainda listado em `/services`**, ou só quando ele já saiu do registro — isso valida (ou não) a lógica da seção 3.
- Confirmar se o campo `status` (enum `ServiceStatus`) algum dia aparece em `/services`, já que hoje não aparece no schema real de retorno.

### Cronograma
- Datas de sprint review (19/10, 09/11, 23/11) já confirmadas?
- Data prevista pra apresentação final?
- Como funciona a avaliação de cada sprint review?

### Escopo do MVP
- O que conta como "evidência documental" aceitável (RP05)?
- Mapa geográfico (RF13) é diferencial ou esperado no MVP mínimo?
- Até onde vai o "histórico de coletas" no MVP — só salvar, ou já precisa virar gráfico?

### Restrições técnicas
- Sem ORM (RP03): pode usar query builder (ex: Knex) ou tem que ser SQL puro via driver `pg`?
- Banco também precisa rodar em container Docker (RP04)?
- Padrão de nomenclatura de branch/commit definido pelo parceiro ou livre?

### Comunicação
- Canal de comunicação com o parceiro entre sprints (Slack, WhatsApp, e-mail)?
- Indisponibilidade da API fora do horário comercial é esperada (RNF04 já prevê) ou deve ser reportada?

---

## 6. Restrições de projeto (do edital, RP01–RP07)

- **RP01**: Frontend obrigatoriamente React + TypeScript.
- **RP02**: Backend obrigatoriamente Node.js + TypeScript, módulos/controllers/services.
- **RP03**: Banco obrigatoriamente PostgreSQL, DDL/DML explícito, **sem ORM**.
- **RP04**: Execução exclusivamente via containers Docker.
- **RP05**: MVP compatível com o tempo do semestre (navegação completa, respostas estruturadas, evidências documentais).
- **RP06**: Autenticação da área de configuração via JWT, implementada **no backend** (não vale só frontend).
- **RP07**: Backlog priorizado + critérios de aceitação; sprint reviews com demonstração e registro de feedback.

---

## 7. Próximos passos

1. Testar `carbon.unilaunch.org/openapi.json` (mesmo processo feito com a Metrics API).
2. Rodar `curl https://metrics.unilaunch.org/services` de verdade e validar o schema com dado real.
3. Fechar o DDL (schema SQL) das tabelas `services` e `service_readings`.
4. Escrever o algoritmo de reconciliação (poller) em TypeScript, comentado linha a linha.
5. Levar as perguntas da seção 5 pro kickoff (28/09, 20h).