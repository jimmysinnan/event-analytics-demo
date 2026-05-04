#!/bin/bash
# update-app.sh — Met à jour le code et redémarre toutes les instances actives
#
# Ce que fait ce script :
#   1. git pull dans app/
#   2. pip install -r requirements.txt (si modifié)
#   3. npm run build (si code frontend modifié)
#   4. Redémarre toutes les instances actives
#
# Usage : ./update-app.sh [--no-build] [--no-restart] [--client slug]
#
# Options :
#   --no-build    Skips npm build (si seul le backend a changé)
#   --no-restart  Met à jour sans redémarrer les instances
#   --client slug Redémarre uniquement ce client

set -euo pipefail
source "$(dirname "$0")/_config.sh"

DO_BUILD=true
DO_RESTART=true
ONLY_CLIENT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-build)   DO_BUILD=false;   shift ;;
        --no-restart) DO_RESTART=false; shift ;;
        --client)     ONLY_CLIENT="$2"; shift 2 ;;
        *) log_error "Option inconnue : $1"; exit 1 ;;
    esac
done

echo ""
echo "============================================================"
echo "  Event Analytics — Mise à jour application"
echo "============================================================"
echo ""

# ── 1. git pull ────────────────────────────────────────────────────────────────
log_info "[1/4] git pull..."
cd "${EA_APP}"

BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
git fetch origin
git pull origin main 2>&1 | grep -E 'Already|Fast-forward|files? changed' || true
AFTER=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

if [ "$BEFORE" = "$AFTER" ]; then
    log_info "Code déjà à jour ($(git log -1 --format='%h %s' 2>/dev/null))."
else
    log_ok "Code mis à jour : ${BEFORE:0:7} → ${AFTER:0:7}"
    git log --oneline "${BEFORE}..${AFTER}" 2>/dev/null | head -5 | while read -r line; do
        echo "    + $line"
    done
fi

# ── 2. pip install ────────────────────────────────────────────────────────────
log_info "[2/4] Vérification des dépendances Python..."
CHANGED_REQ=$(git diff "${BEFORE}..${AFTER}" --name-only 2>/dev/null | grep 'requirements.txt' || true)

if [ -n "$CHANGED_REQ" ] || [ "$BEFORE" = "$AFTER" ]; then
    "${EA_PYTHON}" -m pip install -r "${EA_APP}/requirements.txt" -q --disable-pip-version-check
    log_ok "Dépendances Python OK"
else
    log_info "requirements.txt inchangé — installation skippée"
fi

# ── 3. npm build ──────────────────────────────────────────────────────────────
log_info "[3/4] Build frontend..."

if [ "$DO_BUILD" = false ]; then
    log_info "Build skippé (--no-build)"
else
    CHANGED_FRONTEND=$(git diff "${BEFORE}..${AFTER}" --name-only 2>/dev/null | grep 'frontend/' || true)

    if [ -n "$CHANGED_FRONTEND" ] || [ "$BEFORE" = "$AFTER" ]; then
        cd "${EA_APP}/../frontend" 2>/dev/null || cd "${EA_APP}/../../frontend" 2>/dev/null || {
            log_warn "Dossier frontend introuvable — build skippé"
            DO_BUILD=false
        }
        if [ "$DO_BUILD" = true ]; then
            npm run build 2>&1 | tail -4
            # Copier le build dans frontend_build/
            DIST_SRC="$(pwd)/dist"
            DIST_DEST="${EA_APP}/frontend_build"
            if [ -d "$DIST_SRC" ]; then
                rm -rf "${DIST_DEST:?}"
                cp -r "$DIST_SRC" "$DIST_DEST"
                log_ok "Frontend buildé → ${DIST_DEST}"
            else
                log_error "dist/ absent après build"
                exit 1
            fi
        fi
    else
        log_info "Frontend inchangé — build skippé"
    fi
fi

# ── 4. Redémarrage des instances ──────────────────────────────────────────────
log_info "[4/4] Redémarrage des instances..."

if [ "$DO_RESTART" = false ]; then
    log_info "Redémarrage skippé (--no-restart)"
    echo ""
    log_ok "Mise à jour terminée. Pensez à redémarrer les instances manuellement."
    exit 0
fi

SCRIPTS_DIR="$(dirname "$0")"
RESTARTED=0
SKIPPED=0

if [ -n "$ONLY_CLIENT" ]; then
    CLIENTS="$ONLY_CLIENT"
else
    CLIENTS=$(ls -1 "${EA_CLIENTS}" 2>/dev/null || echo "")
fi

for SLUG in $CLIENTS; do
    if [ ! -d "${EA_CLIENTS}/${SLUG}" ]; then
        log_warn "Client '${SLUG}' introuvable — ignoré"
        continue
    fi

    SERVICE="ea-${SLUG}"
    IS_ACTIVE=false

    if command -v systemctl &>/dev/null && systemctl is-active --quiet "${SERVICE}" 2>/dev/null; then
        IS_ACTIVE=true
    else
        ENV_FILE="${EA_CLIENTS}/${SLUG}/.env"
        PORT=$(grep -E '^PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d ' ' || echo "")
        if [ -n "$PORT" ] && command -v ss &>/dev/null && ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
            IS_ACTIVE=true
        fi
    fi

    if [ "$IS_ACTIVE" = true ]; then
        log_info "Redémarrage : ${SLUG}..."
        bash "${SCRIPTS_DIR}/restart-client.sh" "$SLUG" 2>&1 | grep -E 'OK|ERROR|WARN' || true
        RESTARTED=$((RESTARTED + 1))
    else
        log_info "Instance '${SLUG}' inactive — pas de redémarrage"
        SKIPPED=$((SKIPPED + 1))
    fi
done

echo ""
echo "============================================================"
log_ok "Mise à jour terminée."
echo "  Instances redémarrées : ${RESTARTED}"
echo "  Instances inactives   : ${SKIPPED}"
echo "  Commit actuel         : $(git -C "${EA_APP}" log -1 --format='%h %s' 2>/dev/null || echo 'N/A')"
echo "============================================================"
echo ""
