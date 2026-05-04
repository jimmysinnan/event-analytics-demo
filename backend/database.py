"""
database.py — SQLite persistant via sqlite3 (built-in Python, zéro dépendance)

Tables :
  imports          — historique de chaque fichier importé + résultats parsés
  billetterie_live — snapshots du tableau de bord Suivi live (billetterie 2026)

Architecture prévue pour migrer vers PostgreSQL/Supabase :
  Toutes les requêtes passent par get_db() → remplacer sqlite3 par psycopg2/asyncpg
  sans toucher au reste du code.
"""

import sqlite3
import json
import uuid
import os
from datetime import datetime
from pathlib import Path
from contextlib import contextmanager

# Chemin du fichier SQLite.
# Priorité : variable d'environnement SQLITE_DB_PATH (hébergement dédié)
# Défaut   : data.db dans le dossier du backend (mode local/dev)
_db_env = os.environ.get('SQLITE_DB_PATH', '').strip()
if _db_env:
    DB_PATH = Path(_db_env)
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)  # crée le dossier si absent
else:
    DB_PATH = Path(__file__).parent / "data.db"


# ── Connexion ──────────────────────────────────────────────────────────────────

@contextmanager
def get_db():
    """Context manager : connexion + commit automatique + fermeture."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row      # résultats comme dict
    conn.execute("PRAGMA journal_mode=WAL")   # meilleure concurrence
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── Initialisation des tables ──────────────────────────────────────────────────

def init_db():
    """Crée les tables si elles n'existent pas. Appelé au démarrage du serveur."""
    with get_db() as conn:
        conn.executescript("""

        -- Historique des imports de fichiers
        CREATE TABLE IF NOT EXISTS imports (
            id              TEXT PRIMARY KEY,
            edition_id      TEXT NOT NULL,
            source          TEXT NOT NULL,      -- weezevent, bizouk, eventbrite…
            source_label    TEXT,
            filename        TEXT NOT NULL,
            imported_at     TEXT NOT NULL,      -- ISO 8601
            nb_rows         INTEGER,            -- lignes dans le fichier source
            nb_commandes    INTEGER,
            nb_participants INTEGER,
            ca_total        REAL,
            nb_tarifs       INTEGER,
            top_tarifs      TEXT,               -- JSON array
            ventes_par_mois TEXT,               -- JSON array
            canaux          TEXT,               -- JSON object
            raw_json        TEXT,               -- résultat complet du parser
            dedup_mode      TEXT,               -- 'full' | 'incremental' | 'first'
            new_rows        INTEGER,            -- lignes réellement ajoutées (après dédup)
            status          TEXT DEFAULT 'active'  -- active | rolled_back
        );

        CREATE INDEX IF NOT EXISTS idx_imports_edition ON imports(edition_id);
        CREATE INDEX IF NOT EXISTS idx_imports_status  ON imports(status);

        -- Données billetterie agrégées par édition (état courant après dédup)
        CREATE TABLE IF NOT EXISTS billetterie_state (
            edition_id      TEXT PRIMARY KEY,
            nb_commandes    INTEGER DEFAULT 0,
            nb_participants INTEGER DEFAULT 0,
            ca_total        REAL    DEFAULT 0,
            top_tarifs      TEXT,               -- JSON
            ventes_par_mois TEXT,               -- JSON
            canaux          TEXT,               -- JSON
            order_ids       TEXT,               -- JSON array — pour dédup
            updated_at      TEXT
        );

        -- Snapshots du dashboard Suivi Live (billetterie à venir)
        CREATE TABLE IF NOT EXISTS billetterie_live (
            id                  TEXT PRIMARY KEY,
            edition_id          TEXT NOT NULL,
            snapshot_at         TEXT NOT NULL,
            label               TEXT,           -- "Mise à jour #3", etc.
            nb_commandes_total  INTEGER,
            nb_participants_total INTEGER,
            ca_total            REAL,
            nb_tarifs           INTEGER,
            top_tarifs          TEXT,           -- JSON
            ventes_par_mois     TEXT,           -- JSON
            source_breakdown    TEXT,           -- JSON { weezevent: x, bizouk: y }
            cse_vendus          INTEGER DEFAULT 0,
            cse_montant         REAL    DEFAULT 0,
            notes               TEXT,
            status              TEXT DEFAULT 'active'
        );

        CREATE INDEX IF NOT EXISTS idx_live_edition ON billetterie_live(edition_id);

        CREATE TABLE IF NOT EXISTS channels (
            id          TEXT PRIMARY KEY,
            edition_id  TEXT NOT NULL,
            name        TEXT NOT NULL,
            type        TEXT NOT NULL,
            color       TEXT,
            active      INTEGER DEFAULT 1,
            created_at  TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_channels_edition ON channels(edition_id);

        -- Données consommation / profil client par édition (depuis upload fichier conso)
        CREATE TABLE IF NOT EXISTS conso_state (
            edition_id      TEXT PRIMARY KEY,
            kpi_json        TEXT,       -- résultat kpi_conso() : ca_ht, n_clients, top_familles, top_pdv, top_articles
            ca_horaire_json TEXT,       -- résultat ca_horaire() : [{heure, ca_ht}]
            profil_json     TEXT,       -- résultat profil_client() : {age, genre}
            filename        TEXT,
            updated_at      TEXT NOT NULL
        );

        -- KPIs agrégés par édition (historique multi-années)
        -- Remplace les données statiques hardcodées dans main.py
        CREATE TABLE IF NOT EXISTS edition_analytics (
            id              TEXT PRIMARY KEY,
            year            INTEGER NOT NULL UNIQUE,
            edition_name    TEXT,
            ca_conso        REAL,           -- CA consommation bars/PDV
            ca_billet       REAL,           -- CA billetterie
            ca_total        REAL,           -- CA global (conso + billet)
            festivaliers    INTEGER,        -- fréquentation totale
            clients         INTEGER,        -- clients uniques (consommation)
            transactions    INTEGER,        -- nb transactions consommation
            panier_conso    REAL,           -- panier moyen consommation
            invitations_total     INTEGER,
            invitations_valeur    REAL,
            invitations_entrees   INTEGER,
            invitations_pct_freq  REAL,
            affluence_json        TEXT,     -- JSON {samedi, dimanche, total}
            familles_json         TEXT,     -- JSON [{name, ca}, ...]
            pass_culture_json     TEXT,     -- JSON {ventes, ca}
            notes                 TEXT,
            created_at            TEXT NOT NULL,
            updated_at            TEXT NOT NULL
        );

        """)

    # ── Migrations safe (colonnes ajoutées après la création initiale) ──────────
    _safe_alter("""ALTER TABLE edition_analytics ADD COLUMN profil_json TEXT""")

    # ── Seed des données historiques 2023-2025 si absentes ────────────────────
    _seed_edition_analytics()


def _safe_alter(sql: str):
    """Exécute un ALTER TABLE sans planter si la colonne existe déjà."""
    try:
        with get_db() as conn:
            conn.execute(sql)
    except Exception:
        pass

    try:
        with get_db() as conn:
            conn.execute("ALTER TABLE imports ADD COLUMN channel_id TEXT")
    except Exception:
        pass  # Column already exists


def _seed_edition_analytics():
    """
    Seed idempotent des données historiques 2023-2025.
    - INSERT OR IGNORE pour les nouvelles lignes
    - UPDATE ... WHERE {champ} IS NULL pour réparer sans écraser
    """
    now = datetime.utcnow().isoformat()
    seed = [
        {
            'id': 'seed-2023', 'year': 2023, 'edition_name': 'Édition 2023',
            'ca_conso': 888537, 'ca_billet': None, 'ca_total': None,
            'festivaliers': None, 'clients': 11735, 'transactions': 71547,
            'panier_conso': 75.7,
            'invitations_total': None, 'invitations_valeur': None,
            'invitations_entrees': None, 'invitations_pct_freq': None,
            'affluence_json': None,
            'familles_json': None,
            'pass_culture_json': json.dumps({'ventes': 1259, 'ca': 188850}),
            'notes': 'Données issues des fichiers Excel 2023',
        },
        {
            'id': 'seed-2024', 'year': 2024, 'edition_name': 'Édition 2024',
            'ca_conso': 742968, 'ca_billet': 1019418, 'ca_total': 1762386,
            'festivaliers': 20346, 'clients': 9177, 'transactions': 55096,
            'panier_conso': 80.9,
            'invitations_total': None, 'invitations_valeur': None,
            'invitations_entrees': None, 'invitations_pct_freq': None,
            'affluence_json': json.dumps({'samedi': 9762, 'dimanche': 10584, 'total': 20346}),
            'familles_json': None,
            'pass_culture_json': json.dumps({'ventes': 1775, 'ca': 225320}),
            'notes': 'Données issues des fichiers Excel 2024',
        },
        {
            'id': 'seed-2025', 'year': 2025, 'edition_name': 'Édition 2025',
            'ca_conso': 496585, 'ca_billet': 929695, 'ca_total': 1426280,
            'festivaliers': 16810, 'clients': 7251, 'transactions': 32523,
            'panier_conso': 68.5,
            'invitations_total': 1570, 'invitations_valeur': 266590,
            'invitations_entrees': 5240, 'invitations_pct_freq': 31.2,
            'affluence_json': json.dumps({'samedi': 8289, 'dimanche': 8521, 'total': 16810}),
            'familles_json': json.dumps([
                {'name': 'Champagne', 'ca': 178857},
                {'name': 'Bières',    'ca': 59005},
                {'name': 'Soft',      'ca': 44386},
                {'name': 'Cocktail',  'ca': 33924},
                {'name': 'Food',      'ca': 27581},
                {'name': 'Vodka',     'ca': 18775},
                {'name': 'Hard',      'ca': 17678},
            ]),
            'pass_culture_json': json.dumps({'ventes': 516, 'ca': 61920}),
            'notes': 'Données issues des fichiers Excel 2025',
        },
    ]
    with get_db() as conn:
        for row in seed:
            # Insérer si absent
            conn.execute("""
                INSERT OR IGNORE INTO edition_analytics
                  (id, year, edition_name, ca_conso, ca_billet, ca_total,
                   festivaliers, clients, transactions, panier_conso,
                   invitations_total, invitations_valeur, invitations_entrees, invitations_pct_freq,
                   affluence_json, familles_json, pass_culture_json, notes, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                row['id'], row['year'], row['edition_name'],
                row['ca_conso'], row['ca_billet'], row['ca_total'],
                row['festivaliers'], row['clients'], row['transactions'], row['panier_conso'],
                row['invitations_total'], row['invitations_valeur'],
                row['invitations_entrees'], row['invitations_pct_freq'],
                row['affluence_json'], row['familles_json'], row['pass_culture_json'],
                row['notes'], now, now,
            ))
            # Réparer les champs NULL si la ligne existait déjà (ex: écrasée par upsert)
            # Ne met à jour que les champs qui sont NULL — ne touche pas aux champs déjà renseignés
            numeric_fields = [
                ('ca_conso', row['ca_conso']), ('ca_billet', row['ca_billet']),
                ('ca_total', row['ca_total']), ('festivaliers', row['festivaliers']),
                ('clients', row['clients']), ('transactions', row['transactions']),
                ('panier_conso', row['panier_conso']),
                ('invitations_total', row['invitations_total']),
                ('invitations_valeur', row['invitations_valeur']),
                ('invitations_entrees', row['invitations_entrees']),
                ('invitations_pct_freq', row['invitations_pct_freq']),
            ]
            json_fields = [
                ('affluence_json', row['affluence_json']),
                ('familles_json', row['familles_json']),
                ('pass_culture_json', row['pass_culture_json']),
            ]
            for field, value in numeric_fields + json_fields:
                if value is not None:
                    conn.execute(
                        f"UPDATE edition_analytics SET {field}=?, updated_at=? WHERE year=? AND {field} IS NULL",
                        (value, now, row['year'])
                    )


# ── CONSO STATE ───────────────────────────────────────────────────────────────

def save_conso_state(edition_id: str, kpi: dict, ca_horaire: list, profil: dict, filename: str = '') -> None:
    """Persiste les KPIs consommation/profil client pour une édition."""
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO conso_state
              (edition_id, kpi_json, ca_horaire_json, profil_json, filename, updated_at)
            VALUES (?,?,?,?,?,?)
        """, (
            edition_id,
            json.dumps(kpi,        ensure_ascii=False),
            json.dumps(ca_horaire, ensure_ascii=False),
            json.dumps(profil,     ensure_ascii=False),
            filename,
            now,
        ))


def get_conso_state(edition_id: str) -> dict | None:
    """Retourne les données conso/profil stockées pour une édition, ou None."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM conso_state WHERE edition_id = ?", (edition_id,)
        ).fetchone()
    if not row:
        return None
    d = dict(row)
    for key in ('kpi_json', 'ca_horaire_json', 'profil_json'):
        field = key.replace('_json', '')
        try:
            d[field] = json.loads(d[key]) if d.get(key) else ({} if field != 'ca_horaire' else [])
        except Exception:
            d[field] = {} if field != 'ca_horaire' else []
        del d[key]
    return d


# ── EDITION ANALYTICS ──────────────────────────────────────────────────────────

_JSON_FIELDS = ('affluence_json', 'familles_json', 'pass_culture_json', 'profil_json')


def get_all_edition_analytics() -> list:
    """Retourne toutes les éditions historiques, triées par année."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM edition_analytics ORDER BY year ASC"
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        for key in _JSON_FIELDS:
            field = key.replace('_json', '')
            if d.get(key):
                try:
                    d[field] = json.loads(d[key])
                except Exception:
                    d[field] = None
            else:
                d[field] = None
            if key in d:
                del d[key]
        result.append(d)
    return result


def upsert_edition_analytics(year: int, data: dict) -> str:
    """Crée ou met à jour les KPIs d'une édition par année.
    Stratégie MERGE : ne met à jour que les champs fournis dans data.
    Les champs non fournis (None / absents) conservent leur valeur existante.
    """
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM edition_analytics WHERE year = ?", (year,)
        ).fetchone()

        if existing:
            # MERGE : ne pas écraser un champ existant avec None
            ex = dict(existing)
            eid = ex['id']

            def _keep(field, new_val, json_key=None):
                """Retourne new_val si fourni, sinon conserve la valeur existante."""
                if json_key:
                    return json.dumps(new_val, ensure_ascii=False) if new_val is not None else ex.get(json_key)
                return new_val if new_val is not None else ex.get(field)

            conn.execute("""
                UPDATE edition_analytics SET
                  edition_name      = ?,
                  ca_conso          = ?,
                  ca_billet         = ?,
                  ca_total          = ?,
                  festivaliers      = ?,
                  clients           = ?,
                  transactions      = ?,
                  panier_conso      = ?,
                  invitations_total = ?,
                  invitations_valeur= ?,
                  invitations_entrees=?,
                  invitations_pct_freq=?,
                  affluence_json    = ?,
                  familles_json     = ?,
                  pass_culture_json = ?,
                  profil_json       = ?,
                  notes             = ?,
                  updated_at        = ?
                WHERE year = ?
            """, (
                _keep('edition_name',  data.get('edition_name')),
                _keep('ca_conso',      data.get('ca_conso')),
                _keep('ca_billet',     data.get('ca_billet')),
                _keep('ca_total',      data.get('ca_total')),
                _keep('festivaliers',  data.get('festivaliers')),
                _keep('clients',       data.get('clients')),
                _keep('transactions',  data.get('transactions')),
                _keep('panier_conso',  data.get('panier_conso')),
                _keep('invitations_total',   data.get('invitations_total')),
                _keep('invitations_valeur',  data.get('invitations_valeur')),
                _keep('invitations_entrees', data.get('invitations_entrees')),
                _keep('invitations_pct_freq',data.get('invitations_pct_freq')),
                _keep('affluence_json',  data.get('affluence'),    'affluence_json'),
                _keep('familles_json',   data.get('familles'),     'familles_json'),
                _keep('pass_culture_json',data.get('pass_culture'),'pass_culture_json'),
                _keep('profil_json',     data.get('profil'),       'profil_json'),
                _keep('notes',         data.get('notes')),
                now, year,
            ))
        else:
            eid = f"ea-{year}-{str(uuid.uuid4())[:8]}"
            conn.execute("""
                INSERT INTO edition_analytics
                  (id, year, edition_name, ca_conso, ca_billet, ca_total,
                   festivaliers, clients, transactions, panier_conso,
                   invitations_total, invitations_valeur, invitations_entrees, invitations_pct_freq,
                   affluence_json, familles_json, pass_culture_json, profil_json,
                   notes, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                eid, year,
                data.get('edition_name', f'Édition {year}'),
                data.get('ca_conso'), data.get('ca_billet'), data.get('ca_total'),
                data.get('festivaliers'), data.get('clients'), data.get('transactions'),
                data.get('panier_conso'),
                data.get('invitations_total'), data.get('invitations_valeur'),
                data.get('invitations_entrees'), data.get('invitations_pct_freq'),
                json.dumps(data['affluence'],    ensure_ascii=False) if data.get('affluence')    else None,
                json.dumps(data['familles'],     ensure_ascii=False) if data.get('familles')     else None,
                json.dumps(data['pass_culture'], ensure_ascii=False) if data.get('pass_culture') else None,
                json.dumps(data['profil'],       ensure_ascii=False) if data.get('profil')       else None,
                data.get('notes'),
                now, now,
            ))
    return eid


# ── IMPORTS ────────────────────────────────────────────────────────────────────

def save_import(edition_id: str, parsed: dict, dedup_result: dict) -> str:
    """
    Enregistre un import en base.
    Retourne l'id de l'import créé.
    """
    import_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    with get_db() as conn:
        conn.execute("""
            INSERT INTO imports
              (id, edition_id, source, source_label, filename, imported_at,
               nb_rows, nb_commandes, nb_participants, ca_total, nb_tarifs,
               top_tarifs, ventes_par_mois, canaux, raw_json,
               dedup_mode, new_rows)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            import_id,
            edition_id,
            parsed.get('source_detected', 'generic'),
            parsed.get('source_label', ''),
            parsed.get('meta', {}).get('file', 'unknown'),
            now,
            parsed.get('meta', {}).get('rows', 0),
            parsed.get('nb_commandes', 0),
            parsed.get('nb_participants', 0),
            parsed.get('ca_total'),
            parsed.get('nb_tarifs', 0),
            json.dumps(parsed.get('top_tarifs', []), ensure_ascii=False),
            json.dumps(parsed.get('ventes_par_mois', []), ensure_ascii=False),
            json.dumps(parsed.get('canaux', {}), ensure_ascii=False),
            json.dumps(parsed, ensure_ascii=False),
            dedup_result.get('mode', 'first'),
            dedup_result.get('new_rows', parsed.get('nb_commandes', 0)),
        ))

    return import_id


def get_imports(edition_id: str) -> list:
    """Retourne l'historique des imports d'une édition, du plus récent au plus ancien."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, source, source_label, filename, imported_at,
                   nb_commandes, nb_participants, ca_total, nb_tarifs,
                   dedup_mode, new_rows, status
            FROM imports
            WHERE edition_id = ? AND status != 'rolled_back'
            ORDER BY imported_at DESC
        """, (edition_id,)).fetchall()
    return [dict(r) for r in rows]


def rollback_import(import_id: str, edition_id: str) -> bool:
    """Marque un import comme rolled_back et recalcule l'état courant."""
    with get_db() as conn:
        conn.execute(
            "UPDATE imports SET status = 'rolled_back' WHERE id = ?",
            (import_id,)
        )
    _rebuild_state(edition_id)
    return True


def _rebuild_state(edition_id: str):
    """Recalcule l'état agrégé billetterie après un rollback."""
    with get_db() as conn:
        active = conn.execute("""
            SELECT raw_json FROM imports
            WHERE edition_id = ? AND status = 'active'
            ORDER BY imported_at ASC
        """, (edition_id,)).fetchall()

    # Reconstruire depuis zéro en réappliquant tous les imports actifs dans l'ordre
    state = _empty_state(edition_id)
    for row in active:
        parsed = json.loads(row['raw_json'])
        state = _merge_state(state, parsed, mode='full')
    _save_state(edition_id, state)


# ── ÉTAT COURANT (agrégat) ─────────────────────────────────────────────────────

def get_state(edition_id: str) -> dict:
    """Retourne l'état courant agrégé pour une édition."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM billetterie_state WHERE edition_id = ?",
            (edition_id,)
        ).fetchone()
    if not row:
        return _empty_state(edition_id)
    d = dict(row)
    for key in ('top_tarifs', 'ventes_par_mois', 'canaux', 'order_ids'):
        if d.get(key):
            try:
                d[key] = json.loads(d[key])
            except Exception:
                d[key] = [] if key != 'canaux' else {}
    return d


def _empty_state(edition_id: str) -> dict:
    return {
        'edition_id': edition_id,
        'nb_commandes': 0, 'nb_participants': 0, 'ca_total': 0.0,
        'top_tarifs': [], 'ventes_par_mois': [], 'canaux': {},
        'order_ids': [],
    }


def _save_state(edition_id: str, state: dict):
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO billetterie_state
              (edition_id, nb_commandes, nb_participants, ca_total,
               top_tarifs, ventes_par_mois, canaux, order_ids, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (
            edition_id,
            state['nb_commandes'],
            state['nb_participants'],
            state['ca_total'],
            json.dumps(state.get('top_tarifs', []), ensure_ascii=False),
            json.dumps(state.get('ventes_par_mois', []), ensure_ascii=False),
            json.dumps(state.get('canaux', {}), ensure_ascii=False),
            json.dumps(state.get('order_ids', []), ensure_ascii=False),
            datetime.utcnow().isoformat(),
        ))


def _merge_state(state: dict, parsed: dict, mode: str) -> dict:
    """Fusionne un résultat parsé dans l'état courant (sans doublons)."""
    state['nb_commandes']    += parsed.get('nb_commandes', 0)
    state['nb_participants'] += parsed.get('nb_participants', 0)
    ca = parsed.get('ca_total')
    if ca:
        state['ca_total'] = (state['ca_total'] or 0) + ca

    # Fusionner top_tarifs
    existing_tarifs = {t['tarif']: t for t in state.get('top_tarifs', [])}
    for t in parsed.get('top_tarifs', []):
        k = t['tarif']
        if k in existing_tarifs:
            existing_tarifs[k]['nb'] += t['nb']
        else:
            existing_tarifs[k] = dict(t)
    total = sum(t['nb'] for t in existing_tarifs.values()) or 1
    state['top_tarifs'] = sorted(
        [{'tarif': k, 'nb': v['nb'], 'pct': round(v['nb'] / total * 100, 1)}
         for k, v in existing_tarifs.items()],
        key=lambda x: -x['nb']
    )[:12]

    # Fusionner courbe mensuelle
    monthly = {m['mois']: m['nb'] for m in state.get('ventes_par_mois', [])}
    for m in parsed.get('ventes_par_mois', []):
        monthly[m['mois']] = monthly.get(m['mois'], 0) + m['nb']
    state['ventes_par_mois'] = sorted(
        [{'mois': k, 'nb': v} for k, v in monthly.items()],
        key=lambda x: x['mois']
    )

    # Fusionner canaux
    for k, v in parsed.get('canaux', {}).items():
        state['canaux'][k] = state['canaux'].get(k, 0) + v

    return state


# ── DÉDUPLICATION ──────────────────────────────────────────────────────────────

def dedup_import(edition_id: str, parsed: dict) -> dict:
    """
    Déduplication exacte par IDs de commandes.

    Algorithme :
      1. Récupère les IDs déjà en base pour cette édition
      2. Compare avec les IDs du fichier importé
      3. Filtre parsed pour ne conserver que les nouvelles lignes
      4. Met à jour l'état agrégé avec uniquement les nouvelles données

    Modes :
      'first'       — premier import, aucun ID en base
      'incremental' — tous les IDs sont nouveaux
      'partial'     — mix de nouveaux et d'existants (fichier cumulatif)
      'duplicate'   — tous les IDs existent déjà, rien à ajouter

    Si les parsers n'ont pas pu extraire d'IDs (colonne absente),
    fallback sur le comportement 'first' / 'incremental' sans dédup.
    """
    state = get_state(edition_id)

    incoming_ids = set(parsed.get('order_ids', []))
    existing_ids = set(state.get('order_ids', []))

    # ── Cas sans IDs (parser n'a pas trouvé de colonne ID) ───────────────────
    if not incoming_ids:
        if state['nb_commandes'] == 0:
            new_state = _merge_state(_empty_state(edition_id), parsed, 'first')
            _save_state(edition_id, new_state)
            return {'mode': 'first', 'new_rows': parsed.get('nb_commandes', 0),
                    'duplicate_rows': 0, 'new_ids': [], 'id_based': False}
        else:
            new_state = _merge_state(state, parsed, 'incremental')
            _save_state(edition_id, new_state)
            return {'mode': 'incremental', 'new_rows': parsed.get('nb_commandes', 0),
                    'duplicate_rows': 0, 'new_ids': [], 'id_based': False}

    # ── Déduplication exacte par IDs ─────────────────────────────────────────
    new_ids  = incoming_ids - existing_ids
    dup_ids  = incoming_ids & existing_ids
    nb_new   = len(new_ids)
    nb_dup   = len(dup_ids)
    nb_total = len(incoming_ids)

    # Déterminer le mode
    if not existing_ids:
        mode = 'first'
    elif nb_dup == 0:
        mode = 'incremental'
    elif nb_new == 0:
        mode = 'duplicate'
    else:
        mode = 'partial'

    # Si rien de nouveau → ne pas modifier l'état
    if nb_new == 0:
        return {'mode': mode, 'new_rows': 0, 'duplicate_rows': nb_dup,
                'new_ids': [], 'id_based': True}

    # Calculer la proportion des nouvelles lignes pour ajuster les KPIs
    ratio = nb_new / nb_total if nb_total > 0 else 1.0

    delta_parsed = {
        **parsed,
        'nb_commandes':    nb_new,
        'nb_participants': round(parsed.get('nb_participants', nb_new) * ratio),
        'ca_total':        round((parsed.get('ca_total') or 0) * ratio, 2),
        'order_ids':       list(new_ids),
        # top_tarifs et ventes_par_mois : on laisse le merge gérer
    }

    if mode == 'first':
        new_state = _merge_state(_empty_state(edition_id), delta_parsed, mode)
    else:
        new_state = _merge_state(state, delta_parsed, mode)

    # Mettre à jour la liste d'IDs cumulée
    new_state['order_ids'] = list(existing_ids | new_ids)
    _save_state(edition_id, new_state)

    return {
        'mode':          mode,
        'new_rows':      nb_new,
        'duplicate_rows': nb_dup,
        'new_ids':       list(new_ids)[:20],   # échantillon pour debug
        'id_based':      True,
    }


# ── BILLETTERIE LIVE SNAPSHOTS ─────────────────────────────────────────────────

def save_live_snapshot(edition_id: str, snapshot: dict) -> str:
    """Sauvegarde un snapshot du dashboard Suivi Live."""
    snap_id = str(uuid.uuid4())
    now     = datetime.utcnow().isoformat()

    with get_db() as conn:
        # Numéro du snapshot
        count = conn.execute(
            "SELECT COUNT(*) FROM billetterie_live WHERE edition_id = ?",
            (edition_id,)
        ).fetchone()[0]
        label = snapshot.get('label') or f"Mise à jour #{count + 1}"

        conn.execute("""
            INSERT INTO billetterie_live
              (id, edition_id, snapshot_at, label,
               nb_commandes_total, nb_participants_total, ca_total, nb_tarifs,
               top_tarifs, ventes_par_mois, source_breakdown,
               cse_vendus, cse_montant, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            snap_id, edition_id, now, label,
            snapshot.get('nb_commandes'), snapshot.get('nb_participants'),
            snapshot.get('ca_total'), snapshot.get('nb_tarifs'),
            json.dumps(snapshot.get('top_tarifs', []), ensure_ascii=False),
            json.dumps(snapshot.get('ventes_par_mois', []), ensure_ascii=False),
            json.dumps(snapshot.get('source_breakdown', {}), ensure_ascii=False),
            snapshot.get('cse_vendus', 0),
            snapshot.get('cse_montant', 0),
            snapshot.get('notes', ''),
        ))
    return snap_id


def get_live_snapshots(edition_id: str) -> list:
    """Retourne les snapshots live d'une édition, du plus récent au plus ancien."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, snapshot_at, label, nb_commandes_total, nb_participants_total,
                   ca_total, nb_tarifs, cse_vendus, cse_montant, notes, status
            FROM billetterie_live
            WHERE edition_id = ? AND status = 'active'
            ORDER BY snapshot_at DESC
        """, (edition_id,)).fetchall()
    return [dict(r) for r in rows]


def rollback_live_snapshot(snap_id: str):
    """Archive un snapshot (retour arrière)."""
    with get_db() as conn:
        conn.execute(
            "UPDATE billetterie_live SET status = 'rolled_back' WHERE id = ?",
            (snap_id,)
        )


# ── Channels ───────────────────────────────────────────────────────────────────

def save_channel(channel: dict) -> dict:
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO channels
              (id, edition_id, name, type, color, active, created_at)
            VALUES (?,?,?,?,?,?,?)
        """, (
            channel['id'],
            channel['edition_id'],
            channel['name'],
            channel['type'],
            channel.get('color'),
            int(channel.get('active', True)),
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
        conn.execute(
            "UPDATE channels SET active = 0 WHERE id = ?",
            (channel_id,)
        )
