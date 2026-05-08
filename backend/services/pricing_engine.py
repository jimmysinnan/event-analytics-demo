"""
pricing_engine.py — Packs, quotas et tarification par participants

Règles :
  - Prix calculé par tranche progressive de participants
  - Prix final = max(prix calculé, prix minimum du pack)
  - Pas de paiement en ligne — activation manuelle via configuration .env
  - PACK_TYPE lue depuis l'environnement
"""

from __future__ import annotations
from typing import Optional

# ── Barème progressif ─────────────────────────────────────────────────────────
# (start_excl, end_incl_or_None, rate)
TRANCHES = [
    (0,    2000, 1.00),    # 0 – 2 000 participants : 1,00 € / participant
    (2000, 5000, 0.75),    # 2 001 – 5 000          : 0,75 €
    (5000, None, 0.50),    # > 5 000                : 0,50 €
]


def calculate_price(nb_participants: int) -> dict:
    """
    Calcule le prix HT selon le barème progressif.
    Retourne le total HT et le détail par tranche.
    """
    nb = max(0, int(nb_participants))
    total  = 0.0
    detail = []
    remaining = nb

    for start, end, rate in TRANCHES:
        if remaining <= 0:
            break
        tranche_max = (end - start) if end else remaining
        nb_in       = min(remaining, tranche_max)
        if nb_in <= 0:
            continue
        amount = round(nb_in * rate, 2)
        detail.append({
            'label':  f"{start + 1:,} – {start + nb_in:,}".replace(',', ' '),
            'nb':     nb_in,
            'rate':   rate,
            'amount': amount,
        })
        total     += amount
        remaining -= nb_in

    return {
        'nb_participants': nb,
        'total_ht':        round(total, 2),
        'detail':          detail,
    }


# ── Définitions des packs ─────────────────────────────────────────────────────
PACKS: dict[str, dict] = {

    'pilote': {
        'id':          'pilote',
        'label':       'Pack Pilote',
        'tagline':     'Analyse d\'une édition test. Pour découvrir Event Analytics.',
        'min_price_ht': 1_500,
        'duration_months': 3,

        'quota_events':         1,
        'quota_editions':       1,
        'quota_ai_reports':     3,
        'quota_users':          1,

        'modules':         ['billetterie', 'consommation', 'vue_globale'],
        'modules_locked':  ['profil', 'invitations', 'stocks', 'restitution'],

        'ai_report_types': ['executive', 'audience'],
        'features': [
            'Instance dédiée hébergée 3 mois',
            '1 édition analysée',
            'Import billetterie + consommation',
            '3 rapports IA (executive, audience)',
            'Formation initiale 1h visio',
        ],
        'not_included': [
            'Reprise historique',
            'Rapports partenaires',
            'Support prioritaire',
        ],
        'extensions_available': ['edition_supplementaire', 'rapport_partenaire'],
        'support': None,
        'on_quote': False,
    },

    'starter': {
        'id':          'starter',
        'label':       'Pack Starter',
        'tagline':     'Organisateurs récurrents — jusqu\'à 3 éditions / an.',
        'min_price_ht': 2_500,
        'duration_months': 12,

        'quota_events':         2,
        'quota_editions':       3,
        'quota_ai_reports':     10,
        'quota_users':          2,

        'modules':         ['billetterie', 'consommation', 'vue_globale', 'profil', 'invitations'],
        'modules_locked':  ['stocks', 'restitution'],

        'ai_report_types': ['executive', 'audience', 'consommation', 'billet'],
        'features': [
            'Instance dédiée hébergée 12 mois',
            'Jusqu\'à 3 éditions par an',
            'Import multi-source illimité',
            '10 rapports IA',
            'Sauvegardes quotidiennes',
            'Formation 2h visio',
            'Support email 48h',
        ],
        'not_included': [
            'Reprise historique',
            'Rapports partenaires personnalisés',
            'Modules Stocks / Restitution',
        ],
        'extensions_available': [
            'edition_supplementaire', 'rapport_partenaire',
            'formation_supplementaire', 'reprise_donnees',
        ],
        'support': 'email_48h',
        'on_quote': False,
    },

    'saison': {
        'id':          'saison',
        'label':       'Pack Saison',
        'tagline':     'Organisateurs professionnels avec équipes et partenaires.',
        'min_price_ht': 5_000,
        'duration_months': 12,

        'quota_events':         5,
        'quota_editions':       None,   # illimité
        'quota_ai_reports':     None,   # illimité
        'quota_users':          5,

        'modules':         ['billetterie', 'consommation', 'vue_globale',
                            'profil', 'invitations', 'stocks', 'restitution'],
        'modules_locked':  [],

        'ai_report_types': 'all',
        'features': [
            'Instance dédiée hébergée 12 mois',
            'Éditions illimitées',
            'Rapports IA illimités (7 types)',
            'Tous les modules activés',
            'Reprise historique 3 éditions',
            'Rapports partenaires personnalisés',
            'Formation 2h sur site ou visio',
            'Support prioritaire 24h',
            '1 session revue post-édition',
        ],
        'not_included': [],
        'extensions_available': [
            'rapport_partenaire', 'formation_supplementaire',
            'reprise_donnees', 'urgence',
        ],
        'support': 'prioritaire_24h',
        'on_quote': False,
    },

    'premium': {
        'id':          'premium',
        'label':       'Pack Premium',
        'tagline':     'Multi-événements, holding, réseau de festivals. Sur devis.',
        'min_price_ht': 9_000,
        'duration_months': 12,

        'quota_events':         None,   # illimité
        'quota_editions':       None,
        'quota_ai_reports':     None,
        'quota_users':          None,

        'modules':         'all',
        'modules_locked':  [],

        'ai_report_types': 'all',
        'features': [
            'Plusieurs instances dédiées',
            'Branding personnalisé (APP_NAME, couleurs)',
            'Onboarding complet des équipes',
            'Intégration données historiques complète',
            'Accompagnement stratégique annuel',
            'SLA réponse 4h',
        ],
        'not_included': [],
        'extensions_available': 'all',
        'support': 'sla_4h',
        'on_quote': True,
    },
}


# ── Extensions à la carte ─────────────────────────────────────────────────────
EXTENSIONS: dict[str, dict] = {
    'edition_supplementaire':   { 'label': 'Édition supplémentaire',       'price_ht': 290  },
    'rapport_partenaire':       { 'label': 'Rapport partenaire PDF',        'price_ht': 190  },
    'formation_supplementaire': { 'label': 'Formation supplémentaire (1h)', 'price_ht': 150  },
    'reprise_donnees':          { 'label': 'Reprise données (1 édition)',    'price_ht': 390  },
    'urgence':                  { 'label': 'Livraison urgence (< 24h)',      'price_pct': 50  },
}


# ── API helpers ───────────────────────────────────────────────────────────────

def get_pack(pack_id: str) -> dict:
    """Retourne la définition d'un pack (défaut : starter)."""
    return PACKS.get((pack_id or 'starter').lower(), PACKS['starter'])


def calculate_pack_price(pack_id: str, nb_participants: int) -> dict:
    """
    Calcule le prix final pour un pack et un nombre de participants.
    Prix final = max(prix calculé, prix minimum du pack).
    """
    pack  = get_pack(pack_id)
    calc  = calculate_price(nb_participants)

    price_calc = calc['total_ht']
    price_min  = pack['min_price_ht']
    price_final = max(price_calc, price_min)

    return {
        'pack':             pack_id,
        'pack_label':       pack['label'],
        'nb_participants':  nb_participants,
        'price_calculated': price_calc,
        'price_minimum':    price_min,
        'price_final':      price_final,
        'price_basis':      'minimum' if price_calc < price_min else 'participants',
        'detail_tranches':  calc['detail'],
    }


def pack_info(pack_id: str) -> dict:
    """Retourne le pack avec les extensions disponibles résolues."""
    p = get_pack(pack_id)
    exts_ids = p.get('extensions_available', [])
    if exts_ids == 'all':
        exts = list(EXTENSIONS.values())
    else:
        exts = [EXTENSIONS[e] for e in exts_ids if e in EXTENSIONS]
    return {**p, 'extensions_resolved': exts}
