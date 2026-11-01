#!/usr/bin/env bash
# gerado pelo agilekit — edite em DEVassos/agilekit (repo/.github/scripts/project-set-status.sh)
#
# Move o cartão de uma issue no GitHub Project v2 (coluna Status) e/ou preenche campos de texto.
# Usado pelo board.yml (com PROJECTS_TOKEN) e pelas skills /tarefa e /pr (token do próprio dev).
#
# Uso: project-set-status.sh <issue-nº> <Status|-> [--only-from "_,Backlog,Sprint Backlog"]
#                            [--text "Campo=Valor"]... [--number "Campo=Valor"]... [--issues-only] [--dry-run]
#   Status "-"      : não altera o Status (só campos --text)
#   --only-from     : lista separada por vírgula dos status atuais permitidos ("_" = sem status/não está no quadro)
#   --issues-only   : se o nº for de um PR, sai 0 sem fazer nada
# Env: PROJECT_OWNER (padrão: dono do repo), PROJECT_NUMBER (obrigatório), PROJECTS_TOKEN (opcional; vale para as mutações)
# Saída: 0 ok/no-op, 1 falha, 2 argumentos

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/conventions.sh
source "$HERE/lib/conventions.sh"
need_jq; need_gh

[ $# -ge 2 ] || { sed -n '3,14p' "$0"; exit 2; }
NUM="$1"; TARGET="$2"; shift 2
ONLY_FROM=""; TEXTS=(); NUMBERS=(); ISSUES_ONLY=0; DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --only-from) ONLY_FROM="$2"; shift ;;
    --text) TEXTS+=("$2"); shift ;;
    --number) NUMBERS+=("$2"); shift ;;
    --issues-only) ISSUES_ONLY=1 ;;
    --dry-run) DRY=1 ;;
    *) err "argumento desconhecido: $1"; exit 2 ;;
  esac
  shift
done

REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
OWNER_REPO="${REPO%%/*}"; NAME_REPO="${REPO##*/}"
PROJECT_OWNER="$(project_owner)"; PROJECT_OWNER="${PROJECT_OWNER:-$OWNER_REPO}"
PROJECT_NUMBER="$(project_number)"
[ -n "$PROJECT_NUMBER" ] || { err "PROJECT_NUMBER não definido (env ou gh variable set PROJECT_NUMBER). Rode gh-bootstrap.sh."; exit 1; }
[ -n "${PROJECTS_TOKEN:-}" ] && export GH_TOKEN="$PROJECTS_TOKEN"

# 1) projeto + campos (dono pode ser usuário ou organização)
PROJ="$(gh api graphql -f owner="$PROJECT_OWNER" -F number="$PROJECT_NUMBER" -f query='
  query($owner:String!, $number:Int!) {
    repositoryOwner(login:$owner) {
      ... on User { projectV2(number:$number) { id title fields(first:50) { nodes {
        ... on ProjectV2FieldCommon { id name dataType }
        ... on ProjectV2SingleSelectField { options { id name } } } } } }
      ... on Organization { projectV2(number:$number) { id title fields(first:50) { nodes {
        ... on ProjectV2FieldCommon { id name dataType }
        ... on ProjectV2SingleSelectField { options { id name } } } } } }
    } }' --jq '.data.repositoryOwner.projectV2')"
[ -n "$PROJ" ] && [ "$PROJ" != "null" ] || { err "Project #$PROJECT_NUMBER de $PROJECT_OWNER não encontrado (token com escopo project?)"; exit 1; }
PROJECT_ID="$(jq -r .id <<< "$PROJ")"
STATUS_FIELD_ID="$(jq -r '.fields.nodes[] | select(.name=="Status") | .id' <<< "$PROJ")"

# 2) item (issue ou PR) e status atual
ITEM="$(gh api graphql -f owner="$OWNER_REPO" -f name="$NAME_REPO" -F number="$NUM" -f query='
  query($owner:String!, $name:String!, $number:Int!) {
    repository(owner:$owner, name:$name) { issueOrPullRequest(number:$number) { __typename
      ... on Issue { id projectItems(first:20) { nodes { id project { id } fieldValueByName(name:"Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } }
      ... on PullRequest { id projectItems(first:20) { nodes { id project { id } fieldValueByName(name:"Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } }
    } } }' --jq '.data.repository.issueOrPullRequest')"
[ -n "$ITEM" ] && [ "$ITEM" != "null" ] || { err "#$NUM não encontrado em $REPO"; exit 1; }
TYPENAME="$(jq -r .__typename <<< "$ITEM")"
if [ "$TYPENAME" = "PullRequest" ] && [ "$ISSUES_ONLY" = 1 ]; then info "#$NUM é PR; só issues entram no quadro"; exit 0; fi
CONTENT_ID="$(jq -r .id <<< "$ITEM")"
ITEM_ID="$(jq -r --arg p "$PROJECT_ID" '.projectItems.nodes[] | select(.project.id==$p) | .id' <<< "$ITEM" | head -1)"
CURRENT="$(jq -r --arg p "$PROJECT_ID" '.projectItems.nodes[] | select(.project.id==$p) | .fieldValueByName.name // ""' <<< "$ITEM" | head -1)"

if [ -z "$ITEM_ID" ]; then
  if [ "$DRY" = 1 ]; then info "[dry-run] adicionaria #$NUM ao projeto"; ITEM_ID="DRY"; else
    ITEM_ID="$(gh api graphql -f projectId="$PROJECT_ID" -f contentId="$CONTENT_ID" -f query='
      mutation($projectId:ID!, $contentId:ID!) { addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) { item { id } } }' --jq '.data.addProjectV2ItemById.item.id')"
    info "#$NUM adicionado ao projeto"
  fi
  CURRENT=""
fi

# 3) guarda --only-from
if [ -n "$ONLY_FROM" ] && [ "$TARGET" != "-" ]; then
  cur="${CURRENT:-_}"; permitido=0
  IFS=',' read -ra lista <<< "$ONLY_FROM"
  for s in "${lista[@]}"; do [ "$(printf '%s' "$s" | trim)" = "$cur" ] && permitido=1; done
  if [ "$permitido" = 0 ]; then info "#$NUM em '${CURRENT:-sem status}' — transição para '$TARGET' não permitida (only-from: $ONLY_FROM); nada feito"; exit 0; fi
fi

# 4) Status
if [ "$TARGET" != "-" ]; then
  if [ "$CURRENT" = "$TARGET" ]; then info "#$NUM já está em '$TARGET'"; else
    OPTION_ID="$(jq -r --arg t "$TARGET" '.fields.nodes[] | select(.name=="Status") | .options[] | select(.name==$t) | .id' <<< "$PROJ")"
    [ -n "$OPTION_ID" ] || { err "opção de Status '$TARGET' não existe no projeto (opções: $(jq -r '[.fields.nodes[] | select(.name=="Status") | .options[].name] | join(", ")' <<< "$PROJ"))"; exit 1; }
    if [ "$DRY" = 1 ]; then info "[dry-run] #$NUM: '${CURRENT:-sem status}' → '$TARGET'"; else
      gh api graphql -f projectId="$PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="$STATUS_FIELD_ID" -f optionId="$OPTION_ID" -f query='
        mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $optionId:String!) {
          updateProjectV2ItemFieldValue(input:{projectId:$projectId, itemId:$itemId, fieldId:$fieldId, value:{singleSelectOptionId:$optionId}}) { projectV2Item { id } } }' >/dev/null
      ok "#$NUM: '${CURRENT:-sem status}' → '$TARGET'"
    fi
  fi
fi

# 5) campos de texto
for kv in "${TEXTS[@]:-}"; do
  [ -n "$kv" ] || continue
  campo="${kv%%=*}"; valor="${kv#*=}"
  FIELD_ID="$(jq -r --arg c "$campo" '.fields.nodes[] | select(.name==$c and .dataType=="TEXT") | .id' <<< "$PROJ")"
  [ -n "$FIELD_ID" ] || { warn "campo de texto '$campo' não existe no projeto; ignorado"; continue; }
  if [ "$DRY" = 1 ]; then info "[dry-run] #$NUM: $campo='$valor'"; else
    gh api graphql -f projectId="$PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="$FIELD_ID" -f text="$valor" -f query='
      mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $text:String!) {
        updateProjectV2ItemFieldValue(input:{projectId:$projectId, itemId:$itemId, fieldId:$fieldId, value:{text:$text}}) { projectV2Item { id } } }' >/dev/null
    ok "#$NUM: $campo='$valor'"
  fi
done

# 6) campos numéricos (ex.: Story Points)
for kv in "${NUMBERS[@]:-}"; do
  [ -n "$kv" ] || continue
  campo="${kv%%=*}"; valor="${kv#*=}"
  FIELD_ID="$(jq -r --arg c "$campo" '.fields.nodes[] | select(.name==$c and .dataType=="NUMBER") | .id' <<< "$PROJ")"
  [ -n "$FIELD_ID" ] || { warn "campo numérico '$campo' não existe no projeto (rode gh-bootstrap.sh --project); ignorado"; continue; }
  if [ "$DRY" = 1 ]; then info "[dry-run] #$NUM: $campo=$valor"; else
    gh api graphql -f projectId="$PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="$FIELD_ID" -F number="$valor" -f query='
      mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $number:Float!) {
        updateProjectV2ItemFieldValue(input:{projectId:$projectId, itemId:$itemId, fieldId:$fieldId, value:{number:$number}}) { projectV2Item { id } } }' >/dev/null
    ok "#$NUM: $campo=$valor"
  fi
done
exit 0
