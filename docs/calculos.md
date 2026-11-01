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

## Como verificar e migrar

[Roteiro reproduzível](arquitetura/verificacao-schema.md) usa PostgreSQL descartável: exemplos acima, agregações, limites, NULL, estados e índices. Schema inicial não migra banco populado: a versão anterior com escala seis é recusada pelo guard. Migração futura deverá ampliar os tipos explicitamente e preservar dados; não consegue recuperar energia já arredondada para zero sem entradas originais confiáveis. Nenhuma migração em banco do usuário foi executada.
