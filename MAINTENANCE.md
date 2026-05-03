# Guide de maintenance — Event Analytics

Pour les personnes qui maintiennent ou font évoluer l'application.

---

## Structure du projet

```
event-analytics/
│
├── backend/
│   ├── main.py                   ← Tous les endpoints API (FastAPI)
│   ├── database.py               ← Accès SQLite — CRUD complet
│   ├── data.db                   ← Base de données SQLite (ne pas versionner)
│   ├── .env                      ← Secrets (ne pas versionner)
│   └── services/
│       ├── ai_reporter.py        ← Génération rapports IA (7 types)
│       ├── import_parser.py      ← Parsing billetterie multi-source
│       ├── file_reader.py        ← Lecture fichiers (12 formats)
│       ├── kpi_engine.py         ← Calcul KPIs depuis DataFrames
│       ├── billetterie_analyzer.py  ← Analyse avancée billetterie
│       ├── pdf_generator.py      ← Génération PDF
│       └── report_generator.py   ← Export rapport texte
│
├── frontend/
│   └── src/
│       ├── lib/
│       │   ├── api.js            ← URL API centralisée (VITE_API_URL)
│       │   ├── appMode.js        ← IS_DEMO flag (VITE_APP_MODE)
│       │   └── editionsData.js   ← Données démo hardcodées
│       ├── store/
│       │   └── eventStore.js     ← Persistance localStorage
│       ├── context/
│       │   └── EventContext.jsx  ← État global (édition active, canaux, thème)
│       ├── components/
│       │   ├── AiReport.jsx      ← Composant rapport IA
│       │   └── ui/
│       │       └── EmptyState.jsx  ← État vide réutilisable
│       └── pages/
│           ├── Import.jsx        ← /importer-donnees
│           └── Settings.jsx      ← /parametres
│
├── instructions_ia.md            ← Référentiel métier pour les prompts IA
├── README.md                     ← Installation et lancement
├── DEMO.md                       ← Script de démonstration
├── LIMITES.md                    ← Ce document — limites assumées
└── setup-client.bat              ← Création d'un dossier client production
```

---

## Fichiers importants à connaître

| Fichier | Modifier pour… |
|---|---|
| `backend/.env` | Changer la clé API, le nom de l'app, le token de sécurité |
| `frontend/.env.local` | Changer l'URL du backend, le mode (demo/production) |
| `instructions_ia.md` | Modifier le comportement et le périmètre des rapports IA |
| `backend/database.py` | Modifier le schéma de base de données |
| `backend/services/import_parser.py` | Ajouter ou modifier une source billetterie |
| `backend/services/file_reader.py` | Ajouter un format de fichier |
| `frontend/src/lib/editionsData.js` | Modifier les données de démonstration |

---

## Changer l'URL de l'API backend

1. Ouvrir `frontend/.env.local`
2. Modifier `VITE_API_URL=http://nouvelle-url:port`
3. Relancer le frontend (`npm run dev`)

Aucun autre fichier à modifier — toutes les requêtes passent par `frontend/src/lib/api.js`.

---

## Configurer les PDF de référence (bouton "Consulter")

1. Copier les PDF dans un dossier accessible (ex: `C:\PDFs\client\`)
2. Ouvrir `backend/.env`
3. Ajouter : `PDF_SOURCE_DIR=C:\PDFs\client\`
4. Les noms de fichiers attendus sont définis dans `backend/main.py` dans `PDF_TYPES`

Pour changer les noms des PDF attendus :
```python
# backend/main.py — chercher PDF_TYPES
PDF_TYPES = {
    'global':  ('Mon PDF global.pdf', generate_global),
    'pdv':     ('Mon PDF PDV.pdf',    generate_pdv),
    'profil':  ('Mon PDF profil.pdf', generate_profil),
}
```

---

## Ajouter une source billetterie

1. Ouvrir `backend/services/import_parser.py`
2. Ajouter la fonction de détection dans `detect_source()`
3. Ajouter le parser dans `PARSERS`
4. Ajouter le label dans `SOURCE_LABELS`
5. Tester avec un fichier réel

```python
# Exemple de structure parser
def _parse_nouvelle_source(df):
    # Normaliser les colonnes
    # Retourner un dict avec : nb_commandes, nb_participants, ca_total, order_ids[], ...
    pass

PARSERS['nouvelle_source'] = _parse_nouvelle_source
SOURCE_LABELS['nouvelle_source'] = 'Nouvelle Source'
```

---

## Ajouter un format de fichier

1. Ouvrir `backend/services/file_reader.py`
2. Créer une fonction `_read_nouveau_format(data: bytes) -> pd.DataFrame`
3. L'ajouter dans `READERS`

```python
READERS['.nouveau'] = _read_nouveau_format
```

---

## Modifier un type de rapport IA

1. Ouvrir `instructions_ia.md` — modifier le périmètre et la structure attendue
2. Ouvrir `backend/services/ai_reporter.py`
3. Modifier le prompt correspondant dans `_build_prompt()`
4. Redémarrer le backend (le cache `instructions_ia.md` est rechargé au démarrage)

Pour ajouter un nouveau type de rapport :
1. Ajouter l'entrée dans `REPORT_TYPES` dans `frontend/src/components/AiReport.jsx`
2. Ajouter le prompt dans `prompts` dans `_build_prompt()` dans `ai_reporter.py`
3. Documenter dans `instructions_ia.md`

---

## Modifier les données de démonstration

Les données de démo sont dans `frontend/src/lib/editionsData.js`.
Elles ne sont affichées qu'en `VITE_APP_MODE=demo`.

Structure :
```js
export const CONSO = {
  2025: { ca: 496585, clients: 7251, ... },
  2024: { ... },
}
export const BILLETTERIE = { ... }
export const AFFLUENCE   = { ... }
```

---

## Sauvegarder les données client

Les données importées sont dans `backend/data.db` (SQLite).

```bash
# Sauvegarde manuelle
cp backend/data.db backend/data.db.backup-$(date +%Y%m%d)
```

La configuration (événements, éditions, canaux) est dans le `localStorage` du navigateur.
Pour l'exporter : ouvrir la console navigateur → `JSON.stringify(localStorage)`.

---

## Redémarrer proprement

```bash
# Arrêter les processus (fermer les fenêtres Terminal)
# Puis relancer
start.bat
```

Si le port 8001 est occupé :
```bash
# Windows
netstat -ano | findstr :8001
taskkill /PID <pid> /F
```
