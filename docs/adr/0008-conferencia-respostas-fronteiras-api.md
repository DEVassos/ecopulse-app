# ADR 0008 — Conferência das respostas nas fronteiras de API

| Campo | Valor |
|---|---|
| Status | proposto |
| Data | 2026-10-30 |
| Decisores | @travensolli (SM, responsável pela #161 e pela #236) |
| Rastreabilidade | issue #236 · frontend: #161 (PR #235) e #237 · épico #41 · requisito RNF04 · critérios TP02, TP03 e DW02 |

## Contexto e problema

O EcoPulse tem duas fronteiras por onde entra JSON vindo de fora do código TypeScript:

1. o **backend** lê as APIs do cliente, a Greener Metrics Aggregator API e a Greener Carbon Intensity API, descritas em [`docs/especificacao-api.md`](../especificacao-api.md);
2. o **frontend** lê a API do próprio EcoPulse, descrita em [`docs/api.md`](../api.md).

Os tipos do TypeScript somem no build ([erased types](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#erased-types)): declarar o tipo da resposta não garante o que o servidor mandou. Nos apontamentos escritos sobre a Sprint 1 (`docs/sprints/sprint-1/review.md` § 3), o cliente mostrou que `frontend/src/services/api.ts` convertia o JSON com `as T`, sem conferir nada.

O backend já confere as respostas das APIs do cliente desde a Sprint 1 (DW02), e o frontend passou a conferir as rotas de serviços e coletas na #161. Mas não havia uma regra escrita. Hoje, `GET /api/services/summary` e `GET /api/services/compare` ainda são lidas com `as T`, e cada rota nova decide sozinha. Sem uma definição de projeto, um dado fora do contrato pode aparecer na tela ou ir para o banco como se fosse válido, o que TP03 proíbe.

## Fatores de decisão

- **TP03 e RNF04:** nenhum resultado aparece como válido depois de uma falha; a falha vira um estado explícito, na tela e no banco.
- **TP02:** sem `any`; o que chega de fora entra como `unknown` e é estreitado. A regra de área do backend já pede "valide o que chega (não confie no formato)".
- **DW02:** o avaliador abre `metrics-api.ts` e `carbon-api.ts` procurando chamada, parsing e tratamento de falha.
- **Custo:** nenhum dos dois módulos tem biblioteca de validação hoje, e o congelamento da Sprint 2 é em 08/11.
- **Investigação:** quando a resposta é recusada, a mensagem precisa dizer onde está o problema, em pt-BR.

## Opções consideradas

1. **Conferência escrita à mão:** a resposta entra como `unknown` e passa por funções de leitura que conferem cada campo, sem biblioteca. É o que o backend e o frontend já fazem.
2. **Biblioteca de esquema** (zod ou valibot) nos dois módulos.
3. **Contrato em OpenAPI**, com tipos e validadores gerados a partir dele.
4. **Não conferir:** confiar no tipo declarado (`as T`), como fazem hoje o resumo e a comparação.

## Decisão

Escolhemos a **opção 1** como regra de projeto, porque já está em uso e testada nas duas fronteiras, não acrescenta dependência de produção e atende a TP02 e TP03 sem retrabalho antes do congelamento.

A regra:

1. **Toda resposta que atravessa uma fronteira entra como `unknown`** e só é usada depois de conferida contra o contrato documentado: `docs/especificacao-api.md` para as APIs do cliente e `docs/api.md` para a nossa.
2. **A conferência fica no ponto de entrada:** no backend, em `src/integrations/*.ts`; no frontend, em `src/services/*.service.ts`, com os leitores de `src/services/contract.ts`. Coletor, domínio, repositórios, hooks e componentes só recebem dado conferido.
3. **Política padrão: recusar a resposta inteira** no primeiro campo fora do contrato. A exceção é a série de um gráfico, que pode deixar de fora o item inválido, desde que conte quantos foram descartados e a tela avise (página Emissões).
4. **A recusa vira erro tipado:** `ExternalApiError` no backend, que o coletor transforma em estado gravado; `ApiError` no frontend, que segue o fluxo de falha da tela. Nunca um `catch` que devolve lista vazia ou sucesso.
5. **A mensagem diz onde:** no frontend, o caminho do campo (ex.: `services[3].id`); no backend, a rota e o item.
6. **Cada fronteira tem teste** com ao menos uma resposta válida, de preferência o exemplo do contrato, e uma inválida.
7. **Rota nova consumida** (no frontend) **ou API externa nova** (no backend) entra no mesmo PR com o contrato documentado, a conferência e o teste.

Como se materializa no repositório:

| Fronteira | Onde a conferência fica | Resposta fora do contrato | Teste |
|---|---|---|---|
| Backend ← Metrics Aggregator API, `GET /services` | `backend/src/integrations/metrics-api.ts` (`isServiceSummary`) | `ExternalApiError` com o índice do item; o ciclo de descoberta é descartado e o cadastro é preservado | `backend/tests/metrics-api.test.ts` |
| Backend ← Metrics Aggregator API, `GET /metrics/{id}` | `metrics-api.ts` (`isMetricsResponse`, com as faixas de CPU, memória, disco e rede) | `ExternalApiError`; o coletor grava a coleta com `status = erro` e o motivo, e o serviço fica `indisponivel`. 404 e 500 são estados previstos (`sem_metricas`, `indisponivel`), não erros | `backend/tests/metrics-api.test.ts` |
| Backend ← Carbon Intensity API | `backend/src/integrations/carbon-api.ts` (`isResponse`, que também confere se a região devolvida é a pedida) | `ExternalApiError`; o cálculo fica `indisponivel`, com o motivo em `collections.calculation_error_message`. Só resposta válida entra no cache | `backend/tests/carbon-api.test.ts` |
| Frontend ← `GET /api/services` e `GET /api/collections` | `frontend/src/services/services.service.ts` e `collections.service.ts`, com `contract.ts` (#161) | `ApiError` com o campo; a tela mantém os dados anteriores com "Desatualizado desde…" e **Tentar novamente** | `frontend/src/services/*.test.ts` |
| Frontend ← `GET /api/collections` e `GET /api/collections/series` na página Emissões | `frontend/src/services/emissions.service.ts` | envelope inválido: `ApiError`; item inválido: fica de fora e a tela avisa quantos | ainda sem teste (#237) |
| Frontend ← `GET /api/services/summary` e `GET /api/services/compare` | ainda lidas com `as T` | — | #237 |

## Consequências

**Positivas**
- Uma regra só para os dois módulos, que o revisor confere no PR: rota consumida ou API externa nova chega com conferência e teste.
- Um dado fora do contrato não chega à tela nem ao banco como válido; vira um estado que a pessoa vê (TP03, RNF04).
- Nenhuma dependência nova de produção, e o bundle do frontend não cresce.
- A mensagem com o campo recusado encurta a investigação de quem mantém o backend.

**Negativas / custos**
- A conferência é escrita e mantida à mão, em paralelo aos tipos de `*.types.ts`. Mudar o contrato exige mudar o tipo, o leitor e o teste; os testes com o exemplo de `docs/api.md` avisam quando um dos três fica para trás.
- Backend e frontend são pacotes separados e não compartilham código: funções parecidas, como `isRecord`, existem nos dois.
- Recusar a resposta inteira faz um único item ruim esconder a atualização da lista toda até a correção. É intencional: a tela continua com o último dado bom, marcado como desatualizado, e a mensagem aponta o item.
- O frontend passou a ter o vitest como dependência de desenvolvimento (#161).
- Até a #237, duas rotas do frontend continuam fora da regra, e a página Emissões não tem teste da sua conferência.

## Prós e contras das opções

### Opção 2 — Biblioteca de esquema (zod ou valibot)
- Bom: esquema declarativo, tipo inferido do próprio esquema (sem manter tipo e leitor em paralelo) e mensagens de erro com o caminho do campo.
- Ruim: dependência nova nos dois módulos e mais peso no bundle do frontend; reescrever os validadores do backend, que já têm testes, sem ganho para o avaliador; aprendizado novo na reta final da Sprint 2.

### Opção 3 — Contrato em OpenAPI com código gerado
- Bom: um contrato único, legível por máquina, de onde saem tipos e validadores.
- Ruim: o EcoPulse não tem OpenAPI, e as APIs do cliente são descritas em Markdown; o gerador acrescenta um passo de build ao Docker e ao CI. É desproporcional para três sprints.

### Opção 4 — Não conferir
- Bom: nenhum código a mais.
- Ruim: contraria TP03 e o apontamento do cliente; um campo trocado no servidor aparece na tela como dado válido.

## Como verificar que está em vigor

```bash
grep -n "apiRequest<" frontend/src/services/*.service.ts
```

Resultado esperado: todas as chamadas são `apiRequest<unknown>`, menos `fetchServicesSummary` e `compare.service.ts`, que são o escopo da #237. Depois da #237, só `apiRequest<unknown>`.

```bash
cd backend && npx vitest run tests/metrics-api.test.ts tests/carbon-api.test.ts
cd ../frontend && npm test
```

Resultado esperado: os testes das duas integrações do backend e os da conferência do frontend passam.

## Links

- Issues: #236 (esta definição) · #161 e PR #235 (frontend: serviços e coletas) · #237 (resumo, comparação e testes da página Emissões) · épico #41
- Contratos: [`docs/especificacao-api.md`](../especificacao-api.md) (APIs do cliente) · [`docs/api.md`](../api.md) (API do EcoPulse)
- Apontamento do cliente: [`docs/sprints/sprint-1/review.md`](../sprints/sprint-1/review.md) § 3
- Módulos: [`backend/README.md`](../../backend/README.md) · [`frontend/README.md`](../../frontend/README.md#conferência-das-respostas-da-api-161)
- Requisito: [RNF04](../requisitos.md) · Critérios TP02, TP03 e DW02 no [plano de entregas](../plano-de-entregas.md)
- Referência externa: https://www.typescriptlang.org/docs/handbook/2/basic-types.html#erased-types
