#!/usr/bin/env bash
# script do repositório (não vem do agilekit) — issue #117
#
# Gera o burndown da sprint em markdown: gráfico Mermaid (renderizado pelo GitHub) e tabela dia a dia
# com escopo, pontos restantes e linha ideal, a partir das issues da milestone "Sprint N" e do campo
# "Story Points" do Project. Histórias e épicos ficam fora da soma (os pontos estão nas tarefas filhas).
# Uso: burndown.sh <sprint-nº> [--out docs/sprints/sprint-N/burndown.md] [--base AAAA-MM-DD]
#      (datas de .github/calendario.json; projeto de PROJECT_OWNER/PROJECT_NUMBER ou das variáveis do repo)
#      --base (ou "burndown_base" da sprint no calendário): issues criadas até essa data contam como
#      escopo planejado desde o primeiro dia (ex.: backlog importado para o GitHub depois do início)

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/conventions.sh
source "$HERE/lib/conventions.sh"
need_jq; need_gh
[ -n "${1:-}" ] || { sed -n '3,8p' "$0"; exit 2; }
N="$1"; shift; OUT=""; BASE=""
while [ $# -gt 0 ]; do case "$1" in --out) OUT="$2"; shift;; --base) BASE="$2"; shift;; esac; shift; done

INICIO="$(sprint_campo "$N" inicio)"; FIM="$(sprint_campo "$N" fim)"
[ -n "$INICIO" ] || { err "sprint $N não existe em $CALENDARIO_JSON"; exit 1; }
[ -n "$BASE" ] || BASE="$(sprint_campo "$N" burndown_base)"; [ -n "$BASE" ] || BASE="$INICIO"
REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
MS="Sprint $N"

# gh antigo não tem "gh variable get": cai para "gh variable list"
var_repo() { gh variable list -R "$REPO" 2>/dev/null | awk -v k="$1" '$1==k {print $2}'; }
PNUM="$(project_number)"; [ -n "$PNUM" ] || PNUM="$(var_repo PROJECT_NUMBER)"
POWNER="$(project_owner)"; [ -n "$POWNER" ] || POWNER="$(var_repo PROJECT_OWNER)"
[ -n "$PNUM" ] && [ -n "$POWNER" ] || { err "PROJECT_NUMBER/PROJECT_OWNER não definidos (env ou variáveis do repositório)"; exit 1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
# Story Points lidos a partir de cada issue da milestone (projectItems), não da listagem do quadro:
# em 22/10 o "gh project item-list" omitiu 5 tarefas que estavam no quadro com pontos (#205)
MILESTONES="$(gh api "repos/$REPO/milestones?state=all&per_page=100")" || { err "falha ao listar as milestones de $REPO"; exit 1; }
MS_NUM="$(jq -r --arg t "$MS" '.[] | select(.title == $t) | .number' <<< "$MILESTONES")"
[ -n "$MS_NUM" ] || { err "milestone \"$MS\" não encontrada em $REPO"; exit 1; }
gh api graphql --paginate -f owner="${REPO%%/*}" -f name="${REPO##*/}" -F ms="$MS_NUM" -f query='
  query($owner:String!, $name:String!, $ms:Int!, $endCursor:String) {
    repository(owner:$owner, name:$name) { milestone(number:$ms) { issues(first:100, after:$endCursor) {
      pageInfo { hasNextPage endCursor }
      nodes { number title url state createdAt closedAt labels(first:30) { nodes { name } }
        projectItems(first:20) { nodes {
          project { number owner { ... on Organization { login } ... on User { login } } }
          fieldValueByName(name:"Story Points") { ... on ProjectV2ItemFieldNumberValue { number } } } } } } } } }' \
  --jq '.data.repository.milestone.issues.nodes[]' > "$TMP/issues.json" \
  || { err "falha ao ler as issues da milestone \"$MS\" e os pontos do quadro (token com escopo read:project?)"; exit 1; }

# último dia do gráfico: hoje, limitado ao fim da sprint
# UTC-3 fixo em formato POSIX: o Git Bash não traz zoneinfo e trataria America/Sao_Paulo como UTC
TZ_BR="<-03>3"
HOJE="$(TZ="$TZ_BR" date +%F)"
ATE="$FIM"; [[ "$HOJE" < "$FIM" ]] && ATE="$HOJE"
DIAS="$(jq -rn --arg i "$INICIO" --arg f "$ATE" '
  [range(($i+"T12:00:00Z"|fromdateiso8601); ($f+"T12:00:00Z"|fromdateiso8601)+1; 86400) | strftime("%Y-%m-%d")]')"
TOTAL_DIAS="$(jq -rn --arg i "$INICIO" --arg f "$FIM" '((($f+"T12:00:00Z"|fromdateiso8601) - ($i+"T12:00:00Z"|fromdateiso8601)) / 86400)')"

# itens: tarefas/processo/bug da milestone com pontos do Project; datas em America/Sao_Paulo (UTC-3)
jq -s --arg ini "$INICIO" --arg base "$BASE" --arg owner "$POWNER" --argjson pnum "$PNUM" '
  def brt: fromdateiso8601 - 10800 | strftime("%Y-%m-%d");
  sort_by(.number)
  | map(select([.labels.nodes[].name] | (index("tipo:historia") or index("tipo:epico")) | not)
        | ([.projectItems.nodes[] | select(.project.number == $pnum and (.project.owner.login | ascii_downcase) == ($owner | ascii_downcase))] | first) as $item
        | {number, title, url, state,
           noquadro: ($item != null),
           pontos: $item.fieldValueByName.number,
           entrou: ((.createdAt|brt) as $c | if $c <= $base then $ini else $c end),
           fechou: (if .closedAt then (.closedAt|brt) else null end)})' "$TMP/issues.json" > "$TMP/itens.json"
FORA="$(jq -c '[.[] | select(.noquadro | not) | .number]' "$TMP/itens.json")"
[ "$FORA" = "[]" ] || warn "issues da milestone fora do quadro $PNUM (sem pontos na soma): $FORA"

jq --argjson dias "$DIAS" --argjson total "$TOTAL_DIAS" '
  map(select(.pontos != null)) as $it
  | ([$it[] | select(.entrou <= $dias[0]) | .pontos] | add // 0) as $s0
  | [range(0; $dias|length) as $i | $dias[$i] as $d
     | {dia: $d,
        escopo: ([$it[] | select(.entrou <= $d) | .pontos] | add // 0),
        restante: ([$it[] | select(.entrou <= $d and (.fechou == null or .fechou > $d)) | .pontos] | add // 0),
        ideal: ((($s0 * (1 - $i / $total)) * 10 | round) / 10),
        fechadas: [$it[] | select(.fechou == $d) | .number],
        novas: (if $i == 0 then [] else [$it[] | select(.entrou == $d) | .number] end)}]' "$TMP/itens.json" > "$TMP/serie.json"

ddmm() { jq -r '.[] | .dia | split("-") | "\(.[2])/\(.[1])"' "$TMP/serie.json"; }
csv() { jq -r "[.[] | $1] | map(tostring) | join(\", \")" "$TMP/serie.json"; }
S0="$(jq '.[0].escopo' "$TMP/serie.json")"
ESC="$(jq '.[-1].escopo' "$TMP/serie.json")"
REST="$(jq '.[-1].restante' "$TMP/serie.json")"
FEITO=$(( ESC - REST ))
YMAX="$(jq '[.[].escopo] | max | . + 5 - (. % 5)' "$TMP/serie.json")"
ULT="$(jq -r '.[-1].dia | split("-") | "\(.[2])/\(.[1])"' "$TMP/serie.json")"
lista() { jq -r --arg u "https://github.com/$REPO/issues/" 'if length == 0 then "—" else map("[#\(.)](\($u)\(.))") | join(", ") end'; }

{
  echo "# Burndown — Sprint $N"
  echo
  echo "_Gerado em $(TZ="$TZ_BR" date '+%d/%m/%Y %H:%M') por \`.github/scripts/burndown.sh $N\` a partir das issues da milestone [$MS](https://github.com/$REPO/milestones) e do campo **Story Points** do [quadro](https://github.com/orgs/$POWNER/projects/$PNUM). Período da sprint: $(date -d "$INICIO" +%d/%m) a $(date -d "$FIM" +%d/%m/%Y); dados até $ULT._"
  echo
  echo '```mermaid'
  echo 'xychart-beta'
  echo "    title \"Sprint $N — Story Points por dia\""
  echo "    x-axis [$(ddmm | sed 's/.*/"&"/' | paste -sd, | sed 's/,/, /g')]"
  echo "    y-axis \"Story Points\" 0 --> $YMAX"
  echo "    bar [$(csv .escopo)]"
  echo "    line [$(csv .ideal)]"
  echo "    line [$(csv .restante)]"
  echo '```'
  echo
  echo "Como ler: **barras** = escopo da sprint no dia (soma dos pontos das tarefas já na milestone); **linha que desce reta** = ideal, de $S0 pontos no primeiro dia até 0 no último dia da sprint; **outra linha** = pontos ainda abertos no fim de cada dia. Restante acima do ideal indica atraso; barra que sobe indica escopo acrescentado durante a sprint."
  echo
  echo "## Resumo"
  echo
  echo "| Indicador | Story Points |"
  echo "|---|---|"
  echo "| Escopo no primeiro dia ($(date -d "$INICIO" +%d/%m)) | $S0 |"
  echo "| Escopo em $ULT | $ESC |"
  echo "| Concluído (issues fechadas) | $FEITO |"
  echo "| Restante | $REST |"
  echo
  echo "## Dia a dia"
  echo
  echo "| Dia | Escopo | Ideal | Restante | Issues fechadas no dia | Issues que entraram no dia |"
  echo "|---|---|---|---|---|---|"
  jq -c '.[]' "$TMP/serie.json" | while IFS= read -r l; do
    d="$(jq -r '.dia | split("-") | "\(.[2])/\(.[1])"' <<< "$l")"
    echo "| $d | $(jq .escopo <<< "$l") | $(jq .ideal <<< "$l") | $(jq .restante <<< "$l") | $(jq -c .fechadas <<< "$l" | lista) | $(jq -c .novas <<< "$l" | lista) |"
  done
  echo
  SEM="$(jq -c '[.[] | select(.noquadro and .pontos == null) | .number]' "$TMP/itens.json")"
  echo "## Fora da soma"
  echo
  echo "- Histórias (\`tipo:historia\`) e épicos: os pontos deles já estão nas tarefas filhas."
  echo "- Issues sem Story Points no quadro: $(lista <<< "$SEM")."
  [ "$FORA" = "[]" ] || echo "- Issues da milestone que não estão no quadro: $(lista <<< "$FORA")."
  echo
  echo "## Método"
  echo
  echo "- Uma issue entra no escopo no dia em que foi criada (ou no primeiro dia da sprint, se é anterior) e sai do restante no dia em que foi fechada (merge do PR em \`develop\` para tarefas), no horário de Brasília."
  [ "$BASE" != "$INICIO" ] && echo "- Data-base desta sprint: $(date -d "$BASE" +%d/%m) (\`burndown_base\` em \`.github/calendario.json\`). As issues criadas até essa data contam como escopo planejado desde $(date -d "$INICIO" +%d/%m), porque o backlog chegou ao GitHub depois do início da sprint."
  echo "- A lista de issues é a da milestone no momento da geração: issue movida para outra sprint deixa de aparecer em todos os dias, e o motivo fica no [histórico do plano](../../plano-de-entregas.md#histórico-de-alterações-do-plano)."
} > "$TMP/out.md"

if [ -n "$OUT" ]; then
  mkdir -p "$(dirname "$ROOT/$OUT")"; cp "$TMP/out.md" "$ROOT/$OUT"
  ok "burndown da sprint $N em $OUT (escopo $ESC, restante $REST)"
else
  cat "$TMP/out.md"
fi
