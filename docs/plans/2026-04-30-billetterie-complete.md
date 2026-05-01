# Billetterie Complète — Implementation Plan

> **Pour l'exécution :** Utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans`.

**Goal:** Étendre le module Billetterie existant avec les canaux de distribution, les KPIs métier avancés (composition zones/tarifs, tendance horaire, comparaison historique) et le système de thème événementiel — sans casser l'existant.

**Architecture:** Canaux de distribution comme entité centrale (additive sur l'existant) → chaque import lié à un canal → dashboards par canal + consolidé. SQLite déjà en place. Thème événement par édition.

**Tech Stack:** React 18 + Recharts + FastAPI + SQLite (natif Python, déjà en place)

**Référence métier:**
- `processus_metier.md` — logique métier
- `Exemple/*.png` — structure visuelle (patterns tirés de Baccha, à généraliser)
- `DESIGN.md` — système de design

---

## ⚠️ Contraintes d'intégration — Lire avant toute modification

### 1. Approche additive — ne pas casser l'existant

**Tout ce qui a déjà été développé doit être conservé et étendu, pas remplacé.**

Avant chaque modification d'un fichier existant :
- Lire le fichier en entier
- Identifier ce qui existe (fonctions, composants, endpoints, tables)
- **Ajouter / étendre uniquement** — ne jamais supprimer les blocs existants sans confirmation
- Si une fonctionnalité couvre partiellement le besoin → l'améliorer, ne pas la réécrire

Exemples concrets :
- `BilletterieTracking.jsx` a déjà upload, déduplication, CSE, historique → **ajouter** sélecteur canal + nouveaux KPIs par-dessus
- `database.py` a déjà `imports`, `billetterie_state`, `billetterie_live` → **ajouter** table `channels`
- `eventStore.js` a déjà orgs, events, editions, CSE → **ajouter** clés channels + settings
- `import_parser.py` a déjà 10 parsers + `order_ids` → **enrichir** avec `col_map` pour l'analyzer

### 2. Généralisation — les exemples Baccha sont des patterns, pas des valeurs figées

Les images d'exemple viennent de Baccha (festival 2 jours, zones "Palmeraie" VIP et "Fosse"). Ils **inspirent la logique**, l'outil doit s'adapter à tout événement :

| Baccha (spécifique) | Logique générique à implémenter |
|---|---|
| "Palmeraie" = VIP, "Fosse" = standard | Mots-clés VIP **configurables par édition** |
| Samedi + Dimanche | Jours réels depuis les données — **aucune valeur hardcodée** |
| 2 canaux (Bizouk + Weezevent) + CSE | N canaux, types extensibles |
| Festival estival Martinique | Applicable à : afterwork, salon, concert, escape game, tournoi |

### 3. Mots-clés "zone premium" — configurables

Dans `billetterie_analyzer.py`, les mots-clés pour détecter une zone premium ne sont pas hardcodés globalement. Ils sont passés en paramètre (`vip_keywords: list[str]`) avec une valeur par défaut. Chaque édition peut définir ses propres mots-clés depuis l'UI (stockés dans `edition_settings` du store).

Valeur par défaut : `['vip', 'premium', 'palmeraie', 'prestige', 'gold', 'platine', 'ultra', 'carré or']`

### 4. Jours d'événement — dynamiques depuis les données

La jauge par jour ne suppose **jamais** "Samedi" ou "Dimanche". Elle lit les dates réelles dans les données importées, regroupe par date calendaire, et affiche les labels selon ce qu'elle trouve. Si pas de date d'entrée disponible, utilise la date de commande avec une note explicite.

---

## Phase 1 — Canaux de Distribution (Backend + Models)

### Task 1 : Modèles JS — Channel + Theme

**Files:**
- Modify: `frontend/src/lib/models.js`

- [ ] Ajouter le type `Channel` (canal de distribution) :

```js
// Ajouter dans models.js après createEdition

export const CHANNEL_TYPES = [
  { id: 'weezevent',  label: 'Weezevent',             icon: '🎫' },
  { id: 'bizouk',     label: 'Bizouk',                 icon: '🎟️' },
  { id: 'cse',        label: 'CSE / Comité entreprise', icon: '🏢' },
  { id: 'physique',   label: 'Vente physique / Réseau', icon: '🏪' },
  { id: 'helloasso',  label: 'HelloAsso',              icon: '💙' },
  { id: 'billetweb',  label: 'Billetweb',              icon: '🏷️' },
  { id: 'autre',      label: 'Autre',                  icon: '📋' },
]

export function createChannel(data = {}) {
  return {
    id:        data.id        ?? _id(),
    editionId: data.editionId ?? null,
    name:      data.name      ?? 'Nouveau canal',
    type:      data.type      ?? 'autre',
    color:     data.color     ?? null,    // accent couleur optionnel
    active:    data.active    ?? true,
    createdAt: data.createdAt ?? new Date().toISOString(),
  }
}

// Thème événementiel par édition
export function createEventTheme(data = {}) {
  return {
    imageUrl:    data.imageUrl    ?? null,
    primary:     data.primary     ?? '#6366F1',
    secondary:   data.secondary   ?? '#F59E0B',
    fontFamily:  data.fontFamily  ?? 'Outfit',
    textColor:   data.textColor   ?? '#FFFFFF',
    textSize:    data.textSize    ?? 'md',      // 'sm' | 'md' | 'lg'
    bannerOn:    data.bannerOn    ?? false,
    bannerHeight: data.bannerHeight ?? 160,    // px
  }
}
```

- [ ] Commit :
```bash
git add frontend/src/lib/models.js
git commit -m "feat: add Channel and EventTheme models"
```

---

### Task 2 : Store — CRUD Channels + Theme

**Files:**
- Modify: `frontend/src/store/eventStore.js`

- [ ] Ajouter clés + fonctions :

```js
// Dans KEYS (début du fichier)
const KEYS = {
  orgs:     'ea_organisations',
  events:   'ea_events',
  editions: 'ea_editions',
  cse:      'ea_cse',
  channels: 'ea_channels',   // ← ajouter
  themes:   'ea_themes',     // ← ajouter
}

// ── Channels ──────────────────────────────────────────────────────────────────
export function getChannels(editionId = null) {
  const all = load(KEYS.channels)
  return editionId ? all.filter(c => c.editionId === editionId && c.active) : all
}
export function saveChannel(channel) {
  const list = load(KEYS.channels).filter(c => c.id !== channel.id)
  save(KEYS.channels, [...list, channel])
  return channel
}
export function deleteChannel(channelId) {
  const list = load(KEYS.channels)
  save(KEYS.channels, list.map(c => c.id === channelId ? { ...c, active: false } : c))
}

// ── Themes ────────────────────────────────────────────────────────────────────
export function getTheme(editionId) {
  const all = load(KEYS.themes)
  return all.find(t => t.editionId === editionId) ?? null
}
export function saveTheme(editionId, theme) {
  const all = load(KEYS.themes).filter(t => t.editionId !== editionId)
  save(KEYS.themes, [...all, { editionId, ...theme }])
}
```

- [ ] Commit :
```bash
git add frontend/src/store/eventStore.js
git commit -m "feat: add channel and theme store functions"
```

---

### Task 3 : Database SQLite — Table channels

**Files:**
- Modify: `backend/database.py`

- [ ] Ajouter la table `channels` dans `init_db()` :

```python
# Dans le executescript de init_db(), ajouter :
"""
CREATE TABLE IF NOT EXISTS channels (
    id          TEXT PRIMARY KEY,
    edition_id  TEXT NOT NULL,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,    -- weezevent | bizouk | cse | physique | autre
    color       TEXT,             -- #hex optionnel
    active      INTEGER DEFAULT 1,
    created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_channels_edition ON channels(edition_id);

-- Lier les imports à un canal
-- (ajouter colonne channel_id à la table imports si elle n'existe pas)
ALTER TABLE imports ADD COLUMN channel_id TEXT;
"""
```

- [ ] Ajouter les fonctions CRUD :

```python
# ── Channels ───────────────────────────────────────────────────────────────────
def save_channel(channel: dict) -> dict:
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO channels
              (id, edition_id, name, type, color, active, created_at)
            VALUES (?,?,?,?,?,?,?)
        """, (
            channel['id'], channel['edition_id'], channel['name'],
            channel['type'], channel.get('color'), int(channel.get('active', True)),
            channel.get('created_at', datetime.utcnow().isoformat()),
        ))
    return channel

def get_channels(edition_id: str) -> list:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM channels WHERE edition_id = ? AND active = 1 ORDER BY created_at",
            (edition_id,)
        ).fetchall()
    return [dict(r) for r in rows]

def delete_channel(channel_id: str):
    with get_db() as conn:
        conn.execute("UPDATE channels SET active = 0 WHERE id = ?", (channel_id,))
```

- [ ] Re-créer la DB proprement :
```bash
cd backend && python -c "
import os; os.remove('data.db') if os.path.exists('data.db') else None
from database import init_db; init_db(); print('OK')
"
```

- [ ] Commit :
```bash
git add backend/database.py
git commit -m "feat: add channels table to SQLite + CRUD functions"
```

---

### Task 4 : Endpoints API — Channels

**Files:**
- Modify: `backend/main.py`

- [ ] Ajouter l'import :
```python
from database import (
    init_db, save_import, get_imports, rollback_import,
    get_state, dedup_import,
    save_live_snapshot, get_live_snapshots, rollback_live_snapshot,
    save_channel, get_channels, delete_channel,   # ← ajouter
)
```

- [ ] Ajouter les routes (après `/api/import/sources`) :

```python
# ── Channels ───────────────────────────────────────────────────────────────────

@app.get("/api/channels/{edition_id}")
def list_channels(edition_id: str):
    """Liste des canaux de distribution d'une édition."""
    return jsonify(get_channels(edition_id))

@app.post("/api/channels")
async def create_channel(request: Request):
    """Crée un canal de distribution."""
    body = await request.json()
    if not body.get('id'):
        import uuid
        body['id'] = str(uuid.uuid4())
    if not body.get('created_at'):
        body['created_at'] = datetime.utcnow().isoformat()
    return jsonify(save_channel(body))

@app.put("/api/channels/{channel_id}")
async def update_channel(channel_id: str, request: Request):
    """Met à jour un canal."""
    body = await request.json()
    body['id'] = channel_id
    return jsonify(save_channel(body))

@app.delete("/api/channels/{channel_id}")
def remove_channel(channel_id: str):
    """Désactive un canal."""
    delete_channel(channel_id)
    return {"ok": True}
```

- [ ] Tester :
```bash
cd backend && python -m uvicorn main:app --reload --port 8001 &
curl -s http://localhost:8001/api/channels/edi-test | python -m json.tool
# Attendu: []
```

- [ ] Commit :
```bash
git add backend/main.py
git commit -m "feat: add channel CRUD endpoints"
```

---

## Phase 2 — Nouveaux KPIs Billetterie (Backend)

### Task 5 : Service Billetterie Analyzer

**Files:**
- Create: `backend/services/billetterie_analyzer.py`

Ce service prend un DataFrame Bizouk/Weezevent et en extrait les nouveaux KPIs métier.

- [ ] Créer le fichier :

```python
"""
billetterie_analyzer.py — Calcul des KPIs métier billetterie

KPIs produits :
  composition_tickets  — Total / VIP / Fosse / Invitation VIP / Invitation Fosse
  composition_jauge    — Participants par jour × zone (Samedi/Dimanche × VIP/Fosse)
  commandes_multi      — Nombre de commandes avec ≥ 2 billets
  panier_moyen         — Montant moyen par commande (déjà dans parser)
  tickets_par_client   — Moyenne de billets par acheteur unique
  montant_par_client   — CA moyen par acheteur unique
  tendance_horaire     — Nb commandes par heure (0-23)
  evolution_ca         — CA agrégé par jour / par mois / par an
  evolution_quantite   — Quantité agrégée par jour / par mois / par an
"""

import pandas as pd
import numpy as np
from typing import Optional


# ── Helpers ────────────────────────────────────────────────────────────────────

def _is_vip(tarif: str) -> bool:
    """Détecte si un tarif est de type VIP / premium.
    Mots-clés VIP : vip, palmeraie, premium, ultra, prestige, gold, platine.
    """
    t = str(tarif).lower()
    return any(k in t for k in ['vip', 'palmeraie', 'premium', 'ultra', 'prestige', 'gold', 'platine'])


def _is_invitation(tarif: str) -> bool:
    """Détecte si un tarif est une invitation / billet offert."""
    t = str(tarif).lower()
    return any(k in t for k in ['invitation', 'invit', 'invite', 'gratuit', 'offert', 'compl', 'press', 'artiste'])


def _get_day_label(date_series: pd.Series) -> pd.Series:
    """Retourne le jour de la semaine en français, simplifié en 'Samedi'/'Dimanche'/etc."""
    days = {0: 'Lundi', 1: 'Mardi', 2: 'Mercredi',
            3: 'Jeudi', 4: 'Vendredi', 5: 'Samedi', 6: 'Dimanche'}
    return pd.to_datetime(date_series, errors='coerce', dayfirst=True).dt.dayofweek.map(days)


# ── KPIs ───────────────────────────────────────────────────────────────────────

def composition_tickets(df: pd.DataFrame, col_tarif: str, col_qty: str) -> dict:
    """
    Décompose le nombre total de billets en :
    VIP payant / Fosse payant / Invitation VIP / Invitation Fosse

    Entrée : DataFrame avec colonnes tarif et quantité
    """
    df = df.copy()
    qty = pd.to_numeric(df[col_qty], errors='coerce').fillna(1) if col_qty else pd.Series([1] * len(df))

    results = {
        'total':          int(qty.sum()),
        'vip_payant':     0,
        'fosse_payant':   0,
        'invitation_vip': 0,
        'invitation_fosse': 0,
    }

    if col_tarif not in df.columns:
        results['fosse_payant'] = results['total']
        return results

    for _, row in df.iterrows():
        tarif = str(row.get(col_tarif, ''))
        q = int(pd.to_numeric(row.get(col_qty, 1), errors='coerce') or 1)
        is_vip  = _is_vip(tarif)
        is_inv  = _is_invitation(tarif)

        if is_inv and is_vip:
            results['invitation_vip'] += q
        elif is_inv:
            results['invitation_fosse'] += q
        elif is_vip:
            results['vip_payant'] += q
        else:
            results['fosse_payant'] += q

    return results


def composition_jauge(df: pd.DataFrame, col_tarif: str, col_qty: str, col_date: str) -> list:
    """
    Participants par jour × zone (VIP/Fosse).
    Retourne une liste : [{ jour, vip, fosse }, ...]

    Utilisé pour les événements multi-jours (festival Samedi/Dimanche).
    Le 'jour' est la date d'entrée si disponible, sinon la date de commande.
    """
    if col_date not in df.columns:
        return []

    df = df.copy()
    df['_qty']  = pd.to_numeric(df.get(col_qty, 1), errors='coerce').fillna(1)
    df['_day']  = _get_day_label(df[col_date])
    df['_is_vip'] = df[col_tarif].apply(_is_vip) if col_tarif in df.columns else False

    days = df['_day'].dropna().unique()
    result = []

    for day in sorted(days):
        sub = df[df['_day'] == day]
        vip   = int(sub[sub['_is_vip']]['_qty'].sum())
        fosse = int(sub[~sub['_is_vip']]['_qty'].sum())
        result.append({'jour': day, 'vip': vip, 'fosse': fosse})

    return result


def commandes_multi(df: pd.DataFrame, col_cmd: str, col_qty: str) -> dict:
    """
    Commandes avec ≥ 2 billets.
    """
    if col_cmd not in df.columns:
        return {'total': len(df), 'multi': 0, 'single': len(df)}

    df = df.copy()
    df['_qty'] = pd.to_numeric(df.get(col_qty, 1), errors='coerce').fillna(1)
    by_cmd = df.groupby(col_cmd)['_qty'].sum()

    total  = len(by_cmd)
    multi  = int((by_cmd >= 2).sum())
    single = total - multi

    return {'total': total, 'multi': multi, 'single': single,
            'pct_multi': round(multi / total * 100, 1) if total else 0}


def moyennes_client(df: pd.DataFrame, col_cmd: str, col_qty: str, col_prix: str) -> dict:
    """
    Tickets moyen par client et montant moyen par client.
    Un 'client' = une commande unique (col_cmd).
    """
    if col_cmd not in df.columns:
        return {'tickets_par_client': None, 'montant_par_client': None}

    df = df.copy()
    df['_qty']  = pd.to_numeric(df.get(col_qty, 1), errors='coerce').fillna(1)
    df['_prix'] = pd.to_numeric(df.get(col_prix), errors='coerce').fillna(0) if col_prix else pd.Series([0]*len(df))

    by_cmd = df.groupby(col_cmd).agg({'_qty': 'sum', '_prix': 'sum'})

    tickets_moy = round(float(by_cmd['_qty'].mean()), 2) if len(by_cmd) else None
    montant_moy = round(float(by_cmd['_prix'].mean()), 2) if len(by_cmd) else None

    return {'tickets_par_client': tickets_moy, 'montant_par_client': montant_moy}


def tendance_horaire(df: pd.DataFrame, col_date: str) -> list:
    """
    Courbe : nombre de commandes par heure (0-23).
    Retourne 24 entrées : [{ heure: 0, nb: 45 }, { heure: 1, nb: 12 }, ...]
    """
    if col_date not in df.columns:
        return [{'heure': h, 'nb': 0} for h in range(24)]

    dates = pd.to_datetime(df[col_date], errors='coerce', dayfirst=True)
    hours = dates.dt.hour.dropna()
    counts = hours.value_counts().reindex(range(24), fill_value=0)

    return [{'heure': int(h), 'nb': int(counts[h])} for h in range(24)]


def evolution_temporelle(df: pd.DataFrame, col_date: str, col_qty: str, col_prix: str) -> dict:
    """
    Evolution CA et quantité par jour / par mois / par an.
    Retourne { jour: [...], mois: [...], an: [...] }
    Chaque entrée : { periode, ca, quantite }
    """
    if col_date not in df.columns:
        return {'jour': [], 'mois': [], 'an': []}

    df = df.copy()
    df['_date'] = pd.to_datetime(df[col_date], errors='coerce', dayfirst=True)
    df['_qty']  = pd.to_numeric(df.get(col_qty, 1), errors='coerce').fillna(1)
    df['_prix'] = pd.to_numeric(df.get(col_prix), errors='coerce').fillna(0) if col_prix else pd.Series([0]*len(df))

    df = df.dropna(subset=['_date'])

    def _agg(period_col):
        g = df.groupby(period_col).agg(ca=('_prix', 'sum'), quantite=('_qty', 'sum')).reset_index()
        return [{'periode': str(r[period_col]), 'ca': round(float(r['ca']), 2), 'quantite': int(r['quantite'])}
                for _, r in g.iterrows()]

    df['_jour'] = df['_date'].dt.date.astype(str)
    df['_mois'] = df['_date'].dt.to_period('M').astype(str)
    df['_an']   = df['_date'].dt.year.astype(str)

    return {
        'jour': _agg('_jour'),
        'mois': _agg('_mois'),
        'an':   _agg('_an'),
    }


# ── Dispatch principal ─────────────────────────────────────────────────────────

def analyze_billetterie(df: pd.DataFrame, col_map: dict) -> dict:
    """
    Point d'entrée : prend un DataFrame parsé + son col_map (depuis import_parser)
    et retourne tous les KPIs métier.

    col_map attendu : {
      'tarif': nom_colonne,   'qty': nom_colonne,
      'cmd':   nom_colonne,   'prix': nom_colonne,
      'date':  nom_colonne,
    }
    """
    c = col_map

    return {
        'composition_tickets': composition_tickets(df, c.get('tarif'), c.get('qty')),
        'composition_jauge':   composition_jauge(df, c.get('tarif'), c.get('qty'), c.get('date')),
        'commandes_multi':     commandes_multi(df, c.get('cmd'), c.get('qty')),
        'moyennes_client':     moyennes_client(df, c.get('cmd'), c.get('qty'), c.get('prix')),
        'tendance_horaire':    tendance_horaire(df, c.get('date')),
        'evolution':           evolution_temporelle(df, c.get('date'), c.get('qty'), c.get('prix')),
    }
```

- [ ] Tester le service :
```bash
cd backend && python -c "
import pandas as pd
from services.billetterie_analyzer import composition_tickets, tendance_horaire

# Test minimal
df = pd.DataFrame({
    'tarif': ['VIP - Palmeraie', 'Fosse', 'Invitation VIP', 'Fosse'],
    'qty':   [1, 2, 1, 3],
    'date':  ['2025-08-11 08:30', '2025-08-11 20:15', '2025-08-12 10:00', '2025-08-12 22:45'],
})

comp = composition_tickets(df, 'tarif', 'qty')
print('Composition:', comp)
# Attendu: vip_payant=1, fosse_payant=5, invitation_vip=1

th = tendance_horaire(df, 'date')
actifs = [(e['heure'], e['nb']) for e in th if e['nb'] > 0]
print('Horaire non nul:', actifs)
# Attendu: [(8,1), (10,1), (20,1), (22,1)]
"
```

- [ ] Commit :
```bash
git add backend/services/billetterie_analyzer.py
git commit -m "feat: billetterie analyzer - VIP/Fosse breakdown, hourly trend, multi-ticket"
```

---

### Task 6 : Intégrer l'analyzer dans import_parser.py

**Files:**
- Modify: `backend/services/import_parser.py`

- [ ] Exposer le `col_map` dans le résultat de chaque parser pour que l'analyzer puisse fonctionner :

Dans `parse_bizouk`, ajouter en fin :
```python
# Construire le col_map pour l'analyzer
analyzer_map = {
    'tarif': c_tarif, 'qty': c_qty,
    'cmd':   c_cmd,   'prix': c_price,
    'date':  c_date,
}
result = _normalize('bizouk', nb_cmd, nb_part, ca, nb_tarifs, top,
                    monthly, {}, filename, len(df), list(df.columns), ids)
result['_analyzer_map'] = analyzer_map
result['_df_json'] = df.to_json(orient='records', date_format='iso', force_ascii=False)
return result
```

Faire pareil dans `parse_weezevent` avec ses propres variables.

- [ ] Dans `parse_import` (dispatch principal), appeler l'analyzer :

```python
from services.billetterie_analyzer import analyze_billetterie

def parse_import(df: pd.DataFrame, filename: str, source: str = 'auto') -> dict:
    # ... code existant ...
    result = parser(df, filename)
    result['source_label'] = SOURCE_LABELS.get(detected, detected)

    # Ajouter les KPIs avancés si col_map disponible
    amap = result.pop('_analyzer_map', None)
    df_json = result.pop('_df_json', None)
    if amap:
        try:
            result['kpis_avances'] = analyze_billetterie(df, amap)
        except Exception as e:
            result['kpis_avances'] = None
            result['_analyzer_error'] = str(e)

    return result
```

- [ ] Tester sur le vrai fichier Bizouk :
```bash
cd backend && python -c "
from services.import_parser import parse_import
from services.file_reader import read_file

with open(r'C:\Users\jimmy\Downloads\bizouk_orders_baccha-festival-2026_20260428-052601.xls', 'rb') as f:
    data = f.read()

df = read_file(data, 'bizouk.xls')
result = parse_import(df, 'bizouk.xls', 'auto')
kpis = result.get('kpis_avances', {})
print('Composition:', kpis.get('composition_tickets'))
print('Tendance (top 3):', sorted(kpis.get('tendance_horaire', []), key=lambda x:-x['nb'])[:3])
print('Multi-tickets:', kpis.get('commandes_multi'))
"
```

- [ ] Commit :
```bash
git add backend/services/import_parser.py
git commit -m "feat: integrate billetterie analyzer into parse_import"
```

---

## Phase 3 — Dashboard Billetterie Restructuré (Frontend)

### Task 7 : EventContext — Exposer les channels

**Files:**
- Modify: `frontend/src/context/EventContext.jsx`

- [ ] Ajouter dans `EventProvider` :

```jsx
// Après les états existants, ajouter :
const [channels, setChannels] = useState([])

// Dans useEffect (refresh) :
import { getChannels, saveChannel as saveChannelStore, deleteChannel as deleteChannelStore } from '../store/eventStore'

// Dans le useEffect qui appelle refresh() :
setChannels(getChannels(activeEvent?.id)) // ou par editionId selon choix

function addChannel(data) {
  const ch = saveChannelStore(createChannel({ ...data, editionId: activeEdition?.id }))
  setChannels(getChannels(activeEdition?.id))
  return ch
}
function removeChannel(id) {
  deleteChannelStore(id)
  setChannels(getChannels(activeEdition?.id))
}

// Dans le Provider value :
channels, addChannel, removeChannel,
```

- [ ] Commit :
```bash
git add frontend/src/context/EventContext.jsx
git commit -m "feat: expose channels in EventContext"
```

---

### Task 8 : Composant ChannelManager — Gestion des canaux dans l'édition

**Files:**
- Create: `frontend/src/components/ChannelManager.jsx`

- [ ] Créer le composant (liste + ajout / suppression de canaux) :

```jsx
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useEventContext } from '../context/EventContext'
import { CHANNEL_TYPES, createChannel } from '../lib/models'

export default function ChannelManager() {
  const { channels, addChannel, removeChannel, activeEdition } = useEventContext()
  const [adding, setAdding] = useState(false)
  const [form, setForm]     = useState({ name: '', type: 'weezevent' })

  function handleAdd() {
    if (!form.name.trim()) return
    addChannel({ ...form, editionId: activeEdition?.id })
    setForm({ name: '', type: 'weezevent' })
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider">
          Canaux de distribution
        </p>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition"
          style={{ background: '#6366F1' }}>
          <Plus size={12} strokeWidth={2.5} /> Ajouter
        </button>
      </div>

      {/* Formulaire ajout */}
      {adding && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: '#111D33', border: '1px solid #1A2840' }}>
          <input
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: '#0D1526', border: '1px solid #1A2840' }}
            placeholder="Nom du canal (ex: Weezevent web, CSE EDF...)"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-2">
            {CHANNEL_TYPES.map(t => (
              <button key={t.id}
                onClick={() => setForm(f => ({ ...f, type: t.id }))}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition"
                style={{
                  background: form.type === t.id ? 'rgba(99,102,241,0.2)' : '#0D1526',
                  border: `1px solid ${form.type === t.id ? '#6366F1' : '#1A2840'}`,
                  color: form.type === t.id ? '#A5B4FC' : '#8B9BB4',
                }}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)}
              className="flex-1 py-1.5 rounded-lg text-xs text-[#8B9BB4]"
              style={{ border: '1px solid #1A2840' }}>Annuler</button>
            <button onClick={handleAdd}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: '#6366F1' }}>Créer</button>
          </div>
        </div>
      )}

      {/* Liste */}
      {channels.length === 0 && !adding && (
        <p className="text-xs text-center py-4" style={{ color: '#4A5568' }}>
          Aucun canal. Ajoutez Weezevent, Bizouk, CSE…
        </p>
      )}
      {channels.map(ch => {
        const type = CHANNEL_TYPES.find(t => t.id === ch.type)
        return (
          <div key={ch.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
            style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm">{type?.icon ?? '📋'}</span>
              <div>
                <p className="text-sm font-medium text-white">{ch.name}</p>
                <p className="text-xs" style={{ color: '#4A5568' }}>{type?.label}</p>
              </div>
            </div>
            <button onClick={() => removeChannel(ch.id)}
              className="p-1.5 rounded-lg transition hover:bg-[#1A2840]"
              style={{ color: '#4A5568' }}>
              <Trash2 size={13} strokeWidth={1.8} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] Intégrer dans `Evenements.jsx` — ajouter `<ChannelManager />` dans le modal d'édition ou dans un panneau de configuration de l'édition active.

- [ ] Commit :
```bash
git add frontend/src/components/ChannelManager.jsx frontend/src/pages/Evenements.jsx
git commit -m "feat: ChannelManager UI - add/remove distribution channels"
```

---

### Task 9 : BilletterieTracking — Sélecteur de canal + nouveaux KPIs

**Files:**
- Modify: `frontend/src/components/BilletterieTracking.jsx`

- [ ] Ajouter le sélecteur de canal avant l'upload :

```jsx
// Ajouter après l'import de useEdition
import { useEventContext } from '../context/EventContext'
import { CHANNEL_TYPES } from '../lib/models'

// Dans le composant :
const { channels } = useEventContext()
const [channelId, setChannelId] = useState(null)

// Section sélection canal (avant SectionCard Import fichier) :
{channels.length > 0 && (
  <SectionCard title="Canal de distribution" subtitle="Associer cet import à un canal">
    <div className="flex flex-wrap gap-2">
      {channels.map(ch => {
        const type = CHANNEL_TYPES.find(t => t.id === ch.type)
        return (
          <button key={ch.id}
            onClick={() => setChannelId(id => id === ch.id ? null : ch.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition"
            style={{
              background: channelId === ch.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${channelId === ch.id ? '#6366F1' : '#1A2840'}`,
              color: channelId === ch.id ? '#A5B4FC' : '#8B9BB4',
            }}>
            {type?.icon} {ch.name}
          </button>
        )
      })}
    </div>
  </SectionCard>
)}
```

- [ ] Passer `channel_id` dans la requête upload :

```js
// Dans handleFile, modifier params :
const params = new URLSearchParams({ source, save: 'true' })
if (editionId) params.set('edition_id', editionId)
if (channelId) params.set('channel_id', channelId)
```

- [ ] Commit :
```bash
git add frontend/src/components/BilletterieTracking.jsx
git commit -m "feat: channel selector in BilletterieTracking"
```

---

### Task 10 : Composant KPIs Avancés — Composition Tickets + Jauge

**Files:**
- Create: `frontend/src/components/BilletterieComposition.jsx`

- [ ] Créer le composant affichant la composition VIP/Fosse/Invitation (structure image `Composition nombre de ticket.png`) :

```jsx
import { fmt } from '../lib/format'

export default function BilletterieComposition({ kpisAvances, previousYear }) {
  if (!kpisAvances) return null

  const { composition_tickets: ct, composition_jauge: cj,
          commandes_multi: cm, moyennes_client: mc } = kpisAvances

  const pctVsAn = previousYear?.total
    ? ((ct.total - previousYear.total) / previousYear.total * 100).toFixed(1)
    : null

  return (
    <div className="space-y-4">
      {/* Composition tickets */}
      <div className="p-4 rounded-2xl" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8B9BB4' }}>
          Nombre de tickets vendus
        </p>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="num text-4xl font-bold text-white">{fmt.number(ct.total)}</span>
          {pctVsAn && (
            <span className="text-sm font-semibold" style={{ color: Number(pctVsAn) >= 0 ? '#10B981' : '#EF4444' }}>
              {Number(pctVsAn) >= 0 ? '+' : ''}{pctVsAn}% vs {previousYear?.year ?? 'an passé'}
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {[
            { label: 'VIP',              val: ct.vip_payant,      color: '#F59E0B' },
            { label: 'Fosse',            val: ct.fosse_payant,    color: '#068EEA' },
            { label: 'Invitation Fosse', val: ct.invitation_fosse, color: '#8B9BB4' },
            { label: 'Invitation VIP',   val: ct.invitation_vip,   color: '#8B5CF6' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span style={{ color: '#8B9BB4' }}>{label}</span>
              <span className="num font-semibold" style={{ color }}>{fmt.number(val)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Jauge par jour */}
      {cj?.length > 0 && (
        <div className="p-4 rounded-2xl" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8B9BB4' }}>
            Nombre de participants total
          </p>
          {cj.map(({ jour, vip, fosse }) => (
            <div key={jour} className="mb-3 last:mb-0">
              <p className="text-xs font-semibold text-white mb-1">Jauge {jour}</p>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#8B9BB4' }}>VIP</span>
                <span className="num font-semibold" style={{ color: '#F59E0B' }}>{fmt.number(vip)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#8B9BB4' }}>Fosse</span>
                <span className="num font-semibold" style={{ color: '#068EEA' }}>{fmt.number(fosse)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Indicateurs comportementaux */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Commandes ≥ 2 billets', val: fmt.number(cm?.multi), sub: `${cm?.pct_multi ?? 0}% des cmds`, color: '#8B5CF6' },
          { label: 'Tickets / client',       val: mc?.tickets_par_client ? mc.tickets_par_client.toFixed(1) : '—', sub: 'moyenne', color: '#06B6D4' },
          { label: 'CA / client',            val: mc?.montant_par_client ? fmt.currency(mc.montant_par_client) : '—', sub: 'panier client', color: '#F59E0B' },
          { label: 'Commandes mono-billet',  val: fmt.number(cm?.single), sub: `${cm ? (100-cm.pct_multi).toFixed(1) : 0}% des cmds`, color: '#8B9BB4' },
        ].map(({ label, val, sub, color }) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
            <p className="text-2xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#4A5568' }}>{label}</p>
            <p className="num text-xl font-bold" style={{ color }}>{val}</p>
            <p className="text-2xs mt-0.5" style={{ color: '#4A5568' }}>{sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] Intégrer dans `BilletterieTracking.jsx` après les KPIs existants :

```jsx
import BilletterieComposition from './BilletterieComposition'

// Dans le rendu, après les KpiCards :
{data?.kpis_avances && (
  <BilletterieComposition kpisAvances={data.kpis_avances} />
)}
```

- [ ] Commit :
```bash
git add frontend/src/components/BilletterieComposition.jsx frontend/src/components/BilletterieTracking.jsx
git commit -m "feat: BilletterieComposition - VIP/Fosse breakdown + jauge + behavioral KPIs"
```

---

### Task 11 : Composant TendanceHoraire

**Files:**
- Create: `frontend/src/components/TendanceHoraire.jsx`

Courbe 0-23h (voir image `Tendance horaire.png` — courbe line simple avec axe X heures).

- [ ] Créer :

```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fmt } from '../lib/format'

function TooltipHoraire({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: '#111D33', border: '1px solid #1A2840' }}>
      <p className="text-[#8B9BB4] mb-1">{label}h</p>
      <p className="num font-semibold text-white">{fmt.number(payload[0].value)} commandes</p>
    </div>
  )
}

export default function TendanceHoraire({ data }) {
  if (!data?.length) return null

  const maxH = Math.max(...data.map(d => d.nb))

  return (
    <div>
      <p className="text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-3">
        Tendance horaire de finalisation des commandes
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid vertical={false} stroke="#1A2840" strokeDasharray="3 3" />
          <XAxis
            dataKey="heure"
            tick={{ fill: '#8B9BB4', fontSize: 9 }}
            axisLine={false} tickLine={false}
            tickFormatter={h => `${h}h`}
          />
          <YAxis tick={{ fill: '#8B9BB4', fontSize: 9 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip content={<TooltipHoraire />} cursor={{ stroke: '#1A2840' }} />
          <Line
            type="monotone"
            dataKey="nb"
            stroke="#068EEA"
            strokeWidth={2}
            dot={d => d.payload.nb === maxH
              ? <circle key={d.key} cx={d.cx} cy={d.cy} r={4} fill="#F59E0B" stroke="none" />
              : <></>
            }
            activeDot={{ r: 5, fill: '#21AAFA' }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-2xs text-center mt-1" style={{ color: '#4A5568' }}>
        Pic : {data.find(d => d.nb === maxH)?.heure}h — {fmt.number(maxH)} commandes
      </p>
    </div>
  )
}
```

- [ ] Intégrer dans `BilletterieTracking.jsx` :

```jsx
import TendanceHoraire from './TendanceHoraire'

// Dans le SectionCard Résultats, après top_tarifs :
{data?.kpis_avances?.tendance_horaire && (
  <TendanceHoraire data={data.kpis_avances.tendance_horaire} />
)}
```

- [ ] Commit :
```bash
git add frontend/src/components/TendanceHoraire.jsx frontend/src/components/BilletterieTracking.jsx
git commit -m "feat: TendanceHoraire - hourly order curve"
```

---

### Task 12 : Composant ComparaisonHistorique

**Files:**
- Create: `frontend/src/components/ComparaisonHistorique.jsx`

Tableau `mois × années` (voir `Comparaison historique au même mois.png`).
Deux variantes : CA mensuel réel + Tickets vendus mensuel réel.

- [ ] Créer :

```jsx
import { fmt } from '../lib/format'

const MOIS_FR = ['Novembre','Décembre','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août']

export default function ComparaisonHistorique({ dataByYear }) {
  // dataByYear : { 2023: [{mois:'2023-01', ca:x, quantite:y}, ...], 2024: [...] }
  if (!dataByYear || Object.keys(dataByYear).length === 0) return null

  const years = Object.keys(dataByYear).sort()

  // Construire la matrice mois × années
  const allMonths = [...new Set(
    Object.values(dataByYear).flat().map(d => d.periode.slice(5, 7))
  )].sort()

  const getVal = (year, monthNum, field) => {
    const row = (dataByYear[year] || []).find(d => d.periode.endsWith(`-${monthNum}`))
    return row?.[field] ?? null
  }

  const formatMonth = m => {
    const map = { '01':'Janvier','02':'Février','03':'Mars','04':'Avril','05':'Mai',
                  '06':'Juin','07':'Juillet','08':'Août','09':'Septembre','10':'Octobre',
                  '11':'Novembre','12':'Décembre' }
    return map[m] ?? m
  }

  const totaux = years.map(yr =>
    (dataByYear[yr] || []).reduce((s, d) => ({ ca: s.ca + d.ca, qty: s.qty + d.quantite }), { ca: 0, qty: 0 })
  )

  const moyennes = years.map((yr, i) => ({
    ca:  totaux[i].ca / Math.max((dataByYear[yr] || []).filter(d => d.ca > 0).length, 1),
    qty: totaux[i].qty / Math.max((dataByYear[yr] || []).filter(d => d.quantite > 0).length, 1),
  }))

  return (
    <div className="space-y-4">
      {/* CA mensuel */}
      <div>
        <p className="text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-2">
          Chiffre d'affaires billetterie — mensuel réel
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th className="text-left py-2 px-3 font-semibold" style={{ color: '#4A5568', width: '25%' }}>mois</th>
                {years.map(yr => (
                  <th key={yr} className="text-right py-2 px-3 font-semibold" style={{ color: '#F59E0B' }}>{yr}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allMonths.map(m => (
                <tr key={m} style={{ borderBottom: '1px solid #1A2840' }}>
                  <td className="py-2 px-3" style={{ color: '#8B9BB4' }}>{formatMonth(m)}</td>
                  {years.map(yr => {
                    const val = getVal(yr, m, 'ca')
                    return (
                      <td key={yr} className="text-right py-2 px-3 num font-medium"
                        style={{ color: val ? '#F0F4FF' : '#4A5568' }}>
                        {val ? fmt.currency(val) : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #1A2840' }}>
                <td className="py-2 px-3 font-bold" style={{ color: '#F0F4FF' }}>Total</td>
                {totaux.map((t, i) => (
                  <td key={i} className="text-right py-2 px-3 num font-bold" style={{ color: '#F59E0B' }}>
                    {fmt.currency(t.ca)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium" style={{ color: '#8B9BB4' }}>Montant moyen</td>
                {moyennes.map((m, i) => (
                  <td key={i} className="text-right py-2 px-3 num" style={{ color: '#8B9BB4' }}>
                    {fmt.currency(m.ca)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tickets mensuel */}
      <div>
        <p className="text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-2">
          Nombre de tickets vendus — mensuel réel
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th className="text-left py-2 px-3 font-semibold" style={{ color: '#4A5568', width: '25%' }}>mois</th>
                {years.map(yr => (
                  <th key={yr} className="text-right py-2 px-3 font-semibold" style={{ color: '#F59E0B' }}>{yr}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allMonths.map(m => (
                <tr key={m} style={{ borderBottom: '1px solid #1A2840' }}>
                  <td className="py-2 px-3" style={{ color: '#8B9BB4' }}>{formatMonth(m)}</td>
                  {years.map(yr => {
                    const val = getVal(yr, m, 'quantite')
                    return (
                      <td key={yr} className="text-right py-2 px-3 num font-medium"
                        style={{ color: val ? '#F0F4FF' : '#4A5568' }}>
                        {val ? fmt.number(val) : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #1A2840' }}>
                <td className="py-2 px-3 font-bold" style={{ color: '#F0F4FF' }}>Total</td>
                {totaux.map((t, i) => (
                  <td key={i} className="text-right py-2 px-3 num font-bold" style={{ color: '#06B6D4' }}>
                    {fmt.number(t.qty)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] Commit :
```bash
git add frontend/src/components/ComparaisonHistorique.jsx
git commit -m "feat: ComparaisonHistorique - monthly CA x year matrix"
```

---

## Phase 4 — Event Theming System

### Task 13 : EventThemeEditor composant

**Files:**
- Create: `frontend/src/components/EventThemeEditor.jsx`

- [ ] Créer l'éditeur de thème (direction artistique de l'événement) :

```jsx
import { useState, useEffect } from 'react'
import { Image, Palette, Type, ToggleLeft, ToggleRight } from 'lucide-react'
import { getTheme, saveTheme } from '../store/eventStore'
import { createEventTheme } from '../lib/models'

const GOOGLE_FONTS = [
  'Outfit', 'Fraunces', 'Playfair Display', 'Montserrat',
  'Raleway', 'Oswald', 'Bebas Neue', 'Dancing Script',
]

const TEXT_SIZES = [
  { id: 'sm', label: 'Petit',  scale: '0.875rem' },
  { id: 'md', label: 'Moyen', scale: '1rem' },
  { id: 'lg', label: 'Grand', scale: '1.125rem' },
]

export default function EventThemeEditor({ editionId, onSave }) {
  const [theme, setTheme] = useState(createEventTheme())
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    const stored = getTheme(editionId)
    if (stored) setTheme(stored)
  }, [editionId])

  function handleSave() {
    saveTheme(editionId, theme)
    onSave?.(theme)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const set = k => v => setTheme(t => ({ ...t, [k]: v }))

  return (
    <div className="space-y-5">

      {/* Image de fond */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-2">
          <Image size={12} /> Direction artistique — Image de fond
        </label>
        <input
          className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
          style={{ background: '#111D33', border: '1px solid #1A2840' }}
          placeholder="URL de l'image (affiche, visuel officiel...)"
          value={theme.imageUrl ?? ''}
          onChange={e => set('imageUrl')(e.target.value || null)}
        />
        {theme.imageUrl && (
          <div className="mt-2 rounded-xl overflow-hidden h-24 relative"
            style={{ backgroundImage: `url(${theme.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(5,8,15,0.5)' }}>
              <p className="text-xs text-white font-semibold">Prévisualisation</p>
            </div>
          </div>
        )}
      </div>

      {/* Couleurs */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-2">
          <Palette size={12} /> Couleurs de l'événement
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'primary',   label: 'Couleur principale' },
            { key: 'secondary', label: 'Couleur secondaire' },
            { key: 'textColor', label: 'Couleur du texte' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <input type="color" value={theme[key]} onChange={e => set(key)(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
                style={{ background: 'transparent' }} />
              <div>
                <p className="text-xs text-white">{label}</p>
                <p className="text-2xs font-mono" style={{ color: '#4A5568' }}>{theme[key]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typographie */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-2">
          <Type size={12} /> Typographie
        </label>
        <select
          className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none mb-2"
          style={{ background: '#111D33', border: '1px solid #1A2840' }}
          value={theme.fontFamily}
          onChange={e => set('fontFamily')(e.target.value)}>
          {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <div className="flex gap-2">
          {TEXT_SIZES.map(s => (
            <button key={s.id}
              onClick={() => set('textSize')(s.id)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition"
              style={{
                background: theme.textSize === s.id ? 'rgba(99,102,241,0.2)' : '#111D33',
                border: `1px solid ${theme.textSize === s.id ? '#6366F1' : '#1A2840'}`,
                color: theme.textSize === s.id ? '#A5B4FC' : '#8B9BB4',
                fontFamily: s.id === theme.textSize ? theme.fontFamily : undefined,
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bannière */}
      <div className="flex items-center justify-between p-3 rounded-xl"
        style={{ background: '#111D33', border: '1px solid #1A2840' }}>
        <div>
          <p className="text-sm font-medium text-white">Bannière événement</p>
          <p className="text-xs" style={{ color: '#4A5568' }}>Afficher une bannière thématique en haut des pages</p>
        </div>
        <button onClick={() => set('bannerOn')(!theme.bannerOn)}>
          {theme.bannerOn
            ? <ToggleRight size={28} className="text-[#6366F1]" />
            : <ToggleLeft  size={28} style={{ color: '#4A5568' }} />}
        </button>
      </div>

      {/* Save */}
      <button onClick={handleSave}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition"
        style={{ background: '#6366F1' }}>
        {saved ? '✓ Thème enregistré' : 'Enregistrer le thème'}
      </button>
    </div>
  )
}
```

- [ ] Intégrer dans `Evenements.jsx` — ajouter onglet "Direction Artistique" dans le panneau d'édition.

- [ ] Commit :
```bash
git add frontend/src/components/EventThemeEditor.jsx frontend/src/pages/Evenements.jsx
git commit -m "feat: EventThemeEditor - image, colors, font, banner customization"
```

---

### Task 14 : EventBanner — Bandeau thématique dans le Layout

**Files:**
- Create: `frontend/src/components/EventBanner.jsx`
- Modify: `frontend/src/components/layout/Layout.jsx`

- [ ] Créer `EventBanner.jsx` :

```jsx
import { useEdition } from '../context/EditionContext'
import { getTheme } from '../store/eventStore'

export default function EventBanner() {
  const { activeEdition, activeEvent } = useEdition()
  const theme = getTheme(activeEdition?.id)

  if (!theme?.bannerOn || !activeEvent) return null

  const style = {
    height: `${theme.bannerHeight ?? 160}px`,
    position: 'relative',
    overflow: 'hidden',
    backgroundImage: theme.imageUrl
      ? `linear-gradient(to bottom, rgba(5,8,15,0.55), rgba(5,8,15,0.88)), url(${theme.imageUrl})`
      : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }

  return (
    <div style={style} className="flex flex-col justify-end px-6 pb-4">
      <p className="text-xs font-semibold uppercase tracking-widest mb-1"
        style={{ color: theme.primary, fontFamily: theme.fontFamily }}>
        {activeEvent.name}
      </p>
      <h1 className="text-2xl font-bold"
        style={{
          color: theme.textColor ?? '#fff',
          fontFamily: theme.fontFamily,
          fontSize: theme.textSize === 'lg' ? '1.75rem' : theme.textSize === 'sm' ? '1.25rem' : '1.5rem',
        }}>
        {activeEdition?.name}
      </h1>
    </div>
  )
}
```

- [ ] Ajouter dans `Layout.jsx` au-dessus de la zone `<Outlet />` :

```jsx
import EventBanner from '../EventBanner'

// Dans le contenu principal, avant <main> :
<EventBanner />
```

- [ ] Commit :
```bash
git add frontend/src/components/EventBanner.jsx frontend/src/components/layout/Layout.jsx
git commit -m "feat: EventBanner - themed banner using event direction artistique"
```

---

## Phase 5 — Reporting Automatique (plan de base)

### Task 15 : Bouton "Générer rapport" + endpoint PDF

**Files:**
- Create: `backend/services/report_generator.py`
- Modify: `backend/main.py`
- Modify: `frontend/src/pages/Restitution.jsx`

- [ ] Créer le service de rapport basique (structure + KPIs → markdown → PDF) :

```python
# backend/services/report_generator.py
"""
Génère un rapport PDF textuel à partir des KPIs d'une édition.
Format : texte structuré + summary KPIs.
La couche IA (Claude API) sera branchée ici en Phase 6.
"""
import io
from datetime import datetime

def generate_report_text(kpis: dict, edition_name: str) -> str:
    """Génère le texte du rapport. 
    Actuellement template statique, remplacé par IA en Phase 6."""
    now = datetime.now().strftime('%d/%m/%Y')
    ct  = kpis.get('composition_tickets', {})
    ev  = kpis.get('evolution', {})
    cm  = kpis.get('commandes_multi', {})
    mc  = kpis.get('moyennes_client', {})

    lines = [
        f"RAPPORT BILLETTERIE — {edition_name}",
        f"Généré le {now}",
        "=" * 50,
        "",
        "SYNTHÈSE BILLETTERIE",
        f"Total billets vendus : {ct.get('total', 0):,}",
        f"  dont VIP payant    : {ct.get('vip_payant', 0):,}",
        f"  dont Fosse payant  : {ct.get('fosse_payant', 0):,}",
        f"  dont Invitations   : {(ct.get('invitation_vip',0) + ct.get('invitation_fosse',0)):,}",
        "",
        "COMPORTEMENT D'ACHAT",
        f"Commandes ≥ 2 billets : {cm.get('multi', 0):,} ({cm.get('pct_multi', 0):.1f}%)",
        f"Tickets / client       : {mc.get('tickets_par_client') or '—'}",
        f"Montant / client       : {mc.get('montant_par_client') or '—'} €",
    ]

    # Évolution mensuelle
    mois_data = ev.get('mois', [])
    if mois_data:
        lines.extend(["", "ÉVOLUTION CA MENSUEL"])
        for m in mois_data:
            lines.append(f"  {m['periode']} : {m['ca']:,.0f} € — {m['quantite']} billets")

    return "\n".join(lines)


def export_txt_report(kpis: dict, edition_name: str) -> bytes:
    """Retourne le rapport en bytes UTF-8 (TXT simple, sans dépendance PDF)."""
    text = generate_report_text(kpis, edition_name)
    return text.encode('utf-8')
```

- [ ] Ajouter l'endpoint dans `main.py` :

```python
from services.report_generator import export_txt_report

@app.get("/api/report/{edition_id}")
def generate_report(edition_id: str, edition_name: str = "Édition"):
    """Génère et retourne un rapport texte pour une édition."""
    state = get_state(edition_id)
    # Récupérer les kpis_avances depuis le dernier import actif
    with get_db() as conn:
        row = conn.execute("""
            SELECT raw_json FROM imports
            WHERE edition_id = ? AND status = 'active'
            ORDER BY imported_at DESC LIMIT 1
        """, (edition_id,)).fetchone()

    kpis = {}
    if row:
        import json
        parsed = json.loads(row['raw_json'])
        kpis = parsed.get('kpis_avances', {})

    report_bytes = export_txt_report(kpis, edition_name)
    return Response(
        content=report_bytes,
        media_type='text/plain; charset=utf-8',
        headers={'Content-Disposition': f'attachment; filename="rapport_{edition_id}.txt"'}
    )
```

- [ ] Ajouter bouton "Générer rapport" dans `Restitution.jsx` :

```jsx
async function handleGenerateReport() {
  const url = `${API}/api/report/${editionId}?edition_name=${encodeURIComponent(activeEdition?.name ?? 'Édition')}`
  const res = await fetch(url)
  const blob = await res.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `rapport_${activeEdition?.name ?? 'edition'}.txt`
  link.click()
}
```

- [ ] Commit :
```bash
git add backend/services/report_generator.py backend/main.py frontend/src/pages/Restitution.jsx
git commit -m "feat: basic report generator - text export triggered from Restitution"
```

---

## Récapitulatif des fichiers créés / modifiés

| Fichier | Statut | Rôle |
|---|---|---|
| `frontend/src/lib/models.js` | Modifié | + Channel, EventTheme |
| `frontend/src/store/eventStore.js` | Modifié | + channels CRUD, themes |
| `frontend/src/context/EventContext.jsx` | Modifié | + channels exposés |
| `frontend/src/components/ChannelManager.jsx` | Créé | UI gestion canaux |
| `frontend/src/components/BilletterieComposition.jsx` | Créé | VIP/Fosse/Invitation KPIs |
| `frontend/src/components/TendanceHoraire.jsx` | Créé | Courbe horaire 0-23h |
| `frontend/src/components/ComparaisonHistorique.jsx` | Créé | Tableau mois × années |
| `frontend/src/components/EventThemeEditor.jsx` | Créé | Direction artistique UI |
| `frontend/src/components/EventBanner.jsx` | Créé | Bannière thématique |
| `frontend/src/components/BilletterieTracking.jsx` | Modifié | + canal selector + nouveaux KPIs |
| `frontend/src/components/layout/Layout.jsx` | Modifié | + EventBanner |
| `frontend/src/pages/Evenements.jsx` | Modifié | + ChannelManager + ThemeEditor |
| `frontend/src/pages/Restitution.jsx` | Modifié | + bouton rapport |
| `backend/database.py` | Modifié | + table channels |
| `backend/main.py` | Modifié | + endpoints channels, report |
| `backend/services/billetterie_analyzer.py` | Créé | Calcul KPIs métier avancés |
| `backend/services/report_generator.py` | Créé | Génération rapport texte |

## Phases suivantes (hors scope ce plan)

- **Phase 6 — IA** : brancher Claude API dans `report_generator.py` pour générer le texte commenté automatiquement après chaque import
- **Phase 7 — Marketing Timeline** : composant `EffetActionMarketing.jsx` (courbe CA journalière + annotations)
- **Phase 8 — Dashboard consolidé** : onglet "Tous canaux" avec tabs par canal
- **Phase 9 — Consommation** : même processus que Billetterie (canaux = points de vente Weezpay)
