"""
billetterie_analyzer.py — KPIs métier billetterie à partir d'un DataFrame

Entités calculées :
  composition_tickets  — Total tickets + décomposition par zone (premium/standard/invitation)
  composition_jauge    — Participants réels par jour de l'événement × zone
  commandes_multi      — Commandes avec ≥ 2 billets
  moyennes_client      — Tickets moyen / montant moyen par acheteur unique
  tendance_horaire     — Nb commandes par heure (0-23)
  evolution            — CA + quantité par jour / mois / an

Toutes les zones sont configurables via vip_keywords et invit_keywords.
Aucun terme spécifique à un événement particulier dans les valeurs par défaut.
Les jours sont lus depuis les données — jamais hardcodés.
"""

import pandas as pd
import numpy as np
from typing import Optional


# ── Defaults ───────────────────────────────────────────────────────────────────

DEFAULT_VIP_KEYWORDS = [
    'vip', 'premium', 'prestige', 'gold', 'platine', 'ultra',
    'carré or', 'golden', 'diamond', 'loge', 'tribune',
]

DEFAULT_INVIT_KEYWORDS = [
    'invitation', 'invit', 'invite', 'gratuit', 'offert',
    'complémentaire', 'complimentary', 'press', 'artiste',
    'staff', 'accréditation',
]


# ── Zone detection ─────────────────────────────────────────────────────────────

def _classify_tarif(tarif: str,
                    vip_keywords: list,
                    invit_keywords: list,
                    tarif_zone_map: dict) -> str:
    """
    Classify a tarif string into: 'vip_payant', 'standard_payant',
    'invitation_vip', 'invitation_standard'.

    tarif_zone_map allows explicit overrides: {'PASS WEEK-END GOLD': 'vip_payant'}
    Checked first before keyword matching.
    """
    t_lower = str(tarif).lower().strip()

    # 1. Explicit map takes priority
    for pattern, zone in (tarif_zone_map or {}).items():
        if pattern.lower() in t_lower:
            return zone

    # 2. Keyword matching
    is_vip   = any(k in t_lower for k in vip_keywords)
    is_invit = any(k in t_lower for k in invit_keywords)

    if is_invit and is_vip:
        return 'invitation_vip'
    if is_invit:
        return 'invitation_standard'
    if is_vip:
        return 'vip_payant'
    return 'standard_payant'


# ── Helpers ────────────────────────────────────────────────────────────────────

def _to_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors='coerce').fillna(0)


def _parse_dates(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors='coerce', dayfirst=True)


# ── KPI functions ──────────────────────────────────────────────────────────────

def composition_tickets(df: pd.DataFrame,
                        col_tarif: Optional[str],
                        col_qty: Optional[str],
                        vip_keywords: list = None,
                        invit_keywords: list = None,
                        tarif_zone_map: dict = None) -> dict:
    """
    Décompose les billets vendus par zone :
    vip_payant / standard_payant / invitation_vip / invitation_standard

    Returns dict with total + per-zone counts + comparison-ready structure.
    """
    vip_kw   = vip_keywords   or DEFAULT_VIP_KEYWORDS
    invit_kw = invit_keywords or DEFAULT_INVIT_KEYWORDS
    zone_map = tarif_zone_map or {}

    qty_series = _to_numeric(df[col_qty]) if col_qty and col_qty in df.columns else pd.Series([1] * len(df))

    result = {
        'total':               int(qty_series.sum()),
        'vip_payant':          0,
        'standard_payant':     0,
        'invitation_vip':      0,
        'invitation_standard': 0,
        'zones':               {},  # { zone_label: count } for custom zones
    }

    if not col_tarif or col_tarif not in df.columns:
        result['standard_payant'] = result['total']
        return result

    for tarif, group in df.groupby(col_tarif, dropna=False):
        zone = _classify_tarif(str(tarif), vip_kw, invit_kw, zone_map)
        qty  = int(_to_numeric(group[col_qty]).sum()) if col_qty and col_qty in group.columns else len(group)
        result[zone] = result.get(zone, 0) + qty

    return result


def composition_jauge(df: pd.DataFrame,
                      col_tarif: Optional[str],
                      col_qty: Optional[str],
                      col_date: Optional[str],
                      vip_keywords: list = None,
                      invit_keywords: list = None,
                      tarif_zone_map: dict = None) -> list:
    """
    Participants par jour de l'événement × zone (premium / standard).
    Days are read from data — never hardcoded.
    Only payant zones (vip_payant + standard_payant) count toward jauge.

    Returns: [{ 'jour': 'YYYY-MM-DD', 'label': 'Vendredi 14 nov.', 'vip': n, 'standard': n, 'total': n }]
    """
    if not col_date or col_date not in df.columns:
        return []

    vip_kw   = vip_keywords   or DEFAULT_VIP_KEYWORDS
    invit_kw = invit_keywords or DEFAULT_INVIT_KEYWORDS
    zone_map = tarif_zone_map or {}

    df = df.copy()
    df['_date'] = _parse_dates(df[col_date])
    df['_date_only'] = df['_date'].dt.date
    df['_qty']  = _to_numeric(df[col_qty]) if col_qty and col_qty in df.columns else 1

    if col_tarif and col_tarif in df.columns:
        df['_zone'] = df[col_tarif].apply(
            lambda t: _classify_tarif(str(t), vip_kw, invit_kw, zone_map)
        )
    else:
        df['_zone'] = 'standard_payant'

    # Only payant tickets count for attendance jauge
    payant = df[df['_zone'].isin(['vip_payant', 'standard_payant'])]
    days = sorted(payant['_date_only'].dropna().unique())

    result = []
    for day in days:
        day_df = payant[payant['_date_only'] == day]
        vip      = int(day_df[day_df['_zone'] == 'vip_payant']['_qty'].sum())
        standard = int(day_df[day_df['_zone'] == 'standard_payant']['_qty'].sum())
        dt = pd.Timestamp(day)
        label = dt.strftime('%A %d %b.').capitalize()
        result.append({
            'jour':     str(day),
            'label':    label,
            'vip':      vip,
            'standard': standard,
            'total':    vip + standard,
        })

    return result


def commandes_multi(df: pd.DataFrame,
                    col_cmd: Optional[str],
                    col_qty: Optional[str]) -> dict:
    """Orders with ≥ 2 tickets."""
    if not col_cmd or col_cmd not in df.columns:
        return {'total': len(df), 'multi': 0, 'single': len(df), 'pct_multi': 0.0}

    df = df.copy()
    df['_qty'] = _to_numeric(df[col_qty]) if col_qty and col_qty in df.columns else 1
    by_cmd = df.groupby(col_cmd)['_qty'].sum()

    total  = len(by_cmd)
    multi  = int((by_cmd >= 2).sum())
    single = total - multi

    return {
        'total':     total,
        'multi':     multi,
        'single':    single,
        'pct_multi': round(multi / total * 100, 1) if total else 0.0,
    }


def moyennes_client(df: pd.DataFrame,
                    col_cmd: Optional[str],
                    col_qty: Optional[str],
                    col_prix: Optional[str]) -> dict:
    """Average tickets and spend per unique buyer (= unique order)."""
    if not col_cmd or col_cmd not in df.columns:
        return {'tickets_par_client': None, 'montant_par_client': None}

    df = df.copy()
    df['_qty']  = _to_numeric(df[col_qty])  if col_qty  and col_qty  in df.columns else 1
    df['_prix'] = _to_numeric(df[col_prix]) if col_prix and col_prix in df.columns else 0

    by_cmd = df.groupby(col_cmd).agg(qty=('_qty', 'sum'), prix=('_prix', 'sum'))

    tpc = round(float(by_cmd['qty'].mean()),  2) if len(by_cmd) else None
    mpc = round(float(by_cmd['prix'].mean()), 2) if len(by_cmd) else None

    return {'tickets_par_client': tpc, 'montant_par_client': mpc}


def tendance_horaire(df: pd.DataFrame, col_date: Optional[str]) -> list:
    """Order count per hour of day (0-23). Returns 24 entries always."""
    zeros = [{'heure': h, 'nb': 0} for h in range(24)]

    if not col_date or col_date not in df.columns:
        return zeros

    hours = _parse_dates(df[col_date]).dt.hour.dropna()
    counts = hours.value_counts().reindex(range(24), fill_value=0)
    return [{'heure': int(h), 'nb': int(counts[h])} for h in range(24)]


def evolution_temporelle(df: pd.DataFrame,
                         col_date: Optional[str],
                         col_qty: Optional[str],
                         col_prix: Optional[str]) -> dict:
    """
    CA and quantity aggregated by day / month / year.
    Returns { 'jour': [...], 'mois': [...], 'an': [...] }
    Each entry: { 'periode': str, 'ca': float, 'quantite': int }
    """
    empty = {'jour': [], 'mois': [], 'an': []}

    if not col_date or col_date not in df.columns:
        return empty

    df = df.copy()
    df['_date'] = _parse_dates(df[col_date])
    df['_qty']  = _to_numeric(df[col_qty])  if col_qty  and col_qty  in df.columns else 1
    df['_prix'] = _to_numeric(df[col_prix]) if col_prix and col_prix in df.columns else 0
    df = df.dropna(subset=['_date'])

    def _agg(key_col):
        g = df.groupby(key_col).agg(
            ca=('_prix', 'sum'), quantite=('_qty', 'sum')
        ).reset_index()
        return [
            {'periode': str(r[key_col]), 'ca': round(float(r['ca']), 2), 'quantite': int(r['quantite'])}
            for _, r in g.iterrows()
        ]

    df['_jour'] = df['_date'].dt.date.astype(str)
    df['_mois'] = df['_date'].dt.to_period('M').astype(str)
    df['_an']   = df['_date'].dt.year.astype(str)

    return {'jour': _agg('_jour'), 'mois': _agg('_mois'), 'an': _agg('_an')}


# ── Main dispatch ──────────────────────────────────────────────────────────────

def analyze_billetterie(df: pd.DataFrame,
                        col_map: dict,
                        vip_keywords: list = None,
                        invit_keywords: list = None,
                        tarif_zone_map: dict = None) -> dict:
    """
    Main entry point. Receives a parsed DataFrame + column map from import_parser.

    col_map expected keys: tarif, qty, cmd, prix, date
    All keys are optional — missing ones are handled gracefully.

    vip_keywords / invit_keywords: per-edition configurable lists.
    tarif_zone_map: explicit tarif→zone overrides { 'tarif substring': 'vip_payant' }.
    """
    c = col_map or {}
    kw = dict(vip_keywords=vip_keywords, invit_keywords=invit_keywords, tarif_zone_map=tarif_zone_map)

    return {
        'composition_tickets': composition_tickets(df, c.get('tarif'), c.get('qty'), **kw),
        'composition_jauge':   composition_jauge(df, c.get('tarif'), c.get('qty'), c.get('date'), **kw),
        'commandes_multi':     commandes_multi(df, c.get('cmd'), c.get('qty')),
        'moyennes_client':     moyennes_client(df, c.get('cmd'), c.get('qty'), c.get('prix')),
        'tendance_horaire':    tendance_horaire(df, c.get('date')),
        'evolution':           evolution_temporelle(df, c.get('date'), c.get('qty'), c.get('prix')),
    }
