"""
ai_reporter.py — Génération de rapports IA avec Claude Sonnet 4.6

À chaque génération, instructions_ia.md est chargé comme system prompt.
Claude lit donc toujours le périmètre complet avant de produire le rapport.
Si une donnée est absente, il raisonne comme un data analyst événementiel senior.
"""

import os
import json
from pathlib import Path

# ── Chargement du fichier instructions ────────────────────────────────────────
_INSTRUCTIONS_PATH = Path(__file__).parent.parent.parent / 'instructions_ia.md'

def _load_instructions() -> str:
    """Charge instructions_ia.md. Retourne une chaîne vide si introuvable."""
    try:
        return _INSTRUCTIONS_PATH.read_text(encoding='utf-8')
    except Exception:
        return ''

# Cache en mémoire — rechargé à chaque redémarrage du serveur
_INSTRUCTIONS_CACHE: str | None = None

def _get_instructions() -> str:
    global _INSTRUCTIONS_CACHE
    if _INSTRUCTIONS_CACHE is None:
        _INSTRUCTIONS_CACHE = _load_instructions()
    return _INSTRUCTIONS_CACHE


def _get_api_key() -> str:
    key = os.environ.get('ANTHROPIC_API_KEY', '')
    if key:
        return key
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

def _pct(v) -> str:
    if v is None: return '—'
    return f"{v:.1f}%"


def _fmt_profil(profil: dict) -> str:
    """Formate les données profil client en texte lisible pour Claude.
    Gère plusieurs formats possibles selon la source (Weezpay ou formulaire).
    """
    lines = []

    # ── Genre ──────────────────────────────────────────────────────────────────
    genre = profil.get('genre', {})
    if genre:
        lines.append('Répartition par genre :')
        # Format 1 : {Femme: 1677, Homme: 1413, ...}  (depuis Weezpay)
        # Format 2 : [{name, pct, n}, ...]             (depuis formulaire)
        if isinstance(genre, list):
            for g in sorted(genre, key=lambda x: -(x.get('pct') or 0)):
                lines.append(f"  {g.get('name')} : {_pct(g.get('pct'))} ({_fmt_num(g.get('n'))} réponses)")
        elif isinstance(genre, dict):
            total = sum(genre.values()) or 1
            for name, n in sorted(genre.items(), key=lambda x: -x[1]):
                lines.append(f"  {name} : {round(n/total*100, 1)}% ({_fmt_num(n)})")
    else:
        lines.append('Genre : non disponible')

    # ── Tranches d'âge ────────────────────────────────────────────────────────
    tranches = profil.get('tranches', profil.get('age', {}))
    if tranches:
        lines.append('Répartition par tranche d\'âge :')
        # Format 1 : [{age, pct, n}, ...]  (depuis formulaire)
        if isinstance(tranches, list):
            for t in tranches:
                lines.append(f"  {t.get('age')} ans : {_pct(t.get('pct'))} ({_fmt_num(t.get('n'))} profils)")
        # Format 2 : {tranche: {sum, count}, ...}  (depuis Weezpay groupby)
        elif isinstance(tranches, dict):
            try:
                for tranche, vals in sorted(tranches.items()):
                    if isinstance(vals, dict):
                        lines.append(f"  {tranche} : CA {_fmt_cur(vals.get('sum', 0))} / {_fmt_num(vals.get('count', 0))} achats")
                    else:
                        lines.append(f"  {tranche} : {_fmt_num(vals)}")
            except Exception:
                lines.append('  (format inattendu)')
    else:
        lines.append('Tranches d\'âge : non disponible')

    # ── Comportement par tranche si disponible ────────────────────────────────
    comportement = profil.get('comportement', [])
    if comportement:
        lines.append('Comportement d\'achat par tranche :')
        for c in comportement:
            lines.append(
                f"  {c.get('age')} ans : CA {_fmt_cur(c.get('ca'))} / "
                f"{_fmt_num(c.get('clients'))} clients / panier {_fmt_cur(c.get('panier'))}/transac."
            )

    # ── Préférences produit si disponible ────────────────────────────────────
    prefs = profil.get('prefs', profil.get('preferences', []))
    if prefs:
        lines.append('Préférences produit par tranche (% des achats) :')
        for p in prefs:
            cat = p.get('cat', p.get('categorie', '?'))
            lines.append(
                f"  {cat} : 18-20={p.get('j18','?')}% / 21-30={p.get('j21','?')}% / "
                f"31-40={p.get('j31','?')}% / 41-50={p.get('j41','?')}% / 51+={p.get('j51','?')}%"
            )

    # ── Source ────────────────────────────────────────────────────────────────
    source = profil.get('source', '')
    nb_reponses = profil.get('nb_reponses', profil.get('n_reponses', ''))
    if source or nb_reponses:
        lines.append(f'Source profil : {source}{f" — {_fmt_num(nb_reponses)} réponses" if nb_reponses else ""}')

    return '\n'.join(f'  {l}' if not l.startswith('  ') else l for l in lines)


def _build_context(kpis: dict, state: dict, edition_name: str) -> str:
    """Construit le bloc de contexte complet transmis à Claude.
    Agrège toutes les sources disponibles : billetterie, conso, profil, historique.
    """
    ct        = kpis.get('composition_tickets', {})
    cm        = kpis.get('commandes_multi', {})
    mc        = kpis.get('moyennes_client', {})
    ev        = kpis.get('evolution', {})
    th        = kpis.get('tendance_horaire', [])
    hist      = kpis.get('historique_editions', [])
    conso_mod = kpis.get('module_conso', {})

    # Heure de pic billetterie
    peak_hour = '—'
    if th:
        peak = max(th, key=lambda x: x.get('nb', 0), default=None)
        if peak:
            peak_hour = f"{peak['heure']}h ({_fmt_num(peak['nb'])} commandes)"

    # Évolution mensuelle billetterie
    mois_lines = '\n'.join(
        f"  {m['periode']} : {_fmt_cur(m.get('ca'))} / {_fmt_num(m.get('quantite'))} billets"
        for m in ev.get('mois', [])[:12]
    ) or '  (données mensuelles non disponibles)'

    # ── Statut modules ────────────────────────────────────────────────────────
    has_billet = bool(state.get('nb_commandes') or state.get('ca_total'))
    has_conso  = conso_mod.get('disponible', False)
    has_profil = conso_mod.get('profil_disponible', False)
    has_hist   = len(hist) > 0

    modules_dispo     = []
    modules_manquants = []
    if has_billet: modules_dispo.append('Billetterie')
    else:          modules_manquants.append('Billetterie')
    if has_conso:  modules_dispo.append('Consommation')
    else:          modules_manquants.append('Consommation')
    if has_profil: modules_dispo.append('Profil Client')
    else:          modules_manquants.append('Profil Client')
    if has_hist:   modules_dispo.append('Historique éditions')
    else:          modules_manquants.append('Historique')
    modules_manquants += ['Invitations', 'Stocks Édition+1']

    # ── Bloc consommation ─────────────────────────────────────────────────────
    if has_conso:
        kpi_c   = conso_mod.get('kpi', {})
        horaire = conso_mod.get('ca_horaire', [])

        fam_lines = '\n'.join(
            f"  {k} : {_fmt_cur(v)}"
            for k, v in sorted((kpi_c.get('top_familles') or {}).items(), key=lambda x: -x[1])[:8]
        ) or '  (non disponible)'
        pdv_lines = '\n'.join(
            f"  {k} : {_fmt_cur(v)}"
            for k, v in sorted((kpi_c.get('top_pdv') or {}).items(), key=lambda x: -x[1])[:8]
        ) or '  (non disponible)'
        art_lines = '\n'.join(
            f"  {k} : {_fmt_num(v)} unités"
            for k, v in sorted((kpi_c.get('top_articles') or {}).items(), key=lambda x: -x[1])[:8]
        ) or '  (non disponible)'

        pic_conso = ''
        if horaire:
            peak_c = max(horaire, key=lambda x: x.get('ca_ht', 0), default=None)
            if peak_c:
                pic_conso = f"\n- Heure de pic : {peak_c['heure']}h ({_fmt_cur(peak_c['ca_ht'])})"

        conso_block = f"""
DONNÉES CONSOMMATION (module Consommation) :
- CA consommation HT : {_fmt_cur(kpi_c.get('ca_ht'))}
- Clients uniques : {_fmt_num(kpi_c.get('n_clients'))}
- Transactions : {_fmt_num(kpi_c.get('n_transac'))}
- Panier moyen : {_fmt_cur(kpi_c.get('panier_moyen'))}{pic_conso}

Top familles de produits :
{fam_lines}

Top points de vente :
{pdv_lines}

Top articles :
{art_lines}
"""
    else:
        conso_block = '\nDONNÉES CONSOMMATION : non disponibles pour cette édition.\n'

    # ── Bloc profil client ────────────────────────────────────────────────────
    profil_data = conso_mod.get('profil', {})
    if has_profil and profil_data:
        profil_block = f'\nPROFIL CLIENT (module Profil Client) :\n{_fmt_profil(profil_data)}\n'
    else:
        profil_block = (
            '\nPROFIL CLIENT : données démographiques non disponibles pour cette édition.\n'
            '→ Le module Profil Client sera alimenté dès que les données seront importées '
            '(formulaire participant ou fichier Weezpay avec colonnes "Tranche d\'âge"/"Genre").\n'
        )

    # ── Historique multi-éditions ─────────────────────────────────────────────
    hist_block = ''
    if hist:
        hist_block = '\nHISTORIQUE MULTI-ÉDITIONS :\n'
        for h in hist:
            hist_block += (
                f"  {h.get('edition_name', h.get('year'))} :\n"
                f"    CA conso : {_fmt_cur(h.get('ca_conso'))} | "
                f"CA billet : {_fmt_cur(h.get('ca_billet'))} | "
                f"CA total : {_fmt_cur(h.get('ca_total'))}\n"
                f"    Festivaliers : {_fmt_num(h.get('festivaliers'))} | "
                f"Clients : {_fmt_num(h.get('clients'))} | "
                f"Transactions : {_fmt_num(h.get('transactions'))} | "
                f"Panier conso : {_fmt_cur(h.get('panier_conso'))}\n"
            )
            if h.get('invitations_total'):
                hist_block += (
                    f"    Invitations : {_fmt_num(h['invitations_total'])} billets "
                    f"({_pct(h.get('invitations_pct_freq'))} de la fréquentation)\n"
                )
            if h.get('pass_culture'):
                pc = h['pass_culture']
                hist_block += f"    Pass Culture : {_fmt_num(pc.get('ventes'))} ventes / {_fmt_cur(pc.get('ca'))}\n"
            if h.get('familles'):
                top = sorted(h['familles'], key=lambda x: -(x.get('ca') or 0))[:3]
                hist_block += f"    Top familles : {', '.join(f['name'] for f in top)}\n"
            if h.get('affluence'):
                aff = h['affluence']
                hist_block += f"    Affluence : {_fmt_num(aff.get('total'))} (sam. {_fmt_num(aff.get('samedi'))} / dim. {_fmt_num(aff.get('dimanche'))})\n"
            # Profil historique si disponible
            if h.get('profil'):
                hist_block += f"    Profil client disponible pour cette édition.\n"
                hist_block += f"{_fmt_profil(h['profil'])}\n"

    return f"""ÉDITION ANALYSÉE : {edition_name}

MODULES DISPONIBLES DANS CE CONTEXTE IA :
  Disponibles  : {', '.join(modules_dispo) if modules_dispo else 'aucun'}
  Manquants    : {', '.join(modules_manquants)}
  → Pour chaque module manquant : signaler l'absence, analyser avec ce qui est disponible.

DONNÉES BILLETTERIE (module Billetterie) :
- Total billets vendus : {_fmt_num(ct.get('total'))}
  · VIP / premium payant : {_fmt_num(ct.get('vip_payant'))}
  · Standard payant : {_fmt_num(ct.get('standard_payant'))}
  · Invitations VIP : {_fmt_num(ct.get('invitation_vip'))}
  · Invitations standard : {_fmt_num(ct.get('invitation_standard'))}
- Total commandes : {_fmt_num(state.get('nb_commandes'))}
- Total participants : {_fmt_num(state.get('nb_participants'))}
- CA billetterie : {_fmt_cur(state.get('ca_total'))}

COMPORTEMENT D'ACHAT :
- Commandes multi-billets (≥ 2) : {_fmt_num(cm.get('multi'))} ({cm.get('pct_multi', 0):.1f}% des commandes)
- Tickets moyen / commande : {mc.get('tickets_par_client') or '—'}
- Panier moyen / commande : {_fmt_cur(mc.get('montant_par_client'))}
- Heure de pic d'achat : {peak_hour}

ÉVOLUTION MENSUELLE DES VENTES (billetterie) :
{mois_lines}
{conso_block}{profil_block}{hist_block}
PRINCIPE ABSOLU :
L'IA ne doit jamais inventer de chiffres.
Pour chaque module manquant, indiquer clairement son absence et travailler avec ce qui est disponible.
Distinguer : 1. Fait observé | 2. Interprétation | 3. Hypothèse | 4. Recommandation | 5. Limite de l'analyse."""


def _image_note(has_image: bool) -> str:
    if not has_image:
        return ''
    return """

---
IMAGE D'INSPIRATION :
Une image (affiche, visuel, charte graphique) est fournie.
Utilise-la UNIQUEMENT pour adapter le ton narratif et le style de mise en forme du rapport.
Elle n'influence pas l'analyse chiffrée ni les recommandations.
Ne jamais inventer de données à partir de l'image."""


def _build_prompt(report_type: str, kpis: dict, state: dict, edition_name: str, has_image: bool = False) -> str:
    ctx = _build_context(kpis, state, edition_name)
    img = _image_note(has_image)

    prompts = {

# ─── 1. RÉSUMÉ EXÉCUTIF ───────────────────────────────────────────────────────
'executive': f"""Tu es un consultant senior en pilotage d'événements. Tu écris comme un data analyst expert et un storyteller data senior.

Données disponibles :
{ctx}
{img}

Génère un **résumé exécutif** en français, synthétique et orienté décision.
Cible : organisateur, direction, DAF, comité de pilotage.

Structure OBLIGATOIRE :

# Résumé exécutif — {edition_name}

## Synthèse générale
3 phrases : niveau de performance global, tendance principale, enseignement central.

## Chiffres clés
Indicateurs essentiels disponibles. Si une donnée est absente, indique-le explicitement.

## Ce qui a bien fonctionné
2 à 4 points forts ancrés dans des constats chiffrés.

## Ce qui doit alerter
2 à 4 signaux faibles ou risques. Factuel, sans dramatiser.

## Priorités pour la prochaine édition
3 à 5 décisions prioritaires formulées comme des actions concrètes.

## Comparaison historique
Si des données historiques sont disponibles, commenter l'évolution. Sinon, indiquer leur absence.

## Limites de l'analyse
Données absentes, hypothèses, modules non transmis.

Style : stratégique, synthétique, clair, sans jargon. Maximum 400 mots.
Éviter les phrases génériques du type "les ventes sont bonnes, continuons les efforts".""",


# ─── 2. RECOMMANDATIONS ───────────────────────────────────────────────────────
'recommandations': f"""Tu es un expert en optimisation d'événements récurrents. Tu écris comme un consultant data senior.

Données disponibles :
{ctx}
{img}

Génère entre **5 et 8 recommandations priorisées** pour la prochaine édition.

Structure OBLIGATOIRE pour chaque recommandation :

**[PRIORITÉ : Haute / Moyenne / Basse] — Titre de la recommandation**
- **Constat :** observation factuelle tirée des données
- **Interprétation :** pourquoi c'est un enjeu pour l'événement
- **Action recommandée :** ce qu'il faut faire concrètement
- **Impact attendu :** effet prévisible sur les résultats
- **Difficulté :** Facile / Modérée / Complexe
- **Délai :** avant J-90 / J-60 / J-30 / pendant / après
- **Module concerné :** Billetterie / Consommation / PDV / Marketing / Logistique / etc.

Exemple de bonne recommandation :
"La billetterie concentre l'essentiel de sa dynamique sur les dernières semaines avant l'événement. Pour réduire le risque de remplissage tardif, la prochaine édition devrait renforcer les incitations early bird et structurer des relances commerciales plus tôt dans le cycle de vente."

Classer par priorité décroissante. Ne pas inventer de chiffres absents.
Chaque recommandation doit être directement liée à un constat data.
Si certains modules sont absents, ne pas formuler de recommandations inventées — indiquer que des données complémentaires seraient nécessaires.""",


# ─── 3. PERTES INVISIBLES ─────────────────────────────────────────────────────
'pertes_invisibles': f"""Tu es un analyste financier spécialisé en événementiel. Tu identifies les revenus manqués et les opportunités non exploitées.

Données disponibles :
{ctx}
{img}

Génère une **analyse des pertes invisibles** pour {edition_name}.

Analyse chacun des axes suivants si les données le permettent :
- Invitations peu rentables ou surdistribuées
- Invitations utilisées sans consommation associée
- Produits sous-performants (si données conso disponibles)
- Stocks mal calibrés — ruptures ou surstocks
- Canaux de vente faibles
- Segments clients sous-exploités
- Points de vente sous-performants (si données conso disponibles)
- Périodes creuses exploitables
- Baisse du panier moyen
- Opportunités de pricing non saisies
- Manque de conversion d'un segment client

Structure OBLIGATOIRE pour chaque perte identifiée :

**[Numéro] Type de perte invisible**
- **Constat data :** observation factuelle (ou "donnée non disponible" si absent)
- **Impact potentiel :** quantifié si possible, sinon "impact à investiguer"
- **Hypothèse d'explication :** causes probables
- **Action corrective :** ce qu'il faut changer
- **Priorité :** Haute / Moyenne / Basse

Règle : si l'impact financier ne peut pas être calculé, ne pas inventer de montant.
Si une catégorie n'est pas analysable faute de données, le signaler brièvement.
Terminer par un bloc "Limites de l'analyse" listant les données absentes.""",


# ─── 4. PERSONA CLIENT ────────────────────────────────────────────────────────
'persona': f"""Tu es un expert en marketing événementiel. Tu produis des analyses client actionnables.

Données disponibles :
{ctx}
{img}

Génère un **profil client complet** pour {edition_name}.

Structure OBLIGATOIRE :

# Profil client — {edition_name}

## Persona principal
Prénom fictif, description en 4-5 phrases : qui il est, motivations, comportement d'achat, consommation.
Indiquer clairement si les données démographiques (âge, genre, localisation) sont disponibles ou non.

## Personas secondaires
2 à 3 segments distincts visibles dans les données.
Pour chaque : comportement d'achat, panier, caractéristiques.

## Segments à forte valeur
Quels segments génèrent le plus de CA ? Comportements associés ?

## Segments sous-exploités
Quel potentiel non activé ? Pourquoi ?

## Implications marketing
- Communication : messages, canaux, moments
- Pricing : packagés, early bird, VIP
- Expérience client : ce que ces profils attendent

## Recommandations pour la prochaine édition
3 à 5 actions concrètes par profil ou segment.

## Limites de l'analyse
Données démographiques absentes ou incomplètes à signaler explicitement.
Ne pas inventer de données démographiques non présentes dans le contexte.""",


# ─── 5. RAPPORT POST-ÉVÉNEMENT ────────────────────────────────────────────────
'post_event': f"""Tu es un directeur événementiel rédigeant le bilan officiel. Tu écris comme un data analyst expert.

Données disponibles :
{ctx}
{img}

Génère un **rapport post-événement complet** pour {edition_name}.
Ton : analytique, professionnel, structuré, orienté apprentissage et amélioration continue.

Structure OBLIGATOIRE :

# Rapport post-événement — {edition_name}

## 1. Synthèse exécutive
3-4 phrases : édition, performance, enseignement central.

## 2. Chiffres clés
CA total, fréquentation, billets vendus, panier moyen, ratio invitation/payant.
Indiquer les données absentes.

## 3. Analyse de la billetterie
Répartition payant/invitation, VIP vs standard, évolution mensuelle, dynamique de vente.

## 4. Analyse de la consommation
CA conso, panier moyen, transactions, tendance horaire.
Si données absentes : "Module Consommation non transmis dans ce contexte. Données à importer."

## 5. Analyse des points de vente
Performance par zone/bar, top PDV, PDV sous-performants.
Si données absentes : signaler et passer.

## 6. Analyse du profil client
Comportements, segments, multi-billet, heure de pic.

## 7. Analyse des invitations
Volume, ratio, répartition VIP/standard, impact CA.

## 8. Analyse des stocks
Ruptures potentielles, surstocks.
Si données absentes : signaler.

## 9. Pertes invisibles
3 à 5 pertes identifiées avec constat et action corrective.

## 10. Recommandations
5 à 8 recommandations priorisées avec action et impact.

## 11. Comparaison historique
Si données historiques disponibles : évolution vs éditions précédentes.

## 12. Plan d'action prochaine édition
5 actions prioritaires avec délai indicatif.

## 13. Limites de l'analyse
Données manquantes, incertitudes, hypothèses.

Ne jamais inventer de chiffres. Signaler explicitement chaque donnée absente.""",


# ─── 6. PRÉVISION PROCHAINE ÉDITION ──────────────────────────────────────────
'prevision': f"""Tu es un analyste prévisionnel spécialisé en événementiel. Tu distingues clairement prévisions calculées, estimations et hypothèses.

Données disponibles :
{ctx}
{img}

Génère une **prévision pour la prochaine édition** de {edition_name}.

Règle fondamentale : distinguer clairement PRÉVISION CALCULÉE / ESTIMATION / HYPOTHÈSE DE TRAVAIL.

Structure OBLIGATOIRE :

# Prévision prochaine édition — {edition_name}

## 1. Hypothèses de départ
Données de référence utilisées. Tendances identifiées.

## 2. Enseignements de l'édition analysée
3 à 5 points clés servant de base à la prévision.

## 3. Points à reconduire
Ce qui a fonctionné et doit être maintenu.

## 4. Points à corriger
Ce qui doit être ajusté ou repensé.

## 5. Scénarios
**Scénario conservateur** (sans changement majeur) — hypothèses prudentes.
**Scénario optimiste** (avec actions d'optimisation) — hypothèses favorables.
Préciser les hypothèses de chaque scénario.

## 6. Recommandations de stocks
Produits à renforcer, à réduire, points de tension.
Si données conso absentes : formuler une hypothèse basée sur l'historique et le signaler.

## 7. Recommandations billetterie
Rythme de vente attendu, pricing, early bird, invitations.

## 8. Recommandations consommation
Horaires critiques, staffing, zones à fort potentiel.
Si données conso absentes : signaler.

## 9. Recommandations marketing
Cibles prioritaires, messages, canaux, timing.

## 10. Plan d'action avant prochaine édition
10 actions concrètes classées par ordre chronologique avec délai indicatif.

## 11. Limites de prévision
Données manquantes, incertitudes, biais potentiels.

Ne jamais inventer de chiffres extérieurs aux données fournies.""",


# ─── 7. RAPPORT PARTENAIRES / SPONSORS ───────────────────────────────────────
'partenaires': f"""Tu es un chargé de relations partenaires événementiel. Tu produis des rapports valorisants, crédibles et professionnels.

Données disponibles :
{ctx}
{img}

Génère un **rapport partenaires / sponsors** pour {edition_name}.
Cible : partenaires, sponsors, financeurs, collectivités.
Ton : professionnel, positif, crédible, valorisant sans exagération, orienté partenaire.

Structure OBLIGATOIRE :

# Rapport partenaires — {edition_name}

## 1. Contexte de l'événement
3-4 phrases attractives : positionnement, ambiance, particularités de l'édition.

## 2. Chiffres clés valorisables
Indicateurs positifs pour un partenaire : fréquentation, transactions, CA, panier.
Être factuel.

## 3. Profil du public touché
Comportements, segments, niveaux de consommation.
Formuler des hypothèses prudentes si données démographiques limitées.

## 4. Retombées et exposition
Visibilité, présence publique, engagement.

## 5. Moments ou zones de forte visibilité
Pics d'activité, zones à fort passage, créneaux stratégiques pour l'activation.

## 6. Valeur générée pour les partenaires
Indicateurs de ROI partenaire : audience, engagement, image.

## 7. Recommandations pour renforcer l'activation
3 à 5 suggestions concrètes pour la prochaine édition.

## 8. Conclusion orientée renouvellement
1 paragraphe valorisant, sans survalorisation.

## 9. Limites de données
Signaler si des données partenaires spécifiques sont absentes.

Règle : ne pas survaloriser sans données justificatives. Ne jamais inventer de chiffres.""",

    }

    return prompts.get(report_type, prompts['executive'])


def _build_messages(prompt: str, image_b64: str = None, image_mime: str = None) -> list:
    """Construit le tableau messages pour l'API Claude (text seul ou multimodal)."""
    if image_b64 and image_mime:
        return [{
            'role': 'user',
            'content': [
                {
                    'type': 'image',
                    'source': {
                        'type': 'base64',
                        'media_type': image_mime,
                        'data': image_b64,
                    },
                },
                {'type': 'text', 'text': prompt},
            ],
        }]
    return [{'role': 'user', 'content': prompt}]


def _build_system_prompt() -> str:
    """
    Construit le system prompt envoyé à Claude avant chaque rapport.
    Charge instructions_ia.md (périmètre complet) + posture data analyst.
    """
    instructions = _get_instructions()

    base = """Tu es un data analyst expert et un storyteller data senior, spécialisé en performance événementielle.

Tu travailles pour Event Analytics, une application de pilotage événementiel.
Ton rôle est de produire des rapports professionnels, structurés, contextualisés et directement exploitables.

POSTURE :
- Tu raisonnes comme un consultant senior en événementiel qui maîtrise la data.
- Tu expliques ce qui s'est passé, pourquoi c'est important, ce que cela révèle, quelles décisions cela implique.
- Quand une donnée est absente, tu le signales explicitement et tu raisonnes à partir de ce que tu as.
- Tu ne transformes jamais une hypothèse en certitude.
- Tu distingues toujours : Fait observé | Interprétation | Hypothèse | Recommandation | Limite de l'analyse.
- Tu ne génères jamais de chiffres inventés.

STYLE RÉDACTIONNEL :
- Clair, professionnel, analytique, orienté décision.
- Phrases construites qui donnent du sens aux chiffres, pas des listes plates.
- Exemple de mauvaise phrase : "Les ventes sont bonnes, il faut continuer les efforts."
- Exemple de bonne phrase : "La billetterie concentre l'essentiel de sa dynamique sur les dernières semaines avant l'événement, ce qui indique une forte dépendance aux achats tardifs et un risque de remplissage tardif à corriger."

"""

    if instructions:
        base += f"""---

RÉFÉRENTIEL MÉTIER COMPLET — INSTRUCTIONS EVENT ANALYTICS :

{instructions}

---

Ces instructions définissent le périmètre exact de chaque type de rapport.
Applique-les à la lettre pour la structure, le contenu attendu et les règles de génération.
"""
    else:
        base += "\n(Fichier instructions_ia.md non trouvé — raisonne comme data analyst événementiel senior.)\n"

    return base


def generate_ai_report_stream(
    report_type: str,
    kpis: dict,
    state: dict,
    edition_name: str,
    api_key: str = None,
    image_b64: str = None,
    image_mime: str = None,
):
    """
    Streaming SSE — yield les chunks au fur et à mesure.
    instructions_ia.md est chargé comme system prompt à chaque appel.
    Supporte la vision Claude si image_b64 et image_mime sont fournis.
    """
    key = api_key or _get_api_key()
    if not key:
        yield 'data: {"error": "ANTHROPIC_API_KEY non configurée. Ajoutez-la dans backend/.env"}\n\n'
        return

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)

        has_image   = bool(image_b64 and image_mime)
        system_prompt = _build_system_prompt()
        prompt      = _build_prompt(report_type, kpis or {}, state or {}, edition_name, has_image)
        messages    = _build_messages(prompt, image_b64, image_mime)

        with client.messages.stream(
            model='claude-sonnet-4-6',
            max_tokens=2048,
            system=system_prompt,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                chunk = json.dumps({'chunk': text}, ensure_ascii=False)
                yield f'data: {chunk}\n\n'

        yield 'data: {"done": true}\n\n'

    except Exception as e:
        yield f'data: {json.dumps({"error": str(e)})}\n\n'
