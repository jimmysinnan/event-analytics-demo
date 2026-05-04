#!/bin/bash
# create-client.sh — Crée une nouvelle instance client dédiée
#
# Usage interactif :
#   ./create-client.sh
#
# Usage avec arguments :
#   ./create-client.sh --name "ADI Events" --slug adi --domain adi.eventanalytics.fr \
#                      --port 8002 --mode production
#
# Ce que fait ce script :
#   1. Crée /var/www/eventanalytics/clients/[slug]/ avec tous les sous-dossiers
#   2. Génère le fichier .env avec toutes les variables nécessaires
#   3. Génère un token API sécurisé
#   4. Génère un fichier de service systemd prêt à installer
#   5. Génère un bloc de configuration Nginx prêt à copier
#   NE démarre PAS le service (utiliser start-client.sh ensuite)

set -euo pipefail
source "$(dirname "$0")/_config.sh"

# ── Parsing des arguments ──────────────────────────────────────────────────────
CLIENT_NAME=""
CLIENT_SLUG=""
CLIENT_DOMAIN=""
CLIENT_PORT=""
CLIENT_MODE=""
ANTHROPIC_KEY=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --name)    CLIENT_NAME="$2";    shift 2 ;;
        --slug)    CLIENT_SLUG="$2";    shift 2 ;;
        --domain)  CLIENT_DOMAIN="$2";  shift 2 ;;
        --port)    CLIENT_PORT="$2";    shift 2 ;;
        --mode)    CLIENT_MODE="$2";    shift 2 ;;
        --key)     ANTHROPIC_KEY="$2";  shift 2 ;;
        *) log_error "Argument inconnu : $1"; exit 1 ;;
    esac
done

echo ""
echo "============================================================"
echo "  Event Analytics — Création d'une instance client"
echo "============================================================"
echo ""

# ── Saisie interactive si arguments absents ────────────────────────────────────
if [ -z "$CLIENT_NAME" ]; then
    read -rp "Nom du client (ex: ADI Events) : " CLIENT_NAME
fi
if [ -z "$CLIENT_SLUG" ]; then
    # Suggestion automatique depuis le nom
    SUGGESTED=$(echo "$CLIENT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
    read -rp "Slug client [${SUGGESTED}] : " input
    CLIENT_SLUG="${input:-$SUGGESTED}"
fi
if [ -z "$CLIENT_DOMAIN" ]; then
    read -rp "Domaine client (ex: adi.eventanalytics.fr) : " CLIENT_DOMAIN
fi
if [ -z "$CLIENT_PORT" ]; then
    # Trouver le prochain port libre
    NEXT_PORT=$PORT_MIN
    while lsof -i ":${NEXT_PORT}" &>/dev/null 2>&1 || \
          grep -r "^PORT=${NEXT_PORT}$" "${EA_CLIENTS}"/*/. env 2>/dev/null | grep -q .; do
        NEXT_PORT=$((NEXT_PORT + 1))
        if [ $NEXT_PORT -gt $PORT_MAX ]; then
            log_error "Plus de ports disponibles dans la plage ${PORT_MIN}-${PORT_MAX}"
            exit 1
        fi
    done
    read -rp "Port backend [${NEXT_PORT}] : " input
    CLIENT_PORT="${input:-$NEXT_PORT}"
fi
if [ -z "$CLIENT_MODE" ]; then
    read -rp "Mode [production/demo] (défaut: production) : " input
    CLIENT_MODE="${input:-production}"
fi
if [ -z "$ANTHROPIC_KEY" ]; then
    read -rsp "Clé API Anthropic (sk-ant-...) [Entrée pour laisser vide] : " ANTHROPIC_KEY
    echo ""
fi

# ── Validation ─────────────────────────────────────────────────────────────────
if [ -z "$CLIENT_SLUG" ] || [ -z "$CLIENT_DOMAIN" ] || [ -z "$CLIENT_PORT" ]; then
    log_error "Slug, domaine et port sont obligatoires."
    exit 1
fi

if [[ ! "$CLIENT_SLUG" =~ ^[a-z0-9-]+$ ]]; then
    log_error "Slug invalide '${CLIENT_SLUG}'. Utiliser uniquement a-z, 0-9, tiret."
    exit 1
fi

if [[ ! "$CLIENT_PORT" =~ ^[0-9]+$ ]] || [ "$CLIENT_PORT" -lt 1024 ] || [ "$CLIENT_PORT" -gt 65535 ]; then
    log_error "Port invalide : ${CLIENT_PORT}"
    exit 1
fi

CLIENT_DIR="${EA_CLIENTS}/${CLIENT_SLUG}"
if [ -d "$CLIENT_DIR" ]; then
    log_error "Client '${CLIENT_SLUG}' existe déjà : ${CLIENT_DIR}"
    exit 1
fi

# ── Génération du token ────────────────────────────────────────────────────────
TOKEN=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")

echo ""
log_info "Création du client '${CLIENT_SLUG}'..."
echo ""

# ── Création des dossiers ──────────────────────────────────────────────────────
mkdir -p "${CLIENT_DIR}/data"
mkdir -p "${CLIENT_DIR}/uploads"
mkdir -p "${CLIENT_DIR}/exports"
mkdir -p "${CLIENT_DIR}/logs"
mkdir -p "${CLIENT_DIR}/backups"
chmod 750 "${CLIENT_DIR}"
log_ok "Dossiers créés : ${CLIENT_DIR}/"

# ── Génération du .env ────────────────────────────────────────────────────────
cat > "${CLIENT_DIR}/.env" << EOF
# Event Analytics — Instance client
# Client  : ${CLIENT_NAME}
# Slug    : ${CLIENT_SLUG}
# Créé le : $(date '+%Y-%m-%d %H:%M')
# ============================================================

APP_NAME=${CLIENT_NAME}
CLIENT_SLUG=${CLIENT_SLUG}
APP_MODE=${CLIENT_MODE}
PORT=${CLIENT_PORT}

# Base de données SQLite dédiée à ce client
SQLITE_DB_PATH=${CLIENT_DIR}/data/data.db

# Dossiers dédiés à ce client
UPLOAD_DIR=${CLIENT_DIR}/uploads
EXPORT_DIR=${CLIENT_DIR}/exports
LOG_DIR=${CLIENT_DIR}/logs

# Sécurité — NE PAS partager ce fichier
API_SECRET_TOKEN=${TOKEN}
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}

# CORS — domaine(s) autorisé(s)
ALLOWED_ORIGINS=https://${CLIENT_DOMAIN}

# Frontend — vide = appels relatifs /api/ via Nginx
FRONTEND_BUILD_PATH=
EOF

chmod 600 "${CLIENT_DIR}/.env"
log_ok ".env généré : ${CLIENT_DIR}/.env"

# ── Génération du service systemd ─────────────────────────────────────────────
SERVICE_NAME="ea-${CLIENT_SLUG}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SERVICE_CONTENT="[Unit]
Description=Event Analytics — ${CLIENT_NAME} (${CLIENT_SLUG})
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=${EA_APP}/backend
EnvironmentFile=${CLIENT_DIR}/.env
ExecStart=${EA_PYTHON} -m uvicorn main:app --host 127.0.0.1 --port ${CLIENT_PORT} --log-level info
Restart=always
RestartSec=5
StandardOutput=append:${CLIENT_DIR}/logs/app.log
StandardError=append:${CLIENT_DIR}/logs/error.log

[Install]
WantedBy=multi-user.target"

# Écrire dans /etc/systemd/system/ si on a les droits, sinon dans le dossier client
if [ -w "/etc/systemd/system/" ]; then
    echo "$SERVICE_CONTENT" > "${SERVICE_FILE}"
    systemctl daemon-reload
    log_ok "Service systemd installé : ${SERVICE_FILE}"
    log_info "Activer au démarrage : sudo systemctl enable ${SERVICE_NAME}"
else
    echo "$SERVICE_CONTENT" > "${CLIENT_DIR}/${SERVICE_NAME}.service"
    log_warn "Droits insuffisants pour /etc/systemd/system/"
    log_info "Service généré dans : ${CLIENT_DIR}/${SERVICE_NAME}.service"
    log_info "Pour l'installer : sudo cp ${CLIENT_DIR}/${SERVICE_NAME}.service /etc/systemd/system/ && sudo systemctl daemon-reload"
fi

# ── Génération du bloc Nginx ───────────────────────────────────────────────────
NGINX_CONF="${CLIENT_DIR}/nginx-${CLIENT_SLUG}.conf"
cat > "${NGINX_CONF}" << EOF
# Nginx — Instance ${CLIENT_SLUG}
# Copier dans /etc/nginx/sites-available/ea-${CLIENT_SLUG}.conf
# Puis : sudo ln -s /etc/nginx/sites-available/ea-${CLIENT_SLUG}.conf /etc/nginx/sites-enabled/
# Et   : sudo certbot --nginx -d ${CLIENT_DOMAIN}

server {
    listen 80;
    server_name ${CLIENT_DOMAIN};
    # Redirige vers HTTPS (Certbot ajoutera les blocs SSL)
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${CLIENT_DOMAIN};

    # SSL — géré par Certbot
    # ssl_certificate     /etc/letsencrypt/live/${CLIENT_DOMAIN}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/${CLIENT_DOMAIN}/privkey.pem;

    # Frontend compilé partagé entre tous les clients
    location / {
        root ${EA_APP}/frontend_build;
        try_files \$uri \$uri/ /index.html;

        # index.html : pas de cache (vérifie toujours la version à jour)
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
        # Assets versionnés (hash dans le nom) : cache long
        location ~* \.(js|css|woff2?|png|ico|svg)$ {
            add_header Cache-Control "public, max-age=31536000, immutable";
        }
    }

    # API — routée vers le backend de CE client
    location /api/ {
        proxy_pass http://127.0.0.1:${CLIENT_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        # Streaming SSE pour les rapports IA
        proxy_read_timeout 300s;
        proxy_buffering off;
    }

    location /health {
        proxy_pass http://127.0.0.1:${CLIENT_PORT};
    }
}
EOF

log_ok "Config Nginx générée : ${NGINX_CONF}"

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "  Instance '${CLIENT_SLUG}' créée avec succès !"
echo "============================================================"
echo ""
echo "  Client   : ${CLIENT_NAME}"
echo "  Domaine  : https://${CLIENT_DOMAIN}"
echo "  Port     : ${CLIENT_PORT}"
echo "  Mode     : ${CLIENT_MODE}"
echo "  Token    : ${TOKEN:0:8}... (voir .env)"
echo ""
echo "  Prochaines étapes :"
echo ""
echo "  1. Vérifier la clé Anthropic dans :"
echo "     ${CLIENT_DIR}/.env"
echo ""
echo "  2. Installer le service systemd (si pas fait) :"
echo "     sudo cp ${CLIENT_DIR}/${SERVICE_NAME}.service /etc/systemd/system/"
echo "     sudo systemctl daemon-reload"
echo "     sudo systemctl enable ${SERVICE_NAME}"
echo ""
echo "  3. Démarrer l'instance :"
echo "     ./start-client.sh ${CLIENT_SLUG}"
echo ""
echo "  4. Configurer Nginx :"
echo "     sudo cp ${NGINX_CONF} /etc/nginx/sites-available/ea-${CLIENT_SLUG}.conf"
echo "     sudo ln -s /etc/nginx/sites-available/ea-${CLIENT_SLUG}.conf /etc/nginx/sites-enabled/"
echo "     sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "  5. Obtenir le certificat SSL :"
echo "     sudo certbot --nginx -d ${CLIENT_DOMAIN}"
echo ""
