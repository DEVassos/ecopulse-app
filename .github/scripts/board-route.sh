#!/usr/bin/env bash
# gerado pelo agilekit — edite em DEVassos/agilekit (repo/.github/scripts/board-route.sh)
#
# Roteador de eventos do board.yml: lê o payload do evento e aplica a máquina de estados do quadro
# (Backlog < Sprint Backlog < Em andamento < Em revisão < Concluído). Só issues entram no quadro.
# Também fecha a issue quando o PR é mergeado em develop (o "Closes #n" nativo só fecha na branch padrão).
#
# Uso: board-route.sh <event.json> <event_name>   (no runner: "$GITHUB_EVENT_PATH" "$GITHUB_EVENT_NAME")
# Env: GH_TOKEN (issues/comentários), PROJECTS_TOKEN + PROJECT_OWNER + PROJECT_NUMBER (quadro),
#      BOARD_COMMENT_ON_PUSH (padrão true), SET_STATUS (caminho do script de status; padrão: project-set-status.sh ao lado — testes trocam por stub)

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/conventions.sh
source "$HERE/lib/conventions.sh"
need_jq; need_gh
[ $# -eq 2 ] || { sed -n '3,11p' "$0"; exit 2; }
EVENT_FILE="$1"; EVENT="$2"
SET_STATUS="${SET_STATUS:-$HERE/project-set-status.sh}"   # caminho do script (testes trocam por um stub)
REPO="${GITHUB_REPOSITORY:-$(jq -r '.repository.full_name // empty' "$EVENT_FILE")}"
export GITHUB_REPOSITORY="$REPO"
BOARD_COMMENT_ON_PUSH="${BOARD_COMMENT_ON_PUSH:-true}"

ev() { jq -r "$1" "$EVENT_FILE"; }
set_status() { # <n> <status> [only-from]
  if [ -z "${PROJECT_NUMBER:-}" ]; then warn "PROJECT_NUMBER ausente; quadro não atualizado para #$1 → $2"; return 0; fi
  bash "$SET_STATUS" "$1" "$2" --issues-only ${3:+--only-from "$3"} || warn "falha ao mover #$1 para '$2' (continua)"
}
set_number() { # <n> <campo> <valor>
  [ -z "${PROJECT_NUMBER:-}" ] && return 0
  bash "$SET_STATUS" "$1" - --issues-only --number "$2=$3" || warn "falha ao gravar $2=$3 em #$1 (continua)"
}
# estimativa: seção "### Estimativa (pontos)" do formulário ou "**Story Points:** N" (tarefas importadas)
estimativa_do_corpo() {
  local e
  e="$(awk '/^### *Estimativa/{f=1; next} /^### /{f=0} f' | grep -oE '[0-9]+([.,][0-9]+)?' | head -1 | tr ',' '.')"
  printf '%s' "$e"
}
issues_from_text() { grep -oE "$RE_ISSUE_REF" | grep -oE '[0-9]+' || true; }
uniq_nums() { tr ' ' '\n' | grep -E '^[0-9]+$' | sort -un; }

# issues ligadas a um PR: closingIssuesReferences ∪ nº da branch ∪ Closes/Fixes/Resolves #n do corpo
# ("Refs #n" só cita a issue: fica fora daqui, então não fecha nem move o cartão)
issues_do_pr() { # <pr-nº> <head-ref> <body>
  local refs branch_n body_n
  refs="$(gh api graphql -f owner="${REPO%%/*}" -f name="${REPO##*/}" -F number="$1" -f query='
    query($owner:String!, $name:String!, $number:Int!) { repository(owner:$owner, name:$name) {
      pullRequest(number:$number) { closingIssuesReferences(first:20) { nodes { number } } } } }' \
    --jq '.data.repository.pullRequest.closingIssuesReferences.nodes[].number' 2>/dev/null || true)"
  branch_n="$(issue_da_branch "$2")"
  body_n="$(printf '%s' "$3" | grep -oE "$RE_PR_CLOSES" | grep -oE '[0-9]+' || true)"
  printf '%s\n%s\n%s\n' "$refs" "$branch_n" "$body_n" | uniq_nums
}

case "$EVENT" in
  issues)
    ACTION="$(ev .action)"; N="$(ev .issue.number)"; MS="$(ev '.issue.milestone.title // ""')"
    case "$ACTION" in
      opened)
        bash "$HERE/issue-autolabel.sh" "$N" || warn "autolabel falhou para #$N"
        EST="$(ev '.issue.body // ""' | estimativa_do_corpo)"; [ -z "$EST" ] && EST="$(ev '.issue.body // ""' | grep -oiE 'Story Points:[*]*[[:space:]]*[0-9]+([.,][0-9]+)?' | grep -oE '[0-9]+([.,][0-9]+)?' | head -1)"
        [ -n "$EST" ] && set_number "$N" "Story Points" "$EST"
        if printf '%s' "$MS" | grep -Eq '^Sprint [0-9]+$'; then set_status "$N" "Sprint Backlog" "_"; else set_status "$N" "Backlog" "_"; fi ;;
      edited)
        bash "$HERE/issue-autolabel.sh" "$N" || warn "autolabel falhou para #$N"
        EST="$(ev '.issue.body // ""' | estimativa_do_corpo)"; [ -z "$EST" ] && EST="$(ev '.issue.body // ""' | grep -oiE 'Story Points:[*]*[[:space:]]*[0-9]+([.,][0-9]+)?' | grep -oE '[0-9]+([.,][0-9]+)?' | head -1)"
        [ -n "$EST" ] && set_number "$N" "Story Points" "$EST" ;;
      milestoned)   printf '%s' "$MS" | grep -Eq '^Sprint [0-9]+$' && set_status "$N" "Sprint Backlog" "_,Backlog" ;;
      demilestoned) set_status "$N" "Backlog" "Sprint Backlog" ;;
      closed)       set_status "$N" "Concluído" ;;
      reopened)     set_status "$N" "Em andamento"; gh issue edit "$N" --add-label regressao >/dev/null 2>&1 || true ;;
      *) info "issues/$ACTION: nada a fazer" ;;
    esac ;;

  push)
    REF="$(ev .ref)"; BRANCH="${REF#refs/heads/}"
    [ "$(ev .deleted)" = "true" ] && { info "branch apagada; nada a fazer"; exit 0; }
    branch_protegida "$BRANCH" && { info "push em $BRANCH; quadro não muda"; exit 0; }
    NUMS="$( { issue_da_branch "$BRANCH"; ev '.commits[].message' | issues_from_text; } | uniq_nums)"
    [ -n "$NUMS" ] || { info "push em $BRANCH sem #issue; nada a fazer"; exit 0; }
    while IFS= read -r n; do
      set_status "$n" "Em andamento" "_,Backlog,Sprint Backlog"
      if [ "$BOARD_COMMENT_ON_PUSH" = "true" ]; then
        MARK="<!-- agilekit:branch:$BRANCH -->"
        if ! gh issue view "$n" --json comments --jq '.comments[].body' 2>/dev/null | grep -Fq "$MARK"; then
          gh issue comment "$n" --body "$MARK
Trabalho iniciado na branch \`$BRANCH\` por @$(ev .sender.login) ($(ev .compare))." >/dev/null 2>&1 || true
        fi
      fi
    done <<< "$NUMS" ;;

  pull_request)
    ACTION="$(ev .action)"; PRN="$(ev .pull_request.number)"; BASE="$(ev .pull_request.base.ref)"
    HEAD_REF="$(ev .pull_request.head.ref)"; DRAFT="$(ev .pull_request.draft)"; MERGED="$(ev .pull_request.merged)"
    BODY="$(ev '.pull_request.body // ""')"
    [ "$(ev '.pull_request.head.repo.fork // false')" = "true" ] && { info "PR de fork; nada a fazer"; exit 0; }
    NUMS="$(issues_do_pr "$PRN" "$HEAD_REF" "$BODY")"
    SO_REFS="$(printf '%s' "$BODY" | grep -oE "$RE_PR_REFS" | grep -oE '[0-9]+' | uniq_nums | grep -vxF -f <(printf '%s\n' "$NUMS") || true)"
    [ -n "$SO_REFS" ] && info "PR #$PRN só cita (Refs) $(printf '%s\n' "$SO_REFS" | sed 's/^/#/' | paste -sd ' ' -); o quadro dessas issues não muda"
    [ -n "$NUMS" ] || { info "PR #$PRN sem issues ligadas"; exit 0; }
    while IFS= read -r n; do
      case "$ACTION" in
        opened|reopened|ready_for_review)
          [ "$DRAFT" = "true" ] || set_status "$n" "Em revisão" "_,Backlog,Sprint Backlog,Em andamento" ;;
        converted_to_draft) set_status "$n" "Em andamento" "Em revisão" ;;
        closed)
          if [ "$MERGED" = "true" ] && [ "$BASE" = "develop" ]; then
            gh issue close "$n" --reason completed --comment "Concluído pelo PR #$PRN (mergeado em \`develop\`)." >/dev/null 2>&1 || true
            set_status "$n" "Concluído"
          elif [ "$MERGED" = "true" ]; then info "PR #$PRN mergeado em $BASE (release/hotfix); quadro não muda"
          else set_status "$n" "Em andamento" "Em revisão"; fi ;;
        *) info "pull_request/$ACTION: nada a fazer" ;;
      esac
    done <<< "$NUMS" ;;

  *) info "evento '$EVENT' não roteado" ;;
esac
exit 0
