<!-- gerado pelo agilekit. Título do PR: type(scope): descrição (#n) [RFxx]. Base: develop (release/* e hotfix/* → main).
     Os checks "commits", "pr" e "docs" precisam passar; o PR só merge com 1 aprovação de alguém ≠ autor. -->

## Issue
Closes #_(preencha)_

## Requisito / Critério da rubrica
RFxx — <título> · Critério(s): DWxx / BDxx / TPxx

## O que foi feito
-

## Como verificar
1. `docker compose up --build`
2.

## Critérios de aceite (copiados da issue — o revisor marca ao executar)
- [ ]

## Evidências
<!-- prints em docs/img/sprint-N-<tela>.png, saídas de comando, links -->

## DoD-PR (marque [x] ou escreva "N/A — motivo")
<!-- Item que não se aplica: deixe o número e o texto do item primeiro e o motivo no fim,
     como em "- [x] 2. <texto do item> — N/A — motivo". -->
- [ ] 1. `Closes #n` e commits com `#n`; co-autoria vazia ou de alguém do time [ES04]
- [ ] 2. Roda com `docker compose up --build`; o revisor executou o "Como verificar" [ES07/DW07]
- [ ] 3. SQL só em `*.repository.ts`, parametrizado (`$1`…), sem ORM [BD02]
- [ ] 4. Sem `any` injustificado e sem `catch` vazio [TP02/TP03]
- [ ] 5. Docs no mesmo PR: `docs/api.md` (rota), `schema.sql` + `database/README.md` (tabela), README (feature), `.env.example` (variável) [DW03/ES08]
- [ ] 6. Aprovado por alguém ≠ autor com ≥1 comentário substantivo [ES09]

## Docs atualizados
-

## Co-autoria
<!-- vazio, ou @login de quem pareou — só integrantes do time (.github/equipe.json) -->
