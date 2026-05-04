#!/bin/bash
# backup-client.sh — Sauvegarde les données d'une instance client
#
# Sauvegarde : data.db + uploads/ + exports/
# Convention : backups/YYYY-MM-DD_HH-mm-[slug]/
# Rétention  : 14 dernières sauvegardes (configurable via BACKUP_KEEP)
#
# Usage : ./backup-client.sh <slug> [--keep N]
# Exemple : ./backup-client.sh adi
# Exemple : ./backup-client.sh adi --keep 7

set -euo pipefail
source "$(dirname "$0")/_config.sh"

SLUG="${1:-}"
require_client "$SLUG"
shift || true

BACKUP_KEEP=14  # Nombre de sauvegardes à conserver

# Parser options
while [[ $# -gt 0 ]]; do
    case $1 in
        --keep) BACKUP_KEEP="$2"; shift 2 ;;
        *) log_error "Option inconnue : $1"; exit 1 ;;
    esac
done

CLIENT_DIR="${EA_CLIENTS}/${SLUG}"
BACKUP_DIR="${CLIENT_DIR}/backups"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M')
DEST="${BACKUP_DIR}/${TIMESTAMP}-${SLUG}"

echo ""
log_info "Sauvegarde de l'instance '${SLUG}'..."

mkdir -p "${DEST}"

# ── data.db ───────────────────────────────────────────────────────────────────
DB_FILE="${CLIENT_DIR}/data/data.db"
if [ -f "${DB_FILE}" ]; then
    # Copie atomique via SQLite backup (évite la corruption si DB en cours d'écriture)
    if command -v sqlite3 &>/dev/null; then
        sqlite3 "${DB_FILE}" ".backup '${DEST}/data.db'"
        log_ok "data.db sauvegardé (sqlite3 backup)"
    else
        cp "${DB_FILE}" "${DEST}/data.db"
        log_ok "data.db sauvegardé (cp)"
    fi
else
    log_warn "data.db absent — pas de sauvegarde DB"
fi

# ── uploads/ ─────────────────────────────────────────────────────────────────
UPLOADS_DIR="${CLIENT_DIR}/uploads"
if [ -d "${UPLOADS_DIR}" ] && [ "$(ls -A "${UPLOADS_DIR}" 2>/dev/null)" ]; then
    cp -r "${UPLOADS_DIR}" "${DEST}/uploads"
    log_ok "uploads/ sauvegardé"
else
    mkdir -p "${DEST}/uploads"
    log_info "uploads/ vide — dossier créé"
fi

# ── exports/ ─────────────────────────────────────────────────────────────────
EXPORTS_DIR="${CLIENT_DIR}/exports"
if [ -d "${EXPORTS_DIR}" ] && [ "$(ls -A "${EXPORTS_DIR}" 2>/dev/null)" ]; then
    cp -r "${EXPORTS_DIR}" "${DEST}/exports"
    log_ok "exports/ sauvegardé"
else
    log_info "exports/ vide — ignoré"
fi

# ── Métadonnées de la sauvegarde ──────────────────────────────────────────────
cat > "${DEST}/backup-info.txt" << EOF
Sauvegarde Event Analytics
Client  : ${SLUG}
Date    : $(date '+%Y-%m-%d %H:%M:%S')
Serveur : $(hostname)
DB size : $(du -sh "${DEST}/data.db" 2>/dev/null | cut -f1 || echo "N/A")
EOF

# ── Calcul de la taille totale ─────────────────────────────────────────────────
BACKUP_SIZE=$(du -sh "${DEST}" | cut -f1)
log_ok "Sauvegarde créée : ${DEST} (${BACKUP_SIZE})"

# ── Rotation : supprimer les anciennes sauvegardes ───────────────────────────
BACKUP_COUNT=$(ls -1d "${BACKUP_DIR}"/????-??-??_*-"${SLUG}" 2>/dev/null | wc -l)
if [ "${BACKUP_COUNT}" -gt "${BACKUP_KEEP}" ]; then
    TO_DELETE=$(( BACKUP_COUNT - BACKUP_KEEP ))
    log_info "Rotation : suppression de ${TO_DELETE} ancienne(s) sauvegarde(s)..."
    ls -1dt "${BACKUP_DIR}"/????-??-??_*-"${SLUG}" 2>/dev/null | \
        tail -n "${TO_DELETE}" | \
        xargs rm -rf
    log_ok "Rotation effectuée. ${BACKUP_KEEP} sauvegardes conservées."
fi

echo ""
log_info "Sauvegardes disponibles :"
ls -1t "${BACKUP_DIR}"/????-??-??_*-"${SLUG}" 2>/dev/null | head -5 | while read -r b; do
    SIZE=$(du -sh "$b" | cut -f1)
    echo "  $(basename "$b")  (${SIZE})"
done
echo ""
