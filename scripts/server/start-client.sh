#!/bin/bash
# start-client.sh — Démarre une instance client
#
# Usage : ./start-client.sh <slug>
# Exemple : ./start-client.sh adi

set -euo pipefail
source "$(dirname "$0")/_config.sh"

SLUG="${1:-}"
require_client "$SLUG"
load_env "$SLUG"

SERVICE="ea-${SLUG}"

echo ""
log_info "Démarrage de l'instance '${SLUG}'..."

# ── Via systemd (recommandé) ───────────────────────────────────────────────────
if command -v systemctl &>/dev/null && systemctl list-unit-files "${SERVICE}.service" &>/dev/null 2>&1; then
    if systemctl is-active --quiet "${SERVICE}"; then
        log_warn "Instance '${SLUG}' déjà active."
        systemctl status "${SERVICE}" --no-pager -l | head -5
        exit 0
    fi
    systemctl start "${SERVICE}"
    sleep 2
    if systemctl is-active --quiet "${SERVICE}"; then
        log_ok "Instance '${SLUG}' démarrée via systemd."
    else
        log_error "Échec du démarrage. Logs :"
        journalctl -u "${SERVICE}" -n 20 --no-pager
        exit 1
    fi

# ── Fallback : démarrage direct avec PID file ──────────────────────────────────
else
    log_warn "systemd non disponible ou service non installé. Démarrage direct."

    PIDFILE="${EA_CLIENTS}/${SLUG}/run/app.pid"
    LOGFILE="${EA_CLIENTS}/${SLUG}/logs/app.log"
    mkdir -p "${EA_CLIENTS}/${SLUG}/run"

    # Vérifier si déjà en cours
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
        log_warn "Instance '${SLUG}' déjà en cours (PID $(cat "$PIDFILE"))."
        exit 0
    fi

    nohup "${EA_PYTHON}" -m uvicorn main:app \
        --host 127.0.0.1 \
        --port "${PORT}" \
        --log-level info \
        --app-dir "${EA_APP}/backend" \
        >> "${LOGFILE}" 2>&1 &

    echo $! > "$PIDFILE"
    sleep 2

    if kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
        log_ok "Instance '${SLUG}' démarrée (PID $(cat "$PIDFILE"), port ${PORT})."
    else
        log_error "Échec du démarrage. Voir ${LOGFILE}"
        exit 1
    fi
fi

# ── Test health ───────────────────────────────────────────────────────────────
sleep 1
HEALTH=$(curl -s --max-time 5 "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"healthy"'; then
    log_ok "Health check OK → http://127.0.0.1:${PORT}"
else
    log_warn "Health check non répondu (instance peut encore démarrer)"
fi
echo ""
