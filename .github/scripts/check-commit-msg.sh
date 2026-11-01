#!/usr/bin/env bash
# gerado pelo agilekit — edite em DEVassos/agilekit (repo/.github/scripts/check-commit-msg.sh)
#
# Valida mensagens de commit do EcoPulse (ES04/ES05/ES09):
#   type(scope): descrição no imperativo (#issue) [RFxx]   ≤72 caracteres
#   referência #n no assunto ou no corpo
#   Co-authored-by: só integrantes de .github/equipe.json (vazio ou alguém do time)
#
# Uso:
#   check-commit-msg.sh [--local] <arquivo>      # hook commit-msg (arquivo com a mensagem)
#   check-commit-msg.sh [--local] -               # mensagem pelo stdin (guard dos assistentes de IA)
#   check-commit-msg.sh --range <A..B>            # todos os commits do intervalo (CI); ignora merges
# --local aceita prefixos fixup!/squash! (serão esmagados antes do PR).
# Commits importados de outro repositório (histórico preservado com SHA, autor e data originais) e listados
# em .github/commits-importados.txt (um SHA completo por linha) têm a validação de mensagem dispensada.

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/conventions.sh
source "$HERE/lib/conventions.sh"

LOCAL=0; MODE=""; ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --local) LOCAL=1 ;;
    --range) MODE=range; ARG="${2:-}"; shift ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) MODE="${MODE:-msg}"; ARG="$1" ;;
  esac
  shift
done
[ -n "$MODE" ] || { sed -n '2,13p' "$0"; exit 2; }

AJUDA="Formato: type(scope): descrição no imperativo (#issue) [RFxx] — tipos: ${COMMIT_TYPES//|/ }; ex.: feat(backend): lista serviços descobertos (#12) [RF01]"

# valida_mensagem <texto> <rótulo> [autor-email]
valida_mensagem() {
  local msg="$1" rotulo="$2" autor="${3:-}" header segunda trailers
  header="$(printf '%s\n' "$msg" | awk 'NF {print; exit}')"

  if [ -z "$header" ]; then err "$rotulo: mensagem vazia. $AJUDA"; return; fi
  if printf '%s' "$header" | grep -Eq "$RE_MERGE"; then ok "$rotulo: commit de merge/revert aceito"; return; fi
  if [ "$LOCAL" = 1 ] && printf '%s' "$header" | grep -Eq "$RE_FIXUP"; then ok "$rotulo: fixup!/squash! aceito localmente"; return; fi

  if ! printf '%s' "$header" | grep -Eq "$RE_COMMIT_HEADER"; then
    err "$rotulo: assunto fora do padrão: \"$header\". $AJUDA"
  fi
  if [ "${#header}" -gt "$SUBJECT_MAX" ]; then
    err "$rotulo: assunto com ${#header} caracteres (máximo $SUBJECT_MAX): \"$header\""
  fi
  if ! printf '%s\n' "$msg" | grep -Eq "$RE_ISSUE_REF"; then
    err "$rotulo: falta a referência à issue (#n) no assunto ou no corpo. Toda mudança nasce de uma issue (ES04)."
  fi
  segunda="$(printf '%s\n' "$msg" | awk 'NR==2 {print; exit}')"
  if [ -n "$segunda" ]; then warn "$rotulo: deixe uma linha em branco entre o assunto e o corpo"; fi

  # Co-autoria: vazio ou alguém do time
  trailers="$(printf '%s\n' "$msg" | grep -iE '^co-authored-by:' || true)"
  if [ -n "$trailers" ]; then
    if ! equipe_disponivel; then
      warn "$rotulo: .github/equipe.json não encontrado; co-autoria não validada"
    else
      local emails_time linha email nome login
      emails_time="$(equipe_emails)"
      while IFS= read -r linha; do
        [ -n "$linha" ] || continue
        email="$(printf '%s' "$linha" | sed -nE 's/.*<([^>]+)>.*/\1/p' | lower)"
        nome="$(printf '%s' "$linha" | sed -E 's/^[Cc]o-authored-by:[[:space:]]*//; s/[[:space:]]*<.*$//')"
        if [ -z "$email" ]; then
          err "$rotulo: trailer de co-autoria sem e-mail: \"$linha\". Exemplo: $(equipe_coauthor_line "$(equipe_logins | head -1)")"
          continue
        fi
        if ! printf '%s\n' "$emails_time" | grep -Fxq "$email"; then
          err "$rotulo: co-autor fora do time: \"$linha\". Co-autoria só pode ser vazia ou de um integrante listado em .github/equipe.json (nunca IA, bots ou externos)."
          continue
        fi
        login="$(equipe_login_por_email "$email")"
        if [ -n "$autor" ] && [ "$(printf '%s' "$autor" | lower)" = "$email" ]; then
          warn "$rotulo: o co-autor ($login) é o próprio autor do commit"
        fi
        ok "$rotulo: co-autoria válida ($login — $nome)"
      done <<< "$trailers"
    fi
  fi
  if printf '%s\n' "$msg" | grep -iEq '^(co-authored-by|signed-off-by|authored-by):.*(claude|anthropic|copilot|chatgpt|openai|codex|gemini|antigravity|cursor|\[bot\])'; then
    err "$rotulo: trailer de autoria atribuído a IA/bot. Remova-o (regra do time: co-autor só humano e do time)."
  fi
}

case "$MODE" in
  msg)
    MSG="$(mensagem_limpa "$ARG")"
    valida_mensagem "$MSG" "commit" "${GIT_AUTHOR_EMAIL:-}"
    finish "check-commit-msg"
    ;;
  range)
    [ -n "$ARG" ] || { err "informe o intervalo, ex.: --range origin/develop..HEAD"; exit 2; }
    SHAS="$(git -C "$ROOT" rev-list --no-merges --reverse "$ARG" 2>/dev/null || true)"
    if [ -z "$SHAS" ]; then info "nenhum commit em $ARG"; finish "check-commit-msg"; fi
    EMAILS_TIME=""
    equipe_disponivel && EMAILS_TIME="$(equipe_emails)"
    IMPORTADOS=""
    if [ -f "$ROOT/.github/commits-importados.txt" ]; then
      IMPORTADOS="$(grep -vE '^[[:space:]]*(#|$)' "$ROOT/.github/commits-importados.txt" | awk '{print $1}' | lower || true)"
    fi
    while IFS= read -r sha; do
      [ -n "$sha" ] || continue
      short="${sha:0:7}"
      if [ -n "$IMPORTADOS" ] && printf '%s\n' "$IMPORTADOS" | grep -Fxq "$sha"; then
        info "$short: commit importado (listado em .github/commits-importados.txt) — mensagem original preservada, validação dispensada"
        continue
      fi
      autor_email="$(git -C "$ROOT" log -1 --format=%ae "$sha" | lower)"
      autor_nome="$(git -C "$ROOT" log -1 --format=%an "$sha")"
      if [ -n "$EMAILS_TIME" ] && ! printf '%s\n' "$EMAILS_TIME" | grep -Fxq "$autor_email"; then
        warn "$short: autor $autor_nome <$autor_email> não está em .github/equipe.json — confira se este e-mail é verificado na sua conta GitHub (senão o commit fica sem login e não conta para ES09) e adicione-o ao equipe.json via PR"
      fi
      MSG="$(git -C "$ROOT" log -1 --format=%B "$sha" | mensagem_limpa -)"
      valida_mensagem "$MSG" "$short" "$autor_email"
    done <<< "$SHAS"
    finish "check-commit-msg"
    ;;
esac
