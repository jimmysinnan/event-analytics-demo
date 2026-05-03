# Script de démonstration — Event Analytics

Durée estimée : **15 à 20 minutes**
Mode : `VITE_APP_MODE=demo` (données de démonstration pré-chargées)

---

## Avant la démo

1. Lancer `start.bat`
2. Attendre que le navigateur s'ouvre sur http://localhost:5174
3. Vérifier que le backend répond : http://localhost:8001 → `{"status":"ok"}`
4. L'application affiche l'édition **Festival Client 2025** par défaut

---

## Étape 1 — Sélectionner une édition

**Où :** Sélecteur d'année en haut à droite du Header

**Montrer :**
- Le sélecteur d'année (2023 / 2024 / 2025 / 2026)
- Changer l'année → les modules réagissent
- L'édition active est affichée en bas de la sidebar

**Message clé :**
> "L'application s'organise par édition. Vous pouvez comparer les années et basculer d'un clic."

---

## Étape 2 — Vue Globale

**Où :** Menu → Vue Globale (icône dashboard)

**Montrer :**
- 4 KPIs principaux : CA Consommation, Festivaliers, CA Billetterie, Clients
- Graphique évolution CA 2023 → 2025
- Comparatif inter-éditions
- Tableau de bord Pass Culture

**Message clé :**
> "En un coup d'œil, le niveau de performance de l'édition et la tendance sur 3 ans."

---

## Étape 3 — Billetterie

**Où :** Menu → Billetterie

**Montrer :**
- Onglet **Analyse** : KPIs billetterie, familles tarifaires, courbe de vente mensuelle
- Onglet **Suivi live** : tableau de bord d'import et suivi en temps réel
- Sélecteur de canal de vente

**Message clé :**
> "La billetterie est multi-source : Weezevent, Bizouk, BilletWeb, Eventbrite, Shotgun, etc."

---

## Étape 4 — Consommation

**Où :** Menu → Consommation

**Montrer :**
- CA par point de vente (graphique horizontal)
- Top familles de produits
- CA horaire (courbe de pic de 15h à 23h)
- Top articles par volume

**Message clé :**
> "Tous les bars en un tableau de bord. On voit immédiatement quelle zone génère le plus de CA et à quelle heure."

---

## Étape 5 — Profil Client

**Où :** Menu → Profil Client

**Montrer :**
- Répartition par genre (donut)
- Répartition par tranche d'âge (barres %)
- Comportement d'achat par tranche : CA total + panier moyen
- Préférences produit par tranche d'âge

**Changer l'année sur 2024 → EmptyState apparaît**
**Message clé :**
> "Quand les données ne sont pas disponibles, l'application le dit clairement. Pas de chiffre inventé."

---

## Étape 6 — Invitations

**Où :** Menu → Invitations

**Montrer :**
- KPIs : billets distribués, valeur économique, entrées réelles, CA généré
- Bilan de rentabilité : ratio retour / coût
- Consommation réelle des invités vs payants
- CA par point de vente pour les invités

**Message clé :**
> "Les invitations coûtent. L'outil mesure exactement ce qu'elles rapportent en consommation."

---

## Étape 7 — Stocks Édition+1

**Où :** Menu → Stocks Édition+1

**Montrer :**
- Tableau de prévisions par zone (2025 → 2026, facteur −10%)
- Sélecteur de bar → détail par heure + top produits
- Résumé global : total 2025 vs prévision 2026

**Message clé :**
> "Le module prépare la commande de l'édition suivante automatiquement, zone par zone, produit par produit."

---

## Étape 8 — Importer des données

**Où :** Menu → Importer données

**Montrer :**
- Bandeau édition active (édition à laquelle les données seront liées)
- Deux slots d'import : Consommation et Billetterie
- Formats acceptés affichés sur chaque slot
- *(Si fichier disponible)* Glisser-déposer un fichier → feedback KPIs immédiat

**Message clé :**
> "L'import prend 5 secondes. La source est détectée automatiquement. Les doublons sont éliminés si on importe le même fichier deux fois."

---

## Étape 9 — Générer une restitution IA

**Où :** Menu → Restitution PDF → section Analyse IA

**Montrer :**
1. Sélectionner le type de rapport (ex : **Résumé exécutif**)
2. Cliquer **Générer**
3. Observer l'effet "typing" du rapport en streaming
4. Changer de type (ex : **Recommandations**)
5. *(Optionnel)* Importer une image d'inspiration → le rapport adapte son ton

**Message clé :**
> "L'IA analyse les données réelles de l'édition et produit un rapport professionnel en 30 secondes. 7 types de rapports selon la cible : direction, partenaires, équipe opérationnelle."

---

## Étape 10 — Exporter les données brutes

**Où :** Menu → Restitution PDF → bouton "Exporter données brutes (.txt)"

**Montrer :**
- Téléchargement d'un fichier `.txt` structuré
- Contenu : KPIs globaux, données par module, contexte édition

**Message clé :**
> "Toutes les données utilisées par l'IA sont exportables. Pour audit, pour réutilisation dans d'autres outils, ou pour debug."

---

## Questions fréquentes en démo

**"Les données sont-elles réelles ?"**
→ En mode démo, les données sont représentatives d'un vrai festival (anonymisées). Votre installation sera vierge et alimentée par vos propres fichiers.

**"Combien de temps pour configurer avec nos données ?"**
→ Installation : 30 minutes. Import des données : 5 minutes. Première analyse IA : immédiate.

**"Quels formats de fichiers ?"**
→ Excel (.xlsx, .xls), CSV, Parquet, JSON. Sources billetterie : Weezevent, Bizouk, BilletWeb, Eventbrite, Shotgun, HelloAsso, Yurplan et plus.

**"Les données restent sur notre poste ?"**
→ Oui. La seule connexion externe est vers l'API Claude (Anthropic) pour générer les rapports IA.
