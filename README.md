# Event Analytics

Outil de pilotage événementiel — billetterie, consommation, profil client et rapports IA.

Conçu pour les organisateurs d'événements qui veulent analyser leurs données avant, pendant et après l'événement, sans expertise technique.

---

## Architecture

```
event-analytics/
├── frontend/       React 18 + Vite + Tailwind CSS      → http://localhost:5174
├── backend/        FastAPI + Python + SQLite            → http://localhost:8001
└── start.bat       Lance les deux en une commande
```

Les données sont stockées localement sur votre poste. Aucune donnée ne quitte votre machine.

---

## Prérequis

| Outil | Version minimale | Vérification |
|---|---|---|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

---

## Installation

### 1. Cloner ou copier le projet

```bash
# Via Git
git clone https://github.com/jimmysinnan/event-analytics-demo.git
cd event-analytics-demo

# Ou dézipper l'archive fournie
```

### 2. Installer les dépendances backend

```bash
cd backend
pip install -r requirements.txt
```

### 3. Installer les dépendances frontend

```bash
cd frontend
npm install
```

### 4. Configurer les variables d'environnement

```bash
# Backend
cp backend/.env.example backend/.env
# Éditer backend/.env — renseigner ANTHROPIC_API_KEY

# Frontend
cp frontend/.env.example frontend/.env.local
# Vérifier que VITE_API_URL=http://localhost:8001
```

---

## Configuration

### `backend/.env`

| Variable | Obligatoire | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Oui | Clé API Claude pour les rapports IA — obtenir sur console.anthropic.com |
| `APP_NAME` | Non | Nom affiché dans les PDF (défaut : `Event Analytics`) |
| `API_SECRET_TOKEN` | Non | Token de sécurité API (vide = accès libre en local) |
| `PDF_SOURCE_DIR` | Non | Dossier contenant les PDF de référence à consulter |
| `CORS_ORIGINS` | Non | Domaines autorisés si déploiement serveur |

### `frontend/.env.local`

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL du backend (défaut : `http://localhost:8001`) |
| `VITE_API_TOKEN` | Token si `API_SECRET_TOKEN` est défini côté backend |
| `VITE_APP_MODE` | `demo` (données de démo) ou `production` (données client réelles) |

---

## Lancement

### Option A — Lancement automatique (recommandé)

```
Double-cliquer sur start.bat
```

Ouvre deux fenêtres (backend + frontend) et le navigateur.

### Option B — Lancement manuel

```bash
# Terminal 1 — Backend
cd backend
python -m uvicorn main:app --reload --port 8001

# Terminal 2 — Frontend
cd frontend
npm run dev -- --port 5174
```

### Accès

| Service | URL |
|---|---|
| Application | http://localhost:5174 |
| API backend | http://localhost:8001 |
| Documentation API | http://localhost:8001/docs |

---

## Erreurs fréquentes

**`Failed to fetch` ou page blanche**
→ Le backend n'est pas démarré. Lancer `start.bat` ou le backend manuellement.

**`ANTHROPIC_API_KEY non configurée`**
→ Ouvrir `backend/.env` et renseigner la clé API Anthropic.

**`Module not found` au démarrage Python**
→ Exécuter `pip install -r backend/requirements.txt`

**Port 8001 déjà utilisé**
→ Fermer l'ancienne fenêtre backend ou changer le port dans `.env.local` et `start.bat`.

**L'application s'ouvre sans données**
→ Normal en mode `production`. Créer un événement dans `/evenements`, puis importer des données.

---

## Installation client (version production)

Pour préparer une installation sur le poste d'un client :

```
Double-cliquer sur setup-client.bat
Saisir le nom du client
```

Le script crée un dossier `event-analytics-[nom]` avec une base vide et les fichiers `.env` préconfigurés en mode production.
