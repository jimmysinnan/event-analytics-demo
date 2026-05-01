"""
ai_reporter.py — Génération de rapports IA avec Claude Sonnet 4.6

Analyse les KPIs billetterie et génère :
  - Résumé exécutif (points clés en langage naturel)
  - Recommandations priorisées pour la prochaine édition
  - Analyse des pertes invisibles
  - Draft rapport partenaires/sponsors

La clé API est lue depuis :
  1. Variable d'env ANTHROPIC_API_KEY
  2. Fichier .env dans le dossier backend
"""

import os
import json
from pathlib import Path


def _get_api_key() -> str:
    """Charge la clé API depuis l'environnement ou le fichier .env."""
    key = os.environ.get('ANTHROPIC_API_KEY', '')
    if key:
        return key
    # Chercher dans .env
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith('ANTHROPIC_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"\'')
    return ''


def _fmt_cur(v) -> str:
    if v is None: return '—'
    return f"{v:,.0f} €".replace(',', ' ')

def _fmt_num(v) -> str:
    if v is None: return '—'
    return f"{int(v):,}".replace(',', ' ')


def _build_prompt(report_type: str, kpis: dict, state: dict, edition_name: str) -> str:
    """Construit le prompt envoyé à Claude selon le type de rapport."""

    # Données structurées pour le contexte
    ct = kpis.get('composition_tickets', {})
    cm = kpis.get('commandes_multi', {})
    mc = kpis.get('moyennes_client', {})
    ev = kpis.get('evolution', {})
    th = kpis.get('tendance_horaire', [])

    peak_hour = None
    if th:
        peak = max(th, key=lambda x: x.get('nb', 0), default=None)
        if peak: peak_hour = f"{peak['heure']}h ({_fmt_num(peak['nb'])} commandes)"

    context = f"""
Édition analysée : {edition_name}

DONNÉES BILLETTERIE :
- Total billets vendus : {_fmt_num(ct.get('total'))}
  - Zone premium/VIP : {_fmt_num(ct.get('vip_payant'))}
  - Zone standard : {_fmt_num(ct.get('standard_payant'))}
  - Invitations VIP : {_fmt_num(ct.get('invitation_vip'))}
  - Invitations standard : {_fmt_num(ct.get('invitation_standard'))}
- Total commandes : {_fmt_num(state.get('nb_commandes'))}
- Total participants : {_fmt_num(state.get('nb_participants'))}
- CA total billetterie : {_fmt_cur(state.get('ca_total'))}

COMPORTEMENT D'ACHAT :
- Commandes avec ≥ 2 billets : {_fmt_num(cm.get('multi'))} ({cm.get('pct_multi', 0):.1f}% des commandes)
- Tickets moyen par commande : {mc.get('tickets_par_client') or '—'}
- Montant moyen par commande : {_fmt_cur(mc.get('montant_par_client'))}
- Heure de pic d'achat : {peak_hour or '—'}

ÉVOLUTION MENSUELLE :
{chr(10).join(f"  {m['periode']} : {_fmt_cur(m.get('ca'))} / {_fmt_num(m.get('quantite'))} billets" for m in ev.get('mois', [])[:12])}
"""

    prompts = {
        'executive': f"""Tu es un consultant senior spécialisé en pilotage d'événements.

Voici les données billetterie de {edition_name} :
{context}

Génère un **résumé exécutif** en français, concis et professionnel (max 250 mots).
Structure :
1. **Performance globale** — chiffres clés et tendance
2. **Points forts** — 2-3 éléments positifs
3. **Points d'attention** — 2-3 risques ou anomalies
4. **Recommandation prioritaire** — 1 action immédiate

Ton : décisionnel, factuel, sans jargon. Pas de bullet points plats — des phrases qui donnent du sens aux chiffres.""",

        'recommandations': f"""Tu es un expert en optimisation d'événements récurrents.

Données billetterie {edition_name} :
{context}

Génère **3 recommandations priorisées** pour la prochaine édition.
Format pour chaque recommandation :
**[Priorité] Titre court**
Observation : ce que les données montrent
Impact estimé : effet attendu sur les résultats
Action concrète : ce qu'il faut faire précisément

Sois spécifique aux données fournies. Ne pas inventer de chiffres non présents.""",

        'pertes_invisibles': f"""Tu es un analyste financier événementiel.

Données billetterie {edition_name} :
{context}

Identifie les **pertes invisibles** : revenus manqués, inefficacités, opportunités non saisies.
Analyse :
1. **Invitations** — ratio invitation/payant, impact financier
2. **Comportement d'achat** — opportunités de montée en gamme
3. **Timing de vente** — pics et creux exploitables
4. **Mix billetterie** — équilibre VIP/Standard

Pour chaque perte : quantifier si possible, proposer une action corrective.""",

        'partenaires': f"""Tu es un chargé de relations partenaires événementiel.

Données billetterie {edition_name} :
{context}

Génère un **rapport partenaires/sponsors** synthétique.
Inclure :
- Synthèse de l'édition (1 paragraphe)
- Données de fréquentation clés
- Profil de l'audience (ce qu'on peut dire)
- Points de valorisation pour les partenaires
- Perspectives prochaine édition

Ton : valorisant, professionnel, orienté valeur pour le partenaire.""",
    }

    return prompts.get(report_type, prompts['executive'])


def generate_ai_report(
    report_type: str,
    kpis: dict,
    state: dict,
    edition_name: str,
) -> dict:
    """
    Génère un rapport IA via Claude Sonnet 4.6.

    Returns: { text, model, tokens_used, error? }
    """
    api_key = _get_api_key()
    if not api_key:
        return {
            'text':  None,
            'error': 'ANTHROPIC_API_KEY non configurée. Ajoutez-la dans backend/.env',
            'model': None,
        }

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        prompt = _build_prompt(report_type, kpis or {}, state or {}, edition_name)

        message = client.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=1024,
            messages=[{'role': 'user', 'content': prompt}],
        )

        text = message.content[0].text
        return {
            'text':         text,
            'model':        'claude-sonnet-4-6',
            'tokens_used':  message.usage.input_tokens + message.usage.output_tokens,
            'report_type':  report_type,
            'edition_name': edition_name,
            'error':        None,
        }

    except Exception as e:
        return {
            'text':  None,
            'error': str(e),
            'model': 'claude-sonnet-4-6',
        }


def generate_ai_report_stream(
    report_type: str,
    kpis: dict,
    state: dict,
    edition_name: str,
    api_key: str = None,
):
    """
    Version streaming — yield les chunks de texte au fur et à mesure.
    Utilisé par l'endpoint SSE du backend.
    """
    key = api_key or _get_api_key()
    if not key:
        yield 'data: {"error": "ANTHROPIC_API_KEY non configurée"}\n\n'
        return

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        prompt = _build_prompt(report_type, kpis or {}, state or {}, edition_name)

        with client.messages.stream(
            model='claude-sonnet-4-6',
            max_tokens=1024,
            messages=[{'role': 'user', 'content': prompt}],
        ) as stream:
            for text in stream.text_stream:
                chunk = json.dumps({'chunk': text}, ensure_ascii=False)
                yield f'data: {chunk}\n\n'

        yield 'data: {"done": true}\n\n'

    except Exception as e:
        yield f'data: {json.dumps({"error": str(e)})}\n\n'
