"""
pricing_engine.py — Packs, quotas et tarification par participants

Modèle commercial :
  - Pack = accès de base avec quotas
  - Prix calculé par tranche progressive de participants par édition
  - Prix final = max(somme des éditions, minimum du pack)
  - Activation manuelle — pas de paiement en ligne
"""

from __future__ import annotations
from typing import Optional


# ── Barème progressif participants ────────────────────────────────────────────

def calculate_participant_based_price(participants: int) -> float:
    """
    Calcule le prix HT pour un nombre de participants selon le barème progressif.

    Tranches :
      0 – 2 000       → 1,00 € / participant
      2 001 – 5 000   → 0,75 € / participant
      5 001 et +      → 0,50 € / participant
    """
    p = max(0, int(participants))
    price = 0.0

    tier1 = min(p, 2000)
    price += tier1 * 1.00

    if p > 2000:
        tier2 = min(p - 2000, 3000)
        price += tier2 * 0.75

    if p > 5000:
        tier3 = p - 5000
        price += tier3 * 0.50

    return round(price, 2)


def get_plan_minimum(plan_type: str) -> int:
    """Retourne le prix minimum HT pour un pack."""
    minimums = {
        'pilot':   1_500,
        'starter': 2_500,
        'season':  5_000,
        'premium': 9_000,
        # Alias français
        'pilote':  1_500,
        'saison':  5_000,
    }
    return minimums.get(plan_type.lower(), 2_500)


def calculate_plan_price(plan_type: str, editions: list[dict]) -> dict:
    """
    Calcule le prix final pour un plan en tenant compte de toutes les éditions.

    editions : liste de { name, expected_participants }
    Prix final = max(somme des prix par édition, minimum du plan)
    """
    per_edition = []
    total_calculated = 0.0

    for ed in editions:
        nb = int(ed.get('expected_participants') or ed.get('expectedParticipants') or 0)
        price = calculate_participant_based_price(nb)
        per_edition.append({
            'name':          ed.get('name', '—'),
            'participants':  nb,
            'price_calc':    price,
        })
        total_calculated += price

    minimum   = get_plan_minimum(plan_type)
    price_final = max(total_calculated, float(minimum))

    return {
        'plan_type':         plan_type,
        'total_calculated':  round(total_calculated, 2),
        'minimum':           minimum,
        'price_final':       round(price_final, 2),
        'price_basis':       'minimum' if total_calculated < minimum else 'participants',
        'per_edition':       per_edition,
    }


def calculate_price_detail(nb_participants: int) -> dict:
    """Détail de la décomposition par tranche pour un nombre de participants."""
    p = max(0, int(nb_participants))
    detail = []
    total  = 0.0

    tranches = [
        (0,    2000, 1.00,  '0 – 2 000'),
        (2000, 5000, 0.75,  '2 001 – 5 000'),
        (5000, None, 0.50,  '5 001 et +'),
    ]
    remaining = p
    for start, end, rate, label in tranches:
        if remaining <= 0:
            break
        tranche_max = (end - start) if end else remaining
        nb_in  = min(remaining, tranche_max)
        if nb_in <= 0:
            continue
        amount = round(nb_in * rate, 2)
        detail.append({'label': label, 'nb': nb_in, 'rate': rate, 'amount': amount})
        total     += amount
        remaining -= nb_in

    return {
        'nb_participants': p,
        'total_ht':        round(total, 2),
        'detail':          detail,
    }


# ── Configurations de plans ───────────────────────────────────────────────────

def apply_plan_configuration(plan_type: str) -> dict:
    """
    Retourne la configuration complète d'un plan.
    Source de vérité pour les quotas, modules et rapports.
    """
    plans = {
        'pilot': {
            'id':                        'pilot',
            'label':                     'Pack Pilote',
            'tagline':                   'Analyse d\'une édition test. Pour découvrir Event Analytics.',
            'included_events':           1,
            'included_active_editions':  1,
            'included_ai_reports':       3,
            'max_users':                 1,
            'minimum_price':             1_500,
            'duration_months':           3,
            'enabled_modules': [
                'events', 'global_view', 'ticketing', 'consumption',
                'consumption_live', 'pdf_restitution', 'data_import', 'settings',
            ],
            'locked_modules': [
                'customer_profile', 'invitations', 'stocks_next_edition', 'history',
            ],
            'enabled_reports': [
                'executive_summary', 'recommendations', 'post_event_report',
            ],
            'support': None,
            'on_quote': False,
            'features': [
                'Instance dédiée hébergée 3 mois',
                '1 édition analysée',
                'Import billetterie + consommation',
                '3 rapports IA',
                'Formation initiale 1h visio',
            ],
        },

        'starter': {
            'id':                        'starter',
            'label':                     'Pack Starter',
            'tagline':                   'Organisateurs récurrents — jusqu\'à 2 éditions actives.',
            'included_events':           2,
            'included_active_editions':  2,
            'included_ai_reports':       10,
            'max_users':                 2,
            'minimum_price':             2_500,
            'duration_months':           12,
            'enabled_modules': [
                'events', 'global_view', 'ticketing', 'consumption',
                'consumption_live', 'pdf_restitution', 'data_import', 'settings',
            ],
            'locked_modules': [
                'customer_profile', 'invitations', 'stocks_next_edition', 'history',
            ],
            'enabled_reports': [
                'executive_summary', 'recommendations', 'post_event_report',
            ],
            'support': 'email_48h',
            'on_quote': False,
            'features': [
                'Instance dédiée hébergée 12 mois',
                '2 événements, 2 éditions actives',
                'Import multi-source illimité',
                '10 rapports IA',
                'Sauvegardes quotidiennes',
                'Formation 2h visio',
                'Support email 48h',
            ],
        },

        'season': {
            'id':                        'season',
            'label':                     'Pack Saison',
            'tagline':                   'Organisateurs professionnels avec équipes et partenaires.',
            'included_events':           5,
            'included_active_editions':  5,
            'included_ai_reports':       30,
            'max_users':                 5,
            'minimum_price':             5_000,
            'duration_months':           12,
            'enabled_modules': [
                'events', 'global_view', 'ticketing', 'consumption', 'consumption_live',
                'customer_profile', 'invitations', 'stocks_next_edition',
                'pdf_restitution', 'history', 'data_import', 'settings',
            ],
            'locked_modules': [],
            'enabled_reports': [
                'executive_summary', 'recommendations', 'invisible_losses',
                'customer_persona', 'post_event_report', 'next_edition_forecast',
                'partners_sponsors_report', 'festival_global_figures', 'edition_customer_profile',
            ],
            'support': 'prioritaire_24h',
            'on_quote': False,
            'features': [
                'Instance dédiée hébergée 12 mois',
                '5 événements, 5 éditions actives',
                'Tous les modules activés',
                '30 rapports IA (9 types)',
                'Reprise historique 3 éditions',
                'Rapports partenaires personnalisés',
                'Formation 2h sur site ou visio',
                'Support prioritaire 24h',
            ],
        },

        'premium': {
            'id':                        'premium',
            'label':                     'Pack Premium',
            'tagline':                   'Multi-événements, holding, réseau de festivals. Sur devis.',
            'included_events':           10,
            'included_active_editions':  10,
            'included_ai_reports':       100,
            'max_users':                 10,
            'minimum_price':             9_000,
            'duration_months':           12,
            'enabled_modules':           'all',
            'locked_modules':            [],
            'enabled_reports':           'all',
            'support': 'sla_4h',
            'on_quote': True,
            'features': [
                'Plusieurs instances dédiées',
                '10 événements, 10 éditions actives',
                'Rapports IA illimités (tous types)',
                'Branding personnalisé',
                'Onboarding complet des équipes',
                'Accompagnement stratégique annuel',
                'SLA réponse 4h',
            ],
        },
    }

    # Alias français
    aliases = {'pilote': 'pilot', 'saison': 'season'}
    key = aliases.get(plan_type.lower(), plan_type.lower())
    return plans.get(key, plans['starter'])


# ── Mapping modules → routes frontend ────────────────────────────────────────

MODULE_ROUTES = {
    'events':               '/evenements',
    'global_view':          '/',
    'ticketing':            '/billetterie',
    'consumption':          '/consommation',
    'consumption_live':     '/consommation',       # sous-onglet
    'customer_profile':     '/profil-client',
    'invitations':          '/invitations',
    'stocks_next_edition':  '/stocks',
    'pdf_restitution':      '/restitution',
    'history':              None,                  # supprimé en V1
    'data_import':          '/importer-donnees',
    'settings':             '/parametres',
}


# ── Extensions à la carte ─────────────────────────────────────────────────────

EXTENSIONS = {
    'edition_supplementaire':   {'label': 'Édition supplémentaire',       'price_ht': 290},
    'rapport_partenaire':       {'label': 'Rapport partenaire PDF',        'price_ht': 190},
    'formation_supplementaire': {'label': 'Formation supplémentaire (1h)', 'price_ht': 150},
    'reprise_donnees':          {'label': 'Reprise données (1 édition)',    'price_ht': 390},
    'urgence':                  {'label': 'Livraison urgence (< 24h)',      'price_pct': 50},
}


# ── Config client complète ────────────────────────────────────────────────────

PRICING_TIERS = [
    {'from': 0,    'to': 2000,  'price_per_participant': 1.00},
    {'from': 2001, 'to': 5000,  'price_per_participant': 0.75},
    {'from': 5001, 'to': None,  'price_per_participant': 0.50},
]


def build_client_config(
    client_name:    str,
    client_slug:    str,
    plan_type:      str,
    *,
    used_events:           int = 0,
    used_active_editions:  int = 0,
    used_ai_reports:       int = 0,
    subscription_status:   str = 'active',
    payment_status:        str = 'paid',
    extensions_extra: dict = None,
) -> dict:
    """Construit la configuration client complète à partir d'un plan."""
    plan = apply_plan_configuration(plan_type)
    return {
        'client_name':               client_name,
        'client_slug':               client_slug,
        'plan_type':                 plan['id'],
        'plan_label':                plan['label'],
        'deployment_mode':           'hosted_dedicated',
        'billing_mode':              'manual_invoice',
        'subscription_status':       subscription_status,
        'payment_status':            payment_status,
        'pricing_model':             'participants_tiered',
        'pricing_tiers':             PRICING_TIERS,
        'included_events':           plan['included_events'],
        'included_active_editions':  plan['included_active_editions'],
        'included_ai_reports':       plan['included_ai_reports'],
        'max_users':                 plan['max_users'],
        'used_events':               used_events,
        'used_active_editions':      used_active_editions,
        'used_ai_reports':           used_ai_reports,
        'enabled_modules':           plan['enabled_modules'],
        'locked_modules':            plan['locked_modules'],
        'enabled_reports':           plan['enabled_reports'],
        'minimum_price':             plan['minimum_price'],
        'extensions': extensions_extra or {
            'events_extra':         0,
            'editions_extra':       0,
            'ai_reports_extra':     0,
            'enabled_extra_modules': [],
            'support_level':        plan['support'] or 'standard',
        },
    }
