# Scripts serveur — Event Analytics

Scripts de gestion des instances clients sur VPS Linux.

## Architecture cible

```
/var/www/eventanalytics/
├── app/                    ← code source (git clone ici)
│   ├── backend/
│   ├── frontend_build/     ← dist/ après npm run build
│   └── requirements.txt
└── clients/
    ├── demo/               ← instance démo (APP_MODE=demo)
    │   ├── .env
    │   └── data/data.db
    └── adi/                ← instance client (APP_MODE=production)
        ├── .env
        ├── data/data.db
        ├── uploads/
        ├── exports/
        ├── logs/
        └── backups/
```

## Usage

### Créer une instance

```bash
./create-client.sh
# ou avec arguments :
./create-client.sh --name "ADI Events" --slug adi \
    --domain adi.eventanalytics.fr --port 8002 --mode production
```

Génère :
- `clients/[slug]/` avec tous les sous-dossiers
- `clients/[slug]/.env` avec token sécurisé
- fichier service systemd à installer
- bloc Nginx à copier

### Démarrer / Arrêter / Redémarrer

```bash
./start-client.sh adi
./stop-client.sh adi
./restart-client.sh adi
```

### Voir toutes les instances

```bash
./list-clients.sh
```

### Sauvegarder un client

```bash
./backup-client.sh adi           # garde 14 sauvegardes
./backup-client.sh adi --keep 7  # garde 7 sauvegardes
```

Convention : `backups/YYYY-MM-DD_HH-mm-[slug]/`

### Mettre à jour l'application

```bash
./update-app.sh                  # git pull + build + restart tout
./update-app.sh --no-build       # backend seulement
./update-app.sh --client adi     # redémarre uniquement adi
```

## Installation sur le VPS

```bash
# 1. Cloner le repo
git clone https://github.com/jimmysinnan/event-analytics-demo.git /var/www/eventanalytics/app

# 2. Créer le dossier scripts
mkdir -p /var/www/eventanalytics/scripts
cp -r /var/www/eventanalytics/app/scripts/server /var/www/eventanalytics/scripts/
chmod +x /var/www/eventanalytics/scripts/server/*.sh

# 3. Créer le lien symbolique pour accès rapide
ln -s /var/www/eventanalytics/scripts/server /var/www/eventanalytics/bin

# 4. Installer les dépendances Python
cd /var/www/eventanalytics/app
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 5. Builder le frontend
cd frontend && npm install && npm run build
cp -r dist /var/www/eventanalytics/app/frontend_build

# 6. Créer la première instance (démo)
/var/www/eventanalytics/scripts/server/create-client.sh \
    --name "Event Analytics Demo" --slug demo \
    --domain demo.eventanalytics.fr --port 8001 --mode demo
```
