"""
Event Analytics — FastAPI backend
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
import pandas as pd
import io
import json
import numpy as np
import os
import uuid
from datetime import datetime
from services.kpi_engine import kpi_conso, kpi_billetterie, ca_horaire, profil_client
from services.ai_reporter import generate_ai_report_stream
from services.pdf_generator import generate_global, generate_pdv, generate_profil
from services.import_parser import parse_import, detect_source, SOURCE_LABELS
from services.file_reader import read_file, SUPPORTED_EXTENSIONS
from database import (
    init_db, save_import, get_imports, rollback_import,
    get_state, dedup_import, get_db,
    save_live_snapshot, get_live_snapshots, rollback_live_snapshot,
    save_channel, get_channels, delete_channel,
    get_all_edition_analytics, upsert_edition_analytics,
    save_conso_state, get_conso_state,
)

app = FastAPI(title="Event Analytics API", version="2.0.0")

@app.on_event("startup")
def startup():
    init_db()

# CORS — origines autorisées + origines configurables via env
_cors_origins = [
    "http://localhost:5173", "http://localhost:4173",
    "http://localhost:5174", "http://localhost:4174",
]
_extra_origins = os.environ.get('CORS_ORIGINS', '')
if _extra_origins:
    _cors_origins += [o.strip() for o in _extra_origins.split(',') if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth — token statique optionnel ───────────────────────────────────────────
# Si API_SECRET_TOKEN est défini dans .env, toutes les requêtes doivent
# inclure l'en-tête X-API-Token avec la valeur correspondante.
# Laisser vide (défaut) pour désactiver en local.
_API_TOKEN = os.environ.get('API_SECRET_TOKEN', '').strip()

@app.middleware('http')
async def check_token(request: Request, call_next):
    if not _API_TOKEN:
        return await call_next(request)
    # Laisser passer CORS preflight, health, docs
    if request.method == 'OPTIONS' or request.url.path in ('/', '/health', '/docs', '/openapi.json', '/redoc'):
        return await call_next(request)
    token = request.headers.get('X-API-Token', '')
    if token != _API_TOKEN:
        return JSONResponse({'error': 'Unauthorized — X-API-Token requis'}, status_code=401)
    return await call_next(request)


# ── JSON encoder pour numpy ────────────────────────────────────────────────────
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)):   return int(obj)
        if isinstance(obj, (np.floating,)):  return float(obj)
        if isinstance(obj, np.ndarray):      return obj.tolist()
        return super().default(obj)


def jsonify(data):
    return json.loads(json.dumps(data, cls=NumpyEncoder))


# ── Helper lecture Excel ───────────────────────────────────────────────────────
async def read_excel(file: UploadFile, sheet_name=0) -> pd.DataFrame:
    contents = await file.read()
    try:
        return pd.read_excel(io.BytesIO(contents), sheet_name=sheet_name)
    except Exception as e:
        raise HTTPException(400, detail=f"Impossible de lire le fichier Excel : {str(e)}")


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    app_name = os.environ.get('APP_NAME', 'Event Analytics')
    return {"status": "ok", "service": f"{app_name} API v2.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/import/formats")
def list_formats():
    """Retourne les formats de fichiers supportés pour l'import."""
    return {"formats": SUPPORTED_EXTENSIONS}


@app.post("/api/upload/conso")
async def upload_conso(
    file: UploadFile = File(...),
    edition_id: str = "",
):
    """
    Upload du fichier de consommation (BDD Weezpay).
    Si edition_id est fourni, les KPIs calculés sont persistés en DB
    pour alimenter les rapports IA.
    """
    contents = await file.read()
    try:
        df = read_file(contents, file.filename or 'conso')
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    sheet = None
    fname = (file.filename or '').lower()
    if fname.endswith(('.xlsx', '.xlsm', '.xls')):
        try:
            engine = 'xlrd' if fname.endswith('.xls') else 'openpyxl'
            kw = {'ignore_workbook_corruption': True} if fname.endswith('.xls') else {}
            xl = pd.ExcelFile(io.BytesIO(contents), engine=engine, engine_kwargs=kw)
            sheet = ('BDD' if 'BDD' in xl.sheet_names
                     else 'JDD Vente' if 'JDD Vente' in xl.sheet_names
                     else None)
            if sheet:
                df = xl.parse(sheet)
        except Exception:
            pass

    kpi_result    = kpi_conso(df)
    horaire       = ca_horaire(df)
    profil        = profil_client(df)

    # Persistance en DB si edition_id fourni
    if edition_id:
        save_conso_state(edition_id, kpi_result, horaire, profil, file.filename or '')

    result = {
        'kpi':        kpi_result,
        'ca_horaire': horaire,
        'profil':     profil,
        '_saved':     bool(edition_id),
        'meta': {
            'rows':       int(len(df)),
            'sheet':      sheet,
            'file':       file.filename,
            'edition_id': edition_id or None,
        }
    }
    return JSONResponse(content=jsonify(result))


@app.post("/api/upload/billetterie")
async def upload_billetterie(file: UploadFile = File(...)):
    """
    Upload du TDB billetterie (TDB billetterie 2025.xlsx).
    Lit les onglets : participants, Billetterie total réalisé, Pass culture, CSE X partenaire détails, Invitation
    """
    contents = await file.read()
    xl = pd.ExcelFile(io.BytesIO(contents))
    sheets = xl.sheet_names

    df_part   = xl.parse('participants') if 'participants' in sheets else None
    df_real   = xl.parse('Billetterie total réalisé') if 'Billetterie total réalisé' in sheets else None
    df_pc     = xl.parse('Pass culture') if 'Pass culture' in sheets else None
    df_cse    = xl.parse('CSE X partenaire détails') if 'CSE X partenaire détails' in sheets else None
    df_inv    = xl.parse('Invitation') if 'Invitation' in sheets else None

    result = {
        'kpi_billetterie': kpi_billetterie(df_part, df_real),
        'pass_culture':    df_pc.fillna('').to_dict(orient='records') if df_pc is not None else [],
        'cse':             df_cse.fillna('').to_dict(orient='records') if df_cse is not None else [],
        'invitations':     df_inv.fillna('').to_dict(orient='records') if df_inv is not None else [],
        'meta': {
            'sheets_found': sheets,
            'file': file.filename,
        }
    }
    return JSONResponse(content=jsonify(result))


@app.get("/api/data/static")
def static_data():
    """
    Retourne les données historiques depuis la table edition_analytics.
    Remplace les données hardcodées — modifiable via POST /api/editions/analytics.
    """
    analytics = get_all_edition_analytics()

    # Rétrocompatibilité : format attendu par le frontend existant
    editions = [
        {
            'year':         a['year'],
            'ca_conso':     a.get('ca_conso'),
            'ca_billet':    a.get('ca_billet'),
            'ca_total':     a.get('ca_total'),
            'festivaliers': a.get('festivaliers'),
            'clients':      a.get('clients'),
            'transactions': a.get('transactions'),
            'panier':       a.get('panier_conso'),
        }
        for a in analytics
    ]

    # Familles produits de la dernière édition disponible
    familles = None
    for a in reversed(analytics):
        if a.get('familles'):
            familles = a['familles']
            break

    # Pass culture par année
    pass_culture = [
        {'year': a['year'], **a['pass_culture']}
        for a in analytics if a.get('pass_culture')
    ]

    # Invitations de la dernière édition avec données
    invitations = None
    for a in reversed(analytics):
        if a.get('invitations_total'):
            invitations = {
                'total_billets':     a['invitations_total'],
                'valeur':            a.get('invitations_valeur'),
                'entrees_reelles':   a.get('invitations_entrees'),
                'pct_frequentation': a.get('invitations_pct_freq'),
            }
            break

    # Affluence par année
    affluence = {
        str(a['year']): a['affluence']
        for a in analytics if a.get('affluence')
    }

    return JSONResponse(content={
        'editions':         editions,
        'familles_2025':    familles,
        'pass_culture':     pass_culture,
        'invitations_2025': invitations,
        'affluence':        affluence,
        '_source':          'database',
    })


@app.get("/api/editions/analytics")
def list_edition_analytics():
    """Retourne toutes les éditions avec leurs KPIs historiques."""
    return JSONResponse(content=get_all_edition_analytics())


@app.post("/api/editions/analytics")
async def save_edition_analytics(request: Request):
    """Crée ou met à jour les KPIs d'une édition. Body JSON : { year, ca_conso, ... }"""
    body = await request.json()
    year = body.get('year')
    if not year:
        raise HTTPException(400, "Le champ 'year' est obligatoire")
    eid = upsert_edition_analytics(int(year), body)
    return JSONResponse(content={'ok': True, 'id': eid})


# ── PDF endpoints ──────────────────────────────────────────────────────────────
PDF_TYPES = {
    'global':  ('Présentation Global des chiffres du festival 2025.pdf', generate_global),
    'pdv':     ('Présentation de la Performances des points de ventes.pdf', generate_pdv),
    'profil':  ("Présentation profil client de l'édition 2025.pdf", generate_profil),
}

# SOURCE_DIR est configurable via variable d'environnement.
# En l'absence de configuration, les PDF de référence ne sont pas disponibles.
SOURCE_DIR = os.environ.get('PDF_SOURCE_DIR', '')

@app.get("/api/pdf/existing/{pdf_type}")
def get_existing_pdf(pdf_type: str):
    """Sert un PDF de référence depuis PDF_SOURCE_DIR (configurable dans .env)."""
    if pdf_type not in PDF_TYPES:
        raise HTTPException(404, "Type inconnu")
    if not SOURCE_DIR:
        raise HTTPException(503, detail="PDF_SOURCE_DIR non configuré — fonctionnalité indisponible dans cette installation.")
    filename, _ = PDF_TYPES[pdf_type]
    path = os.path.join(SOURCE_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404, f"Fichier non trouvé : {filename}")
    return FileResponse(path, media_type='application/pdf',
                        headers={'Content-Disposition': f'inline; filename="{filename}"'})

@app.get("/api/pdf/generate/{pdf_type}")
def generate_pdf(pdf_type: str, edition: int = 2025):
    """Génère un PDF de présentation.
    Note : contenu basé sur les données de démonstration intégrées.
    La génération dynamique depuis les données client sera disponible en V2.
    """
    if pdf_type not in PDF_TYPES:
        raise HTTPException(404, "Type inconnu")
    filename, generator_fn = PDF_TYPES[pdf_type]
    try:
        pdf_bytes = generator_fn(edition=edition)
    except Exception as e:
        raise HTTPException(500, f"Erreur génération PDF : {str(e)}")
    name = filename.replace('2025', str(edition))
    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{name}"'}
    )

@app.post("/api/upload/weezevent")
async def upload_weezevent(file: UploadFile = File(...)):
    """
    Parse un export Weezevent (liste participants / commandes).
    Format : export standard Weezevent (.xlsx ou .csv)
    Colonnes attendues : Numéro de commande, Date commande, Tarif,
                         Prénom participant, Nom participant, Montant...
    """
    contents = await file.read()
    try:
        df = read_file(contents, file.filename or 'weezevent')
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    # ── Normalisation des colonnes ─────────────────────────────────────────────
    col_map = {}
    for col in df.columns:
        c = str(col).lower().strip()
        if 'commande' in c and ('numéro' in c or 'numero' in c or 'n.' in c):
            col_map['num_commande'] = col
        elif 'date' in c and 'commande' in c:
            col_map['date_commande'] = col
        elif 'tarif' in c and 'groupe' not in c:
            col_map['tarif'] = col
        elif 'prénom' in c or 'prenom' in c:
            col_map['prenom'] = col
        elif 'nom' in c and 'point' not in c and 'acheteur' not in c and 'vendeur' not in c:
            col_map['nom'] = col
        elif 'montant' in c or 'total' in c or 'prix' in c:
            if 'montant' not in col_map:
                col_map['montant'] = col
        elif 'canal' in c or 'origine' in c:
            col_map['canal'] = col

    # ── Calculs ────────────────────────────────────────────────────────────────
    result = {}

    # Commandes uniques
    if 'num_commande' in col_map:
        result['nb_commandes'] = int(df[col_map['num_commande']].nunique())
    else:
        result['nb_commandes'] = int(len(df))

    # Participants (lignes = billets)
    result['nb_participants'] = int(len(df))

    # CA total
    if 'montant' in col_map:
        ca = pd.to_numeric(df[col_map['montant']], errors='coerce').sum()
        result['ca_total'] = round(float(ca), 2) if not np.isnan(ca) else None
    else:
        result['ca_total'] = None

    # Tarifs
    result['nb_tarifs'] = 0
    result['top_tarifs'] = []
    if 'tarif' in col_map:
        tarif_counts = df[col_map['tarif']].value_counts().dropna()
        result['nb_tarifs'] = int(len(tarif_counts))
        total = int(tarif_counts.sum())
        result['top_tarifs'] = [
            {'tarif': str(k), 'nb': int(v), 'pct': round(v / total * 100, 1)}
            for k, v in tarif_counts.head(12).items()
            if str(k).strip()
        ]

    # Courbe de vente par mois
    result['ventes_par_mois'] = []
    if 'date_commande' in col_map:
        dates = pd.to_datetime(df[col_map['date_commande']], errors='coerce', dayfirst=True)
        df['_mois'] = dates.dt.to_period('M').astype(str)
        monthly = df[df['_mois'] != 'NaT'].groupby('_mois').size().reset_index(name='nb')
        monthly = monthly[monthly['_mois'].str.match(r'\d{4}-\d{2}')]
        result['ventes_par_mois'] = [
            {'mois': row['_mois'], 'nb': int(row['nb'])}
            for _, row in monthly.iterrows()
        ]

    # Canaux
    if 'canal' in col_map:
        canaux = df[col_map['canal']].value_counts().dropna()
        result['canaux'] = {str(k): int(v) for k, v in canaux.head(6).items()}

    result['meta'] = {
        'file':    file.filename,
        'rows':    int(len(df)),
        'columns': list(df.columns)[:15],
        'col_map': col_map,
    }

    return JSONResponse(content=jsonify(result))


@app.post("/api/upload/import")
async def upload_import(
    file: UploadFile = File(...),
    source: str = "auto",
    edition_id: str = "",
    save: bool = True,
):
    """
    Endpoint unifié — import billetterie multi-sources.
    - source      : auto | weezevent | bizouk | eventbrite | billetweb | …
    - edition_id  : si fourni, sauvegarde en DB + déduplication
    - save        : False pour un import en prévisualisation (sans sauvegarde)

    Retourne les KPIs normalisés + info déduplication si edition_id fourni.
    """
    contents = await file.read()

    try:
        df = read_file(contents, file.filename or 'upload')
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        raise HTTPException(400, detail=f"Impossible de lire le fichier : {str(e)}")

    if df.empty:
        raise HTTPException(422, detail="Le fichier est vide ou illisible.")

    try:
        result = parse_import(df, file.filename or 'upload', source)
    except Exception as e:
        raise HTTPException(500, detail=f"Erreur d'analyse : {str(e)}")

    # Sauvegarde en DB + déduplication si edition_id fourni
    if edition_id and save:
        try:
            dedup = dedup_import(edition_id, result)
            import_id = save_import(edition_id, result, dedup)
            result['_saved']     = True
            result['_import_id'] = import_id
            result['_dedup']     = dedup
            # Ajouter l'état agrégé courant (après dédup)
            result['_state']     = get_state(edition_id)
        except Exception as e:
            result['_saved'] = False
            result['_save_error'] = str(e)
    else:
        result['_saved'] = False

    return JSONResponse(content=jsonify(result))


@app.get("/api/import/sources")
def list_sources():
    """Retourne la liste des sources supportées."""
    return [{"id": k, "label": v} for k, v in SOURCE_LABELS.items()]


# ── Channels (canaux de distribution) ─────────────────────────────────────────

@app.get("/api/channels/{edition_id}")
def list_channels(edition_id: str):
    """Liste des canaux de distribution actifs pour une édition."""
    return jsonify(get_channels(edition_id))


@app.post("/api/channels")
async def create_channel(request: Request):
    """Crée ou met à jour un canal de distribution."""
    body = await request.json()
    if not body.get('id'):
        body['id'] = str(uuid.uuid4())
    if not body.get('created_at'):
        body['created_at'] = datetime.utcnow().isoformat()
    return jsonify(save_channel(body))


@app.put("/api/channels/{channel_id}")
async def update_channel(channel_id: str, request: Request):
    """Met à jour un canal existant."""
    body = await request.json()
    body['id'] = channel_id
    return jsonify(save_channel(body))


@app.delete("/api/channels/{channel_id}")
def remove_channel(channel_id: str):
    """Désactive (soft delete) un canal."""
    delete_channel(channel_id)
    return {"ok": True}


# ── Historique des imports ─────────────────────────────────────────────────────

@app.get("/api/imports/{edition_id}")
def list_imports(edition_id: str, channel_id: str = None):
    """Historique des imports pour une édition. channel_id optionnel pour filtrer."""
    imports = get_imports(edition_id)
    if channel_id:
        imports = [i for i in imports if i.get('channel_id') == channel_id]
    return jsonify(imports)


@app.get("/api/imports/{edition_id}/state")
def current_state(edition_id: str, channel_id: str = None):
    """État agrégé courant. Si channel_id fourni, recalcule sur les imports de ce canal."""
    if channel_id:
        # Recalculer l'état pour ce canal uniquement
        with get_db() as conn:
            rows = conn.execute("""
                SELECT raw_json FROM imports
                WHERE edition_id = ? AND (channel_id = ? OR channel_id IS NULL)
                AND status = 'active'
                ORDER BY imported_at ASC
            """, (edition_id, channel_id)).fetchall()
        from database import _empty_state, _merge_state
        state = _empty_state(edition_id)
        for row in rows:
            parsed = json.loads(row['raw_json'])
            state = _merge_state(state, parsed, 'incremental')
        return jsonify(state)
    return jsonify(get_state(edition_id))


@app.get("/api/import/{import_id}/detail")
def get_import_detail(import_id: str):
    """Retourne le résultat complet (raw_json) d'un import spécifique."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT raw_json, source_label, filename, imported_at FROM imports WHERE id = ?",
            (import_id,)
        ).fetchone()
    if not row:
        raise HTTPException(404, "Import introuvable")
    parsed = json.loads(row['raw_json'])
    return jsonify({
        **parsed,
        'source_label': row['source_label'],
        'filename':     row['filename'],
        'imported_at':  row['imported_at'],
    })


@app.delete("/api/imports/{import_id}/rollback")
def rollback(import_id: str, edition_id: str):
    """Annule un import et recalcule l'état courant."""
    rollback_import(import_id, edition_id)
    return {"ok": True, "state": jsonify(get_state(edition_id))}


# ── Snapshots live (Billetterie Suivi) ────────────────────────────────────────

@app.post("/api/live/{edition_id}/snapshot")
async def create_snapshot(edition_id: str, request: Request):
    """Sauvegarde un snapshot du dashboard Suivi Live."""
    body = await request.json()
    snap_id = save_live_snapshot(edition_id, body)
    return {"id": snap_id}


@app.get("/api/live/{edition_id}/snapshots")
def list_snapshots(edition_id: str):
    """Historique des snapshots live pour une édition."""
    return jsonify(get_live_snapshots(edition_id))


@app.delete("/api/live/{snap_id}/rollback")
def rollback_snapshot(snap_id: str):
    """Archive un snapshot (retour arrière)."""
    rollback_live_snapshot(snap_id)
    return {"ok": True}


# ── Rapport billetterie ────────────────────────────────────────────────────────

@app.get("/api/report/{edition_id}")
def download_report(edition_id: str, edition_name: str = "Édition"):
    """Génère et télécharge un rapport texte pour une édition."""
    state = get_state(edition_id)

    # Récupérer les kpis_avances depuis le dernier import actif
    kpis = None
    with get_db() as conn:
        row = conn.execute("""
            SELECT raw_json FROM imports
            WHERE edition_id = ? AND status = 'active'
            ORDER BY imported_at DESC LIMIT 1
        """, (edition_id,)).fetchone()
    if row:
        raw = json.loads(row['raw_json'])
        kpis = raw.get('kpis_avances')

    report_bytes = export_report_bytes(kpis or {}, edition_name, state)
    safe_name = edition_name.replace(' ', '_').replace('/', '-')

    return Response(
        content=report_bytes,
        media_type='text/plain; charset=utf-8',
        headers={'Content-Disposition': f'attachment; filename="rapport_{safe_name}.txt"'}
    )


# ── Rapports IA — Claude Sonnet 4.6 ───────────────────────────────────────────

def _get_kpis_for_edition(edition_id: str) -> tuple:
    """
    Retourne (kpis, state) pour une édition.
    Agrège : billetterie (imports) + consommation/profil (conso_state) + historique (edition_analytics).
    """
    state = get_state(edition_id)
    kpis  = {}

    # ── Billetterie : KPIs avancés du dernier import actif ────────────────────
    with get_db() as conn:
        row = conn.execute("""
            SELECT raw_json FROM imports
            WHERE edition_id = ? AND status = 'active'
            ORDER BY imported_at DESC LIMIT 1
        """, (edition_id,)).fetchone()
    if row:
        kpis = json.loads(row['raw_json']).get('kpis_avances') or {}

    # ── Historique multi-éditions ─────────────────────────────────────────────
    hist = get_all_edition_analytics()
    kpis['historique_editions'] = hist

    # ── Consommation + Profil client ──────────────────────────────────────────
    # Source 1 : conso_state (upload fichier conso avec edition_id)
    conso = get_conso_state(edition_id)

    # Source 2 : profil depuis edition_analytics (peut venir du formulaire ou d'une autre source)
    # On cherche d'abord dans edition_analytics de l'année courante si disponible
    profil_from_analytics = None
    if hist:
        # Essayer de trouver l'édition correspondant à l'edition_id actif
        # On prend la plus récente si pas de correspondance directe
        for h in reversed(hist):
            if h.get('profil'):
                profil_from_analytics = h['profil']
                break

    # Fusion : conso_state a la priorité sur edition_analytics pour les données fraîches
    profil_merged = {}
    if profil_from_analytics:
        profil_merged.update(profil_from_analytics)
    if conso and conso.get('profil'):
        # Les données Weezpay (genre, age depuis colonnes) enrichissent si présentes
        profil_merged.update({k: v for k, v in conso['profil'].items() if v})

    kpis['module_conso'] = {
        'disponible':          bool(conso),
        'kpi':                 conso.get('kpi', {})       if conso else {},
        'ca_horaire':          conso.get('ca_horaire', []) if conso else [],
        'profil':              profil_merged,
        'profil_disponible':   bool(profil_merged),
        'fichier':             conso.get('filename', '')  if conso else '',
        'mis_a_jour':          conso.get('updated_at', '') if conso else '',
    }

    return kpis, state


@app.post("/api/ai/report/{edition_id}")
async def ai_report(edition_id: str):
    """Endpoint legacy — utiliser /stream à la place."""
    return JSONResponse(content={"error": "Utiliser /api/ai/report/{edition_id}/stream"})


@app.post("/api/ai/report/{edition_id}/stream")
async def ai_report_stream(
    edition_id: str,
    request: Request,
    report_type: str = "executive",
    edition_name: str = "Édition",
):
    """
    Version streaming — renvoie le texte chunk par chunk (Server-Sent Events).
    Produit un effet "typing" dans le frontend.
    """
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    api_key    = body.get('api_key', '')
    image_b64  = body.get('image_b64') or None
    image_mime = body.get('image_mime') or None
    kpis, state = _get_kpis_for_edition(edition_id)

    return StreamingResponse(
        generate_ai_report_stream(report_type, kpis, state, edition_name, api_key, image_b64, image_mime),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )


@app.get("/api/pdf/list")
def list_pdfs():
    """Retourne la liste des PDFs disponibles avec leur statut."""
    result = []
    for key, (filename, _) in PDF_TYPES.items():
        if SOURCE_DIR:
            path = os.path.join(SOURCE_DIR, filename)
            exists   = os.path.exists(path)
            size_kb  = round(os.path.getsize(path) / 1024) if exists else None
        else:
            exists  = False
            size_kb = None
        result.append({'key': key, 'filename': filename, 'exists': exists, 'size_kb': size_kb})
    return result
