#!/bin/bash
# setup-basic-auth.sh — Configure Nginx Basic Auth pour une instance client
#
# Basic Auth = protection V1 recommandée.
# Le navigateur met en cache les credentials → les appels /api/ les
# incluent automatiquement. Aucune modification du frontend requise.
#
# Usage : ./setup-basic-auth.sh <slug> [--user <login>] [--pass <password>]
# Exemple : ./setup-basic-auth.sh adi
# Exemple : ./setup-basic-auth.sh adi --user client --pass MonMotDePasse123

set -euo pipefail
source "$(dirname "$0")/_config.sh"

SLUG="${1:-}"
require_client "$SLUG"
shift || true

AUTH_USER=""
AUTH_PASS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --user) AUTH_USER="$2"; shift 2 ;;
        --pass) AUTH_PASS="$2"; shift 2 ;;
        *) log_error "Option inconnue : $1"; exit 1 ;;
    esac
done

CLIENT_DIR="${EA_CLIENTS}/${SLUG}"
HTPASSWD_FILE="${CLIENT_DIR}/.htpasswd"

echo ""
log_info "Configuration Basic Auth pour '${SLUG}'..."

# ── Saisie interactive si absent ──────────────────────────────────────────────
if [ -z "$AUTH_USER" ]; then
    read -rp "Login utilisateur (ex: ${SLUG}-admin) : " AUTH_USER
fi
if [ -z "$AUTH_USER" ]; then
    log_error "Login obligatoire."
    exit 1
fi
if [ -z "$AUTH_PASS" ]; then
    while true; do
        read -rsp "Mot de passe (min 8 caractères) : " AUTH_PASS
        echo ""
        if [ "${#AUTH_PASS}" -lt 8 ]; then
            log_warn "Mot de passe trop court. Minimum 8 caractères."
            continue
        fi
        read -rsp "Confirmer le mot de passe : " AUTH_PASS2
        echo ""
        if [ "$AUTH_PASS" = "$AUTH_PASS2" ]; then
            break
        else
            log_warn "Les mots de passe ne correspondent pas."
        fi
    done
fi

# ── Génération du hash bcrypt ou MD5 ──────────────────────────────────────────
if command -v htpasswd &>/dev/null; then
    # Apache utils disponible — hash bcrypt (plus sécurisé)
    htpasswd -bc "${HTPASSWD_FILE}" "$AUTH_USER" "$AUTH_PASS"
    log_ok "Hash bcrypt généré via htpasswd"
elif command -v python3 &>/dev/null && python3 -c "import bcrypt" &>/dev/null 2>&1; then
    # Python bcrypt disponible
    HASH=$(python3 -c "
import bcrypt, sys
pw = sys.argv[1].encode()
h = bcrypt.hashpw(pw, bcrypt.gensalt()).decode()
print(h)
" "$AUTH_PASS")
    echo "${AUTH_USER}:${HASH}" > "${HTPASSWD_FILE}"
    log_ok "Hash bcrypt généré via Python"
elif command -v openssl &>/dev/null; then
    # Fallback openssl — hash MD5 (moins sécurisé mais fonctionnel)
    HASH=$(openssl passwd -apr1 "$AUTH_PASS")
    echo "${AUTH_USER}:${HASH}" > "${HTPASSWD_FILE}"
    log_warn "Hash MD5 (openssl). Recommandé : installer apache2-utils pour bcrypt."
    log_info "  sudo apt install apache2-utils"
else
    log_error "Aucun outil disponible pour générer le hash (htpasswd, python3+bcrypt, openssl)."
    exit 1
fi

chmod 640 "${HTPASSWD_FILE}"
chown www-data:www-data "${HTPASSWD_FILE}" 2>/dev/null || true

# ── Vérifier que Nginx a le bloc auth_basic ────────────────────────────────────
NGINX_CONF="/etc/nginx/sites-available/ea-${SLUG}.conf"
if [ -f "$NGINX_CONF" ]; then
    if grep -q "auth_basic_user_file" "$NGINX_CONF"; then
        log_ok "Nginx déjà configuré avec auth_basic_user_file"
        log_info "Rechargement Nginx..."
        sudo nginx -t && sudo systemctl reload nginx
        log_ok "Nginx rechargé."
    else
        log_warn "Le fichier Nginx ${NGINX_CONF} n'a pas de bloc auth_basic."
        log_info "Recréer la config Nginx via create-client.sh pour inclure le Basic Auth."
    fi
else
    log_warn "Config Nginx non trouvée : ${NGINX_CONF}"
    log_info "Le fichier .htpasswd a été créé. Ajouter manuellement dans Nginx :"
    echo ""
    echo "  auth_basic \"Event Analytics — Accès privé\";"
    echo "  auth_basic_user_file ${HTPASSWD_FILE};"
fi

echo ""
log_ok "Basic Auth configuré pour '${SLUG}'."
echo "  Login    : ${AUTH_USER}"
echo "  Fichier  : ${HTPASSWD_FILE}"
echo ""
log_info "Pour ajouter un second utilisateur :"
echo "  htpasswd ${HTPASSWD_FILE} <autre-login>"
echo ""
