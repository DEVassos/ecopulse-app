# ADR 0006 — Modelo de potência e fatores de emissão do cálculo de energia e CO₂e

| Campo | Valor |
|---|---|
| Status | aceito |
| Data | 2026-10-16 |
| Decisores | @henriqueptbd-cell (PO), @LUCASAMR23 (backend) |
| Rastreabilidade | issue #133 (sub-issue de #43, história pai STORY-02/US02) · requisito RF07 (RF08 como destino do mesmo motor) · critério TP01, DW02, BD04 · restrição: ADR 0002 (sem ORM) |

## Contexto e problema

O dashboard já exibe as colunas "Energia (kWh)" e "Emissão (g CO₂e)" (`frontend/src/components/ServicesTable.tsx`), mas elas aparecem sempre vazias: `GET /api/services` devolve `energyKwh` e `emissionsG` sempre `null` (`backend/src/modules/services/services.service.ts`) e `CollectionRepository.insert` grava `calculation_status='nao_calculado'` fixo (`backend/src/modules/collections/collections.repository.ts`). O `database/schema.sql` já tem as colunas de resultado (`carbon_intensity_gco2e_per_kwh`, `power_watts`, `energy_kwh`, `co2e_grams`, `calculation_error_message`) e a constraint `collections_calculation_state_valid`, que define os três estados aceitos. O cliente `backend/src/integrations/carbon-api.ts` (cache de 1 h, timeout de 10 s, validação do contrato) existe e está testado, mas nada o chama em runtime.

Faltam duas decisões: (a) como estimar a potência do serviço a partir das métricas do agregador e (b) de onde vem a intensidade de carbono usada na conversão. Sem decisão, RF07 fica só no papel e as duas colunas do dashboard continuam sem valor.

Restrições reais: RP03/ADR 0002 (sem ORM; SQL só em `*.repository.ts`, parametrizado); o projeto não fabrica fator de emissão em falha (número inventado é pior que número ausente); o coletor roda a cada `POLLING_INTERVAL_MS` (padrão 30 s) para 8 serviços em 5 regiões (`br-sudeste`, `us-east`, `eu-west`, `ca-central`, `jp-east`).

## Fatores de decisão

- TP01: o cálculo precisa viver como classe de domínio em `backend/src/domain/`, testável isolado e chamado pelo coletor.
- RP03/ADR 0002: consultar a API de carbono é I/O de rede, não pode virar SQL fora do repository nem justificar ORM.
- DW02: a API de carbono tem de ser usada de verdade, com timeout, validação de resposta e falha tratada — não basta declarar a integração.
- BD04: as colunas gravadas precisam ser somadas por período (`SUM`, `GROUP BY`) sem reinterpretar unidade nem recalcular fator.
- RNF04: indisponibilidade da API de carbono não pode derrubar o ciclo de coleta nem a resposta de `GET /api/services`.
- Prazo: a demonstração na review de 19/10 só existe se o PR de #133 estiver em `develop` antes do congelamento de 18/10 20h (`docs/plano-de-entregas.md`).
- Reprodutibilidade: o avaliador precisa conferir a conta com um exemplo numérico documentado e uma consulta SQL.

## Opções consideradas

1. Fator de intensidade fixo em constante/configuração global, sem consultar a Carbon Intensity API (`https://carbon.unilaunch.org`).
2. Potência estimada por fórmula a partir das métricas do serviço + intensidade por região obtida na **mesma coleta**, com o cliente `carbon-api.ts` já mergeado, e `calculation_status='indisponivel'` quando o fator não vem.
3. Consultar a intensidade sob demanda no endpoint `GET /api/services`, com cache em tabela do banco.

## Decisão

Escolhemos a **opção 2**, porque é a única que atende RF07/DW02 usando a API do parceiro, mantém o cálculo auditável junto da métrica que o originou e não cria caminho novo de I/O na leitura da API própria.

**Potência (estimativa, não medição do consumo real)** — fórmula do enunciado, já registrada em [`docs/calculos.md`](../calculos.md), com as constantes oficiais do kickoff:

```text
P (W) = (cpu_percent / 100) × 100      (CPU_MAX_WATTS = 100 W)
      + memory_gb × 0,375              (RAM_WATTS_PER_GB = 0,375 W/GB)
      + disk_gb × 0,01                 (DISK_WATTS_PER_GB = 0,01 W/GB)
      + network_gb × 0,02              (NETWORK_WATTS_PER_GB = 0,02 W/GB)
E (kWh) = P × collection_interval_seconds / 3.600.000
C (g CO₂e) = E × carbon_intensity_gco2e_per_kwh
```

- `collection_interval_seconds` é o intervalo da coleta informado pelo agregador (`GET /metrics/{id}`), não o `POLLING_INTERVAL_MS` da tela. Sem arredondar intermediários: quantiza-se só na persistência (potência e intensidade em 6 casas; energia e emissão em 12 casas).

**Origem do fator** — `GET /regions/{code}/carbon-intensity` da Carbon Intensity API (OpenAPI v0.1.0), casado pelo `region_code` de `services` (mesmo valor gravado em `collections.region_code`). Em `GET /regions` (consultado em 16/10/2026) os códigos listados são exatamente os cinco usados pelo agregador, um para um:

| `region_code` | `carbon_intensity_gco2e_per_kwh` |
|---|---|
| `br-sudeste` | 85,0 |
| `us-east` | 378,0 |
| `eu-west` | 295,0 |
| `ca-central` | 40,0 |
| `jp-east` | 465,0 |

O cliente já mergeado fixa cache de 1 h por região (`CACHE_TTL_MS = 3_600_000`) e timeout de 10 s (`TIMEOUT_MS = 10_000`); só respostas válidas entram no cache. Timeout, HTTP diferente de 200, resposta fora do contrato e região ausente (`region_not_found`) nunca produzem fator.

**Gravação** — o cálculo entra na **mesma transação** do `INSERT` da coleta, em `CollectionRepository.insert`, pelo coletor (`backend/src/jobs/collector.ts`), que passa a chamar `createCarbonApi({ baseUrl: env.carbonApiUrl })` na coleta `ok`:

- cálculo ok → `calculation_status='disponivel'` com `carbon_intensity_gco2e_per_kwh`, `power_watts`, `energy_kwh` e `co2e_grams` preenchidos e `calculation_error_message` nulo;
- API fora, timeout, região desconhecida ou serviço sem `region_code` → `calculation_status='indisponivel'`, `carbon_intensity_gco2e_per_kwh` e `co2e_grams` nulos, `power_watts` e `energy_kwh` nulos (nenhum número exibível sem fator), `calculation_error_message` em pt-BR; a coleta continua `status='ok'` (a métrica veio) e o serviço continua `ativo`;
- coleta `erro`/`sem_metricas` → `calculation_status='nao_calculado'` (exigido por `collections_metrics_state_valid`).

Os três casos respeitam `collections_calculation_state_valid` e `collections_metrics_state_valid` em `database/schema.sql`; serviço sem `region_code` também cai em `indisponivel`, porque a constraint exige `region_code IS NOT NULL` para `disponivel`.

**Exposição** — `GET /api/services` passa a devolver `energyKwh` e `emissionsG` numéricos, lidos da última coleta pelo `LEFT JOIN LATERAL` existente de `findAllWithLastReading` (`services.repository.ts`) e tipados como `number | null` em `services.service.ts` — deixa de existir o `null` fixo. Serviço sem coleta, coleta sem cálculo (`nao_calculado`) ou cálculo `indisponivel` continuam `null`.

**Exemplo numérico (verificação do modelo)** — o mesmo exemplo do OpenAPI e do roteiro de `docs/calculos.md`: CPU 62,67 %, memória 3,17 GB, disco 19,26 GB, rede 0,45 GB, intervalo 27 s e intensidade 85 g CO₂e/kWh.

```text
P = 62,67 + (3,17 × 0,375) + (19,26 × 0,01) + (0,45 × 0,02)
  = 62,67 + 1,18875 + 0,1926 + 0,009 = 64,06035 W
E = 64,06035 × 27 / 3.600.000 = 0,000480452625 kWh
C = 0,000480452625 × 85 = 0,040838473125 g CO₂e
```

Persistido com as escalas do esquema: `power_watts = 64.060350`, `energy_kwh = 0.000480452625`, `co2e_grams = 0.040838473125`, `carbon_intensity_gco2e_per_kwh = 85.000000`.

**RF08** — o mesmo motor (potência no domínio, resultados gravados por coleta) é a base dos indicadores agregados: a Sprint 3 soma `energy_kwh` e `co2e_grams` com `SUM`/`GROUP BY` em `collections`, sem recalcular nada.

**Como se materializa no repositório**

- `backend/src/domain/`: classe/função pura do cálculo (potência, energia e CO₂e) com as constantes acima, lançando `ValidationError` em vez de devolver valor fora de faixa — é o alvo de TP01.
- `backend/src/jobs/collector.ts`: buscar a intensidade na coleta `ok` e montar a linha de `collections` com o resultado.
- `backend/src/modules/collections/collections.repository.ts`: `insert` recebe os campos de cálculo (hoje `'nao_calculado'` literal).
- `backend/src/modules/services/services.repository.ts` e `services.service.ts`: expor energia e emissão da última coleta.
- `backend/src/shared/persistence.types.ts`: `NewCollection` e `StoredCollection` passam a modelar `calculation_status` e os campos de resultado.
- `docs/calculos.md`: deixar de dizer que não há motor de cálculo; `docs/api.md`: deixar de dizer que `energyKwh`/`emissionsG` são sempre `null`.

## Consequências

**Positivas**
- RF07 sai do papel: as colunas "Energia (kWh)" e "Emissão (g CO₂e)" do dashboard passam a ter valor, com `period` informado pela API.
- O motor fica isolado no domínio (TP01), testável sem banco e sem rede, e reutilizável por RF08/BD04.
- A decisão reaproveita `carbon-api.ts` já mergeado: nenhuma dependência nova e nenhum SQL novo fora de repository (ADR 0002 intacto).
- Cada coleta guarda a intensidade usada, então o número exibido ontem pode ser reconferido com a consulta SQL do período.
- DW02/DW03 continuam verificáveis por `curl` e por `grep` do uso do cliente no coletor.

**Negativas / custos**
- A coleta passa a depender de duas APIs externas. Se a API de carbono falhar, a linha é salva com `calculation_status='indisponivel'`, `calculation_error_message` preenchido e energia/emissão nulos: a coluna fica vazia em vez de mostrar número errado. Isso precisa estar visível na review e nos docs.
- O cache de 1 h admite fator de até 1 h atrás do valor corrente da API. É aceitável para um indicador horário, o TTL está em `backend/src/integrations/carbon-api.ts` e a ressalva entra em `docs/calculos.md` no PR da #133; não vale para cenários que exijam fator por minuto.
- A potência é estimativa linear documentada pelo enunciado, não medição do consumo real do serviço; o nome das colunas e o texto dos docs não podem sugerir medição.
- Qualquer mudança de unidade ou de escala (por exemplo, tratar `memory_gb` como GiB) invalida os valores já gravados e exige revalidar `numeric(20,12)` (energia) e `numeric(24,12)` (emissão), além de revisar `docs/calculos.md`.
- Cálculo na mesma transação da coleta aumenta o tempo dentro da transação: a chamada HTTP acontece antes, fora dela, e o timeout de 10 s limita a espera.
- Coletas antigas permanecem `nao_calculado` (histórico imutável, fora do escopo de #133): as somas de BD04 só têm valor onde o cálculo rodou.

## Prós e contras das opções

### Opção 1 — Fator fixo em constante/configuração global
- Bom: simples, offline, nenhuma dependência de rede nova e nenhuma linha `indisponivel`.
- Ruim: joga fora a API do parceiro (contraria RF07/DW02), produz número errado fora do Brasil — as regiões vão de 40 (Ontário) a 465 (Tóquio) g CO₂e/kWh — e o avaliador não consegue rastrear a origem do fator.

### Opção 2 — Cálculo na coleta, com o cliente de carbono mergeado (escolhida)
- Bom: fator regional real, auditável junto da métrica, uma chamada por região a cada 1 h (cache), falha vira estado visível, e o motor de domínio serve a RF07 e RF08.
- Ruim: adiciona dependência de rede no caminho da coleta e exige disciplina para o cálculo não derrubar o ciclo nem transformar falha em número.

### Opção 3 — Intensidade sob demanda em `GET /api/services`, com cache em tabela
- Bom: separa responsabilidades, a leitura sempre tentaria o fator mais recente e a coleta não conheceria a API de carbono.
- Ruim: coloca I/O de terceiro no caminho da leitura da API própria (latência e falha visíveis para o dashboard), exige tabela de cache e TTL no banco, e não deixa o fator gravado junto da métrica — a auditoria por período (`SUM` em `co2e_grams`) deixa de ser direta.

## Como verificar que está em vigor

Com o ambiente no ar e pelo menos um ciclo de coleta concluído:

```bash
grep -n "getIntensity\|carbon" backend/src/jobs/collector.ts
curl -s http://localhost:3000/api/services | jq '.services[0] | {energyKwh, emissionsG}'
docker compose exec postgres psql -U ecopulse -d ecopulse_db -c "SELECT calculation_status, count(*) FROM collections GROUP BY 1"
cd backend && npm test
```

Esperado: o `grep` mostra o uso do cliente de carbono no coletor; a resposta traz `energyKwh` e `emissionsG` numéricos (não `null`) para serviços com coleta calculada; o `SELECT` mostra `disponivel` (e `indisponivel` se a API de carbono estiver fora); `npm test` (`vitest run`) confirma o exemplo numérico acima, o exemplo oficial de 60 s de `docs/calculos.md` e os casos de falha.

Conferir os códigos regionais na fonte:

```bash
curl -s https://carbon.unilaunch.org/regions | jq -r '.regions[] | "\(.code) \(.carbon_intensity_gco2e_per_kwh)"'
```

As credenciais acima são os padrões de `compose.yaml`/`.env.example` (`POSTGRES_USER=ecopulse`, `POSTGRES_DB=ecopulse_db`); se o `.env` local usar outros valores, ajuste o `psql`.

## Links

- Issue: [#133](https://github.com/DEVassos/greener-app/issues/133) (sub-issue de [#43](https://github.com/DEVassos/greener-app/issues/43), STORY-02/US02)
- Requisitos: [`RF07`](../requisitos.md) (cálculo individual) · [`RF08`](../requisitos.md) (indicadores agregados)
- Fórmulas, constantes e unidades: [`docs/calculos.md`](../calculos.md)
- Contrato das APIs auxiliares: [`docs/especificacao-api.md`](../especificacao-api.md)
- Critério no plano: [plano de entregas](../plano-de-entregas.md) — TP01 (Sprint 2), DW02 (Sprint 1), BD04 (Sprint 3)
- Restrição relacionada: [ADR 0002](0002-postgresql-pg-sem-orm.md) (PostgreSQL com `pg`, SQL explícito, sem ORM)
- Cliente já mergeado: [`backend/src/integrations/carbon-api.ts`](../../backend/src/integrations/carbon-api.ts)
- Referência externa: https://carbon.unilaunch.org/openapi.json e https://carbon.unilaunch.org/regions
