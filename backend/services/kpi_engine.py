"""
Event Analytics — KPI Engine
Calcule tous les indicateurs à partir des DataFrames Weezpay.

Colonnes attendues dans l'export Weezpay (BDD ou JDD Vente) :
  Total HT              — CA hors taxes (ou Total H.T)
  Quantité              — quantité vendue
  Heure transaction     — heure de la transaction (entier 12-28)
  Point de vente        — nom du PDV
  Type de point de vente — catégorie : BAR, FOOD, MERCH, ...
  Famille d'articles    — famille produit
  Article               — nom article
  ID acheteur           — identifiant client
  ID Transaction        — identifiant transaction
"""
import pandas as pd
import numpy as np
from typing import Optional


def _num(series) -> pd.Series:
    return pd.to_numeric(series, errors='coerce')


# ── Familles à exclure (frais techniques) ─────────────────────────────────────
FRAIS_FAMILLES = {'Z_FRAIS BACCHA', 'Consigne', 'CONSIGNE', 'FRAIS DE RECHARGEMENT'}


def _find(df: pd.DataFrame, *exact: str, keywords=None, exclude_kw=None) -> Optional[str]:
    """
    Trouve une colonne :
    1. Par nom exact (insensible casse + strip des espaces)
    2. Par mots-clés (tous présents dans le nom, keywords optionnels exclus)
    """
    col_low = {c.strip().lower(): c for c in df.columns}
    for name in exact:
        if name.strip().lower() in col_low:
            return col_low[name.strip().lower()]
    if keywords:
        for orig_col in df.columns:
            cl = orig_col.lower()
            if all(k.lower() in cl for k in keywords):
                if exclude_kw is None or not any(e.lower() in cl for e in exclude_kw):
                    return orig_col
    return None


# ── Nettoyage BDD consommation ─────────────────────────────────────────────────
def clean_conso(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Familles — exclure frais techniques
    fam_col = _find(df, "Famille d'articles", keywords=['famille'])
    if fam_col:
        df = df[~df[fam_col].astype(str).isin(FRAIS_FAMILLES)]

    # CA HT : "Total HT" ou variantes avec espaces
    ca_col  = _find(df, 'Total HT', 'Total H.T', 'Total H.T ', keywords=['total'], exclude_kw=['ttc', 'tva', 'ht_'])
    df['_ca_ht'] = _num(df[ca_col]) if ca_col else pd.Series(0.0, index=df.index)

    # CA TTC
    ttc_col = _find(df, 'Total TTC', 'Total T.T.C', keywords=['total', 'ttc'])
    df['_ca_ttc'] = _num(df[ttc_col]) if ttc_col else pd.Series(0.0, index=df.index)

    # Quantité
    qty_col = _find(df, 'Quantité', 'Quantite', 'Qté', keywords=['quantit'])
    df['_qty'] = _num(df[qty_col]) if qty_col else pd.Series(1.0, index=df.index)

    return df


# ── KPI globaux consommation ───────────────────────────────────────────────────
def kpi_conso(df: pd.DataFrame) -> dict:
    df = clean_conso(df)

    ca_ht     = float(df['_ca_ht'].fillna(0).sum())
    n_clients = int(df['ID acheteur'].nunique())   if 'ID acheteur'   in df.columns else 0
    n_transac = int(df['ID Transaction'].nunique()) if 'ID Transaction' in df.columns else 0
    panier    = round(ca_ht / n_clients, 2)         if n_clients > 0 else 0.0

    # ── Familles produit : "Famille d'articles" → SUM CA HT ─────────────────
    fam_col = _find(df, "Famille d'articles", keywords=['famille'])
    top_familles = {}
    if fam_col:
        top_familles = (
            df.groupby(fam_col)['_ca_ht'].sum()
              .sort_values(ascending=False)
              .head(12)
              .round(2)
              .to_dict()
        )

    # ── CA par type de PDV : "Type de point de vente" → BAR, FOOD, MERCH ────
    type_pdv_col = _find(df, 'Type de point de vente', keywords=['type', 'point'])
    top_pdv_type = {}
    if type_pdv_col:
        top_pdv_type = (
            df.groupby(type_pdv_col)['_ca_ht'].sum()
              .sort_values(ascending=False)
              .head(10)
              .round(2)
              .to_dict()
        )

    # ── CA par nom de PDV : "Point de vente" exact ───────────────────────────
    # IMPORTANT : exclure "Type de point de vente" pour éviter la confusion
    pdv_col = _find(df, 'Point de vente', keywords=['point de vente'], exclude_kw=['type'])
    top_pdv_name = {}
    if pdv_col:
        top_pdv_name = (
            df.groupby(pdv_col)['_ca_ht'].sum()
              .sort_values(ascending=False)
              .head(12)
              .round(2)
              .to_dict()
        )

    # ── Top articles : "Article" → SUM Quantité (top 50 pour le filtre) ────────
    art_col = _find(df, 'Article', keywords=['article'])
    top_articles = {}
    if art_col:
        top_articles = (
            df.groupby(art_col)['_qty'].sum()
              .sort_values(ascending=False)
              .head(50)
              .round(0)
              .astype(int)
              .to_dict()
        )

    # ── Top articles BAR uniquement (top 50) ─────────────────────────────────
    top_articles_bar = {}
    if type_pdv_col and art_col:
        df_bar = df[df[type_pdv_col].astype(str).str.strip().str.upper() == 'BAR']
        if not df_bar.empty:
            top_articles_bar = (
                df_bar.groupby(art_col)['_qty'].sum()
                      .sort_values(ascending=False)
                      .head(50)
                      .round(0)
                      .astype(int)
                      .to_dict()
            )

    # ── CA horaire par PDV BAR individuel (pour le filtre dropdown) ──────────
    h_col_kpi    = _find(df, 'Heure transaction', keywords=['heure', 'transaction'])
    pdv_name_col = _find(df, 'Point de vente', keywords=['point de vente'], exclude_kw=['type'])
    ca_horaire_by_pdv = {}
    bar_pdv_names     = []

    if h_col_kpi and type_pdv_col and pdv_name_col:
        df_bar_h = df[df[type_pdv_col].astype(str).str.strip().str.upper() == 'BAR'].copy()
        df_bar_h['_hour_h'] = _num(df_bar_h[h_col_kpi])
        df_bar_h = df_bar_h[df_bar_h['_hour_h'].between(12, 28)]
        bar_pdv_names = sorted([str(n) for n in df_bar_h[pdv_name_col].dropna().unique()])

        for pdv in bar_pdv_names:
            df_p = df_bar_h[df_bar_h[pdv_name_col] == pdv]
            if df_p.empty:
                continue
            hourly = (
                df_p.groupby('_hour_h')['_ca_ht'].sum()
                    .round(2)
                    .reset_index()
                    .rename(columns={'_hour_h': 'heure', '_ca_ht': 'ca_ht'})
                    .sort_values('heure')
            )
            hourly['label'] = hourly['heure'].apply(
                lambda h: f"{int(h)}h" if h <= 24 else f"{int(h)-24}h"
            )
            ca_horaire_by_pdv[pdv] = hourly.to_dict(orient='records')

    # ── Top acheteurs avec nom + prénom ───────────────────────────────────────
    top_acheteurs_ca = []
    top_acheteurs_nb = []
    buyer_col  = _find(df, 'ID acheteur',    keywords=['id', 'acheteur'])
    nom_col    = _find(df, 'Nom',    'Nom acheteur',    keywords=['nom'],    exclude_kw=['numéro', 'point', 'nombre', 'transaction', 'article', 'famille', 'total', 'type'])
    prenom_col = _find(df, 'Prénom', 'Prenom', 'Prénom acheteur', keywords=['prénom', 'prenom'])

    if buyer_col:
        ca_series    = df.groupby(buyer_col)['_ca_ht'].sum()
        nb_series    = df.groupby(buyer_col).size()
        first_nom    = df.groupby(buyer_col)[nom_col].first()    if nom_col    else None
        first_prenom = df.groupby(buyer_col)[prenom_col].first() if prenom_col else None

        def _clean(val):
            s = str(val) if val is not None else ''
            return '' if s in ('nan', 'NaN', 'None', '') else s

        def _buyer_entry(bid):
            return {
                'id':     str(bid),
                'nom':    _clean(first_nom[bid])    if first_nom    is not None and bid in first_nom.index    else '',
                'prenom': _clean(first_prenom[bid]) if first_prenom is not None and bid in first_prenom.index else '',
            }

        top_acheteurs_ca = [
            {**_buyer_entry(bid), 'ca': round(float(ca), 2)}
            for bid, ca in ca_series.sort_values(ascending=False).head(10).items()
        ]
        top_acheteurs_nb = [
            {**_buyer_entry(bid), 'nb': int(nb)}
            for bid, nb in nb_series.sort_values(ascending=False).head(10).items()
        ]

    return {
        'ca_ht':              round(ca_ht, 2),
        'n_clients':          n_clients,
        'n_transac':          n_transac,
        'panier_moyen':       panier,
        'top_familles':       top_familles,
        'top_pdv_type':       top_pdv_type,
        'top_pdv_name':       top_pdv_name,
        'top_pdv':            top_pdv_type,          # rétrocompat
        'top_articles':       top_articles,
        'top_articles_bar':   top_articles_bar,
        'ca_horaire_by_pdv':  ca_horaire_by_pdv,
        'bar_pdv_names':      bar_pdv_names,
        'top_acheteurs_ca':   top_acheteurs_ca,
        'top_acheteurs_nb':   top_acheteurs_nb,
    }


# ── CA horaire bars uniquement ────────────────────────────────────────────────
def ca_horaire(df: pd.DataFrame) -> list[dict]:
    """
    CA HT par heure, filtré sur les PDV de type BAR uniquement.
    Colonnes : 'Heure transaction' (entier) + 'Type de point de vente' = 'BAR'.
    """
    df = clean_conso(df)

    h_col = _find(df, 'Heure transaction', keywords=['heure', 'transaction'])
    if not h_col:
        return []

    # Filtre BAR (si la colonne type existe)
    type_col = _find(df, 'Type de point de vente', keywords=['type', 'point'])
    if type_col:
        df = df[df[type_col].astype(str).str.strip().str.upper() == 'BAR'].copy()

    if df.empty:
        return []

    df['_hour'] = _num(df[h_col])
    # Plage horaire événement : 12h → 28h (4h du matin = 28 en Weezpay)
    df = df[df['_hour'].between(12, 28)]

    if df.empty:
        return []

    result = (
        df.groupby('_hour')['_ca_ht'].sum()
          .round(2)
          .reset_index()
          .rename(columns={'_hour': 'heure', '_ca_ht': 'ca_ht'})
          .sort_values('heure')
    )
    # Formatage label : 15 → "15h", 25 → "1h"
    result['label'] = result['heure'].apply(
        lambda h: f"{int(h)}h" if h <= 24 else f"{int(h)-24}h"
    )
    return result.to_dict(orient='records')


# ── KPI billetterie ───────────────────────────────────────────────────────────
def kpi_billetterie(df_participants: pd.DataFrame, df_realise: Optional[pd.DataFrame] = None) -> dict:
    result = {}

    if df_participants is not None and not df_participants.empty:
        result['total_scans'] = int(len(df_participants))
        if 'Session' in df_participants.columns:
            sessions = df_participants['Session'].value_counts().to_dict()
            result['scans_par_session'] = {str(k): int(v) for k, v in sessions.items()}
        if 'Tarif' in df_participants.columns:
            result['top_tarifs'] = df_participants['Tarif'].value_counts().head(10).to_dict()
            invit = df_participants[
                df_participants['Tarif'].str.contains('INVITATION|Invitation', na=False, case=False)
            ]
            result['nb_invitations_scannees'] = int(len(invit))
            result['pct_invitations'] = round(len(invit) / len(df_participants) * 100, 1) if len(df_participants) > 0 else 0

    if df_realise is not None and not df_realise.empty:
        ca_col  = next((c for c in df_realise.columns if 'ca' in c.lower() or 'réalis' in c.lower()), None)
        nbt_col = next((c for c in df_realise.columns if 'ticket' in c.lower() or 'nombre' in c.lower()), None)
        if ca_col:
            result['ca_total_realise'] = float(_num(df_realise[ca_col]).sum())
        if nbt_col:
            result['nb_tickets_total'] = int(_num(df_realise[nbt_col]).sum())

    return result


# ── Profil client ──────────────────────────────────────────────────────────────
def profil_client(df: pd.DataFrame) -> dict:
    df = clean_conso(df)
    result = {}
    if "Tranche d'âge" in df.columns:
        result['age'] = df.groupby("Tranche d'âge")['_ca_ht'].agg(['sum', 'count']).round(2).to_dict()
    if 'Genre' in df.columns:
        g = df['Genre'].value_counts()
        result['genre'] = {str(k): int(v) for k, v in g.items() if str(k).strip()}
    return result
