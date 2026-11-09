# Guia de contribuição — EcoPulse (DEVassos · ABP 2DSM 2026-2)

<!-- gerado pelo agilekit — edite em DEVassos/agilekit (repo/.github/CONTRIBUTING.md) -->

Regras de branch, commit e Pull Request. Todas são **validadas automaticamente**: pelos hooks git locais (instalados pelo agilekit), pelo guard dos assistentes de IA (Claude Code, Copilot, Codex ou Antigravity) e pelos checks do GitHub (`commits`, `pr`, `docs`). O processo Scrum (papéis, cerimônias, DoR/DoD) está em [docs/processo/README.md](../docs/processo/README.md).

## 1. Git Flow

```
main      ← estável. Só recebe release/sprint-N e hotfix/* por PR. Tag sprint-N em cada fechamento.
develop   ← integração. Base de TODO PR de trabalho.
feature/12-descoberta-servicos      fix/31-status-indisponivel      docs/7-api-services
chore/1-processo-agil   test/40-repositorio-collections   sql/18-indice-collections
release/sprint-1 (develop → main, pelo SM no congelamento)   hotfix/55-crash-coleta (main → main + develop)
```

- **Nunca** commit ou push direto em `main` ou `develop` (bloqueado por hook e por ruleset).
- 1 issue = 1 branch = 1 PR (≤400 linhas alteradas). A branch é **apagada automaticamente** no merge.
- Nome da branch: `tipo/<nº-da-issue>-slug-curto` — tipos `feature fix docs chore test sql`; `slug` em minúsculas, `a-z0-9.-`.
- Comece sempre de `origin/develop` atualizada: `git fetch && git switch -c feature/12-slug origin/develop` (ou a skill `tarefa` no seu assistente de IA: `/tarefa 12`; no Codex, `$tarefa 12`).
- `hotfix/<n>-slug` nasce de `main`, vai por PR para `main` **e** por outro PR para `develop`.
- Mudanças em `.github/workflows` precisam chegar a `main` (os eventos de issues/push usam o workflow da branch padrão): PR para `develop` e PR para `main`.

## 2. Commits

```
type(scope): descrição no imperativo (#issue) [RFxx]
```

| Parte | Regra |
|---|---|
| `type` | `feat` `fix` `docs` `refactor` `test` `chore` `sql` `style` `perf` `ci` `build` `revert` |
| `scope` | `backend` `frontend` `db` `docs` `infra` `processo` (minúsculas) |
| descrição | imperativo, pt-BR, sem ponto final; assunto ≤ **72** caracteres |
| `(#issue)` | **obrigatório** no assunto ou no corpo — é a chave de rastreabilidade (ES04) |
| `[RFxx]` | recomendado quando o commit implementa um requisito |
| corpo | opcional, após linha em branco: o quê e por quê |

Exemplos:

```
feat(backend): lista serviços descobertos no agregador (#12) [RF01]
sql(db): cria tabela collections com índice por serviço e data (#18) [RF10]
docs(docs): documenta GET /services em api.md (#12)
fix(frontend): mostra estado indisponível no card do serviço (#31) [RF05]
chore(processo): registra ata da daily de 07/10 (#3)
```

Um commit por intenção; commite ao fim de cada sessão de trabalho (ES05 olha a distribuição ao longo da sprint). `git commit` abre o template `.agilekit/gitmessage` com estas regras; a skill `commitar` do assistente de IA monta a mensagem.

### Co-autoria

O trailer `Co-authored-by:` é **opcional** e, quando existir, só pode apontar para **um integrante do time** listado em [.github/equipe.json](equipe.json) (nome + e-mail noreply do GitHub). Nada além disso: nem IA, nem bots, nem pessoas externas. O hook recusa o commit; o CI recusa o PR.

```
Co-authored-by: Andrea Turibio <139165742+DeaTuribio@users.noreply.github.com>
```

Use o `.agilekit/gitmessage` (descomente a linha da pessoa) ou `/commitar --par @login`. Quem gera código com apoio de IA explica isso no PR, não no commit.

### E-mail do git

`git config user.email` deve ser um e-mail **verificado** na sua conta GitHub (ou o noreply `ID+login@users.noreply.github.com`). Sem isso o commit aparece sem login e **não conta para ES09**. `setup-dev.sh` confere.

## 3. Pull Requests

- Título no mesmo formato do commit: `type(scope): descrição (#n) [RFxx]`.
- Base `develop` (trabalho) · `main` só para `release/*` e `hotfix/*`.
- Corpo pelo template: `Closes #n`, requisito/critério, o que foi feito, **como verificar**, critérios de aceite da issue, evidências, **DoD-PR (6 itens)**, docs atualizados, co-autoria.
- Labels: herde as da issue (`RFxx`, `tipo:*`, `area:*`); PRs de processo levam `tipo:processo`.
- Checklist: a seção `## DoD-PR` do template traz os 6 itens, cada um `[x]` ou `N/A — motivo`; nenhum `- [ ]` pode ficar pendente. Só o PR de `release/*` dispensa a DoD-PR, porque segue a DoD-Sprint.
- Revisão: 1 aprovação de alguém **≠ autor**, com ≥1 comentário substantivo; o revisor **executa** o "Como verificar" e marca os critérios de aceite. Revise em ≤24h.
- Merge: **merge commit** (preserva a autoria de cada integrante). Squash e rebase estão desabilitados.
- Sem rodapé de ferramenta ("Generated with …") no PR e sem trailer de IA nos commits: quem usou IA explica isso em texto no corpo do PR. O check `pr` recusa o rodapé, o hook `commit-msg` recusa o trailer e o kit desliga a atribuição automática do Claude Code e do Copilot no VS Code; no Copilot CLI, rode uma vez `/settings includeCoAuthoredBy off`.
- Rascunho (`--draft`) enquanto não estiver pronto: os checks viram avisos.

## 4. Release e tags

No congelamento (domingo 20h antes da review) o SM roda `/sprint N congelar`: cria `release/sprint-N` de `develop`, abre PR para `main` com título `chore(release): entrega da sprint N`. Após a review e o registro do feedback, `/sprint N fechar` faz o merge, cria a tag anotada `sprint-N` em `main` e publica a GitHub Release com `docs/sprints/sprint-N.md`. Tags `sprint-*` são imutáveis (ruleset).

## 5. Checks automáticos

| Check | O que valida | Script |
|---|---|---|
| `commits` | todos os commits do PR: formato, ≤72, `#n`, co-autoria do time, e-mail em `equipe.json` | `.github/scripts/check-commit-msg.sh` |
| `pr` | título, branch, base, `Closes #n`, labels, DoD-PR, placeholders, tamanho; ORM, `.env`, `any`, SQL interpolado, `catch` vazio | `check-pr.sh`, `check-forbidden.sh` |
| `docs` | plano de entregas (Concluído com link e responsável), `api.md` quando há rotas, docs vazios/placeholders | `check-docs.sh` |

Rode localmente antes de abrir o PR: `bash .github/scripts/check-forbidden.sh && bash .github/scripts/check-docs.sh`.

### Histórico importado

Commits trazidos de outro repositório do time (por exemplo, o antigo `Projeto-GreenER`) entram por **merge** de um PR dedicado, o que preserva SHA, autor, data e mensagem originais — e, portanto, a autoria de cada integrante no GitHub. Como essas mensagens são anteriores ao padrão, os SHAs completos ficam listados em `.github/commits-importados.txt` (com a origem) e o check `commits` não os valida. Todo commit novo, inclusive os de organização feitos no próprio PR de importação, segue o padrão normalmente.

## 6. Dúvidas frequentes

- **Esqueci o `#n` no commit.** `git commit --amend` (antes do push) e corrija o assunto.
- **Preciso mexer em `main` ou `develop` direto.** Não precisa. Se for o bootstrap do repositório, o SM usa `AGILEKIT_ALLOW_PROTECTED=1` conscientemente.
- **O check `pr` falhou por `- [ ]`.** Marque `[x]` ou escreva `N/A — motivo`; os critérios de aceite são marcados pelo revisor.
- **Posso aprovar meu próprio PR?** Não (ruleset). Peça ao par de revisão da sprint.
