#!/usr/bin/env bash
# gerado pelo agilekit — edite em DEVassos/agilekit (repo/.github/scripts/backlog-export.sh)
#
# Exporta o Product Backlog (issues do GitHub) para docs/backlog/product-backlog.md — snapshot versionado
# que o avaliador lê (ES01) sem redigitar nada. Rode na planning e no fechamento de cada sprint.
# Uso: backlog-export.sh [--out docs/backlog/product-backlog.md]

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/conventions.sh
source "$HERE/lib/conventions.sh"
need_jq; need_gh
OUT="docs/backlog/product-backlog.md"
[ "${1:-}" = "--out" ] && OUT="$2"
REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
PROJ_URL=""
[ -n "${PROJECT_NUMBER:-}" ] && PROJ_URL="https://github.com/orgs/${PROJECT_OWNER:-${REPO%%/*}}/projects/$PROJECT_NUMBER"

DATA="$(gh issue list -R "$REPO" --state all --limit 500 --json number,title,labels,milestone,state,assignees,url,createdAt)"
mkdir -p "$(dirname "$ROOT/$OUT")"
{
  echo "# Product Backlog — EcoPulse"
  echo
  echo "_Exportado das issues de [$REPO](https://github.com/$REPO/issues) em $(date '+%d/%m/%Y %H:%M') por \`.github/scripts/backlog-export.sh\`. A fonte da verdade é o GitHub Issues${PROJ_URL:+ e o [quadro]($PROJ_URL)}; este arquivo é um retrato versionado para a avaliação (ES01)._"
  echo
  echo "Legenda — Prioridade: **must** (obrigatório), **should** (importante), **could** (desejável, ex.: RF13). Estado: aberta/fechada."
  echo
  for prio in must should could sem; do
    if [ "$prio" = sem ]; then filtro='[.labels[].name] | any(startswith("prioridade:")) | not'; titulo="Sem prioridade definida"
    else filtro="[.labels[].name] | index(\"prioridade:$prio\")"; titulo="Prioridade $prio"; fi
    LINHAS="$(jq -r --arg f "$filtro" '
      .[] | select(([.labels[].name] | index("tipo:historia") or index("tipo:tarefa") or index("tipo:bug") or index("tipo:processo")) // true)
      | select('"$filtro"')
      | "| [#\(.number)](\(.url)) | \(.title) | \([.labels[].name | select(test("^(RF|RNF)[0-9]{2}$"))] | join(", ")) | \([.labels[].name | select(startswith("tipo:")) | sub("tipo:";"")] | join(", ")) | \(.milestone.title // "—") | \(if .state=="OPEN" then "aberta" else "fechada" end) | \([.assignees[].login | "@" + .] | join(", ")) |"' <<< "$DATA" | sort -t'#' -k2 -n)"
    [ -n "$LINHAS" ] || continue
    echo "## $titulo"
    echo
    echo "| # | Título | Requisito | Tipo | Sprint | Estado | Responsáveis |"
    echo "|---|---|---|---|---|---|---|"
    printf '%s\n' "$LINHAS"
    echo
  done
  echo "## Cobertura do escopo obrigatório"
  echo
  echo "| Requisito | Issues |"
  echo "|---|---|"
  for rf in RF01 RF02 RF03 RF04 RF05 RF06 RF07 RF08 RF09 RF10 RF11 RF12 RF13 RF14 RF15 RNF01 RNF02 RNF03 RNF04 RNF05; do
    iss="$(jq -r --arg rf "$rf" '[.[] | select([.labels[].name] | index($rf)) | "#\(.number)"] | join(", ")' <<< "$DATA")"
    echo "| $rf | ${iss:-⚠ sem issue} |"
  done
} > "$ROOT/$OUT"
ok "backlog exportado para $OUT ($(jq length <<< "$DATA") issues)"
