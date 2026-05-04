#!/bin/bash
# restart-client.sh — Redémarre une instance client
#
# Utilisé après modification du .env ou mise à jour du code.
#
# Usage : ./restart-client.sh <slug>
# Exemple : ./restart-client.sh adi

set -euo pipefail
source "$(dirname "$0")/_config.sh"

SLUG="${1:-}"
require_client "$SLUG"

SERVICE="ea-${SLUG}"
SCRIPTS_DIR="$(dirname "$0")"

echo ""
log_info "Redémarrage de l'instance '${SLUG}'..."

# ── Via systemd (plus fiable, rechargement du .env inclus) ────────────────────
if command -v systemctl &>/dev/null && systemctl list-unit-files "${SERVICE}.service" &>/dev/null 2>&1; then
    systemctl restart "${SERVICE}"
    sleep 2
    if systemctl is-active --quiet "${SERVICE}"; then
        log_ok "Instance '${SLUG}' redémarrée."
        # Afficher les dernières lignes de log
        journalctl -u "${SERVICE}" -n 5 --no-pager 2>/dev/null || true
    else
        log_error "Échec du redémarrage. Logs :"
        journalctl -u "${SERVICE}" -n 20 --no-pager
        exit 1
    fi

# ── Fallback : stop + start ────────────────────────────────────────────────────
else
    bash "${SCRIPTS_DIR}/stop-client.sh" "$SLUG"
    sleep 1
    bash "${SCRIPTS_DIR}/start-client.sh" "$SLUG"
fi
echo ""
