#!/bin/bash
# _config.sh — Variables communes à tous les scripts serveur
# Sourcé par chaque script via : source "$(dirname "$0")/_config.sh"

EA_ROOT="/var/www/eventanalytics"
EA_APP="${EA_ROOT}/app"
EA_CLIENTS="${EA_ROOT}/clients"
EA_SCRIPTS="${EA_ROOT}/scripts/server"
EA_PYTHON="${EA_PYTHON:-python3}"
EA_VENV="${EA_APP}/.venv/bin/python"

# Utiliser le venv si disponible, sinon python3 système
if [ -f "${EA_VENV}" ]; then
    EA_PYTHON="${EA_VENV}"
fi

# Plage de ports réservés aux instances clients
PORT_MIN=8001
PORT_MAX=8099

# Couleurs terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Vérifie qu'un slug client existe
require_client() {
    local slug="$1"
    if [ -z "$slug" ]; then
        log_error "Slug client requis."
        echo "Usage: $0 <slug>"
        exit 1
    fi
    if [ ! -d "${EA_CLIENTS}/${slug}" ]; then
        log_error "Client '${slug}' introuvable dans ${EA_CLIENTS}/"
        log_info  "Clients disponibles : $(ls "${EA_CLIENTS}" 2>/dev/null | tr '\n' ' ')"
        exit 1
    fi
}

# Charge le .env d'un client et exporte les variables
load_env() {
    local slug="$1"
    local env_file="${EA_CLIENTS}/${slug}/.env"
    if [ ! -f "$env_file" ]; then
        log_error "Fichier .env introuvable : ${env_file}"
        exit 1
    fi
    # Exporte les variables du .env (ignore lignes vides et commentaires)
    set -a
    # shellcheck disable=SC1090
    source <(grep -v '^\s*#' "$env_file" | grep -v '^\s*$')
    set +a
}
