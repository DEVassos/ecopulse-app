# Cálculos e unidades do modelo

Contrato de dados do RF07, previsto para a Sprint 2 (#18) e adiantado na issue #133 (PR #139). O motor de cálculo está em `backend/src/domain/carbon-calculator.ts` e é chamado pelo coletor (`backend/src/jobs/collector.ts`) a cada coleta válida; os resultados ficam gravados na própria coleta. Decisão do modelo em [ADR 0006](adr/0006-modelo-potencia-fatores-emissao.md).

## Fonte e fórmula

Fonte original: [documentação do desafio](contexto/greener-documentacao-do-desafio.pdf), pp. 5–7. Modelo simplificado padronizado, não medição elétrica direta. Constantes usadas no exemplo oficial: CPU_MAX_WATTS = 100 W; RAM_WATTS_PER_GB = 0,375 W/GB; DISK_WATTS_PER_GB = 0,01 W/GB; NETWORK_WATTS_PER_GB = 0,02 W/GB. Sem versionamento/configuração de coeficientes nesta tarefa.

```text
P (W) = (cpu_percent / 100) × 100
      + memory_gb × 0,375
      + disk_gb × 0,01
      + network_gb × 0,02
E (kWh) = P × collection_interval_seconds / 3.600.000
C (gCO₂e) = E × carbon_intensity_gco2e_per_kwh
```

As métricas de entrada são as mesmas gravadas na coleta, já arredondadas à escala das colunas (CPU com 2 casas, GB com 9); o valor original fica no JSON bruto. O fator de carbono vem da API de intensidade com cache de 1 h por região (decisão do PO na #17): coletas da mesma região dentro dessa hora usam o mesmo fator, e a intensidade efetivamente usada fica gravada em `carbon_intensity_gco2e_per_kwh`. Sem fator válido, o cálculo fica `indisponivel` com energia e emissão `NULL`, nunca zero.

Tempo é o intervalo positivo da API por coleta, não o polling da tela. Memória/disco/rede são GB declarados pelo contrato, sem definição decimal/binária: não presumir GiB nem converter para bytes. Rede não é reinterpretada como taxa por segundo. Snapshot regional e intensidade utilizada são preservados na coleta. JSON bruto preserva a entrada original, sem copiar manualmente os resultados/fatores. Desconhecido é NULL; zero é conhecido.

## Exemplos sem arredondamento intermediário

CPU 50%; RAM 2 GB; disco 10 GB; rede 1 GB; 60 s; intensidade 85 gCO₂e/kWh:

```text
P = 50 + 0,75 + 0,10 + 0,02 = 50,87 W
E = 50,87 × 60 / 3.600.000 = 0,000847833333… kWh
C = E × 85 = 0,072065833333… gCO₂e
```

O PDF aproxima 60/3600 h para 0,0167 h, chegando a aproximadamente 0,0008495 kWh e 0,0722 g. Aqui usamos segundos exatos. Emissão deve ser calculada com intermediários completos; não usar energia arredondada para persistência nem arredondar potência intermediária antes de derivar energia.

OpenAPI: CPU 62,67%; RAM 3,17 GB; disco 19,26 GB; rede 0,45 GB; 27 s; fator 85. P = 64,06035 W; E = 0,000480452625 kWh; C = 0,040838473125 g.

Carga pequena: CPU/RAM/disco zero, rede 1 GB → P = 0,02 W. Em 27 s: E = 0,00000015 kWh. Com fator 85: C = 0,00001275 g; com fator 0,1: C = 0,000000015 g. Todos esses resultados positivos são preservados nas novas escalas.

## Precisão SQL e limites

A regra local pede numeric com escala definida e cita numeric(14,6) como convenção, sem proibição explícita de outras escalas. A precisão foi ampliada a pedido de Vinicius, depois da revisão do schema; a regra do kit não foi alterada. Energia numeric(20,12) mantém oito dígitos inteiros; emissão numeric(24,12) mantém doze, ampliando a faixa para o produto pelo fator regional. A escala da emissão evita perder valores pequenos em regiões com fator baixo. Intensidade e potência permanecem numeric(14,6); GB numeric(20,9); CPU numeric(5,2).

| Campo | Tipo | Resolução | Maior valor positivo |
|---|---|---|---|
| energy_kwh | numeric(20,12) | 0,000000000001 kWh | 99.999.999,999999999999 kWh |
| co2e_grams | numeric(24,12) | 0,000000000001 g | 999.999.999.999,999999999999 g |
| power_watts e intensidade | numeric(14,6) | 0,000001 na unidade do campo | 99.999.999,999999 |

| Exemplo | Valor antes da persistência | Valor persistido |
|---|---|---|
| Energia oficial, segundos exatos | 0,000847833333… | 0,000847833333 |
| Emissão oficial | 0,072065833333… | 0,072065833333 |
| Energia OpenAPI | 0,000480452625 | 0,000480452625 |
| Emissão OpenAPI | 0,040838473125 | 0,040838473125 |
| Energia 0,02 W em 27 s | 0,00000015 | 0,000000150000 |
| Emissão dessa carga, fator 85 | 0,00001275 | 0,000012750000 |
| Emissão dessa carga, fator 0,1 | 0,000000015 | 0,000000015000 |

Quantização final de energia/emissão: até 0,0000000000005 na unidade por linha. Para N coletas, soma dos erros de armazenamento limitada a N × 0,0000000000005, sem considerar erros das entradas, fator/modelo ou cálculo anterior. Valores positivos abaixo de meia unidade de resolução ainda podem virar zero; valores na fronteira da faixa podem causar overflow ao arredondar. Não prometemos precisão universal nem suporte ao produto de todos os máximos possíveis de energia e intensidade.

A intensidade em seis casas também pode perder valores inferiores a 0,0000005 g/kWh; os exemplos documentados 85 e 0,1 são representáveis. Potência persistida é arredondada para seis casas, mas o `CarbonCalculator` usa o intermediário completo para calcular energia e emissão: o arredondamento só acontece na persistência. Verificar limites antes de gravar; falha de precisão/faixa não é medição zero. O fator externo não possui limite universal documentado.

## Agregação de coletas pequenas

1.000 coletas de 0,00000015 kWh somam 0,00015 kWh. Com intensidade 85, emissão total 0,01275 g; com intensidade 0,1, total 0,000015 g. SUM em PostgreSQL opera sobre numeric, sem converter para float; a soma pode superar a faixa de uma coluna individual e não deve ser forçada de volta ao mesmo typmod sem verificar overflow.

No exemplo oficial periódico, 1.000 linhas de energia já persistida somam 0,847833333 kWh, contra 0,847833333333… do cálculo sem quantização. O desvio aproximado 0,000000000333… kWh está abaixo do limite de 0,0000000005 kWh para 1.000 linhas. É um teste de armazenamento/agrupamento, não entrega de ranking/comparação da Sprint 3.

## Intensidade de carbono por região

`GET https://carbon.unilaunch.org/regions` devolve as regiões com `code`, `country`, `region`, `city`, `latitude`, `longitude`, `carbon_intensity_gco2e_per_kwh` e `renewable_share_percent`. Retrato consultado em 11/11/2026 (`jq '.total'` → 5):

| `code` | Cidade | Intensidade (g CO₂e/kWh) | Renovável (%) | Rede limpa (≤ 100 g/kWh) |
|---|---|---|---|---|
| `ca-central` | Toronto | 40 | 89 | sim |
| `br-sudeste` | São Paulo | 85 | 83 | sim |
| `eu-west` | Dublin | 295 | 38 | não |
| `us-east` | Ashburn | 378 | 26 | não |
| `jp-east` | Tokyo | 465 | 22 | não |

É um retrato: a API é externa e pode mudar sem aviso. O fator que vale para uma coleta continua sendo o gravado em `collections.carbon_intensity_gco2e_per_kwh` no momento da coleta, com cache de 1 h por região; esta tabela serve para comparar regiões e para a simulação, nunca para substituir o fator já persistido. A ordem "mais limpa primeiro" usada nas telas é a desta tabela; empate desempata por `code` em ordem alfabética.

## Simulação de migração regional

A pergunta é qual o impacto de mover um serviço para uma região mais limpa. A simulação troca **somente** o fator regional: carga de trabalho, hardware e intervalo de coleta ficam iguais, então a energia do período é preservada.

```text
E_período (kWh)    = SUM(energy_kwh)  das coletas com calculation_status = 'disponivel' no período
CO₂e_real (g)      = SUM(co2e_grams)  mesmo filtro
CO₂e_simulado (g)  = E_período × intensidade_destino (g/kWh)
redução (g)        = CO₂e_real − CO₂e_simulado
redução (%)        = 100 × redução ÷ CO₂e_real, quando CO₂e_real > 0
```

O `CO₂e_real` é a **soma do que foi gravado**, não `E_período × intensidade_atual`: com cache de 1 h, um período mais longo que 1 h pode ter mais de uma intensidade, e refazer a conta com o fator de agora daria um número que nunca foi medido.

`redução` é **com sinal**. Destino mais sujo que a origem resulta negativo e a tela mostra "aumento de X g (Y %)", nunca uma "redução" negativa. O destino padrão é a região de **menor intensidade entre todas as regiões da API** (hoje `ca-central`, 40 g/kWh), inclusive as que não têm serviço. Serviço cuja região não está na lista da API não tem "atual" para comparar: a tela lista as demais como destino e não promete redução.

Ressalvas que a tela declara ao lado do número: a estimativa não considera latência, custo de nuvem, disponibilidade, mudança de hardware ou de arquitetura, nem a energia gasta para mover os dados. É ordem de grandeza para decisão, não medição.

Sem dado, não há número: sem energia ou sem `CO₂e_real` no período a tela mostra "sem dado no período". Região de destino sem fator fica indisponível na lista, nunca com 0 g. `CO₂e_real = 0` não tem percentual — mostra a redução em gramas e "percentual não calculável".

Exemplo conferível à mão — serviço em `us-east` (378 g/kWh) com `E_período` = 0,050 kWh:

| Destino | Intensidade | CO₂e simulado | Redução | Resultado na tela |
|---|---|---|---|---|
| (origem) `us-east` | 378 | 0,050 × 378 = 18,90 g | — | `CO₂e_real` = 18,90 g |
| `ca-central` | 40 | 0,050 × 40 = 2,00 g | 16,90 g | redução de 89,42 % |
| `br-sudeste` | 85 | 0,050 × 85 = 4,25 g | 14,65 g | redução de 77,51 % |
| `jp-east` | 465 | 0,050 × 465 = 23,25 g | −4,35 g | aumento de 23,02 % |

Percentual arredondado a 2 casas só na exibição: 16,90 ÷ 18,90 = 0,894179…, 14,65 ÷ 18,90 = 0,775132…, 4,35 ÷ 18,90 = 0,230158…

## Eficiência energética e de carbono

Sem dado de carga de trabalho (requisições, jobs, usuários), eficiência aqui significa **quanta potência o serviço gasta para estar no ar** — e é isso que a tela precisa dizer, em vez de sugerir eficiência por unidade de trabalho.

```text
segundos monitorados  = SUM(collection_interval_seconds) das mesmas coletas de E_período
                        (calculation_status = 'disponivel'), não das coletas com status = 'ok'
P_média (W)           = E_período (kWh) × 3 600 000 ÷ segundos monitorados
eficiência de carbono = intensidade da região (g CO₂e/kWh), menor é melhor
```

`P_média` é a média **ponderada pelo tempo**, não `AVG(power_watts)`: como `E = P × Δt ÷ 3 600 000`, somando as coletas `Σ P·Δt = E × 3 600 000` e `P_média = Σ P·Δt ÷ Σ Δt`. Com intervalos iguais as duas contas coincidem; com intervalos diferentes, só a ponderada está certa — e é por isso que a rota precisa devolver os segundos monitorados, coisa que nenhuma rota faz hoje.

Numerador e denominador têm de sair do **mesmo conjunto de coletas**, e o conjunto é o de `E_período` (`calculation_status = 'disponivel'`). Somar o tempo das coletas `status = 'ok'` e a energia das calculadas mistura dois conjuntos: uma coleta `ok` sem fator tem energia `NULL`, entra no tempo e não entra na energia. Com 1 h da API de carbono fora em 24 h a 20 W, a conta misturada dá 0,46 × 3 600 000 ÷ 86 400 = 19,17 W em vez de 20 W — o serviço parece mais eficiente exatamente quando a medição falhou.

Exemplos conferíveis à mão:

- 0,48 kWh em 24 h monitoradas: 0,48 × 3 600 000 ÷ 86 400 = **20 W**.
- De volta ao exemplo oficial: 1.000 coletas de 60 s com P = 50,87 W dão `E` = 0,847833333 kWh e 60 000 s; 0,847833333 × 3 600 000 ÷ 60 000 = **50,87 W**, a potência de origem.
- Eficiência de carbono, com o exemplo da seção de simulação (`us-east`, `E_período` 0,050 kWh, `CO₂e_real` 18,90 g): 18,90 ÷ 0,050 = **378 g CO₂e/kWh**, o fator da região. O mesmo serviço em `br-sudeste` daria 4,25 ÷ 0,050 = **85 g CO₂e/kWh**.

`segundos monitorados = 0` (período só com coletas `erro` ou `sem_metricas`) não é potência zero: é "sem dado no período".

### Por que W por % de CPU foi descartado

A razão `P ÷ cpu_percent` foi considerada e recusada. No modelo oficial `P = cpu_percent × 1 W + RAM·0,375 + disco·0,01 + rede·0,02`, logo `P ÷ cpu_percent = 1 + (demais recursos) ÷ cpu_percent`: é **1 W por ponto percentual mais um resíduo**, que no exemplo do OpenAPI vale 1,39035 ÷ 62,67 = 0,0222 — ou seja 1,0222 W por ponto, praticamente igual para todo serviço de CPU dominante. Uma métrica que dá ≈ 1 para todos não ordena nada. Ela ainda quebra em `cpu_percent = 0` (divisão por zero), o que acontece em serviço ocioso. A potência média em W não tem nenhum dos dois problemas, é a mesma grandeza que a coleta já grava em `power_watts` e responde à pergunta sem inventar uma razão.

## Composição da potência por recurso

Os mesmos coeficientes da seção "Fonte e fórmula", decompostos. Exemplo do OpenAPI (CPU 62,67 %; RAM 3,17 GB; disco 19,26 GB; rede 0,45 GB):

| Recurso | Entrada | Coeficiente | Potência (W) | Parcela |
|---|---|---|---|---|
| CPU | 62,67 % | 100 W a 100 % → 1 W por ponto | 62,67 | 97,83 % |
| RAM | 3,17 GB | 0,375 W/GB | 1,18875 | 1,86 % |
| Disco | 19,26 GB | 0,01 W/GB | 0,1926 | 0,30 % |
| Rede | 0,45 GB | 0,02 W/GB | 0,009 | 0,01 % |
| **Total** | | | **64,06035** | **100,00 %** |

A soma das parcelas reproduz a potência da seção principal (64,06035 W). As parcelas usam o intermediário completo; 97,83 + 1,86 + 0,30 + 0,01 fecha 100,00 apenas porque as quatro foram arredondadas juntas. A tela não soma percentuais arredondados: exibe o total em W e calcula cada percentual a partir dos watts.

### A composição de um período sai das médias existentes

Cada parcela é **linear** no recurso, então a média da soma é a soma das médias:

```text
média(P) = Σ_r coef_r × média(x_r)   para r em {CPU, RAM, disco, rede}
```

`GET /api/services/compare` já devolve `avgCpuPercent`, `avgMemoryGb`, `avgDiskGb`, `avgNetworkGb` e `energyKwh`, então a composição de um período pode ser calculada na borda sobre as médias que a rota já devolve, sem coluna nova no banco. A condição é que as quatro médias venham do mesmo filtro — hoje vêm (`WHERE c.status = 'ok'` e o mesmo período); se um recurso ganhar filtro próprio, a igualdade deixa de valer.

Isso garante a **soma das médias**, não a média ponderada pelo tempo. As quatro médias do `/compare` são `AVG(...)` por coleta: com intervalos diferentes, `Σ coef_r × AVG(x_r)` só coincide com `P_média` da seção de eficiência quando todos os intervalos são iguais. Por isso a tela usa a composição para as **parcelas em %** — a proporção entre os recursos não depende do intervalo — e não afirma que o total em W fecha com `P_média`. A média ponderada por recurso (`SUM(x·Δt) ÷ SUM(Δt)`) está pedida na [#327](https://github.com/DEVassos/ecopulse-app/issues/327).

Enquanto `cpu_percent = 0` for valor válido, a parcela de CPU é 0 W e a de RAM pode ser a maior: a barra não pode assumir CPU dominante.

## Limite de "rede limpa"

O limite é o mesmo nos dois casos — 100 g CO₂e/kWh —, mas a intensidade vem de fontes diferentes:

```text
região  (fator de agora)    selo quando a intensidade de GET /api/regions ≤ 100
serviço (fator do período)  selo quando CO₂e_real ÷ E_período ≤ 100, com E_período > 0
```

O caso **região** olha o fator atual e vale mesmo sem coleta no período; é o que a coluna "Rede limpa (≤ 100 g/kWh)" da tabela de regiões marca, inclusive `ca-central`, que não tem serviço. O caso **serviço** usa o fator que as coletas gravaram e responde "este serviço rodou em rede limpa no período?" — um serviço que migrou de região no meio do período pode ter os dois resultados.

A #324 usa o caso **região**: o selo da tabela de serviços e o do painel do mapa vêm de `GET /api/regions` (via `utils/regions.ts`), com a intensidade de agora. O caso serviço ainda não tem rota; a fórmula fica aqui para quando ela existir.

A justificativa é a distribuição das cinco regiões da API, não um número da documentação do desafio: 40, 85, 295, 378 e 465 g CO₂e/kWh, mediana 295. O corte em 100 fica **entre a segunda mais limpa (85) e a terceira (295)**, separando exatamente as duas regiões com ≥ 83 % de renovável das três com ≤ 38 %, e está longe dos cinco valores — uma atualização pequena da API não muda o resultado. É **decisão de produto**, registrada no histórico do plano, e não constante do modelo: quem discordar do número muda o limite, não a fórmula.

Verificação em um comando — `curl -s https://carbon.unilaunch.org/regions | jq -r '.regions[] | "\(.code) \(.carbon_intensity_gco2e_per_kwh)"'` — precisa mostrar valores abaixo de 100 para `ca-central` e `br-sudeste`, e acima de 100 para `eu-west`, `us-east` e `jp-east` (a saída traz os valores como `40.0`, `85.0`, `295.0`, `378.0` e `465.0`). A API devolve as regiões na ordem dela, não em ordem alfabética de `code`; para ordenar, use `jq -r '.regions | sort_by(.code)[] | "\(.code) \(.carbon_intensity_gco2e_per_kwh)"'`.

Sem intensidade não há selo: no caso região, região fora de `GET /api/regions`; no caso serviço, `E_período = 0`, `CO₂e_real` nulo ou região sem fator — os dois casos mostram "sem dado no período", nunca "rede limpa". No caso serviço, um período com mais de uma intensidade (cache de 1 h) usa a intensidade ponderada pela energia, `CO₂e_real ÷ E_período`, que é igual ao fator da região quando ele não mudou no período.

## Como verificar e migrar

[Roteiro reproduzível](arquitetura/verificacao-schema.md) usa PostgreSQL descartável: exemplos acima, agregações, limites, NULL, estados e índices. Schema inicial não migra banco populado: a versão anterior com escala seis é recusada pelo guard. Migração futura deverá ampliar os tipos explicitamente e preservar dados; não consegue recuperar energia já arredondada para zero sem entradas originais confiáveis. Nenhuma migração em banco do usuário foi executada.
