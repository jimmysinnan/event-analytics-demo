"""
report_generator.py — Génération de rapport billetterie

Phase actuelle : rapport texte structuré à partir des KPIs calculés.
Phase future   : la fonction generate_report_text() sera remplacée par un
                 appel à l'API Claude pour générer du texte commenté automatiquement.
"""

from datetime import datetime


def _fmt_cur(val) -> str:
    """Format currency French style."""
    if val is None:
        return '—'
    return f"{val:,.0f} €".replace(',', ' ')


def _fmt_num(val) -> str:
    if val is None:
        return '—'
    return f"{int(val):,}".replace(',', ' ')


def generate_report_text(kpis: dict, edition_name: str, state: dict = None) -> str:
    """
    Génère le texte du rapport à partir des KPIs.
    Retourne une string UTF-8 structurée.

    kpis    : résultat de kpis_avances (depuis import_parser + analyzer)
    state   : état agrégé billetterie (depuis database.get_state)
    """
    now = datetime.now().strftime('%d/%m/%Y à %H:%M')
    lines = []

    lines += [
        f"RAPPORT BILLETTERIE — {edition_name}",
        f"Généré le {now}",
        "=" * 60,
        "",
    ]

    # ── Synthèse générale ──────────────────────────────────────
    if state:
        lines += [
            "SYNTHÈSE GÉNÉRALE",
            f"  Commandes totales  : {_fmt_num(state.get('nb_commandes'))}",
            f"  Participants       : {_fmt_num(state.get('nb_participants'))}",
            f"  CA total           : {_fmt_cur(state.get('ca_total'))}",
            "",
        ]

    # ── Composition tickets ────────────────────────────────────
    ct = kpis.get('composition_tickets', {}) if kpis else {}
    if ct:
        lines += [
            "COMPOSITION DES BILLETS",
            f"  Total billets      : {_fmt_num(ct.get('total'))}",
            f"  Zone premium/VIP   : {_fmt_num(ct.get('vip_payant'))}",
            f"  Zone standard      : {_fmt_num(ct.get('standard_payant'))}",
            f"  Invitations VIP    : {_fmt_num(ct.get('invitation_vip'))}",
            f"  Invitations std.   : {_fmt_num(ct.get('invitation_standard'))}",
            "",
        ]

    # ── Comportement d'achat ───────────────────────────────────
    cm = kpis.get('commandes_multi', {}) if kpis else {}
    mc = kpis.get('moyennes_client', {}) if kpis else {}
    if cm or mc:
        lines += [
            "COMPORTEMENT D'ACHAT",
            f"  Commandes ≥ 2 billet : {_fmt_num(cm.get('multi'))} ({cm.get('pct_multi', 0):.1f}%)",
            f"  Tickets / client     : {mc.get('tickets_par_client') or '—'}",
            f"  Montant / client     : {_fmt_cur(mc.get('montant_par_client'))}",
            "",
        ]

    # ── Tendance horaire ───────────────────────────────────────
    th = kpis.get('tendance_horaire', []) if kpis else []
    if th:
        peak = max(th, key=lambda x: x.get('nb', 0), default=None)
        if peak and peak.get('nb', 0) > 0:
            lines += [
                "TENDANCE HORAIRE",
                f"  Heure de pic : {peak['heure']}h — {_fmt_num(peak['nb'])} commandes",
                "",
            ]

    # ── Évolution mensuelle ────────────────────────────────────
    ev = kpis.get('evolution', {}) if kpis else {}
    mois_data = ev.get('mois', [])
    if mois_data:
        lines += ["ÉVOLUTION CA MENSUEL"]
        for m in mois_data:
            lines.append(f"  {m.get('periode', '')} : {_fmt_cur(m.get('ca'))} — {_fmt_num(m.get('quantite'))} billets")
        lines.append("")

    lines += [
        "─" * 60,
        "Note : Ce rapport est généré automatiquement à partir des",
        "données importées. L'analyse IA sera disponible en Phase 6.",
    ]

    return "\n".join(lines)


def export_report_bytes(kpis: dict, edition_name: str, state: dict = None) -> bytes:
    """Retourne le rapport encodé en UTF-8."""
    text = generate_report_text(kpis, edition_name, state)
    return text.encode('utf-8')
