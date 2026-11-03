#!/usr/bin/env bash
# gerado pelo agilekit — edite em DEVassos/agilekit (repo/.github/scripts/lib/conventions.sh)
#
# Biblioteca compartilhada pelos validadores e automações do EcoPulse.
# Uso: source "$(dirname "${BASH_SOURCE[0]}")/lib/conventions.sh"
# Fornece: ambiente portátil (Windows/macOS/Linux/runner), regexes das convenções,
# saída com anotações do GitHub Actions, acesso a .github/equipe.json e calendario.json.

# shellcheck disable=SC2034  # variáveis consumidas pelos scripts que fazem source desta lib
set -euo pipefail

# --- Ambiente ----------------------------------------------------------------
# Windows (Git Bash): NÃO desative a conversão de caminhos do MSYS (git, gh e docker dependem dela).
# Regra: nunca chame "gh api /caminho" com barra inicial (o MSYS reescreveria); use "gh api repos/...".
ROOT="${ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
# No Git Bash o git devolve "G:/..." e o ":" quebraria o PATH; normaliza para a forma POSIX (/g/...)
ROOT="$(cd "$ROOT" 2>/dev/null && pwd || printf "%s" "$ROOT")"
export PATH="$ROOT/.agilekit/bin:$PATH"
EQUIPE_JSON="${EQUIPE_JSON:-$ROOT/.github/equipe.json}"
CALENDARIO_JSON="${CALENDARIO_JSON:-$ROOT/.github/calendario.json}"

# --- Convenções (fonte única — documentadas em .github/CONTRIBUTING.md) --------
COMMIT_TYPES='feat|fix|docs|refactor|test|chore|sql|style|perf|ci|build|revert'
COMMIT_SCOPES='backend frontend db docs infra processo kit'
RE_COMMIT_HEADER="^(${COMMIT_TYPES})(\([a-z0-9._/-]+\))?!?: [^[:space:]].*$"
RE_ISSUE_REF='(^|[^A-Za-z0-9/])#[0-9]+'
RE_MERGE='^(Merge |Revert ")'
RE_FIXUP='^(fixup|squash|amend)! '
SUBJECT_MAX=72

WORK_BRANCH_TYPES='feature|fix|docs|chore|test|sql'
RE_WORK_BRANCH="^(${WORK_BRANCH_TYPES})/[0-9]+-[a-z0-9.-]+$"
RE_RELEASE_BRANCH='^release/sprint-[0-9]+$'
RE_HOTFIX_BRANCH='^hotfix/[0-9]+-[a-z0-9.-]+$'
PROTECTED_BRANCHES='main develop'

# fecham a issue no merge: só as palavras do próprio GitHub (close/fix/resolve e flexões)
RE_PR_CLOSES='(^|[^A-Za-z0-9])([Cc]lose[sd]?|[Ff]ix(e[sd])?|[Rr]esolve[sd]?)[[:space:]]*:?[[:space:]]*#[0-9]+'
# só citam a issue (informativo): "Refs #n" não fecha a issue nem move o cartão
RE_PR_REFS='(^|[^A-Za-z0-9])[Rr]efs?[[:space:]]*:?[[:space:]]*#[0-9]+'
RE_LABEL_REQ='^(RF|RNF)[0-9]{2}$'
RE_LABEL_ALT='^tipo:(processo|bug)$'
PR_MAX_LINES=400

ORM_FORBIDDEN='prisma @prisma/client typeorm sequelize mikro-orm @mikro-orm/core drizzle-orm objection bookshelf waterline'
ORM_WARN='knex'

# --- Saída (anotações quando em GitHub Actions) --------------------------------
ERRORS=0
WARNINGS=0
_gha() { [ "${GITHUB_ACTIONS:-}" = "true" ]; }
info() { printf '%s\n' "$*"; }
ok()   { printf 'OK  %s\n' "$*"; }
# warn "mensagem" ["file=x,line=N"]
warn() {
  WARNINGS=$((WARNINGS + 1))
  if _gha; then printf '::warning%s::%s\n' "${2:+ $2}" "$1"; else printf 'AVISO  %s%s\n' "$1" "${2:+  [$2]}" >&2; fi
}
# err "mensagem" ["file=x,line=N"]
err() {
  ERRORS=$((ERRORS + 1))
  if _gha; then printf '::error%s::%s\n' "${2:+ $2}" "$1"; else printf 'ERRO   %s%s\n' "$1" "${2:+  [$2]}" >&2; fi
}
# finish "nome" → exit 1 se houve erros
finish() {
  local nome="${1:-validação}"
  if [ "$ERRORS" -gt 0 ]; then
    printf '\n%s: %d erro(s), %d aviso(s).\n' "$nome" "$ERRORS" "$WARNINGS" >&2
    exit 1
  fi
  printf '\n%s: sem erros (%d aviso(s)).\n' "$nome" "$WARNINGS"
  exit 0
}
need_cmd() {
  command -v "$1" >/dev/null 2>&1 && return 0
  err "comando '$1' não encontrado. ${2:-}"
  exit 1
}
# jq.exe no Windows emite CRLF; o wrapper normaliza para LF (pipefail preserva o exit code do jq)
jq() { command jq "$@" | tr -d '\r'; }
need_jq() { type -P jq >/dev/null 2>&1 && return 0; err "comando 'jq' não encontrado. Rode 'bash ../agilekit/install.sh .' (instala o jq) ou instale: winget install jqlang.jq | brew install jq | sudo apt-get install -y jq"; exit 1; }
need_gh() { need_cmd gh "Instale o GitHub CLI: https://cli.github.com e rode 'gh auth login'"; }
lower() { tr '[:upper:]' '[:lower:]'; }
trim()  { sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }

# --- Equipe (.github/equipe.json) ---------------------------------------------
equipe_disponivel() { [ -f "$EQUIPE_JSON" ]; }
equipe_logins()  { need_jq; jq -r '.integrantes[].login' "$EQUIPE_JSON"; }
equipe_emails()  { need_jq; jq -r '.integrantes[] | .emails[]' "$EQUIPE_JSON" | lower; }
equipe_nome()    { need_jq; jq -r --arg l "$1" '.integrantes[] | select(.login==$l) | .nome' "$EQUIPE_JSON"; }
equipe_papel()   { need_jq; jq -r --arg l "$1" '.integrantes[] | select(.login==$l) | .papel' "$EQUIPE_JSON"; }
equipe_par()     { need_jq; jq -r --arg l "$1" '.integrantes[] | select(.login==$l) | .par_de_revisao' "$EQUIPE_JSON"; }
equipe_por_papel() { need_jq; jq -r --arg p "$1" '.integrantes[] | select(.papel==$p) | .login' "$EQUIPE_JSON"; }
equipe_login_por_email() {
  need_jq
  local e; e="$(printf '%s' "$1" | lower)"
  jq -r --arg e "$e" '.integrantes[] | select([.emails[] | ascii_downcase] | index($e)) | .login' "$EQUIPE_JSON"
}
# equipe_coauthor_line <login> → "Co-authored-by: Nome <email-noreply>"
equipe_coauthor_line() {
  need_jq
  jq -r --arg l "$1" '.integrantes[] | select(.login==$l) | "Co-authored-by: \(.nome) <\(.emails[0])>"' "$EQUIPE_JSON"
}

# --- Calendário (.github/calendario.json) --------------------------------------
hoje() { date +%F; }
# sprint_atual → sprint cujo período contém hoje (ou a próxima; vazio se acabou)
sprint_atual() {
  need_jq
  local h; h="$(hoje)"
  jq -r --arg h "$h" '
    ( [ .sprints[] | select(.inicio <= $h and .fim >= $h) ] | first | .numero ) //
    ( [ .sprints[] | select(.inicio > $h) ] | first | .numero ) // empty' "$CALENDARIO_JSON"
}
sprint_campo() { need_jq; jq -r --argjson n "$1" --arg c "$2" '.sprints[] | select(.numero==$n) | .[$c] // empty' "$CALENDARIO_JSON"; }
# dias_ate <AAAA-MM-DD[THH:MM]> → inteiro (negativo se passou)
dias_ate() {
  local alvo="${1%%T*}" a b
  if date -d "$alvo" +%s >/dev/null 2>&1; then
    a=$(date -d "$alvo" +%s); b=$(date -d "$(hoje)" +%s)
  else
    a=$(date -j -f %Y-%m-%d "$alvo" +%s); b=$(date -j -f %Y-%m-%d "$(hoje)" +%s)
  fi
  echo $(( (a - b) / 86400 ))
}

# --- Git -------------------------------------------------------------------------
branch_atual() { git -C "$ROOT" symbolic-ref --short HEAD 2>/dev/null || echo ""; }
issue_da_branch() {
  printf '%s\n' "${1:-$(branch_atual)}" | sed -nE 's#^(feature|fix|docs|chore|test|sql|hotfix)/([0-9]+)-.*#\2#p'
}
branch_protegida() { case " $PROTECTED_BRANCHES " in *" $1 "*) return 0;; *) return 1;; esac; }
# mensagem_limpa <arquivo|-> → remove comentários ("# ..." e "#" sozinho; preserva "#12"),
# a seção de tesoura (-v) e linhas em branco repetidas.
mensagem_limpa() {
  local src="${1:--}"
  if [ "$src" = "-" ]; then cat; else cat "$src"; fi \
  | awk '/^# -+ >8 -+/ {exit} !/^#( |$)/ {print}' \
  | sed -e 's/[[:space:]]*$//' \
  | awk 'NF {blank=0} !NF {blank++} blank<=1'
}

# --- Quadro (Project v2) -----------------------------------------------------------
# project_number → PROJECT_NUMBER do ambiente ou variável do repositório (gh variable get)
project_number() {
  if [ -n "${PROJECT_NUMBER:-}" ]; then printf '%s\n' "$PROJECT_NUMBER"; return 0; fi
  gh variable get PROJECT_NUMBER 2>/dev/null || true
}
project_owner() {
  if [ -n "${PROJECT_OWNER:-}" ]; then printf '%s\n' "$PROJECT_OWNER"; return 0; fi
  gh variable get PROJECT_OWNER 2>/dev/null || true
}
