# Design System: Event Analytics — Dashboard Événementiel

## 1. Visual Theme & Atmosphere

L'atmosphère est celle d'un **cockpit décisionnel pour professionnels exigeants** : dense, précis, habité par une lumière froide qui tranche avec la chaleur des données événementielles. Ni austère ni clinique — plutôt comme un poste de pilotage de festival vu depuis les coulisses, là où les décisions se prennent dans le noir. L'interface doit inspirer confiance immédiate : tout est à sa place, tout est lisible d'un coup d'œil.

La section **Événement** et les **Rapports** se distinguent par une dimension supplémentaire : chaque événement peut imposer sa propre direction artistique à l'interface. Le fond devient une image ou une couleur du festival, les typographies s'adaptent à l'identité visuelle du client. Le dashboard reste le dashboard — mais il porte l'âme de l'événement.

- **Densité :** 8/10 — cockpit dense, information riche mais jamais surchargeée
- **Variance :** 6/10 — offset asymétrique, asymétries controlées
- **Motion :** 5/10 — fluide CSS, transitions spring précises, pas de cinématique

## 2. Color Palette & Roles

### Palette Système (Dashboard — Invariante)
- **Void Black** (`#05080F`) — Canvas principal des dashboards, fond profond
- **Deep Surface** (`#0D1526`) — Cartes, panels, sidebar
- **Elevated Layer** (`#111D33`) — Hover states, dropdowns, inputs
- **Structure Line** (`#1A2840`) — Borders, séparateurs, grilles
- **Muted Text** (`#4A5568`) — Labels secondaires, timestamps, metadata
- **Secondary Text** (`#8B9BB4`) — Descriptions, sous-titres
- **Primary Text** (`#F0F4FF`) — Contenu principal, valeurs importantes
- **Ocean Blue** (`#068EEA`) — Accent primaire système, CTA, actif
- **Electric Blue** (`#21AAFA`) — Highlight, focus rings, liens actifs

### Palette Données (Variables par module)
- **Gold Data** (`#F59E0B`) — CA, revenus, billetterie principale
- **Teal Data** (`#06B6D4`) — Participants, fréquentation
- **Violet Data** (`#8B5CF6`) — Profil client, segmentation
- **Emerald Data** (`#10B981`) — Positif, croissance, succès
- **Crimson Alert** (`#EF4444`) — Alerte, baisse, erreur
- **Indigo Brand** (`#6366F1`) — Brand EVENT Analytics, logo

### Palette Événement (Dynamique — injectée par la direction artistique)
- `--event-primary` — Couleur principale de l'événement (définie par le client)
- `--event-secondary` — Couleur secondaire / accent
- `--event-bg` — Image ou couleur de fond (opacity controllée)
- `--event-text` — Couleur de texte sur fond événement
- `--event-font` — Famille typographique de l'événement
- `--event-banner` — Booléen : bannière événement activée ou non

## 3. Typography Rules

### Dashboard (invariant)
- **Display / KPI Values:** `JetBrains Mono` — Chiffres, montants, métriques. Toujours monospace pour les nombres. Weight 500-700.
- **UI Labels & Navigation:** `Outfit` — Sans-serif géométrique moderne. Weight 400-700. Tracking contrôlé.
- **Body / Descriptions:** `Outfit` — Leading 1.6, max 65ch, couleur secondary text.

### Rapports & Documents générés
- **Headlines rapport:** `Fraunces` — Moderne serif editorial, poids 600. Uniquement dans les PDFs/rapports exportés, jamais dans l'UI dashboard.
- **Corps rapport:** `Outfit` — Cohérence système.

### Événement (dynamique)
- `--event-font` peut injecter une Google Font ou une police système pour les interfaces et rapports spécifiques à un événement.
- La variable est appliquée aux titres de pages dans le contexte événement + dans les rapports PDF générés.

### Règles strictes
- Jamais `Inter` — trop générique
- Jamais `Georgia`, `Times New Roman` dans l'UI dashboard
- Tous les nombres dans les KPIs utilisent obligatoirement `JetBrains Mono`
- Texte en capitales uniquement pour les labels de 10px ou moins (eyebrows)

## 4. Component Stylings

### Cartes KPI
- Fond `Deep Surface`, border `Structure Line`, border-radius `14px`
- Accent top-bar 3px en couleur du module (gold, teal, violet…)
- Valeur principale : `JetBrains Mono` 32-40px, weight 700, `Primary Text`
- Label : `Outfit` 11px, uppercase, tracking 0.1em, `Muted Text`
- Micro-glow discret en radial-gradient dans le coin inférieur droit

### Boutons
- **Primaire :** Fond `Ocean Blue`, texte blanc, border-radius 10px, padding 12px 24px. Active: `translateY(1px)`. Jamais de neon outer-glow.
- **Secondaire :** Transparent, border `Structure Line`, texte `Secondary Text`. Hover: fond `Elevated Layer`.
- **Danger :** Fond `rgba(239,68,68,0.15)`, border `rgba(239,68,68,0.3)`, texte `Crimson Alert`.
- **Icône seul :** 36-40px, border-radius 8-10px, même logique.

### Inputs / Formulaires
- Label au-dessus, toujours
- Fond `Elevated Layer` (`#111D33`), border `Structure Line`
- Focus : border `Ocean Blue`, box-shadow `0 0 0 3px rgba(6,142,234,0.15)`
- Erreur en-dessous en rouge inline
- Pas de floating labels

### Tabs / Navigation secondaire
- Fond transparent par défaut, indicateur actif sous-ligne `Ocean Blue` 2px
- Ou pills avec fond `rgba(6,142,234,0.12)` et texte `Electric Blue` pour l'actif

### Graphiques (Recharts)
- Fond transparent (hérite du fond parent)
- Grilles : `Structure Line`, strokeDasharray `3 3`
- Axes : `Muted Text`, fontSize 10-12px
- Tooltips : fond `#111D33`, border `Structure Line`, radius 10px
- Courbes : strokeWidth 2, dots uniquement au hover

### État Vide (Empty States)
- Icône Lucide 40px, opacity 25%
- Titre court en `Primary Text`
- Sous-titre en `Secondary Text`
- CTA optionnel en bouton secondaire

### Skeleton / Loading
- Shimmer sur fond `Elevated Layer` → `Structure Line` → `Elevated Layer`
- Jamais de spinner circulaire générique
- Dimensions et shapes exactes du contenu attendu

### Event Theming Overlay
- Quand `--event-bg` est une image : `background-image` avec `linear-gradient(to bottom, rgba(5,8,15,0.82), rgba(5,8,15,0.92))` par-dessus pour maintenir la lisibilité
- Les cartes KPI en contexte événement ajoutent `backdrop-filter: blur(12px)` et `background: rgba(13,21,38,0.75)`
- La bannière événement (si activée) : zone horizontale en haut de la page avec l'image + le nom de l'événement superposé

## 5. Layout Principles

- **Sidebar** : 240px expanded / 64px collapsed. Fixe, `Void Black`.
- **Main content** : `padding: 24px` standard, `padding: 16px` sur mobile.
- **Grid KPIs** : `repeat(4, 1fr)` sur desktop → `repeat(2, 1fr)` tablette → `1fr` mobile. Jamais 3 colonnes égales.
- **Graphiques** : pleine largeur ou split `3fr 2fr`. Jamais centré avec marge auto symétrique.
- **Sections** : espacées par `gap: 20-24px`, jamais par margin collapsing.
- **Max width content** : `1400px` centré.
- **Hauteur complète** : `min-h-[100dvh]` — jamais `h-screen`.

## 6. Distribution Channels — Architecture UI

La section **Billetterie** est structurée autour des **canaux de distribution** :

```
Tabs : [Vue Consolidée] [Weezevent] [Bizouk] [CSE] [Physique] [+ Ajouter canal]
```

- Chaque canal a : nom libre + type plateforme + couleur d'accent optionnelle
- La vue consolidée agrège tous les canaux (same KPI structure, summed)
- L'import est toujours associé à un canal spécifique
- Le sélecteur de canal est visible avant l'upload

## 7. Event Theming System

### Données stockées par événement
```
{
  theme_image_url: string | null,   // Image de fond (direction artistique)
  theme_primary: string,            // Couleur principale (#hex)
  theme_secondary: string,          // Couleur secondaire
  theme_font: string,               // Font family (Google Font slug)
  theme_text_color: string,         // Couleur texte sur fond thème
  theme_text_size: 'sm'|'md'|'lg', // Échelle typo (modifie les em/rem)
  theme_banner: boolean,            // Afficher bannière événement
  theme_banner_height: number,      // px, 80-240
}
```

### Comportement dans l'UI
- Section "Direction Artistique" dans le formulaire de création/édition événement
- Preview temps réel de la bannière et du fond dans le formulaire
- Les rapports PDF générés héritent automatiquement du thème événement

## 8. Motion & Interaction

- **Spring par défaut :** `stiffness: 100, damping: 20` — précis, sans rebond excessif
- **Entrées de contenu :** `fadeUp` (opacity 0→1, translateY 20→0), staggered 80ms par élément
- **KPI counter :** CountUp sur les valeurs numériques lors du premier affichage
- **Sidebar collapse :** `transition: width 300ms cubic-bezier(0.16, 1, 0.3, 1)`
- **Charts :** barres et lignes s'animent en 600ms easing `ease-out` au mount
- **Tabs :** indicateur glisse (transform translateX) entre les onglets actifs
- **Skeleton :** shimmer `background-size: 200%` défilant

## 9. Anti-Patterns — Strictement Interdits

- ❌ Police `Inter` — remplacée par `Outfit` + `JetBrains Mono`
- ❌ Neon glow, outer shadows saturés sur les boutons
- ❌ `#000000` pur — utiliser `#05080F` (Void Black)
- ❌ Emoji dans l'interface (emojis tolérés uniquement dans les icônes de type d'événement)
- ❌ 3 colonnes exactement égales côte à côte pour les features
- ❌ Données inventées dans les KPIs — toujours `[—]` ou `0` si absent
- ❌ Sections "SYSTEM METRICS" avec données fabriquées
- ❌ Layout Hero centré pour les dashboards
- ❌ Spinner circulaire générique
- ❌ Floating labels dans les formulaires
- ❌ Gradient text sur les titres principaux des dashboards
- ❌ Texte "Scroll to explore", flèches de scroll, bouncing chevrons
- ❌ Noms génériques ("Festival Client A", "Événement Test") dans la démo — utiliser des noms métier réels anonymisés
- ❌ `calc()` percentage hacks en CSS
