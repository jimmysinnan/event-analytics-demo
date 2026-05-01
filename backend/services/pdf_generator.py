"""
Générateur PDF — Event Analytics
Reproduit les 3 présentations de restitution :
  1. Global des chiffres
  2. Performance des points de vente
  3. Profil client
"""
import os
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Palette ───────────────────────────────────────────────────────────────────
BG       = colors.HexColor('#05080F')
SURFACE  = colors.HexColor('#0D1526')
BORDER   = colors.HexColor('#1A2840')
BLUE     = colors.HexColor('#068EEA')
GOLD     = colors.HexColor('#F59E0B')
TEAL     = colors.HexColor('#06B6D4')
VIOLET   = colors.HexColor('#8B5CF6')
GREEN    = colors.HexColor('#10B981')
RED      = colors.HexColor('#EF4444')
WHITE    = colors.HexColor('#F0F4FF')
GREY     = colors.HexColor('#8B9BB4')
DARK     = colors.HexColor('#4A5568')

W, H = A4  # 595 x 842 pts

# ── Helpers ───────────────────────────────────────────────────────────────────
def _bg(c, w=W, h=H):
    c.setFillColor(BG)
    c.rect(0, 0, w, h, fill=1, stroke=0)

def _header(c, title, subtitle='', year=2025):
    # Bande latérale colorée
    c.setFillColor(BLUE)
    c.rect(0, H - 60, 4, 60, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 18)
    c.drawString(20, H - 38, title)

    c.setFillColor(GREY)
    c.setFont('Helvetica', 9)
    c.drawString(20, H - 52, subtitle)

    # Badge édition
    badge_x = W - 90
    c.setFillColor(SURFACE)
    c.roundRect(badge_x, H - 52, 78, 24, 4, fill=1, stroke=0)
    c.setFillColor(BLUE)
    c.setFont('Helvetica-Bold', 8)
    app_name = os.environ.get('APP_NAME', 'EVENT ANALYTICS').upper()
    c.drawCentredString(badge_x + 39, H - 42, f'{app_name} {year}')
    c.setFillColor(GREY)
    c.setFont('Helvetica', 7)
    c.drawCentredString(badge_x + 39, H - 52 + 5, '12e édition')

    # Ligne séparatrice
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.line(0, H - 68, W, H - 68)

def _footer(c, page, total):
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.line(0, 24, W, 24)
    c.setFillColor(DARK)
    c.setFont('Helvetica', 7)
    app_name = os.environ.get('APP_NAME', 'Event Analytics')
    c.drawString(20, 12, f'{app_name} — Confidentiel')
    c.drawRightString(W - 20, 12, f'{page} / {total}')

def _kpi_box(c, x, y, w, h, label, value, sub='', accent=BLUE):
    # Fond
    c.setFillColor(SURFACE)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=0)
    # Barre top
    c.setFillColor(accent)
    c.roundRect(x, y + h - 3, w, 3, 3, fill=1, stroke=0)
    # Label
    c.setFillColor(GREY)
    c.setFont('Helvetica', 7)
    c.drawString(x + 10, y + h - 18, label.upper())
    # Valeur
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 20)
    c.drawString(x + 10, y + h - 42, value)
    # Sub
    if sub:
        c.setFillColor(DARK)
        c.setFont('Helvetica', 7)
        c.drawString(x + 10, y + h - 54, sub)

def _bar_h(c, x, y, w, h_bar, value, max_val, color, label='', value_label=''):
    # Background track
    c.setFillColor(BORDER)
    c.roundRect(x, y, w, h_bar, 2, fill=1, stroke=0)
    # Bar
    bar_w = max(4, int((value / max_val) * w)) if max_val > 0 else 0
    c.setFillColor(color)
    c.roundRect(x, y, bar_w, h_bar, 2, fill=1, stroke=0)
    # Labels
    if label:
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        c.drawString(x - 2, y, label)
    if value_label:
        c.setFillColor(WHITE)
        c.setFont('Helvetica-Bold', 7)
        c.drawRightString(x + w, y, value_label)

def _section_title(c, x, y, text):
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(x, y, text)
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.line(x, y - 4, x + 200, y - 4)


# ── PDF 1 : Global des chiffres ───────────────────────────────────────────────
def generate_global(edition=2025) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    # ── Page 1 : KPIs globaux ──────────────────────────────────────────────────
    _bg(c)
    _header(c, 'Chiffres globaux du festival', 'Consommation · Billetterie · Invitations', edition)

    top = H - 90

    # 4 KPI cards
    kpis = [
        ('CA CONSOMMATION',   '496 585 €',  'Hors frais & consignes',    BLUE   ),
        ('FESTIVALIERS',      '16 810',      'Entrées scannées',           TEAL   ),
        ('CA BILLETTERIE',    '929 695 €',  'Toutes formules',            GOLD   ),
        ('CLIENTS ACHETEURS', '7 251',       'Panier moyen 68,5 €',       VIOLET ),
    ]
    kw = (W - 40 - 15) / 4
    for i, (lbl, val, sub, acc) in enumerate(kpis):
        _kpi_box(c, 20 + i * (kw + 5), top - 80, kw, 80, lbl, val, sub, acc)

    # CA par famille — barres horizontales
    y = top - 110
    _section_title(c, 20, y, 'CA consommation par famille — 2025')
    y -= 18
    familles = [
        ('Champagne', 178857, GOLD),   ('Bières',   59005, BLUE),
        ('Soft',      44386,  TEAL),   ('Cocktail', 33924, VIOLET),
        ('Food',      27581,  colors.HexColor('#F97316')),
        ('Vodka',     18775,  GREEN),  ('Hard',     17678, RED),
    ]
    max_fa = max(f[1] for f in familles)
    for name, val, col in familles:
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        c.drawString(20, y + 3, name)
        _bar_h(c, 90, y, W - 130, 10, val, max_fa, col,
               value_label=f'{val:,.0f} €'.replace(',', ' '))
        y -= 17

    # Comparatif editions
    y -= 10
    _section_title(c, 20, y, 'Évolution CA consommation — 3 éditions')
    y -= 18
    editions_data = [
        ('2023', 888537, DARK), ('2024', 742968, BLUE), ('2025', 496585, GOLD),
    ]
    max_ed = max(e[1] for e in editions_data)
    for yr, val, col in editions_data:
        c.setFillColor(col if yr == '2025' else GREY)
        c.setFont('Helvetica-Bold' if yr == '2025' else 'Helvetica', 8)
        c.drawString(20, y + 2, yr)
        _bar_h(c, 55, y, W - 95, 14, val, max_ed, col,
               value_label=f'{val:,.0f} €'.replace(',', ' '))
        y -= 22

    # Affluence
    y -= 8
    _section_title(c, 20, y, 'Affluence — 2024 vs 2025')
    y -= 16
    for lbl, v24, v25 in [('Samedi', 9762, 8289), ('Dimanche', 10584, 8521), ('Total', 20346, 16810)]:
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        c.drawString(20, y + 3, lbl)
        c.setFillColor(BLUE)
        c.setFont('Helvetica', 6)
        c.drawString(90, y + 3, f'2024 : {v24:,}'.replace(',', ' '))
        c.setFillColor(GOLD)
        c.drawString(160, y + 3, f'2025 : {v25:,}'.replace(',', ' '))
        delta = ((v25 - v24) / v24 * 100)
        c.setFillColor(RED)
        c.setFont('Helvetica-Bold', 7)
        c.drawString(230, y + 3, f'{delta:.1f}%')
        y -= 14

    _footer(c, 1, 3)
    c.showPage()

    # ── Page 2 : Tendance horaire + analyse ────────────────────────────────────
    _bg(c)
    _header(c, 'Tendance horaire & analyse', 'CA bars · Restaurants exclus', edition)

    top = H - 90
    _section_title(c, 20, top, 'CA horaire des bars — 2025 (2 jours combinés)')
    top -= 18

    horaire = [
        ('15h', 1349), ('16h', 10816), ('17h', 30879), ('18h', 50965),
        ('19h', 70942), ('20h', 57416), ('21h', 50408), ('22h', 30528), ('23h', 19100),
    ]
    max_h = max(v for _, v in horaire)
    chart_w = W - 40
    bar_w = chart_w / len(horaire) * 0.7
    gap   = chart_w / len(horaire)
    chart_h = 120

    for i, (h, v) in enumerate(horaire):
        bh = int((v / max_h) * chart_h)
        bx = 20 + i * gap + (gap - bar_w) / 2
        by = top - chart_h
        col = GOLD if h == '19h' else BLUE
        c.setFillColor(col)
        c.roundRect(bx, by, bar_w, bh, 3, fill=1, stroke=0)
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        c.drawCentredString(bx + bar_w / 2, by - 10, h)
        if h in ('19h', '18h', '20h'):
            c.setFillColor(WHITE if h == '19h' else GREY)
            c.setFont('Helvetica-Bold' if h == '19h' else 'Helvetica', 6)
            c.drawCentredString(bx + bar_w / 2, by + bh + 3, f'{v:,.0f}€'.replace(',', ' '))

    # Note pic
    y = top - chart_h - 28
    c.setFillColor(GOLD)
    c.roundRect(20, y - 8, W - 40, 22, 4, fill=1, stroke=0)
    c.setFillColor(BG)
    c.setFont('Helvetica-Bold', 9)
    c.drawCentredString(W / 2, y, f'Pic à 19h — 70 942 € CA bars')

    # Recommandations
    y -= 30
    _section_title(c, 20, y, 'Recommandations opérationnelles')
    y -= 18
    recs = [
        (GOLD,   'Champagne', 'Augmenter le prix de 10% à 15% : raisonnable pour ne pas impacter le volume et augmenter la marge.'),
        (BLUE,   'Cocktail & Bière', 'Produits phares ancrés dans la consommation festival. Miser sur des offres favorisant le volume.'),
        (TEAL,   'Staff', 'Former et incentiver le staff bars pour maximiser la valeur du panier moyen.'),
        (VIOLET, 'Profil client', 'Réitérer les segmentations et faire des communications ciblées avant et pendant le festival.'),
    ]
    for col, title, text in recs:
        c.setFillColor(col)
        c.roundRect(20, y - 6, 3, 20, 1, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont('Helvetica-Bold', 8)
        c.drawString(28, y + 6, title)
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        # Wrap text
        words = text.split()
        line, lines_out = '', []
        for w in words:
            test = f'{line} {w}'.strip()
            if c.stringWidth(test, 'Helvetica', 7) > W - 55:
                lines_out.append(line); line = w
            else:
                line = test
        if line: lines_out.append(line)
        for j, ln in enumerate(lines_out[:2]):
            c.drawString(28, y - 4 - j * 9, ln)
        y -= max(30, 12 + len(lines_out[:2]) * 9)

    _footer(c, 2, 3)
    c.showPage()

    # ── Page 3 : Invitations ───────────────────────────────────────────────────
    _bg(c)
    _header(c, 'Analyse des invitations', 'Impact billetterie & consommation', edition)

    top = H - 90
    inv_kpis = [
        ('BILLETS DISTRIBUÉS',  '1 570',       'Total invitations',            GOLD  ),
        ('VALEUR ÉCONOMIQUE',   '421 510 €',  'Coût d\'opportunité',          RED   ),
        ('CA CONSO GÉNÉRÉ',     '91 955 €',   '1 155 clients invités actifs', GREEN ),
        ('TAUX DE RETOUR',      '21.8%',       'Pour 1€ offert : 0,22€',      VIOLET),
    ]
    kw2 = (W - 40 - 15) / 4
    for i, (lbl, val, sub, acc) in enumerate(inv_kpis):
        _kpi_box(c, 20 + i * (kw2 + 5), top - 80, kw2, 80, lbl, val, sub, acc)

    y = top - 110
    _section_title(c, 20, y, 'CA invités par point de vente')
    y -= 18
    pdv_inv = [
        ('Palmeraie', 30634, GOLD), ('Fosse Terre', 14125, BLUE),
        ('Fosse Mer', 7185, TEAL), ('Palm. Salle', 6001, VIOLET),
        ('Aperol', 5296, GREEN), ('Bar DESPE', 4482, GREY),
    ]
    max_pi = max(v for _, v, _ in pdv_inv)
    for name, val, col in pdv_inv:
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        c.drawString(20, y + 3, name)
        _bar_h(c, 90, y, W - 130, 11, val, max_pi, col,
               value_label=f'{val:,.0f} €'.replace(',', ' '))
        y -= 16

    y -= 12
    _section_title(c, 20, y, 'Alerte rentabilité')
    y -= 14
    c.setFillColor(colors.HexColor('#EF444420'))
    c.roundRect(20, y - 50, W - 40, 60, 6, fill=1, stroke=0)
    c.setStrokeColor(RED)
    c.setLineWidth(0.5)
    c.roundRect(20, y - 50, W - 40, 60, 6, fill=0, stroke=1)
    c.setFillColor(RED)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(30, y - 10, 'Taux de retour : 21,8% — Les invitations ne sont pas auto-financées')
    c.setFillColor(GREY)
    c.setFont('Helvetica', 8)
    c.drawString(30, y - 24, f'Pour 421 510 € de billets offerts, les invités génèrent seulement 91 955 € de CA consommation.')
    c.drawString(30, y - 36, f'Perte nette estimée : 329 555 €. Panier invités (79,6 €) > panier payants (58,2 €).')
    c.drawString(30, y - 48, f'Seuls 22% des invités (1 155/5 240) ont consommé dans les bars.')

    _footer(c, 3, 3)
    c.showPage()

    c.save()
    buf.seek(0)
    return buf.read()


# ── PDF 2 : Performance PDV ───────────────────────────────────────────────────
def generate_pdv(edition=2025) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    PDV_DATA = [
        { 'name': 'Fosse Terre',       'ca': 96164,  'color': BLUE,   'articles': [('Feuillatte Réserve',156),('Lorraine Ice',154),('Nicolas Brut',106),('Vin Rosé',81),('Rhum Vieux',38)] },
        { 'name': 'Palmeraie',         'ca': 73879,  'color': VIOLET, 'articles': [('Feuillatte Réserve',419),('Laurent Perrier',298),('Lorraine Ice',214),('Rhum Vieux',149),('Vin Rosé',109)] },
        { 'name': 'Fosse Mer',         'ca': 55907,  'color': TEAL,   'articles': [('Cocktail Caipi',278),('Cocktail Planteur',244),('Feuillatte',152),('Lorraine Ice',144),('Rhum Vieux',114)] },
        { 'name': 'Palmeraie Salle',   'ca': 46108,  'color': GREEN,  'articles': [('Feuillatte Réserve',280),('Laurent Perrier',210),('Lorraine Ice',180),('Vin Rosé',120),('Mojito',80)] },
        { 'name': 'Bar DESPE',         'ca': 37771,  'color': GOLD,   'articles': [('Desperados Red',2301),('Coca',800),('Eau',600),('Heineken',400),('Desperados citron',300)] },
        { 'name': 'Espace Partenaire', 'ca': 14980,  'color': GREY,   'articles': [('Champagne',100),('Cocktail',80),('Soft',60),('Bière',40),('Rhum',30)] },
    ]

    SEGMENTS = [
        ('<10€',      200, RED),
        ('10–50€',    3200, BLUE),
        ('50–100€',   2400, TEAL),
        ('100–300€',  1200, GOLD),
        ('>300€',     250,  VIOLET),
    ]

    # Page 1: Vue globale CA par PDV
    _bg(c)
    _header(c, 'Performance des points de vente', 'CA · Top produits · Segmentation clients', edition)
    top = H - 90
    _section_title(c, 20, top, 'CA par point de vente — 2025')
    top -= 18
    max_ca = max(d['ca'] for d in PDV_DATA)
    for d in PDV_DATA:
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        c.drawString(20, top + 3, d['name'])
        _bar_h(c, 110, top, W - 150, 13, d['ca'], max_ca, d['color'],
               value_label=f"{d['ca']:,.0f} €".replace(',', ' '))
        top -= 18

    top -= 10
    _section_title(c, 20, top, 'Segmentation clients par budget dépensé — tous PDV')
    top -= 18
    max_seg = max(v for _, v, _ in SEGMENTS)
    for label, n, col in SEGMENTS:
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        c.drawString(20, top + 3, label)
        _bar_h(c, 80, top, W - 120, 12, n, max_seg, col,
               value_label=f'{n:,} clients'.replace(',', ' '))
        top -= 16

    _footer(c, 1, len(PDV_DATA) + 1)
    c.showPage()

    # Pages 2-N: une par PDV
    for pg, pdv in enumerate(PDV_DATA, start=2):
        _bg(c)
        _header(c, f"Performance — {pdv['name']}", 'Top produits · CA · Segmentation', edition)
        top = H - 90

        # KPI box CA
        _kpi_box(c, 20, top - 70, 130, 70, 'CA TOTAL PDV', f"{pdv['ca']:,.0f} €".replace(',', ' '), '2025 hors frais', pdv['color'])

        # Top articles
        _section_title(c, 165, top - 10, 'Top produits vendus')
        y2 = top - 28
        max_art = pdv['articles'][0][1]
        for name, qty in pdv['articles']:
            c.setFillColor(GREY)
            c.setFont('Helvetica', 7)
            c.drawString(165, y2 + 3, name[:20])
            _bar_h(c, 280, y2, W - 320, 10, qty, max_art, pdv['color'],
                   value_label=f'{qty} unités')
            y2 -= 14

        top -= 90
        _section_title(c, 20, top, 'Segmentation clients par tranche de dépense')
        top -= 16
        for label, n, col in SEGMENTS:
            c.setFillColor(GREY)
            c.setFont('Helvetica', 7)
            c.drawString(20, top + 3, label)
            _bar_h(c, 80, top, W - 120, 11, n, max_seg, col,
                   value_label=f'{n:,}'.replace(',', ' '))
            top -= 15

        _footer(c, pg, len(PDV_DATA) + 1)
        c.showPage()

    c.save()
    buf.seek(0)
    return buf.read()


# ── PDF 3 : Profil client ─────────────────────────────────────────────────────
def generate_profil(edition=2025) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    # Page 1: Persona + Démographie
    _bg(c)
    _header(c, 'Profil client de l\'édition', 'Démographie · Comportement · Préférences', edition)
    top = H - 90

    # Persona box
    c.setFillColor(SURFACE)
    c.roundRect(20, top - 100, W - 40, 100, 6, fill=1, stroke=0)
    c.setFillColor(VIOLET)
    c.roundRect(20, top - 3, W - 40, 3, 3, fill=1, stroke=0)
    c.setFillColor(VIOLET)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(30, top - 18, 'Persona — "La Tribu 25–35"')
    c.setFillColor(GREY)
    c.setFont('Helvetica', 8)
    persona_lines = [
        'Le cœur de clientèle, venu pour chiller + danser, cocktails à la main.',
        'Femme 25–35, vient en bande, consomme surtout entre 19h et 20h.',
        'Fan de Caipi / Planteur / Lorraine Ice — 6–7 achats pour 65–85 € dépensés.',
    ]
    for i, line in enumerate(persona_lines):
        c.drawString(30, top - 34 - i * 12, line)

    top -= 118
    _section_title(c, 20, top, 'Répartition par tranche d\'âge — % des 3 299 profils')
    top -= 18
    ages = [('18–20', 16.8, TEAL), ('21–30', 45.2, BLUE), ('31–40', 25.2, VIOLET), ('41–50', 6.8, GOLD), ('51+', 6.0, GREEN)]
    max_age = max(p for _, p, _ in ages)
    for age, pct, col in ages:
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        c.drawString(20, top + 3, age)
        _bar_h(c, 60, top, W - 100, 13, pct, max_age, col,
               value_label=f'{pct}%')
        top -= 18

    top -= 8
    _section_title(c, 20, top, 'Genre — 3 299 formulaires')
    top -= 16
    for genre, pct, col in [('Femme', 50.8, VIOLET), ('Homme', 42.8, BLUE), ('Autre', 6.3, DARK)]:
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        c.drawString(20, top + 3, genre)
        _bar_h(c, 70, top, W - 110, 12, pct, 55, col, value_label=f'{pct}%')
        top -= 15

    top -= 8
    _section_title(c, 20, top, 'Comportement d\'achat par tranche')
    top -= 16
    comportements = [
        ('18–20', '9,3 €/transac.',  '11 427 € CA total', TEAL),
        ('21–30', '11,0 €/transac.', '43 104 € CA total', BLUE),
        ('31–40', '13,4 €/transac.', '35 430 € CA total', VIOLET),
        ('41–50', '11,1 €/transac.', '7 521 € CA total',  GOLD),
        ('51+',   '10,9 €/transac.', '6 505 € CA total',  GREEN),
    ]
    for age, panier, ca, col in comportements:
        c.setFillColor(col)
        c.roundRect(20, top - 3, 3, 14, 1, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont('Helvetica-Bold', 7)
        c.drawString(28, top + 5, age)
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        c.drawString(65, top + 5, panier)
        c.drawString(155, top + 5, ca)
        top -= 14

    _footer(c, 1, 3)
    c.showPage()

    # Page 2: Tendance horaire + poids CA par âge
    _bg(c)
    _header(c, 'Tendance & contributions', 'Heure · CA par tranche · Préférences', edition)
    top = H - 90

    _section_title(c, 20, top, 'Heure de consommation — tendance 2025')
    top -= 18
    horaire = [('15h',1349),('16h',10816),('17h',30879),('18h',50965),('19h',70942),('20h',57416),('21h',50408),('22h',30528),('23h',19100)]
    max_h = max(v for _, v in horaire)
    bw = (W - 40) / len(horaire) * 0.65
    gap = (W - 40) / len(horaire)
    for i, (h, v) in enumerate(horaire):
        bh = int((v / max_h) * 100)
        bx = 20 + i * gap + (gap - bw) / 2
        by = top - 110
        col = GOLD if h == '19h' else BLUE
        c.setFillColor(col)
        c.roundRect(bx, by, bw, bh, 2, fill=1, stroke=0)
        c.setFillColor(GREY)
        c.setFont('Helvetica', 6)
        c.drawCentredString(bx + bw / 2, by - 8, h)
    top -= 125

    _section_title(c, 20, top, 'Poids des tranches d\'âge dans le CA')
    top -= 16
    ca_age = [('21–30', 43104, BLUE), ('31–40', 35430, VIOLET), ('18–20', 11427, TEAL), ('41–50', 7521, GOLD), ('51+', 6505, GREEN)]
    total_ca = sum(v for _, v, _ in ca_age)
    for age, ca, col in ca_age:
        pct = ca / total_ca * 100
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        c.drawString(20, top + 3, age)
        _bar_h(c, 60, top, W - 100, 12, pct, 45, col,
               value_label=f'{pct:.0f}% — {ca:,.0f} €'.replace(',', ' '))
        top -= 15

    top -= 8
    _section_title(c, 20, top, 'Préférences consommation par tranche d\'âge')
    top -= 14
    prefs_note = [
        (GOLD,   'Champagne', '28% (18–20) → 52% (51+) — la préférence augmente avec l\'âge'),
        (VIOLET, 'Cocktail',  '35% (18–20) → 8% (51+) — domaine des jeunes'),
        (BLUE,   'Bières',    'Stable entre 18% et 25% — toutes tranches'),
        (TEAL,   'Soft',      'Représente 15–22% selon l\'âge — besoin hydratation constant'),
    ]
    for col, cat, desc in prefs_note:
        c.setFillColor(col)
        c.roundRect(20, top - 3, 3, 16, 1, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont('Helvetica-Bold', 8)
        c.drawString(28, top + 6, cat)
        c.setFillColor(GREY)
        c.setFont('Helvetica', 7)
        c.drawString(28, top - 4, desc)
        top -= 20

    _footer(c, 2, 3)
    c.showPage()

    # Page 3: Recommandations
    _bg(c)
    _header(c, 'Recommandations stratégiques', 'Basées sur le profil client 2025', edition)
    top = H - 90

    recs = [
        (VIOLET, 'Cibler la Tribu 25–35', 'Segment dominant (45% clients, 42% CA). Orienter communications et offres.',
         ['Communication avant festival ciblée sur les 21–30 ans', 'Offres groupes (bandes d\'amis)', 'Réseaux sociaux en priorité']),
        (GOLD, 'Valoriser le Champagne sur les 41–50 et 51+', 'Panier le plus élevé, forte préférence Champagne (45–52%).',
         ['Offre Champagne premium pour les plus de 40 ans', 'Zone VIP adaptée au profil', 'Communication distincte par âge']),
        (BLUE, 'Activer le pic 19h', 'Heure la plus chargée — optimiser staff et disponibilité.',
         ['Réassort bars avant 18h30', 'Staff renforcé 18h–21h', 'Signal lumineux ou offre spéciale 19h']),
        (TEAL, 'Segmenter les invitations', '31% de la fréquentation sont des invités — cibler les invitations vers les hauts consommateurs.',
         ['Invitations orientées vers profils 31–50 ans', 'Contrôler le volume total', 'Mesurer le retour par segment']),
    ]

    for col, title, desc, bullets in recs:
        c.setFillColor(SURFACE)
        c.roundRect(20, top - 70, W - 40, 70, 6, fill=1, stroke=0)
        c.setFillColor(col)
        c.roundRect(20, top - 3, W - 40, 3, 3, fill=1, stroke=0)
        c.roundRect(20, top - 70, 3, 70, 1, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont('Helvetica-Bold', 9)
        c.drawString(30, top - 16, title)
        c.setFillColor(GREY)
        c.setFont('Helvetica', 8)
        c.drawString(30, top - 28, desc)
        for i, b in enumerate(bullets):
            c.setFillColor(col)
            c.circle(34, top - 42 - i * 11, 2, fill=1, stroke=0)
            c.setFillColor(GREY)
            c.setFont('Helvetica', 7)
            c.drawString(40, top - 46 - i * 11, b)
        top -= 82

    _footer(c, 3, 3)
    c.showPage()

    c.save()
    buf.seek(0)
    return buf.read()
