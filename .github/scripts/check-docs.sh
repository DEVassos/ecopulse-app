#!/usr/bin/env bash
# gerado pelo agilekit — edite em DEVassos/agilekit (repo/.github/scripts/check-docs.sh)
#
# Valida a documentação exigida pela rubrica:
#   ERRO : docs/plano-de-entregas.md ausente; linha com Situação "Concluído" sem link na coluna Evidência;
#          "Concluído" sem responsável; rotas (*.routes.ts) sem docs/api.md; arquivo vazio em docs/; "_(preencha)_"
#   AVISO: seção "## Sprint N" sem linhas ES01–ES09/DW01; Responsáveis vazio; ata de daily sem "Impedimentos";
#          placeholders ("TODO", "em breve", "lorem"); pasta vazia em docs/
# Uso: check-docs.sh [raiz]

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/conventions.sh
source "$HERE/lib/conventions.sh"
[ -n "${1:-}" ] && ROOT="$(cd "$1" && pwd)"
cd "$ROOT"

PLANO="docs/plano-de-entregas.md"
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT

# 1. plano de entregas --------------------------------------------------------
if [ ! -f "$PLANO" ]; then
  err "$PLANO ausente — obrigatório pela rubrica (um plano para as três sprints)"
else
  # awk: percorre as tabelas; coluna 1 = Código; descobre Evidência/Situação/Responsáveis pelo cabeçalho.
  # Emite "TIPO|linha|mensagem" (processado fora do awk para contar erros no shell principal).
  awk -F'|' '
    function trim(s) { gsub(/^[ \t]+|[ \t]+$/, "", s); return s }
    /^\|/ {
      h0 = tolower($0)
      if (h0 ~ /evid/ && h0 ~ /situa/) {
        split("", col); col["cod"] = 2
        for (i = 1; i <= NF; i++) { h = tolower(trim($i)); if (h ~ /^evid/) col["evid"] = i; if (h ~ /^situa/) col["sit"] = i; if (h ~ /^respons/) col["resp"] = i }
        intable = 1; next
      }
      if (intable && $0 ~ /^\|[ \t]*:?-+/) next
      if (intable) {
        cod = trim($(col["cod"])); sit = tolower(trim($(col["sit"]))); evid = trim($(col["evid"]))
        resp = ("resp" in col) ? trim($(col["resp"])) : "x"
        if (cod == "") next
        if (sit ~ /conclu/) {
          if (evid !~ /\]\(/ && evid !~ /https?:\/\//) printf "ERR|%d|%s: Situação \"Concluído\" sem link de evidência na coluna Evidência (ES04/ES07)\n", NR, cod
          if (resp == "" || tolower(resp) ~ /a definir/) printf "ERR|%d|%s: Situação \"Concluído\" sem responsável nomeado (ES09)\n", NR, cod
          if (evid !~ /\/blob\/[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]/) printf "WARN|%d|%s: prefira permalinks com SHA (tecla y no GitHub) na Evidência\n", NR, cod
        } else if (resp == "") {
          printf "WARN|%d|%s: coluna Responsáveis vazia\n", NR, cod
        }
        codigos[secao, cod] = 1
      }
      next
    }
    /^##[ \t]+Sprint[ \t]+[0-9]+/ { secao = $0; gsub(/[^0-9]/, "", secao); secoes[secao] = 1; intable = 0; next }
    /^#/ { intable = 0 }
    END {
      n = split("ES01 ES02 ES03 ES04 ES05 ES06 ES07 ES08 ES09 DW01", todas, " ")
      for (s in secoes) {
        falt = ""
        for (k = 1; k <= n; k++) if (!((s, todas[k]) in codigos)) falt = falt " " todas[k]
        if (falt != "") printf "WARN|0|## Sprint %s sem as linhas obrigatórias:%s (avaliados em toda sprint)\n", s, falt
      }
    }' "$PLANO" > "$TMP"
  while IFS='|' read -r tipo ln msg; do
    [ -n "$tipo" ] || continue
    case "$tipo" in
      ERR)  err "$PLANO:$ln — $msg" "file=$PLANO,line=$ln" ;;
      WARN) if [ "$ln" = "0" ]; then warn "$PLANO — $msg" "file=$PLANO"; else warn "$PLANO:$ln — $msg" "file=$PLANO,line=$ln"; fi ;;
    esac
  done < "$TMP"
  [ -s "$TMP" ] || ok "$PLANO: tabelas consistentes"
fi

# 2. rotas sem docs/api.md (DW03) ---------------------------------------------
if git ls-files -- 'backend/*.routes.ts' 2>/dev/null | grep -q .; then
  if [ ! -s docs/api.md ]; then
    err "existem rotas (*.routes.ts) mas docs/api.md está ausente ou vazio (DW03): documente método, URL, parâmetros, respostas e autenticação" "file=docs/api.md"
  else ok "docs/api.md presente"; fi
fi

# 3. arquivos vazios / placeholders em docs/ ----------------------------------
if [ -d docs ]; then
  { git ls-files -- 'docs/*.md' 2>/dev/null || find docs -name '*.md'; } > "$TMP"
  while IFS= read -r f; do
    [ -n "$f" ] && [ -f "$f" ] || continue
    case "$f" in docs/templates/*) [ -s "$f" ] || err "template vazio: $f" "file=$f"; continue ;; esac
    if [ ! -s "$f" ]; then err "arquivo vazio: $f — a rubrica não aceita documentos vazios" "file=$f"; continue; fi
    if [ "$(grep -cvE '^[[:space:]]*$' "$f")" -le 1 ]; then warn "arquivo só com título: $f — documentos nascem quando há conteúdo" "file=$f"; fi
    while IFS= read -r l; do [ -n "$l" ] || continue; ln="${l%%:*}"; err "placeholder '_(preencha)_' em $f:$ln" "file=$f,line=$ln"; done < <(grep -nF '_(preencha)_' "$f" || true)
    while IFS= read -r l; do [ -n "$l" ] || continue; ln="${l%%:*}"; warn "possível placeholder em $f:$ln: ${l#*:}" "file=$f,line=$ln"; done < <({ grep -nE '(^|[^[:alpha:]])(TODO|FIXME|TBD)([^[:alpha:]]|$)' "$f"; grep -niE '(^|[^[:alpha:]])(em breve|lorem ipsum|a preencher)([^[:alpha:]]|$)' "$f"; } | sort -t: -k1,1n -u || true)
  done < "$TMP"
fi

# 4. atas de daily ------------------------------------------------------------
for ata in docs/sprints/sprint-*/dailies/*.md; do
  [ -f "$ata" ] || continue
  grep -qi 'impedimento' "$ata" || warn "ata sem seção de impedimentos: $ata" "file=$ata"
done

# 5. pastas vazias em docs/ (não comprovam atendimento) -----------------------
if [ -d docs ]; then
  while IFS= read -r d; do [ -n "$d" ] && warn "pasta vazia em $d — remova (pastas vazias não comprovam atendimento)"; done < <(find docs -type d -empty 2>/dev/null || true)
fi

finish "check-docs"
