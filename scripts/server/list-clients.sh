#!/bin/bash
# list-clients.sh — Liste toutes les instances clients et leur état
#
# Usage : ./list-clients.sh

set -euo pipefail
source "$(dirname "$0")/_config.sh"

echo ""
echo "============================================================"
echo "  Event Analytics — Instances clients"
echo "============================================================"
echo ""

if [ ! -d "${EA_CLIENTS}" ]; then
    log_error "Dossier clients introuvable : ${EA_CLIENTS}"
    exit 1
fi

CLIENTS=$(ls -1 "${EA_CLIENTS}" 2>/dev/null)
if [ -z "$CLIENTS" ]; then
    log_warn "Aucun client trouvé dans ${EA_CLIENTS}/"
    exit 0
fi

printf "  %-14s %-6s %-12s %-8s %-36s\n" "SLUG" "PORT" "MODE" "STATUT" "DOMAINE"
printf "  %-14s %-6s %-12s %-8s %-36s\n" "--------------" "------" "------------" "--------" "------------------------------------"

for SLUG in $CLIENTS; do
    ENV_FILE="${EA_CLIENTS}/${SLUG}/.env"
    if [ ! -f "$ENV_FILE" ]; then
        printf "  %-14s %-6s %-12s %-8s\n" "$SLUG" "?" "?" "NO ENV"
        continue
    fi

    # Lire les vars du .env sans les exporter
    PORT=$(grep -E '^PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d ' ' || echo "?")
    MODE=$(grep -E '^APP_MODE=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d ' ' || echo "?")
    DOMAIN=$(grep -E '^ALLOWED_ORIGINS=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d ' https://' | tr -d ',' || echo "?")

    # Statut via systemd ou port TCP
    STATUS="arrêté"
    COLOR=$RED
    SERVICE="ea-${SLUG}"
    if command -v systemctl &>/dev/null && systemctl is-active --quiet "${SERVICE}" 2>/dev/null; then
        STATUS="actif"
        COLOR=$GREEN
    elif [ "$PORT" != "?" ] && command -v ss &>/dev/null && ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
        STATUS="actif"
        COLOR=$GREEN
    elif [ "$PORT" != "?" ] && curl -s --max-time 1 "http://127.0.0.1:${PORT}/health" &>/dev/null 2>&1; then
        STATUS="actif"
        COLOR=$GREEN
    fi

    # Dernière sauvegarde
    LAST_BACKUP=""
    LAST=$(ls -1t "${EA_CLIENTS}/${SLUG}/backups"/????-??-??_*-"${SLUG}" 2>/dev/null | head -1)
    if [ -n "$LAST" ]; then
        LAST_BACKUP="  backup: $(basename "$LAST" | cut -c1-16)"
    fi

    printf "  ${COLOR}%-14s${NC} %-6s %-12s ${COLOR}%-8s${NC} %-36s%s\n" \
        "$SLUG" "$PORT" "$MODE" "$STATUS" "$DOMAIN" "$LAST_BACKUP"
done

echo ""

# Résumé ports utilisés
echo "  Ports réservés dans la plage ${PORT_MIN}-${PORT_MAX} :"
USED_PORTS=$(grep -h '^PORT=' "${EA_CLIENTS}"/*/.env 2>/dev/null | cut -d= -f2 | tr -d ' ' | sort -n | tr '\n' ' ')
echo "    ${USED_PORTS:-aucun}"
echo ""
