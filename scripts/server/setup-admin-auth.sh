#!/bin/bash
# setup-admin-auth.sh — Configure les credentials opérateur pour la console /admin
#
# Ces credentials sont SÉPARÉS des credentials client (.htpasswd).
# Le client ne les connaît jamais.
#
# Usage : ./setup-admin-auth.sh <slug> [--user <login>] [--pass <password>]
# Exemple : ./setup-admin-auth.sh com-media-group
# Exemple : ./setup-admin-auth.sh com-media-group --user admin --pass SecretOp2026

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
HTPASSWD_FILE="${CLIENT_DIR}/.htpasswd-admin"

echo ""
log_info "Configuration console admin opérateur pour '${SLUG}'..."
echo ""

if [ -z "$AUTH_USER" ]; then
    read -rp "Login opérateur admin (ex: admin-orbyon) : " AUTH_USER
fi
if [ -z "$AUTH_USER" ]; then
    log_error "Login obligatoire."
    exit 1
fi
if [ -z "$AUTH_PASS" ]; then
    while true; do
        read -rsp "Mot de passe admin (min 12 caractères) : " AUTH_PASS
        echo ""
        if [ "${#AUTH_PASS}" -lt 12 ]; then
            log_warn "Mot de passe trop court. Minimum 12 caractères."
            continue
        fi
        read -rsp "Confirmer le mot de passe : " AUTH_PASS2
        echo ""
        [ "$AUTH_PASS" = "$AUTH_PASS2" ] && break
        log_warn "Les mots de passe ne correspondent pas."
    done
fi

# Générer le hash
if command -v htpasswd &>/dev/null; then
    htpasswd -bc "${HTPASSWD_FILE}" "$AUTH_USER" "$AUTH_PASS"
    log_ok "Hash bcrypt généré via htpasswd"
elif command -v openssl &>/dev/null; then
    HASH=$(openssl passwd -apr1 "$AUTH_PASS")
    echo "${AUTH_USER}:${HASH}" > "${HTPASSWD_FILE}"
    log_warn "Hash MD5 (openssl). Installez apache2-utils pour bcrypt."
else
    log_error "Aucun outil disponible pour générer le hash."
    exit 1
fi

chmod 640 "${HTPASSWD_FILE}"
chown www-data:www-data "${HTPASSWD_FILE}" 2>/dev/null || true

# Vérifier que le bloc /admin est dans nginx.conf
NGINX_CONF="/etc/nginx/sites-available/ea-${SLUG}.conf"
if [ -f "$NGINX_CONF" ]; then
    if grep -q "htpasswd-admin" "$NGINX_CONF"; then
        log_ok "Nginx déjà configuré avec .htpasswd-admin"
        nginx -t && systemctl reload nginx
        log_ok "Nginx rechargé."
    else
        log_warn "Le bloc /admin n'est pas dans ${NGINX_CONF}."
        log_info "Ajoutez manuellement dans le bloc server 443 :"
        echo ""
        echo "    location /admin {"
        echo "        auth_basic \"Event Analytics Admin\";"
        echo "        auth_basic_user_file ${CLIENT_DIR}/.htpasswd-admin;"
        echo "        try_files \$uri \$uri/ /index.html;"
        echo "    }"
    fi
else
    log_warn "Config Nginx non trouvée : ${NGINX_CONF}"
    log_info "Le fichier .htpasswd-admin a été créé. Configurez Nginx manuellement."
fi

echo ""
log_ok "Console admin configurée pour '${SLUG}'."
echo "  Login    : ${AUTH_USER}"
echo "  Fichier  : ${HTPASSWD_FILE}"
echo "  URL      : https://$(grep server_name ${NGINX_CONF} 2>/dev/null | head -1 | awk '{print $2}' | tr -d ';')/admin"
echo ""
log_info "⚠  Ne jamais partager ces credentials avec le client."
echo ""
