"""
import_parser.py — Parsers normalisés pour 10 plateformes de billetterie

Plateformes supportées :
  weezevent  — export standard liste participants
  bizouk     — export commandes Bizouk
  eventbrite — Attendee Summary / Order Report
  billetweb  — export commandes CSV/Excel
  helloasso  — export participants CSV
  yurplan    — export CSV commandes
  shotgun    — export orders CSV
  stripe     — payments export CSV
  sumup      — transaction history CSV
  generic    — CSV ou Excel générique (mapping automatique)

Sortie normalisée pour chaque parser :
{
  nb_commandes: int,
  nb_participants: int,
  ca_total: float | None,
  nb_tarifs: int,
  top_tarifs: [{ tarif, nb, pct }],
  ventes_par_mois: [{ mois, nb }],
  canaux: { canal: nb },
  order_ids: [str],           ← IDs uniques de commandes (pour déduplication exacte)
  source_detected: str,
  meta: { file, rows, columns }
}
"""

import pandas as pd
import numpy as np
from typing import Optional
from datetime import datetime, timezone

from services.billetterie_analyzer import analyze_billetterie


# ── Helpers ────────────────────────────────────────────────────────────────────

def _safe_sum(series) -> Optional[float]:
    v = pd.to_numeric(series, errors='coerce').sum()
    return round(float(v), 2) if not np.isnan(v) else None


def _monthly_trend(series_dates, df) -> list:
    # Plafond : on n'accepte aucune date future (mois > mois courant)
    # Évite les artefacts de parsing date quand le format jour/mois est ambigu
    now_ym = datetime.now(timezone.utc).strftime('%Y-%m')

    dates = pd.to_datetime(series_dates, errors='coerce', dayfirst=True)
    tmp = df.copy()
    tmp['_m'] = dates.dt.to_period('M').astype(str)
    monthly = (
        tmp[
            tmp['_m'].str.match(r'\d{4}-\d{2}', na=False) &
            (tmp['_m'] <= now_ym)   # exclure les mois futurs
        ]
        .groupby('_m').size()
        .reset_index(name='nb')
    )
    return [{'mois': r['_m'], 'nb': int(r['nb'])} for _, r in monthly.iterrows()]


def _top_tarifs(series) -> tuple[int, list]:
    counts = series.value_counts().dropna()
    nb_tarifs = int(len(counts))
    total = int(counts.sum())
    top = [
        {'tarif': str(k), 'nb': int(v), 'pct': round(v / total * 100, 1)}
        for k, v in counts.head(12).items() if str(k).strip()
    ]
    return nb_tarifs, top


def _extract_ids(series) -> list:
    """Extrait et normalise les IDs uniques d'une colonne (str, dédupliqués)."""
    if series is None:
        return []
    return [str(v).strip() for v in series.dropna().unique() if str(v).strip()]


def _normalize(source: str, nb_cmd: int, nb_part: int, ca: Optional[float],
               nb_tarifs: int, top_tarifs: list, monthly: list,
               canaux: dict, file: str, rows: int, cols: list,
               order_ids: list = None,
               participants_by_tarif: dict = None) -> dict:
    return {
        'nb_commandes':          nb_cmd,
        'nb_participants':        nb_part,
        'ca_total':               ca,
        'nb_tarifs':              nb_tarifs,
        'top_tarifs':             top_tarifs,
        'ventes_par_mois':        monthly,
        'canaux':                 canaux,
        'order_ids':              order_ids or [],
        'participants_by_tarif':  participants_by_tarif or {},
        'source_detected':        source,
        'meta': {'file': file, 'rows': rows, 'columns': cols[:15]},
    }


# ── Détection automatique de la source ────────────────────────────────────────

def detect_source(df: pd.DataFrame) -> str:
    """
    Identifie la plateforme d'export à partir des noms de colonnes.
    Retourne l'identifiant de source ou 'generic'.
    """
    cols = ' '.join(str(c).lower() for c in df.columns)

    # Weezevent
    if any(k in cols for k in ['numéro de commande', 'numero de commande', 'code participant']):
        if 'tarif' in cols and ('prénom participant' in cols or 'prenom participant' in cols):
            return 'weezevent'

    # Bizouk — colonnes réelles export XLS
    if 'bizouk' in cols:
        return 'bizouk'
    # Format export Bizouk réel (vérifié sur fichier client 2026)
    if any(k in cols for k in [
        'description de la ligne de commande',
        'commande no',
        'montant total de la commande',
        'montant de commission',
        'nom du billet', 'code de confirmation',
    ]):
        return 'bizouk'
    # Bizouk ancien format : colonne "ticket" seule + "quantité" + "montant total"
    col_list = [str(c).lower().strip() for c in df.columns]
    if ('ticket' in col_list and 'quantité' in col_list
            and any(k in col_list for k in ['montant total', 'id commande'])):
        return 'bizouk'

    # Billetweb
    if any(k in cols for k in ['ref. commande', 'référence commande', 'prix unitaire ht']):
        return 'billetweb'

    # Eventbrite
    if any(k in cols for k in ['order id', 'attendee #', 'ticket type', 'order type']):
        return 'eventbrite'

    # HelloAsso
    if any(k in cols for k in ['helloasso', 'formule', 'payer email', 'date de paiement']):
        return 'helloasso'

    # Yurplan
    if any(k in cols for k in ['yurplan', 'catégorie de billet', 'numéro de réservation']):
        return 'yurplan'

    # Shotgun
    if any(k in cols for k in ['created at', 'ticket type', 'check-in status']):
        if 'order id' in cols or 'order_id' in cols:
            return 'shotgun'

    # Stripe
    if any(k in cols for k in ['payment_intent', 'customer_email', 'amount_captured']):
        return 'stripe'
    if all(k in cols for k in ['id', 'amount', 'currency', 'status', 'created']):
        return 'stripe'

    # SumUp
    if any(k in cols for k in ['receipt no.', 'transaction id', 'payment method']):
        return 'sumup'

    # Billetweb
    if any(k in cols for k in ['ref. commande', 'nom du billet', 'prix unitaire ht']):
        return 'billetweb'

    return 'generic'


# ── Parsers par plateforme ─────────────────────────────────────────────────────

def parse_weezevent(df: pd.DataFrame, filename: str) -> dict:
    """
    Export Weezevent — liste participants
    Colonnes clés : Numéro de commande / Date commande / Tarif / Prénom participant /
                    Nom participant / Montant TTC / Canal de vente
    """
    col = {c: c for c in df.columns}  # identity map, will override below
    col_low = {str(c).lower().strip(): c for c in df.columns}

    def find(*keys):
        for k in keys:
            for ck, orig in col_low.items():
                if k in ck:
                    return orig
        return None

    c_cmd          = find('numéro de commande', 'numero de commande', 'n° commande')
    c_date         = find('date commande', 'date de commande')
    c_tarif        = find('tarif') if 'groupe' not in str(find('tarif') or '').lower() else None
    # "Groupe de tarif" = regroupement métier (ex : "SAMEDI 8 AOÛT — BACCHA WORLD TRIP")
    c_groupe_tarif = find('groupe de tarif', 'groupe tarif')
    c_price        = find('montant ttc', 'montant', 'total')
    c_canal        = find('canal', 'origine')

    nb_cmd = int(df[c_cmd].nunique()) if c_cmd else int(len(df))

    # Participants = nombre de billets (1 ligne = 1 billet dans Weezevent)
    # Note : "Prénom acheteur" / "Nom acheteur" = l'ACHETEUR pas le porteur.
    # Cindy qui achète Samedi + Dimanche = 2 lignes = 2 billets = 2 participants.
    nb_part = int(len(df))

    ca = _safe_sum(df[c_price]) if c_price else None

    # Breakdown par groupe de tarif (ex: SAMEDI 8 AOÛT / DIMANCHE 9 AOÛT)
    # Priorité : "Groupe de tarif" > "Tarif" (plus précis pour l'affichage par jour)
    participants_by_tarif = {}
    _grp_col = c_groupe_tarif or c_tarif
    if _grp_col:
        participants_by_tarif = {
            str(k): int(v)
            for k, v in df.groupby(_grp_col).size().items()
            if str(k).strip()
        }

    nb_tarifs, top = _top_tarifs(df[c_tarif]) if c_tarif else (0, [])
    monthly  = _monthly_trend(df[c_date], df) if c_date else []
    canaux   = {str(k): int(v) for k, v in df[c_canal].value_counts().head(6).items()} if c_canal else {}
    ids      = _extract_ids(df[c_cmd]) if c_cmd else []

    # col_map for analyzer (column names in this specific DataFrame)
    _col_map = {
        'tarif': c_tarif,
        'qty':   None,
        'cmd':   c_cmd,
        'prix':  c_price,
        'date':  c_date,
    }
    result = _normalize('weezevent', nb_cmd, nb_part, ca, nb_tarifs, top,
                        monthly, canaux, filename, len(df), list(df.columns), ids,
                        participants_by_tarif=participants_by_tarif)
    result['_col_map'] = _col_map
    result['_df_ref']  = df
    return result


def parse_bizouk(df: pd.DataFrame, filename: str) -> dict:
    """
    Export Bizouk — format réel XLS vérifié (export client 2026)

    Colonnes réelles :
      Date de la commande | Commande No | Nom de l'acheteur |
      Statut de la commande | Montant total de la commande |
      Montant payé de la commande | Montant restant dû |
      Description de la ligne de commande | Quantité |
      Prix unitaire | Montant de commission | Montant total de la ligne de commande

    Structure : une ligne par ligne de commande (plusieurs lignes possibles par commande)
    """
    # Normalisation : strip + lower pour la recherche, mais conserver le nom original
    col_norm = {str(c).lower().strip(): c for c in df.columns}

    def find(*keys):
        """Cherche la première colonne dont le nom normalisé contient l'une des clés."""
        for k in keys:
            for ck, orig in col_norm.items():
                if k in ck:
                    return orig
        return None

    # Mapping des colonnes réelles Bizouk
    c_cmd        = find('commande no', 'id commande', 'n° commande', 'référence', 'reference')
    c_date       = find('date de la commande', 'date commande', 'date de commande', 'date')
    c_tarif      = find('description de la ligne', 'description', 'ticket', 'type de billet', 'nom du billet', 'formule')
    # Montant total de la ligne = montant brut par ligne (correct en multi-produits)
    c_price      = find('montant total de la ligne', 'montant total de la commande',
                        'montant pay', 'total', 'montant', 'prix unitaire')
    # Commission Bizouk — pour calculer le CA net reversé à l'organisateur
    c_commission = find('montant de commission', 'commission')
    c_qty        = find('quantit', 'qty', 'nombre')
    c_statut     = find('statut de la commande', 'statut', 'status')

    # ── Deux filtres statut séparés ───────────────────────────────────────────
    # Participants : liste noire (tout sauf annulé/remboursé) → correspond au
    #               dashboard Bizouk qui inclut "En attente", "En cours", etc.
    # CA          : liste blanche (seulement validé/payé) → correspond à la
    #               "Recette" Bizouk qui ne compte que les ventes encaissées

    if c_statut is not None:
        st = df[c_statut].astype(str).str.lower()
        # Liste noire pour participants
        invalides   = st.str.contains(r'annul|cancel|remboursé|remboursee|refund', regex=True, na=False)
        df_comptage = df[~invalides].copy()
        # Liste blanche pour CA (seulement les ordres réellement payés)
        valides_ca  = st.str.contains(r'valid|paid|confirm|success|complet|versé', regex=True, na=False)
        df_ca       = df[valides_ca].copy()
    else:
        df_comptage = df.copy()
        df_ca       = df.copy()

    # Commandes et participants (filtre inclusif)
    nb_cmd = int(df_comptage[c_cmd].nunique()) if c_cmd else int(len(df_comptage))
    if c_qty is not None:
        qty_num = pd.to_numeric(df_comptage[c_qty], errors='coerce').fillna(1)
        nb_part = int(qty_num.sum())
    else:
        nb_part = int(len(df_comptage))

    # CA brut = somme des montants de LIGNE pour les ordres payés
    ca_brut = _safe_sum(df_ca[c_price]) if c_price else None

    # Commission Bizouk — ATTENTION : c'est un montant par COMMANDE dupliqué
    # sur chaque ligne de la commande. On déduplique par commande avant de sommer.
    ca_commission = None
    if c_commission and c_cmd:
        df_ca_dedup  = df_ca.drop_duplicates(subset=[c_cmd])
        ca_commission = _safe_sum(df_ca_dedup[c_commission])
    elif c_commission:
        ca_commission = _safe_sum(df_ca[c_commission])

    # CA net = Brut - Commission (= recette reversée à l'organisateur)
    if ca_brut is not None and ca_commission is not None:
        ca = round(ca_brut - ca_commission, 2)
    else:
        ca = ca_brut

    # Tarifs / formules
    nb_tarifs, top = _top_tarifs(df_comptage[c_tarif]) if c_tarif else (0, [])
    monthly = _monthly_trend(df_comptage[c_date], df_comptage) if c_date else []
    ids     = _extract_ids(df_comptage[c_cmd]) if c_cmd else []

    # Breakdown participants par groupe de tarif — SUM des quantités par tarif
    # (1 ticket = 1 participant, indépendamment de l'acheteur)
    participants_by_tarif = {}
    if c_tarif and c_qty:
        participants_by_tarif = {
            str(k): int(pd.to_numeric(v, errors='coerce').fillna(1).sum())
            for k, v in df_comptage.groupby(c_tarif)[c_qty]
            if str(k).strip()
        }
    elif c_tarif:
        participants_by_tarif = {
            str(k): int(v)
            for k, v in df_comptage.groupby(c_tarif).size().items()
            if str(k).strip()
        }

    # col_map for analyzer
    _col_map = {
        'tarif': c_tarif,
        'qty':   c_qty,
        'cmd':   c_cmd,
        'prix':  c_price,
        'date':  c_date,
    }
    result = _normalize('bizouk', nb_cmd, nb_part, ca, nb_tarifs, top,
                        monthly, {}, filename, len(df_comptage), list(df.columns), ids,
                        participants_by_tarif=participants_by_tarif)
    result['_col_map']      = _col_map
    result['_df_ref']       = df_comptage
    result['ca_brut']       = ca_brut
    result['ca_commission'] = ca_commission
    return result


def parse_eventbrite(df: pd.DataFrame, filename: str) -> dict:
    """
    Export Eventbrite — Attendee Summary ou Order Report
    Colonnes clés : Order ID / Order Date / Ticket Type / Quantity /
                    Order Total / Buyer First Name / Buyer Last Name / Buyer Email
    Formats : anglais (standard) et français
    """
    col_low = {str(c).lower().strip().replace('_', ' '): c for c in df.columns}

    def find(*keys):
        for k in keys:
            for ck, orig in col_low.items():
                if k in ck:
                    return orig
        return None

    c_cmd   = find('order id', 'order #', 'numéro de commande')
    c_date  = find('order date', 'date de commande', 'created at', 'date achat')
    c_tarif = find('ticket type', 'type de billet', 'ticket name', 'category')
    c_price = find('order total', 'total', 'montant')
    c_qty   = find('quantity', 'quantité', 'attendee count')

    nb_cmd  = int(df[c_cmd].nunique()) if c_cmd else int(len(df))
    nb_part = int(df[c_qty].sum()) if c_qty else int(len(df))
    ca      = _safe_sum(df[c_price]) if c_price else None

    nb_tarifs, top = _top_tarifs(df[c_tarif]) if c_tarif else (0, [])
    monthly = _monthly_trend(df[c_date], df) if c_date else []
    ids     = _extract_ids(df[c_cmd]) if c_cmd else []

    return _normalize('eventbrite', nb_cmd, nb_part, ca, nb_tarifs, top,
                      monthly, {}, filename, len(df), list(df.columns), ids)


def parse_billetweb(df: pd.DataFrame, filename: str) -> dict:
    """
    Export Billetweb
    Colonnes clés : Ref. commande / Date / Prénom / Nom / Email /
                    Nom du billet / Prix unitaire HT / Prix unitaire TTC /
                    Quantité / Total TTC / Mode de paiement
    """
    col_low = {str(c).lower().strip(): c for c in df.columns}

    def find(*keys):
        for k in keys:
            for ck, orig in col_low.items():
                if k in ck:
                    return orig
        return None

    c_cmd   = find('ref. commande', 'référence commande', 'ref commande', 'n° commande')
    c_date  = find('date', 'date commande', 'date de commande')
    c_tarif = find('nom du billet', 'type de billet', 'billet')
    c_price = find('total ttc', 'total', 'montant ttc', 'prix ttc')
    c_qty   = find('quantité', 'quantite', 'qté')
    c_canal = find('mode de paiement', 'canal', 'origine')

    nb_cmd  = int(df[c_cmd].nunique()) if c_cmd else int(len(df))
    nb_part = int(df[c_qty].sum()) if c_qty else int(len(df))
    ca      = _safe_sum(df[c_price]) if c_price else None

    nb_tarifs, top = _top_tarifs(df[c_tarif]) if c_tarif else (0, [])
    monthly = _monthly_trend(df[c_date], df) if c_date else []
    canaux  = {str(k): int(v) for k, v in df[c_canal].value_counts().head(6).items()} if c_canal else {}

    ids = _extract_ids(df[c_cmd]) if c_cmd else []
    return _normalize('billetweb', nb_cmd, nb_part, ca, nb_tarifs, top,
                      monthly, canaux, filename, len(df), list(df.columns), ids)


def parse_helloasso(df: pd.DataFrame, filename: str) -> dict:
    """
    Export HelloAsso
    Colonnes clés : Numéro / Date de paiement / Prénom / Nom /
                    Email payeur / Formule / Montant / Statut
    """
    col_low = {str(c).lower().strip(): c for c in df.columns}

    def find(*keys):
        for k in keys:
            for ck, orig in col_low.items():
                if k in ck:
                    return orig
        return None

    c_cmd   = find('numéro', 'numero', 'id', 'référence')
    c_date  = find('date de paiement', 'date', 'created')
    c_tarif = find('formule', 'type', 'billet', 'offre', 'produit')
    c_price = find('montant', 'total', 'prix')
    c_canal = find('canal', 'moyen de paiement', 'paiement')

    nb_cmd  = int(df[c_cmd].nunique()) if c_cmd else int(len(df))
    nb_part = int(len(df))
    ca      = _safe_sum(df[c_price]) if c_price else None

    nb_tarifs, top = _top_tarifs(df[c_tarif]) if c_tarif else (0, [])
    monthly = _monthly_trend(df[c_date], df) if c_date else []
    canaux  = {str(k): int(v) for k, v in df[c_canal].value_counts().head(6).items()} if c_canal else {}

    ids = _extract_ids(df[c_cmd]) if c_cmd else []
    return _normalize('helloasso', nb_cmd, nb_part, ca, nb_tarifs, top,
                      monthly, canaux, filename, len(df), list(df.columns), ids)


def parse_yurplan(df: pd.DataFrame, filename: str) -> dict:
    """
    Export Yurplan
    Colonnes clés : Numéro de réservation / Date / Prénom / Nom /
                    Catégorie de billet / Prix / Statut
    """
    col_low = {str(c).lower().strip(): c for c in df.columns}

    def find(*keys):
        for k in keys:
            for ck, orig in col_low.items():
                if k in ck:
                    return orig
        return None

    c_cmd   = find('numéro de réservation', 'reservation', 'booking id', 'ref')
    c_date  = find('date', 'created', 'achat')
    c_tarif = find('catégorie de billet', 'catégorie', 'category', 'type billet')
    c_price = find('prix', 'montant', 'total', 'amount')

    nb_cmd  = int(df[c_cmd].nunique()) if c_cmd else int(len(df))
    nb_part = int(len(df))
    ca      = _safe_sum(df[c_price]) if c_price else None

    nb_tarifs, top = _top_tarifs(df[c_tarif]) if c_tarif else (0, [])
    monthly = _monthly_trend(df[c_date], df) if c_date else []

    ids = _extract_ids(df[c_cmd]) if c_cmd else []
    return _normalize('yurplan', nb_cmd, nb_part, ca, nb_tarifs, top,
                      monthly, {}, filename, len(df), list(df.columns), ids)


def parse_shotgun(df: pd.DataFrame, filename: str) -> dict:
    """
    Export Shotgun
    Colonnes clés : Order ID / Created At / Name / Email /
                    Ticket Type / Amount / Currency / Status / Check-in Status
    """
    col_low = {str(c).lower().strip().replace('_', ' '): c for c in df.columns}

    def find(*keys):
        for k in keys:
            for ck, orig in col_low.items():
                if k in ck:
                    return orig
        return None

    c_cmd   = find('order id', 'order #')
    c_date  = find('created at', 'date', 'order date')
    c_tarif = find('ticket type', 'type', 'category')
    c_price = find('amount', 'total', 'price', 'prix')
    c_canal = find('source', 'channel', 'canal')

    nb_cmd  = int(df[c_cmd].nunique()) if c_cmd else int(len(df))
    nb_part = int(len(df))
    ca      = _safe_sum(df[c_price]) if c_price else None

    nb_tarifs, top = _top_tarifs(df[c_tarif]) if c_tarif else (0, [])
    monthly = _monthly_trend(df[c_date], df) if c_date else []
    canaux  = {str(k): int(v) for k, v in df[c_canal].value_counts().head(6).items()} if c_canal else {}

    ids = _extract_ids(df[c_cmd]) if c_cmd else []
    return _normalize('shotgun', nb_cmd, nb_part, ca, nb_tarifs, top,
                      monthly, canaux, filename, len(df), list(df.columns), ids)


def parse_stripe(df: pd.DataFrame, filename: str) -> dict:
    """
    Export Stripe — Payments / Payment Intents
    Colonnes clés : id / Amount / Amount Captured / Currency / Created (UTC) /
                    Customer Email / Description / Status
    Montants en centimes → convertis en euros
    """
    col_low = {str(c).lower().strip().replace('_', ' '): c for c in df.columns}

    def find(*keys):
        for k in keys:
            for ck, orig in col_low.items():
                if k in ck:
                    return orig
        return None

    c_id     = find('id', 'payment id')
    c_date   = find('created (utc)', 'created', 'date')
    c_amount = find('amount captured', 'amount', 'montant')
    c_desc   = find('description', 'metadata[product]', 'statement descriptor')
    c_status = find('status')

    # Filtrer uniquement les paiements réussis
    if c_status is not None:
        df = df[df[c_status].astype(str).str.lower().isin(['succeeded', 'paid', 'complete', 'réussi'])]

    nb_cmd  = int(len(df))
    nb_part = int(len(df))

    # Stripe stocke les montants en centimes
    if c_amount:
        raw = pd.to_numeric(df[c_amount], errors='coerce')
        # Si valeurs > 1000 en moyenne : probablement en centimes
        ca = round(float(raw.sum() / 100), 2) if raw.mean() > 100 else round(float(raw.sum()), 2)
        if np.isnan(ca):
            ca = None
    else:
        ca = None

    nb_tarifs, top = _top_tarifs(df[c_desc]) if c_desc else (0, [])
    monthly = _monthly_trend(df[c_date], df) if c_date else []

    ids = _extract_ids(df[c_id]) if c_id else []
    return _normalize('stripe', nb_cmd, nb_part, ca, nb_tarifs, top,
                      monthly, {}, filename, len(df), list(df.columns), ids)


def parse_sumup(df: pd.DataFrame, filename: str) -> dict:
    """
    Export SumUp — Transaction History
    Colonnes clés : Date / Time / Type / Transaction ID / Receipt No. /
                    Payment Method / Note / Amount / Currency / Status
    """
    col_low = {str(c).lower().strip(): c for c in df.columns}

    def find(*keys):
        for k in keys:
            for ck, orig in col_low.items():
                if k in ck:
                    return orig
        return None

    c_id     = find('transaction id', 'receipt no.', 'id')
    c_date   = find('date', 'created')
    c_amount = find('amount', 'montant', 'total')
    c_note   = find('note', 'description', 'product')
    c_method = find('payment method', 'type', 'mode')
    c_status = find('status', 'statut')

    # Garder uniquement les transactions réussies
    if c_status is not None:
        df = df[df[c_status].astype(str).str.lower().isin(['successful', 'réussie', 'completed', 'paid'])]

    nb_cmd  = int(len(df))
    nb_part = int(len(df))
    ca      = _safe_sum(df[c_amount]) if c_amount else None

    nb_tarifs, top = _top_tarifs(df[c_note]) if c_note else (0, [])
    monthly = _monthly_trend(df[c_date], df) if c_date else []
    canaux  = {str(k): int(v) for k, v in df[c_method].value_counts().head(6).items()} if c_method else {}

    ids = _extract_ids(df[c_id]) if c_id else []
    return _normalize('sumup', nb_cmd, nb_part, ca, nb_tarifs, top,
                      monthly, canaux, filename, len(df), list(df.columns), ids)


def parse_generic(df: pd.DataFrame, filename: str) -> dict:
    """
    Parser générique — tente de mapper automatiquement les colonnes.
    Fonctionne sur tout CSV / Excel avec un peu de bonne volonté.
    """
    col_low = {str(c).lower().strip(): c for c in df.columns}

    def find(*keys):
        for k in keys:
            for ck, orig in col_low.items():
                if k in ck:
                    return orig
        return None

    c_cmd   = find('id', 'commande', 'order', 'ref', 'numéro', 'booking')
    c_date  = find('date', 'created', 'time')
    c_tarif = find('tarif', 'ticket', 'type', 'billet', 'formule', 'catégorie', 'produit')
    c_price = find('montant', 'total', 'amount', 'prix', 'price')
    c_qty   = find('quantité', 'qty', 'quantity', 'nombre')

    nb_cmd  = int(df[c_cmd].nunique()) if c_cmd else int(len(df))
    nb_part = int(df[c_qty].sum()) if c_qty else int(len(df))
    ca      = _safe_sum(df[c_price]) if c_price else None

    nb_tarifs, top = _top_tarifs(df[c_tarif]) if c_tarif else (0, [])
    monthly = _monthly_trend(df[c_date], df) if c_date else []

    ids = _extract_ids(df[c_cmd]) if c_cmd else []
    return _normalize('generic', nb_cmd, nb_part, ca, nb_tarifs, top,
                      monthly, {}, filename, len(df), list(df.columns), ids)


# ── Dispatch principal ─────────────────────────────────────────────────────────

PARSERS = {
    'weezevent':  parse_weezevent,
    'bizouk':     parse_bizouk,
    'eventbrite': parse_eventbrite,
    'billetweb':  parse_billetweb,
    'helloasso':  parse_helloasso,
    'yurplan':    parse_yurplan,
    'shotgun':    parse_shotgun,
    'stripe':     parse_stripe,
    'sumup':      parse_sumup,
    'shopify':    parse_generic,   # Shopify orders CSV — mêmes colonnes génériques
    'caisse':     parse_generic,   # Export caisse (Lightspeed, Clover, etc.) — format variable
    'generic':    parse_generic,
}

SOURCE_LABELS = {
    'weezevent':  'Weezevent',
    'bizouk':     'Bizouk',
    'eventbrite': 'Eventbrite',
    'billetweb':  'Billetweb',
    'helloasso':  'HelloAsso',
    'yurplan':    'Yurplan',
    'shotgun':    'Shotgun',
    'stripe':     'Stripe',
    'sumup':      'SumUp',
    'shopify':    'Shopify',
    'caisse':     'Système de caisse',
    'generic':    'CSV / Excel générique',
}


def parse_import(df: pd.DataFrame, filename: str, source: str = 'auto') -> dict:
    """
    Point d'entrée principal.
    source='auto' → détection automatique, sinon force la plateforme.
    """
    if source == 'auto' or source not in PARSERS:
        detected = detect_source(df)
    else:
        detected = source

    parser = PARSERS.get(detected, parse_generic)
    result = parser(df, filename)
    result['source_label'] = SOURCE_LABELS.get(detected, detected)

    # Run advanced KPI analyzer if col_map was exposed by the parser
    _col_map = result.pop('_col_map', None)
    _df_ref  = result.pop('_df_ref',  None)

    if _col_map is not None and _df_ref is not None:
        try:
            result['kpis_avances'] = analyze_billetterie(
                _df_ref, _col_map,
                vip_keywords=None,    # caller can pass via extra param in future
                invit_keywords=None,
                tarif_zone_map=None,
            )
        except Exception as e:
            result['kpis_avances'] = None
            result['_analyzer_error'] = str(e)
    else:
        result['kpis_avances'] = None

    return result
