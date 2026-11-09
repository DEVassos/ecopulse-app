# ADR 0007 — TypeScript 6.0 no frontend para o lint com ESLint

| Campo | Valor |
|---|---|
| Status | aceito (PR #230) |
| Data | 2026-10-28 |
| Decisores | @travensolli (SM, responsável pela #160) |
| Rastreabilidade | issue #160 (lint no frontend e no CI, apontamento do cliente em `docs/sprints/sprint-1/review.md` § 3) · épico #41 · requisito RP01 · critérios DW01, TP02 |

## Contexto e problema

A #160 pede ESLint no `frontend/` com as regras recomendadas para TypeScript e React Hooks, rodando no job `frontend` do CI. Para ler TypeScript, o ESLint depende do `typescript-eslint`, e o frontend estava no TypeScript `^7.0.2` desde o setup (#9, 07/10/2026).

O `typescript-eslint` ainda não aceita o TypeScript 7. A versão 8.72.1 (`latest`) e o canary 8.72.2-alpha.3 declaram `typescript >=4.8.4 <6.1.0` como dependência par. Por isso o `npm install` falha com `ERESOLVE`. Forçando a instalação com `--legacy-peer-deps`, o ESLint para ao carregar a configuração com `typescript-eslint does not support TS 7.0`. O suporte é acompanhado em typescript-eslint#10940. Sem uma decisão, a #160 não tem como ser entregue.

## Fatores de decisão

- TP02 e DW01: o lint reforça a tipagem e a consistência do código React + TypeScript que o avaliador abre.
- #160: regras recomendadas de TypeScript e de React Hooks, `npm run lint` sem erros e o CI reprovando um PR com erro de lint.
- DW07: `npm ci` precisa continuar funcionando sem flags no `Dockerfile` e no CI, só com o `package-lock.json`.
- O código atual não depende de nada exclusivo do TypeScript 7: `tsc --noEmit` e `npm run build` passam com o 6.0.3 sem mudar nenhum arquivo de `src/`.
- O backend usa TypeScript `~5.9.2`; o frontend não precisa do 7 para conversar com ele.

## Opções consideradas

1. **TypeScript 6.0 no frontend** (`typescript ~6.0.3`).
2. Manter o TypeScript 7 e instalar o TypeScript 6 ao lado só para o `typescript-eslint` (`@typescript/typescript6`, caminho indicado pela mensagem de erro do `typescript-eslint`).
3. Manter o TypeScript 7 e fazer o lint sem o `typescript-eslint`: só regras de JavaScript ou outra ferramenta (oxlint, Biome).

## Decisão

Escolhemos a **opção 1**, porque é a única que entrega a #160 inteira com `npm ci` limpo. A faixa `~6.0.3` aceita só correções da 6.0: a 6.1 fica de fora até o `typescript-eslint` aceitá-la.

Como se materializa no repositório (#160):

- `frontend/package.json` e `frontend/package-lock.json`: `typescript ~6.0.3`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks` e `globals` em `devDependencies`, e o script `lint` (`eslint . --max-warnings 0`).
- `frontend/eslint.config.js`: regras recomendadas de JavaScript, TypeScript e React Hooks para `src/` e `vite.config.ts`; JavaScript com variáveis globais do Node para o backend falso (`mock/`) e para a própria configuração.
- `.github/workflows/ci.yml`: `npm run lint --if-present` no job `frontend`, depois do `tsc --noEmit` e antes do build.
- `frontend/README.md` § Requisitos e § Comandos.

## Consequências

**Positivas**
- `npm run lint` roda no CI e na máquina de quem desenvolve, sem `--legacy-peer-deps`.
- Aviso também reprova (`--max-warnings 0`): um aviso novo não se acumula em silêncio no log.
- As regras de React Hooks apontaram quatro efeitos que zeravam estado quando o filtro mudava (`useComparison`, `useEmissions`, `ComparePage`, `EmissionsPage`). Eles passaram a ajustar o estado na própria renderização, como recomenda a documentação do React, e o dado antigo não aparece mais por um quadro junto com o filtro novo.

**Negativas / custos**
- O typecheck usa o compilador em JavaScript do TypeScript 6, mais lento que o nativo do 7. No frontend atual, `npx tsc --noEmit` levou cerca de 3,3 s e `npm run lint` cerca de 4,6 s (28/10/2026, máquina do SM).
- Voltar ao TypeScript 7 quando o `typescript-eslint` aceitar exige um novo ADR que substitua este, além de testar `npm ci`, `npm run lint` e `npm run build`.
- O ESLint 10 exige Node 20.19+ ou 22.13+ (antes, o Vite 8 aceitava 22.12). O CI (Node 22) e o `Dockerfile` (`node:24-alpine`) já atendem.

## Prós e contras das opções

### Opção 2 — TypeScript 7 com o TypeScript 6 ao lado
- Bom: mantém o compilador nativo do 7 no build.
- Ruim: dois compiladores com versões diferentes no mesmo projeto, e o `typescript-eslint` precisa enxergar o 6 como `typescript`. A tentativa com `overrides` do npm falhou no npm 9.2 (`Invalid comparator`), e o arranjo ficaria difícil de revisar e de reproduzir no CI e no Docker.

### Opção 3 — lint sem o `typescript-eslint`
- Bom: não mexe na versão do TypeScript.
- Ruim: o ESLint sem o parser do `typescript-eslint` não lê arquivos `.ts`/`.tsx`, e oxlint ou Biome não são o ESLint com as regras recomendadas que a #160 pede.

## Como verificar que está em vigor

```bash
cd frontend
npm ci
npx tsc --version
npm run lint
```

Resultado esperado: `Version 6.0.3` e o lint termina sem erros nem avisos. No GitHub Actions, o log do job `frontend` de um PR mostra a saída de `npm run lint`.

## Links

- Issue: #160 · épico #41 · setup do frontend: #9
- ADR relacionado: [0004](0004-vite-tailwind-frontend.md) (Vite e Tailwind no frontend)
- Requisito: [RP01](../requisitos.md) · Critérios DW01 e TP02 no [plano de entregas](../plano-de-entregas.md)
- Módulo: [`frontend/README.md`](../../frontend/README.md#comandos)
- Referências externas: https://typescript-eslint.io/users/dependency-versions · https://github.com/typescript-eslint/typescript-eslint/issues/10940 · https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
