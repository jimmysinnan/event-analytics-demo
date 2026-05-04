#!/bin/bash
# install-vps.sh — Installation initiale du VPS Hostinger/OVH
#
# À exécuter UNE SEULE FOIS sur un VPS Ubuntu 22.04 LTS vierge.
# Crée la structure /var/www/eventanalytics/, installe les dépendances,
# clone le repo et crée l'instance de démo.
#
# Prérequis :
#   - Ubuntu 22.04 LTS
#   - Accès root ou sudo
#   - Clé SSH configurée
#   - Domaine pointé sur l'IP du VPS (DNS A record)
#
# Usage :
#   sudo bash install-vps.sh
#   sudo bash install-vps.sh --repo https://github.com/jimmysinnan/event-analytics-demo.git

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/jimmysinnan/event-analytics-demo.git}"
EA_ROOT="/var/www/eventanalytics"
EA_APP="${EA_ROOT}/app"
EA_CLIENTS="${EA_ROOT}/clients"
NODE_VERSION="20"   # LTS

# Parser arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO_URL="$2"; shift 2 ;;
        *) echo "Option inconnue : $1"; exit 1 ;;
    esac
done

# Couleurs
GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${BLUE}[INSTALL]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}     $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}   $*"; }

echo ""
echo "============================================================"
echo "  Event Analytics — Installation VPS"
echo "  Repo   : ${REPO_URL}"
echo "  Root   : ${EA_ROOT}"
echo "============================================================"
echo ""

# Vérifier root
if [ "$(id -u)" -ne 0 ]; then
    echo "Ce script doit être exécuté en tant que root ou avec sudo."
    exit 1
fi

# ── 1. Mise à jour système ────────────────────────────────────────────────────
log "[1/9] Mise à jour du système..."
apt-get update -qq
apt-get upgrade -y -qq
ok "Système à jour"

# ── 2. Dépendances système ────────────────────────────────────────────────────
log "[2/9] Installation des dépendances..."
apt-get install -y -qq \
    python3 python3-pip python3-venv \
    nginx certbot python3-certbot-nginx \
    git curl wget \
    sqlite3 \
    apache2-utils \
    ufw fail2ban \
    htop unzip

# Node.js via NodeSource
if ! command -v node &>/dev/null; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
    apt-get install -y -qq nodejs
fi
ok "Dépendances installées (Python $(python3 --version | cut -d' ' -f2), Node $(node --version), Nginx $(nginx -v 2>&1 | cut -d/ -f2))"

# ── 3. Pare-feu minimal ───────────────────────────────────────────────────────
log "[3/9] Configuration pare-feu (ufw)..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ok "Pare-feu activé (SSH + HTTP/HTTPS)"

# ── 4. Structure des dossiers ─────────────────────────────────────────────────
log "[4/9] Création de la structure des dossiers..."
mkdir -p "${EA_ROOT}"/{app,clients,scripts/server}

# Permissions : www-data est propriétaire des dossiers applicatifs
chown -R www-data:www-data "${EA_ROOT}"
chmod 755 "${EA_ROOT}"
ok "Structure créée : ${EA_ROOT}/"

# ── 5. Clone du repo ──────────────────────────────────────────────────────────
log "[5/9] Clone du repo..."
if [ -d "${EA_APP}/.git" ]; then
    warn "Repo déjà cloné. git pull..."
    sudo -u www-data git -C "${EA_APP}" pull origin main
else
    sudo -u www-data git clone "${REPO_URL}" "${EA_APP}"
fi
ok "Repo cloné dans ${EA_APP}"

# ── 6. Venv Python + dépendances ─────────────────────────────────────────────
log "[6/9] Création du venv Python + dépendances..."
sudo -u www-data python3 -m venv "${EA_APP}/.venv"
sudo -u www-data "${EA_APP}/.venv/bin/pip" install \
    -r "${EA_APP}/backend/requirements.txt" \
    -q --disable-pip-version-check
ok "Venv créé : ${EA_APP}/.venv"

# ── 7. Build frontend ─────────────────────────────────────────────────────────
log "[7/9] Build du frontend..."
cd "${EA_APP}/frontend"
sudo -u www-data npm install --silent
sudo -u www-data npm run build 2>&1 | tail -3
mkdir -p "${EA_APP}/frontend_build"
cp -r "${EA_APP}/frontend/dist/." "${EA_APP}/frontend_build/"
chown -R www-data:www-data "${EA_APP}/frontend_build"
ok "Frontend buildé → ${EA_APP}/frontend_build/"

# ── 8. Copie des scripts serveur ──────────────────────────────────────────────
log "[8/9] Installation des scripts de gestion..."
cp -r "${EA_APP}/scripts/server/." "${EA_ROOT}/scripts/server/"
chmod +x "${EA_ROOT}/scripts/server/"*.sh
# Convertir CRLF → LF (si checkout depuis Windows)
if command -v dos2unix &>/dev/null; then
    dos2unix "${EA_ROOT}/scripts/server/"*.sh 2>/dev/null
elif command -v sed &>/dev/null; then
    sed -i 's/\r//' "${EA_ROOT}/scripts/server/"*.sh
fi
ok "Scripts installés dans ${EA_ROOT}/scripts/server/"

# ── 9. Configuration Nginx de base ────────────────────────────────────────────
log "[9/9] Configuration Nginx de base..."
# Désactiver le vhost default
rm -f /etc/nginx/sites-enabled/default

# Page de statut Nginx (non exposée publiquement)
cat > /etc/nginx/sites-available/ea-status.conf << 'EOF'
server {
    listen 127.0.0.1:8080;
    location /nginx-status {
        stub_status;
        allow 127.0.0.1;
        deny all;
    }
}
EOF
ln -sf /etc/nginx/sites-available/ea-status.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
ok "Nginx configuré"

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "  Installation terminée !"
echo "============================================================"
echo ""
echo "  Structure créée :"
echo "    ${EA_ROOT}/app/              ← code source"
echo "    ${EA_ROOT}/app/frontend_build/ ← frontend compilé"
echo "    ${EA_ROOT}/clients/          ← instances clients"
echo "    ${EA_ROOT}/scripts/server/   ← scripts de gestion"
echo ""
echo "  Prochaines étapes :"
echo ""
echo "  1. Créer l'instance de démo :"
echo "     ${EA_ROOT}/scripts/server/create-client.sh \\"
echo "       --name \"Event Analytics Demo\" --slug demo \\"
echo "       --domain demo.eventanalytics.fr --port 8001 --mode demo"
echo ""
echo "  2. Configurer le DNS :"
echo "     A record : demo.eventanalytics.fr → $(curl -s ifconfig.me 2>/dev/null || echo '<IP_VPS>')"
echo ""
echo "  3. Démarrer et certifier :"
echo "     ${EA_ROOT}/scripts/server/start-client.sh demo"
echo "     sudo certbot --nginx -d demo.eventanalytics.fr"
echo ""
