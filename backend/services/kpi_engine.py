"""
KPI Engine — Baccha Festival
Calcule tous les indicateurs à partir des DataFrames chargés.
"""
import pandas as pd
import numpy as np
from typing import Optional


def _num(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors='coerce')


# ── Nettoyage BDD consommation ────────────────────────────────────────────────
FRAIS_FAMILLES = {'Z_FRAIS BACCHA', 'Consigne', 'CONSIGNE', 'FRAIS DE RECHARGEMENT'}

def clean_conso(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    fam_col = next((c for c in df.columns if 'famille' in c.lower()), None)
    if fam_col:
        df = df[~df[fam_col].isin(FRAIS_FAMILLES)]
    df['_ca_ht']  = _num(df.get('Total HT',  df.get('Total H.T ', 0)))
    df['_ca_ttc'] = _num(df.get('Total TTC', df.get('Total TTC ', 0)))
    df['_qty']    = _num(df.get('Quantité',  df.get('Quantité ',  1)))
    return df


# ── KPI globaux consommation ──────────────────────────────────────────────────
def kpi_conso(df: pd.DataFrame) -> dict:
    df = clean_conso(df)
    ca_ht     = float(df['_ca_ht'].sum())
    n_clients = int(df['ID acheteur'].nunique()) if 'ID acheteur' in df.columns else 0
    n_transac = int(df['ID Transaction'].nunique()) if 'ID Transaction' in df.columns else 0
    panier    = round(ca_ht / n_clients, 2) if n_clients > 0 else 0

    fam_col = next((c for c in df.columns if 'famille' in c.lower()), None)
    top_fam = {}
    if fam_col:
        top_fam = (
            df.groupby(fam_col)['_ca_ht'].sum()
              .sort_values(ascending=False)
              .head(10)
              .round(2)
              .to_dict()
        )

    pdv_col = next((c for c in df.columns if 'point de vente' in c.lower()), None)
    top_pdv = {}
    if pdv_col:
        top_pdv = (
            df.groupby(pdv_col)['_ca_ht'].sum()
              .sort_values(ascending=False)
              .head(8)
              .round(2)
              .to_dict()
        )

    art_col = next((c for c in df.columns if df[c].dtype == object and c.lower() == 'article'), None)
    top_art = {}
    if art_col:
        top_art = (
            df.groupby(art_col)['_qty'].sum()
              .sort_values(ascending=False)
              .head(10)
              .round(0)
              .astype(int)
              .to_dict()
        )

    return {
        'ca_ht':        round(ca_ht, 2),
        'n_clients':    n_clients,
        'n_transac':    n_transac,
        'panier_moyen': panier,
        'top_familles': top_fam,
        'top_pdv':      top_pdv,
        'top_articles': top_art,
    }


# ── KPI billetterie ───────────────────────────────────────────────────────────
def kpi_billetterie(df_participants: pd.DataFrame, df_realise: Optional[pd.DataFrame] = None) -> dict:
    result = {}

    if df_participants is not None and not df_participants.empty:
        result['total_scans'] = int(len(df_participants))
        if 'Session' in df_participants.columns:
            sessions = df_participants['Session'].value_counts().to_dict()
            result['scans_par_session'] = {str(k): int(v) for k, v in sessions.items()}
        if 'Tarif' in df_participants.columns:
            result['top_tarifs'] = (
                df_participants['Tarif'].value_counts()
                .head(10).to_dict()
            )
            invit = df_participants[
                df_participants['Tarif'].str.contains('INVITATION|Invitation', na=False, case=False)
            ]
            result['nb_invitations_scannees'] = int(len(invit))
            result['pct_invitations'] = round(len(invit) / len(df_participants) * 100, 1) if len(df_participants) > 0 else 0

    if df_realise is not None and not df_realise.empty:
        # Cherche les colonnes CA et nb tickets
        ca_col  = next((c for c in df_realise.columns if 'ca' in c.lower() or 'réalis' in c.lower()), None)
        nbt_col = next((c for c in df_realise.columns if 'ticket' in c.lower() or 'nombre' in c.lower()), None)
        if ca_col:
            result['ca_total_realise'] = float(_num(df_realise[ca_col]).sum())
        if nbt_col:
            result['nb_tickets_total'] = int(_num(df_realise[nbt_col]).sum())

    return result


# ── Évolution CA horaire ──────────────────────────────────────────────────────
def ca_horaire(df: pd.DataFrame) -> list[dict]:
    df = clean_conso(df)
    h_col = next((c for c in df.columns if 'heure' in c.lower() and 'transaction' in c.lower()), None)
    if not h_col:
        return []
    df['_hour'] = _num(df[h_col])
    result = (
        df[df['_hour'].between(12, 4 + 24)]
        .groupby('_hour')['_ca_ht'].sum()
        .round(2)
        .reset_index()
        .rename(columns={'_hour': 'heure', '_ca_ht': 'ca_ht'})
        .sort_values('heure')
    )
    return result.to_dict(orient='records')


# ── Profil client ─────────────────────────────────────────────────────────────
def profil_client(df: pd.DataFrame) -> dict:
    df = clean_conso(df)
    result = {}
    if "Tranche d'âge" in df.columns:
        result['age'] = df.groupby("Tranche d'âge")['_ca_ht'].agg(['sum','count']).round(2).to_dict()
    if 'Genre' in df.columns:
        g = df['Genre'].value_counts()
        result['genre'] = {str(k): int(v) for k, v in g.items() if str(k).strip()}
    return result
