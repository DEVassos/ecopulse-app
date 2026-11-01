# Cálculo de energia e emissão de CO₂e

<!-- Template do agilekit (repo/docs/templates/calculos.md). Destino: docs/calculos.md. Dono: PO com o dev backend. Criado no PR que implementa RF07 (Sprint 2); os valores aqui precisam bater com o código em backend/src/domain/ e com o que o dashboard exibe. Substitua os campos `<...>`. -->

## 1. O que é estimado

Para cada serviço monitorado, o EcoPulse estima o **consumo energético** (kWh) a partir das métricas coletadas e converte em **emissão de CO₂ equivalente** (gCO₂e) usando a intensidade de carbono da região onde o serviço está hospedado. Os valores são estimativas: o agregador fornece métricas de uso, não medições de energia.

## 2. Fórmulas

### 2.1 Potência instantânea estimada

```
P(t) = P_idle + (P_max − P_idle) × (cpu_percent(t) / 100)          [W]
```

| Símbolo | Significado | Valor adotado | Fonte |
|---|---|---|---|
| `P_idle` | potência do servidor ocioso | `<x>` W | `<referência: SPECpower, Cloud Carbon Footprint>` |
| `P_max` | potência do servidor a 100% de CPU | `<y>` W | `<referência>` |
| `cpu_percent(t)` | uso de CPU na coleta | métrica do agregador | `GET /metrics/{id}` |

Ajuste opcional por memória: `P_mem(t) = memory_mb(t) / 1024 × <w> W/GB` (fonte `<referência>`), somado a `P(t)` quando a métrica existe.

### 2.2 Energia no período

```
E = Σ_i  P(t_i) × Δt_i / 1000 / 3600          [kWh]
```

onde `Δt_i` é o intervalo em segundos entre a coleta `i` e a anterior (limitado a `<2 × COLLECT_INTERVAL>` para não inflar lacunas de coleta). Coletas com estado `unavailable` ou `no-metrics` não somam energia e são contadas separadamente.

### 2.3 Emissão de CO₂e

```
CO2e = E × I_região          [gCO₂e]
```

| Símbolo | Significado | Fonte |
|---|---|---|
| `I_região` | intensidade de carbono da rede elétrica (gCO₂e/kWh) da região do serviço | Greener Carbon Intensity API (https://carbon.unilaunch.org/docs), consultada a cada `<Z>` min e armazenada em `estimates.carbon_intensity` |
| fator padrão | usado quando a API de carbono falha ou a região não é reconhecida | `<valor>` gCO₂e/kWh (`<fonte: média mundial/IEA>`), marcado como `fallback` na resposta |

## 3. Unidades

| Grandeza | Unidade interna (banco/API) | Unidade exibida |
|---|---|---|
| Potência | W | W |
| Energia | kWh | kWh (ou Wh quando < 1 kWh) |
| Intensidade de carbono | gCO₂e/kWh | gCO₂e/kWh |
| Emissão | gCO₂e | gCO₂e (ou kgCO₂e quando ≥ 1000 g) |

## 4. Período considerado

- Dashboard e indicadores agregados: **últimas 24 h** por padrão (`?from`/`?to` em `/collections` e `/services/:id`).
- Ranking e comparação: período escolhido pelo usuário (`1h`, `24h`, `7d`), sempre indicado na tela e na resposta da API (RF14, RF15).
- Indicadores totais somam apenas serviços com coletas válidas no período; serviços indisponíveis entram na contagem "indisponíveis", não na energia.

## 5. Exemplo numérico completo

Serviço `svc-001`, região `sa-east-1` (`I = <I>` gCO₂e/kWh), `P_idle = <x>` W, `P_max = <y>` W, coletas a cada 60 s:

| Coleta | cpu_percent | P(t) (W) | Δt (s) | Energia (Wh) |
|---|---|---|---|---|
| 1 | 20 | `<x + (y−x)×0,20>` | 60 | `<P×60/3600>` |
| 2 | 50 | `<x + (y−x)×0,50>` | 60 | `<...>` |
| 3 | 80 | `<x + (y−x)×0,80>` | 60 | `<...>` |

Energia total `E = <soma>` Wh = `<soma/1000>` kWh → `CO2e = <E_kWh × I>` gCO₂e.

Conferência: `GET /services/1` deve retornar `estimates.energyKwh = <valor>` e `estimates.co2eGrams = <valor>` para o mesmo período; teste unitário em `backend/src/domain/__tests__/carbon-calculator.test.ts` reproduz esta tabela.

## 6. Limitações

- Modelo linear de potência por CPU; não considera rede, disco, GPU nem PUE do data center (pode ser adicionado como fator `<PUE>` configurável).
- A intensidade de carbono é a média da região informada pela API auxiliar, não a mistura horária real.
- Lacunas de coleta (serviço indisponível) subestimam o consumo real; a interface sinaliza o número de coletas perdidas no período.
- As métricas do agregador variam a cada chamada (RF04); a estimativa é tão boa quanto a frequência de coleta.
