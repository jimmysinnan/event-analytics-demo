"""
Baccha Analytics — FastAPI backend
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
import pandas as pd
import io
import json
import numpy as np
import os
import uuid
from datetime import datetime
from services.kpi_engine import kpi_conso, kpi_billetterie, ca_horaire, profil_client
from services.pdf_generator import generate_global, generate_pdv, generate_profil
from services.import_parser import parse_import, detect_source, SOURCE_LABELS
from services.file_reader import read_file, SUPPORTED_EXTENSIONS
from database import (
    init_db, save_import, get_imports, rollback_import,
    get_state, dedup_import, get_db,
    save_live_snapshot, get_live_snapshots, rollback_live_snapshot,
    save_channel, get_channels, delete_channel
)

app = FastAPI(title="Event Analytics Demo API", version="2.0.0")

@app.on_event("startup")
def startup():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:4173",
        "http://localhost:5174", "http://localhost:4174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    return {"status": "ok", "service": "Baccha Analytics API v1.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/import/formats")
def list_formats():
    """Retourne les formats de fichiers supportés pour l'import."""
    return {"formats": SUPPORTED_EXTENSIONS}


@app.post("/api/upload/conso")
async def upload_conso(file: UploadFile = File(...)):
    """
    Upload du fichier de consommation (BDD Weezpay).
    Accepte tous les formats supportés (xlsx, xls, csv, parquet…)
    Cherche l'onglet BDD ou JDD Vente si Excel multi-onglets.
    """
    contents = await file.read()
    try:
        df = read_file(contents, file.filename or 'conso')
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    # Si Excel multi-onglets, chercher l'onglet BDD ou JDD Vente
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
    result = {
        'kpi':        kpi_conso(df),
        'ca_horaire': ca_horaire(df),
        'profil':     profil_client(df),
        'meta': {
            'rows':   int(len(df)),
            'sheet':  sheet,
            'file':   file.filename,
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
    Retourne les données statiques déjà extraites des fichiers Excel
    pour alimenter le frontend sans upload (données 2023-2025 pré-chargées).
    """
    return jsonify({
        'editions': [
            { 'year': 2023, 'ca_conso': 888537, 'festivaliers': None,  'ca_billet': None,    'clients': 11735, 'transactions': 71547, 'panier': 75.7 },
            { 'year': 2024, 'ca_conso': 742968, 'festivaliers': 20346, 'ca_billet': 1019418, 'clients': 9177,  'transactions': 55096, 'panier': 80.9 },
            { 'year': 2025, 'ca_conso': 496585, 'festivaliers': 16810, 'ca_billet': 929695,  'clients': 7251,  'transactions': 32523, 'panier': 68.5 },
        ],
        'familles_2025': [
            { 'name': 'Champagne', 'ca': 178857 },
            { 'name': 'Bières',    'ca': 59005  },
            { 'name': 'Soft',      'ca': 44386  },
            { 'name': 'Cocktail',  'ca': 33924  },
            { 'name': 'Food',      'ca': 27581  },
            { 'name': 'Vodka',     'ca': 18775  },
            { 'name': 'Hard',      'ca': 17678  },
        ],
        'pass_culture': [
            { 'year': 2023, 'ventes': 1259, 'ca': 188850 },
            { 'year': 2024, 'ventes': 1775, 'ca': 225320 },
            { 'year': 2025, 'ventes': 516,  'ca': 61920  },
        ],
        'invitations_2025': {
            'total_billets':  1570,
            'valeur':         266590,
            'entrees_reelles':5240,
            'pct_frequentation': 31.2,
        },
        'affluence': {
            '2024': { 'samedi': 9762, 'dimanche': 10584, 'total': 20346 },
            '2025': { 'samedi': 8289, 'dimanche': 8521,  'total': 16810 },
        }
    })


# ── PDF endpoints ──────────────────────────────────────────────────────────────
PDF_TYPES = {
    'global':  ('Présentation Global des chiffres du festival 2025.pdf', generate_global),
    'pdv':     ('Présentation de la Performances des points de ventes.pdf', generate_pdv),
    'profil':  ("Présentation profil client de l'édition 2025.pdf", generate_profil),
}

SOURCE_DIR = r'C:\Users\jimmy\OneDrive\Bureau\Baccha\2025'

@app.get("/api/pdf/existing/{pdf_type}")
def get_existing_pdf(pdf_type: str):
    """Sert le PDF existant depuis le dossier 2025."""
    if pdf_type not in PDF_TYPES:
        raise HTTPException(404, "Type inconnu")
    filename, _ = PDF_TYPES[pdf_type]
    path = os.path.join(SOURCE_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404, f"Fichier non trouvé : {filename}")
    return FileResponse(path, media_type='application/pdf',
                        headers={'Content-Disposition': f'inline; filename="{filename}"'})

@app.get("/api/pdf/generate/{pdf_type}")
def generate_pdf(pdf_type: str, edition: int = 2025):
    """Génère un nouveau PDF avec les données de l'édition."""
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
    from services.report_generator import export_report_bytes

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


@app.get("/api/pdf/list")
def list_pdfs():
    """Retourne la liste des PDFs disponibles avec leur statut."""
    result = []
    for key, (filename, _) in PDF_TYPES.items():
        path = os.path.join(SOURCE_DIR, filename)
        result.append({
            'key': key,
            'filename': filename,
            'exists': os.path.exists(path),
            'size_kb': round(os.path.getsize(path) / 1024) if os.path.exists(path) else None,
        })
    return result
