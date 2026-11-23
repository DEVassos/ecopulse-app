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
| [0008](0008-conferencia-respostas-fronteiras-api.md) | Conferência das respostas nas fronteiras de API | aceito (PR #238) | 2026-10-30 | #236 · RNF04 · TP02, TP03, DW02 |
| [0009](0009-aplicacao-inteira-com-login.md) | Aplicação inteira com login | aceito (PR #269) | 2026-11-04 | #257 · RP06, RNF05 · DW06 |
| [0010](0010-mapa-maplibre.md) | Mapa com MapLibre GL JS e imagens de satélite da EOX | aceito | 2026-11-11 | #318 · [#51](https://github.com/DEVassos/ecopulse-app/issues/51) · RF13 · DW04, ES08 |

## Como criar um ADR

1. Rode a skill `adr` no seu assistente de IA (`/adr <título>`; no Codex, `$adr <título>`), ou copie [`docs/templates/adr.md`](../templates/adr.md) para `docs/adr/NNNN-slug.md` (próximo número com 4 dígitos, slug em minúsculas com hifens).
2. Preencha status (`proposto` até a aprovação do PR, depois `aceito`), data, decisores, rastreabilidade (issue `#n`, requisito, critério), contexto, opções, decisão e consequências.
3. Adicione a linha no índice acima e abra o PR na branch da issue que motivou a decisão (`docs/<n>-adr-slug`), com label `tipo:tarefa` ou a label RF correspondente. Revisão por alguém de outra área.
4. Um ADR aceito não é editado: para mudar a decisão, crie um novo ADR com "substitui NNNN" e marque o antigo como "substituído por MMMM".

## ADRs previstos e não escritos

Dois ADRs estavam previstos para a Sprint 2 e não foram escritos. As decisões foram tomadas nas issues e estão descritas na documentação técnica:

| Tema | Decisão | Onde está registrada |
|---|---|---|
| Atualização do dashboard (RF11, RNF02 · DW05) | Polling HTTP, sem Server-Sent Events | #100 e #114; [arquitetura § Fluxo de dados](../arquitetura.md#fluxo-de-dados), item 4, e [README do frontend § Atualização em tempo real](../../frontend/README.md#atualização-em-tempo-real) |
| Autenticação JWT (RP06 · DW06) | JWT HS256 com validade em `JWT_EXPIRES_IN`, token no `sessionStorage` da aba e senha com bcrypt | #20 (PR #208) e #25 (PR #243); [arquitetura § Backend e § Frontend](../arquitetura.md#backend); o login em toda a aplicação está no [ADR 0009](0009-aplicacao-inteira-com-login.md) |
