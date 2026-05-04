#!/bin/bash
# stop-client.sh — Arrête une instance client
#
# Usage : ./stop-client.sh <slug>
# Exemple : ./stop-client.sh adi

set -euo pipefail
source "$(dirname "$0")/_config.sh"

SLUG="${1:-}"
require_client "$SLUG"

SERVICE="ea-${SLUG}"

echo ""
log_info "Arrêt de l'instance '${SLUG}'..."

# ── Via systemd ────────────────────────────────────────────────────────────────
if command -v systemctl &>/dev/null && systemctl list-unit-files "${SERVICE}.service" &>/dev/null 2>&1; then
    if ! systemctl is-active --quiet "${SERVICE}"; then
        log_warn "Instance '${SLUG}' n'est pas active."
        exit 0
    fi
    systemctl stop "${SERVICE}"
    log_ok "Instance '${SLUG}' arrêtée via systemd."

# ── Fallback : PID file ────────────────────────────────────────────────────────
else
    PIDFILE="${EA_CLIENTS}/${SLUG}/run/app.pid"
    if [ ! -f "$PIDFILE" ]; then
        log_warn "PID file introuvable. Instance '${SLUG}' peut-être pas en cours."
        exit 0
    fi

    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill -TERM "$PID"
        sleep 2
        # Force kill si nécessaire
        if kill -0 "$PID" 2>/dev/null; then
            log_warn "SIGTERM ignoré. Envoi SIGKILL..."
            kill -KILL "$PID"
        fi
        rm -f "$PIDFILE"
        log_ok "Instance '${SLUG}' arrêtée (PID ${PID})."
    else
        log_warn "Processus ${PID} introuvable. Suppression du PID file."
        rm -f "$PIDFILE"
    fi
fi
echo ""
