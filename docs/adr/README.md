# Registros de decisão de arquitetura (ADR)

<!-- Arquivo gerenciado pelo time (o agilekit não sobrescreve). Índice mantido por `/adr <título>`. -->

Decisões técnicas e de processo que afetam o repositório inteiro são registradas aqui no formato **MADR** (Markdown Architectural Decision Records), numeradas em sequência. Cada ADR aponta para a issue, o requisito e o critério da rubrica que motivaram a decisão — isso faz parte da rastreabilidade (ES04) e explica ao avaliador por que o código está como está.

## Índice

| ADR | Título | Status | Data | Rastreabilidade |
|---|---|---|---|---|
| [0001](0001-gitflow-commits-coautoria.md) | Git Flow, Conventional Commits em pt-BR e co-autoria restrita ao time | aceito | 2026-10-05 | RP07 · ES04, ES05, ES09 |
| [0002](0002-postgresql-pg-sem-orm.md) | PostgreSQL com driver `pg` e SQL explícito, sem ORM | aceito | 2026-10-05 | RP03 · BD01, BD02 |
| [0003](0003-docker-compose-unico-caminho.md) | Docker Compose como único caminho de execução | aceito (frontend substituído em parte pelo 0005) | 2026-10-05 | RP04 · DW07, BD03 |
| [0004](0004-vite-tailwind-frontend.md) | Vite e Tailwind CSS no frontend | aceito | 2026-10-08 | #67 · RP01, RNF01, RNF05 · DW01, DW04, ES08 |
| [0005](0005-frontend-nginx-build-producao.md) | Frontend servido por nginx com o build de produção no compose | aceito (PR #81) | 2026-10-08 | #80 · RP04, RNF05 · DW07, DW01, TP02 |
| [0006](0006-modelo-potencia-fatores-emissao.md) | Modelo de potência e fatores de emissão do cálculo de energia e CO₂e | aceito (PRs #136 e #139) | 2026-10-16 | #133 · RF07, RF08 · TP01, DW02, BD04 |
| [0007](0007-typescript-6-eslint-frontend.md) | TypeScript 6.0 no frontend para o lint com ESLint | aceito (PR #230) | 2026-10-28 | #160 · RP01 · DW01, TP02 |
| [0008](0008-conferencia-respostas-fronteiras-api.md) | Conferência das respostas nas fronteiras de API | proposto | 2026-10-30 | #236 · RNF04 · TP02, TP03, DW02 |

## Como criar um ADR

1. Rode a skill `adr` no seu assistente de IA (`/adr <título>`; no Codex, `$adr <título>`), ou copie [`docs/templates/adr.md`](../templates/adr.md) para `docs/adr/NNNN-slug.md` (próximo número com 4 dígitos, slug em minúsculas com hifens).
2. Preencha status (`proposto` até a aprovação do PR, depois `aceito`), data, decisores, rastreabilidade (issue `#n`, requisito, critério), contexto, opções, decisão e consequências.
3. Adicione a linha no índice acima e abra o PR na branch da issue que motivou a decisão (`docs/<n>-adr-slug`), com label `tipo:tarefa` ou a label RF correspondente. Revisão por alguém de outra área.
4. Um ADR aceito não é editado: para mudar a decisão, crie um novo ADR com "substitui NNNN" e marque o antigo como "substituído por MMMM".

## ADRs previstos

| Tema | Quando | Quem propõe | Requisito / critério |
|---|---|---|---|
| Atualização do dashboard: polling HTTP vs Server-Sent Events | Sprint 2, antes de implementar RF11 | Andrea (`@DeaTuribio`) com Lucas | RF11, RNF02 · DW05 |
| Autenticação JWT: biblioteca, expiração, armazenamento do token no frontend, hash de senha | Sprint 2, antes de implementar RP06 | Lucas (`@LUCASAMR23`) com Vinicius | RP06 · DW06 |
