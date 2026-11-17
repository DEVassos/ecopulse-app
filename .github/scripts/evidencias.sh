#!/usr/bin/env bash
# gerado pelo agilekit — edite em DEVassos/agilekit (repo/.github/scripts/evidencias.sh)
#
# Gera o relatório de participação da sprint (ES09) em markdown: issues, PRs, reviews, commits e
# arquivos por integrante, commits sem login (e-mail não vinculado) e integrantes sem evidência.
# Uso: evidencias.sh <sprint-nº> [--out arquivo.md] [--branch develop]
#      (datas vêm de .github/calendario.json; integrantes de .github/equipe.json)

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/conventions.sh
source "$HERE/lib/conventions.sh"
need_jq; need_gh
[ -n "${1:-}" ] || { sed -n '3,8p' "$0"; exit 2; }
N="$1"; shift; OUT=""; BRANCH="develop"
while [ $# -gt 0 ]; do case "$1" in --out) OUT="$2"; shift;; --branch) BRANCH="$2"; shift;; esac; shift; done

INICIO="$(sprint_campo "$N" inicio)"; FIM="$(sprint_campo "$N" fim)"
[ -n "$INICIO" ] || { err "sprint $N não existe em $CALENDARIO_JSON"; exit 1; }
REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
MS="Sprint $N"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

gh issue list -R "$REPO" --milestone "$MS" --state all --limit 300 --json number,title,state,assignees,labels > "$TMP/issues.json"
gh pr list -R "$REPO" --state merged --search "merged:${INICIO}..${FIM}" --limit 300 --json number,title,author,mergedAt,reviews,baseRefName,additions,deletions,url > "$TMP/prs.json"
gh pr list -R "$REPO" --state all --search "created:${INICIO}..${FIM}" --limit 300 --json number,reviews > "$TMP/prs_all.json"
gh api "repos/$REPO/commits?sha=${BRANCH}&since=${INICIO}T00:00:00Z&until=${FIM}T23:59:59Z&per_page=100" --paginate \
  --jq '.[] | select(.parents | length < 2) | {sha: .sha[0:7], login: (.author.login // ""), email: .commit.author.email, msg: (.commit.message | split("\n")[0])}' | jq -s . > "$TMP/commits.json" 2>/dev/null || echo '[]' > "$TMP/commits.json"
git -C "$ROOT" fetch -q origin "$BRANCH" 2>/dev/null || true
git -C "$ROOT" log "origin/$BRANCH" --no-merges --since="$INICIO" --until="${FIM}T23:59:59" --format='@@%ae' --name-only 2>/dev/null \
  | awk '/^@@/{a=substr($0,3); next} NF{split($0,p,"/"); area=(p[2]==""?p[1]:p[1]); print a "|" area}' | sort | uniq -c | awk '{print $2 "|" $1}' > "$TMP/files.txt" || true

{
  echo "# Participação dos integrantes — $MS ($INICIO a $FIM)"
  echo
  echo "_Gerado por \`.github/scripts/evidencias.sh $N\` em $(date +%F). Fonte: GitHub ($REPO), branch \`$BRANCH\`. A quantidade de commits isoladamente não mede participação (regra ES09)._"
  echo
  echo "| Integrante | Papel | Issues atribuídas (abertas/fechadas) | PRs mergeados | Reviews feitas | Commits em \`$BRANCH\` | Áreas tocadas | Lacunas |"
  echo "|---|---|---|---|---|---|---|---|"
  while IFS=$'\t' read -r login nome papel emails; do
    [ -n "$login" ] || continue
    ab="$(jq -r --arg l "$login" '[.[] | select(.assignees[]?.login==$l and .state=="OPEN")] | length' "$TMP/issues.json")"
    fe="$(jq -r --arg l "$login" '[.[] | select(.assignees[]?.login==$l and .state=="CLOSED")] | length' "$TMP/issues.json")"
    prs="$(jq -r --arg l "$login" '[.[] | select(.author.login==$l)] | map("[#\(.number)](\(.url))") | join(" ")' "$TMP/prs.json")"
    nprs="$(jq -r --arg l "$login" '[.[] | select(.author.login==$l)] | length' "$TMP/prs.json")"
    rev="$(jq -r --arg l "$login" '[.[] | .reviews[]? | select(.author.login==$l and (.state=="APPROVED" or .state=="CHANGES_REQUESTED" or .state=="COMMENTED"))] | length' "$TMP/prs_all.json")"
    com="$(jq -r --arg l "$login" '[.[] | select(.login==$l)] | length' "$TMP/commits.json")"
    areas="$(printf '%s\n' "$emails" | tr ',' '\n' | lower | awk -F'|' 'NR==FNR{if($0!="") want[$0]=1; next} (tolower($1) in want){s[$2]+=$3} END{for(k in s) print k " (" s[k] ")"}' - "$TMP/files.txt" | sort | paste -sd ',' - | sed 's/,/, /g')"
    lac=""
    [ "$nprs" = 0 ] && lac="$lac sem PR mergeado;"
    [ "$rev" = 0 ] && lac="$lac sem review;"
    [ "$com" = 0 ] && lac="$lac sem commit;"
    [ "$((ab + fe))" = 0 ] && lac="$lac sem issue atribuída;"
    [ -n "$lac" ] && lac="⚠${lac}"
    echo "| @$login ($nome) | $papel | $ab/$fe | $nprs $prs | $rev | $com | ${areas:-—} | ${lac:-—} |"
  done < <(jq -r '.integrantes[] | [.login, .nome, .papel, (.emails | join(","))] | @tsv' "$EQUIPE_JSON")
  echo
  SEM="$(jq -r '[.[] | select(.login=="")] | length' "$TMP/commits.json")"
  if [ "$SEM" != 0 ]; then
    echo "## ⚠ Commits sem login do GitHub ($SEM)"
    echo
    echo "O avaliador não consegue atribuir estes commits a um integrante. Causa: e-mail do git não verificado na conta. Corrija com \`git config user.email\` + e-mail verificado e adicione o e-mail em \`.github/equipe.json\`."
    echo
    jq -r '.[] | select(.login=="") | "- `\(.sha)` \(.email) — \(.msg)"' "$TMP/commits.json"
    echo
  fi
  echo "## PRs mergeados no período"
  echo
  echo "| PR | Título | Autor | Base | Aprovadores | Linhas |"
  echo "|---|---|---|---|---|---|"
  jq -r '.[] | "| [#\(.number)](\(.url)) | \(.title) | @\(.author.login) | \(.baseRefName) | \([.reviews[]? | select(.state=="APPROVED") | "@" + .author.login] | unique | join(", ")) | +\(.additions)/-\(.deletions) |"' "$TMP/prs.json"
  echo
  echo "## Issues da milestone sem responsável"
  echo
  jq -r '.[] | select((.assignees | length)==0) | "- #\(.number) \(.title) (\(.state))"' "$TMP/issues.json" | { grep . || echo "_nenhuma_"; }
  echo
  echo "## Checklist de fechamento (SM)"
  echo
  echo "- [ ] Nenhum integrante com lacuna na tabela acima (ou lacuna justificada em docs/sprints/sprint-$N.md)"
  echo "- [ ] Cada integrante aparece como responsável em ≥1 linha de docs/plano-de-entregas.md"
  echo "- [ ] Zero commits sem login"
} > "${OUT:-/dev/stdout}"
[ -n "$OUT" ] && ok "relatório salvo em $OUT"
exit 0
