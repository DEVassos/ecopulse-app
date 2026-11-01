#!/usr/bin/env bash
# gerado pelo agilekit — edite em DEVassos/agilekit (repo/.github/scripts/issue-autolabel.sh)
#
# Aplica as labels RFxx/RNFxx a partir dos códigos escolhidos no formulário da issue
# (seção "### Requisito relacionado") e a label tipo:* quando faltar. Semântica de conjunto (só adiciona).
# Uso: issue-autolabel.sh <issue-nº>     (GH_TOKEN com issues:write basta)

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/conventions.sh
source "$HERE/lib/conventions.sh"
need_jq; need_gh
[ -n "${1:-}" ] || { sed -n '3,7p' "$0"; exit 2; }
N="$1"
REPO_FLAG=(); [ -n "${GITHUB_REPOSITORY:-}" ] && REPO_FLAG=(-R "$GITHUB_REPOSITORY")

DATA="$(gh issue view "$N" "${REPO_FLAG[@]}" --json body,labels,title)"
BODY="$(jq -r '.body // ""' <<< "$DATA")"
ATUAIS="$(jq -r '.labels[].name' <<< "$DATA")"
EXISTENTES="$(gh label list "${REPO_FLAG[@]}" --limit 200 --json name --jq '.[].name')"

# códigos sob "### Requisito relacionado" (até o próximo "###")
CODIGOS="$(printf '%s\n' "$BODY" | awk '/^### *Requisito relacionado/{f=1; next} /^### /{f=0} f' | grep -oE '\b(RF|RNF)[0-9]{2}\b' | sort -u || true)"
# fallback: códigos no título (ex.: "RF01 — ...")
[ -n "$CODIGOS" ] || CODIGOS="$(jq -r .title <<< "$DATA" | grep -oE '\b(RF|RNF)[0-9]{2}\b' | sort -u || true)"

ADD=()
while IFS= read -r c; do
  [ -n "$c" ] || continue
  printf '%s\n' "$ATUAIS" | grep -Fxq "$c" && continue
  if printf '%s\n' "$EXISTENTES" | grep -Fxq "$c"; then ADD+=("$c"); else warn "label '$c' não existe no repo (rode gh-bootstrap.sh)"; fi
done <<< "$CODIGOS"

# tipo:* pelo cabeçalho do formulário, se nenhuma label tipo: presente
if ! printf '%s\n' "$ATUAIS" | grep -q '^tipo:'; then
  if   printf '%s' "$BODY" | grep -qi '### *História de usuário';  then ADD+=("tipo:historia")
  elif printf '%s' "$BODY" | grep -qi '### *Passos para reproduzir'; then ADD+=("tipo:bug")
  elif printf '%s' "$BODY" | grep -qi '### *História pai';           then ADD+=("tipo:tarefa")
  elif printf '%s' "$BODY" | grep -qi '### *Ação de processo';       then ADD+=("tipo:processo")
  fi
fi

if [ "${#ADD[@]}" -eq 0 ]; then info "#$N: nenhuma label a adicionar"; else
  LISTA="$(IFS=,; printf '%s' "${ADD[*]}")"
  gh issue edit "$N" "${REPO_FLAG[@]}" --add-label "$LISTA" >/dev/null
  ok "#$N: labels adicionadas: $LISTA"
fi

# --- Hierarquia (sub-issues): "### História pai" ou "### Épico" com #N no formulário → vincula como filho ---
PAI="$(printf '%s\n' "$BODY" | awk '/^### *(História pai|Épico|Epico)/{f=1; next} /^### /{f=0} f' | grep -oE '#[0-9]+' | head -1 | tr -d '#' || true)"
if [ -n "$PAI" ] && [ "$PAI" != "$N" ]; then
  REPO_NAME="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
  MEU_ID="$(gh api "repos/$REPO_NAME/issues/$N" --jq .id 2>/dev/null || true)"
  if [ -n "$MEU_ID" ]; then
    if gh api "repos/$REPO_NAME/issues/$PAI/sub_issues?per_page=100" --jq '.[].number' 2>/dev/null | grep -qx "$N"; then
      info "#$N já é sub-issue de #$PAI"
    elif gh api -X POST "repos/$REPO_NAME/issues/$PAI/sub_issues" -F sub_issue_id="$MEU_ID" >/dev/null 2>&1; then
      ok "#$N vinculada como sub-issue de #$PAI"
    else
      warn "não consegui vincular #$N a #$PAI (a issue já tem outro pai? #$PAI existe?)"
    fi
  fi
fi
