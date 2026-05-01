# PROMPT CLAUDE CODE — IA D’ANALYSE DES MODULES ET GÉNÉRATION DE RAPPORTS PDF

Tu es Claude Code.

Tu dois faire évoluer l’application Event Analytics afin d’intégrer une couche IA capable d’analyser automatiquement les données, KPI, graphiques et visualisations de chaque module réel d’une édition événementielle, puis de produire des rapports professionnels dans la page “Restitution PDF”.

Agis comme :
- senior data analyst ;
- expert BI ;
- storyteller data ;
- consultant en performance événementielle ;
- product engineer ;
- expert en génération de rapports automatisés ;
- architecte logiciel pragmatique.

L’objectif n’est pas de générer un résumé générique.

L’objectif est de permettre à l’IA de produire une analyse professionnelle, structurée, contextualisée et exploitable par :
- un organisateur d’événement ;
- une direction administrative et financière ;
- un comité de pilotage ;
- un sponsor ;
- un partenaire ;
- une équipe de production ;
- une équipe marketing.

L’IA doit écrire comme un data analyst expert et un storyteller data senior.

Elle doit expliquer :
- ce qui s’est passé ;
- pourquoi c’est important ;
- ce que cela révèle ;
- quelles décisions cela implique ;
- quelles actions recommander pour la prochaine édition.

---

# CONTEXTE PRODUIT

Event Analytics est une application de pilotage événementiel.

Elle permet d’analyser les données d’une édition d’événement à travers plusieurs modules.

Les modules visibles dans l’application sont :

1. Événements
2. Vue Globale
3. Billetterie
4. Consommation
5. Profil Client
6. Invitations
7. Stocks Édition+1
8. Restitution PDF
9. Historique
10. Importer données
11. Paramètres

Important : l’application ne doit pas inventer de modules absents.  
L’IA doit se baser prioritairement sur les modules réellement visibles dans la sidebar actuelle.

Les modules métier réellement à analyser sont :

- Vue Globale
- Billetterie
- Consommation
- Profil Client
- Invitations
- Stocks Édition+1
- Historique, uniquement si des comparaisons entre éditions sont disponibles

Les modules suivants sont des modules fonctionnels ou contextuels :

- Événements
- Restitution PDF
- Importer données
- Paramètres

Ils peuvent fournir du contexte ou servir d’interface, mais ne doivent pas être traités comme des sources analytiques principales.

---

# OBJECTIF PRINCIPAL

Créer une fonctionnalité d’analyse IA qui :

1. Récupère les données utilisées par chaque graphique.
2. Récupère les KPI calculés dans chaque module.
3. Récupère les tableaux, agrégats et séries utilisés dans les visualisations.
4. Analyse les tendances visibles dans chaque module.
5. Identifie les faits marquants.
6. Détecte les anomalies, signaux faibles et points d’attention.
7. Identifie les pertes invisibles et opportunités non exploitées.
8. Produit une analyse écrite claire, professionnelle et orientée décision.
9. Transforme ces analyses en rapports structurés dans la page “Restitution PDF”.
10. Permet de générer plusieurs types de rapports selon la cible.
11. Prépare une future exportation PDF / Word.
12. Prépare une logique d’audit via export des données brutes utilisées par l’IA.

L’IA ne doit pas simplement “lire les graphiques” comme des images.

Elle doit analyser les données derrière les graphiques :
- KPI ;
- séries ;
- agrégats ;
- tableaux ;
- segments ;
- dimensions ;
- filtres ;
- comparaisons ;
- tendances calculées.

C’est indispensable pour éviter les hallucinations.

---

# PRINCIPE ABSOLU

L’IA ne doit jamais inventer de chiffres.

Elle doit uniquement utiliser :
- les données réellement présentes dans l’application ;
- les KPI calculés ;
- les séries utilisées dans les graphiques ;
- les tableaux déjà disponibles ;
- les métadonnées de l’événement ;
- les informations de l’édition ;
- les comparaisons historiques réellement disponibles.

Si une donnée est absente, incomplète ou insuffisante, elle doit le signaler clairement.

Elle doit distinguer :

1. Fait observé
2. Interprétation
3. Hypothèse
4. Recommandation
5. Limite de l’analyse

Elle ne doit jamais transformer une hypothèse en certitude.

---

# ARCHITECTURE ATTENDUE

Avant de coder, inspecte le projet pour identifier :

1. Où sont stockées les données importées.
2. Où sont calculés les KPI.
3. Où sont construits les graphiques.
4. Quels composants correspondent à chaque module.
5. Comment la page “Restitution PDF” est structurée.
6. S’il existe déjà une logique d’export PDF.
7. S’il existe déjà une logique d’export des données brutes.
8. Si une API IA existe déjà ou doit être ajoutée.
9. Si le projet est front-only ou possède un backend.
10. Comment sont organisées les données par édition active.

Ensuite, propose une architecture propre avant de modifier le code.

---

# CONCEPT À METTRE EN PLACE : ANALYSIS LAYER

Créer une couche logique indépendante appelée par exemple :

- `analysisEngine`
- `insightEngine`
- `reportGenerationEngine`
- `moduleAnalysisService`
- `editionReportService`

Cette couche doit être indépendante des composants graphiques.

Elle ne doit pas dépendre du rendu visuel des graphiques.

Elle doit analyser les données structurées derrière les graphiques.

Architecture souhaitée :

Raw Data  
→ KPI Calculation  
→ Chart Data  
→ Module Analysis  
→ Global Edition Analysis  
→ Report Generation  
→ Restitution PDF Page  
→ Export PDF / TXT

---

# DONNÉES À TRANSMETTRE À L’IA

Pour chaque rapport, préparer un objet structuré contenant les éléments suivants.

---

## 1. Métadonnées de l’événement

Inclure si disponible :

- nom de l’événement ;
- nom de l’édition ;
- année active ;
- date ou période ;
- type d’événement ;
- organisation cliente ;
- jauge prévue ;
- jauge réelle ;
- chiffre d’affaires global ;
- chiffre d’affaires billetterie ;
- chiffre d’affaires consommation ;
- nombre de participants ou festivaliers ;
- nombre de billets vendus ;
- nombre de transactions ;
- panier moyen ;
- sources de données disponibles ;
- modules disponibles ;
- limites éventuelles des données.

---

## 2. Informations du module

Pour chaque module analysé :

- nom du module ;
- objectif du module ;
- KPI principaux ;
- graphiques disponibles ;
- tableaux disponibles ;
- période couverte ;
- filtres actifs ;
- niveau de fiabilité des données ;
- données manquantes éventuelles.

---

## 3. Données des graphiques

Pour chaque graphique :

- identifiant du graphique ;
- titre du graphique ;
- description métier ;
- type de graphique ;
- dimensions ;
- mesures ;
- valeurs ;
- tendances principales ;
- minimum ;
- maximum ;
- moyenne ;
- évolution ;
- écarts ;
- top éléments ;
- bottom éléments ;
- anomalies détectées.

---

## 4. Données complémentaires

Inclure si disponible :

- segment analysé ;
- comparaison avec édition précédente ;
- alertes détectées ;
- anomalies statistiques ;
- données manquantes ;
- hypothèses connues ;
- niveau de confiance.

---

# MODULES RÉELS À ANALYSER

## 1. Module Événements

Rôle :
Fournir le contexte de l’édition active.

Données utiles possibles :
- nom de l’événement ;
- nom de l’édition ;
- année active ;
- type d’événement ;
- période ;
- jauge prévue ;
- organisation cliente ;
- statut de l’édition ;
- historique disponible.

L’IA doit utiliser ce module comme contexte.

Elle ne doit pas produire une analyse métier spécifique du module Événements, sauf si des indicateurs événementiels sont présents.

---

## 2. Module Vue Globale

Rôle :
Analyser la performance générale de l’édition.

L’IA doit analyser :
- chiffre d’affaires global ;
- chiffre d’affaires billetterie ;
- chiffre d’affaires consommation ;
- fréquentation ;
- nombre de festivaliers ou participants ;
- nombre de billets vendus ;
- nombre de transactions ;
- panier moyen ;
- tendance horaire ;
- répartition globale des revenus ;
- dynamique globale ;
- principaux points forts ;
- principales alertes ;
- niveau de performance général.

Ce module doit alimenter :
- Résumé exécutif ;
- Rapport post-événement ;
- Chiffres globaux du festival ;
- Prévision prochaine édition ;
- Recommandations globales ;
- Rapport partenaires / sponsors.

---

## 3. Module Billetterie

Rôle :
Analyser les ventes, la fréquentation payante et la dynamique commerciale avant événement.

L’IA doit analyser :
- billets vendus ;
- chiffre d’affaires billetterie ;
- catégories de billets ;
- évolution des ventes ;
- rythme de vente ;
- périodes de vente fortes/faibles ;
- canaux de vente si disponibles ;
- taux de remplissage si jauge disponible ;
- part des invitations ou gratuités si disponible ;
- comparaison avec objectif ou historique si disponible.

Elle doit identifier :
- les catégories de billets les plus performantes ;
- les périodes de vente critiques ;
- les opportunités de pricing ;
- les risques liés aux ventes tardives ;
- les signaux d’essoufflement ou d’accélération.

Ce module doit alimenter :
- Résumé exécutif ;
- Rapport post-événement ;
- Prévision prochaine édition ;
- Recommandations ;
- Chiffres globaux du festival ;
- Pertes invisibles si des canaux faibles ou opportunités de pricing sont détectés.

---

## 4. Module Consommation

Rôle :
Analyser les ventes sur site, les bars, produits, points de vente et comportements de dépense.

L’IA doit analyser :
- chiffre d’affaires consommation ;
- nombre de transactions ;
- panier moyen ;
- top produits ;
- produits faibles ;
- chiffre d’affaires par point de vente ;
- chiffre d’affaires par zone ;
- horaires de forte consommation ;
- périodes creuses ;
- segmentation par niveau de dépense ;
- comportement d’achat ;
- écarts entre points de vente ;
- opportunités d’augmentation du panier moyen.

Elle doit identifier :
- produits stars ;
- produits sous-performants ;
- points de vente leaders ;
- points de vente faibles ;
- zones chaudes ;
- zones froides ;
- horaires critiques ;
- leviers pour augmenter le panier moyen.

Ce module doit alimenter :
- Rapport post-événement ;
- Performance des points de vente ;
- Pertes invisibles ;
- Recommandations ;
- Prévision prochaine édition ;
- Profil client de l’édition si des données de segmentation sont disponibles ;
- Rapport partenaires / sponsors si des données de comportement public sont pertinentes.

---

## 5. Module Profil Client

Rôle :
Analyser les profils, segments et comportements des participants.

L’IA doit analyser :
- âge ;
- genre ;
- localisation si disponible ;
- segmentation client ;
- comportement d’achat ;
- panier moyen par segment ;
- consommation par profil ;
- préférences produit ;
- heures chaudes par profil ;
- profils les plus rentables ;
- profils sous-exploités ;
- implications marketing, pricing, communication et programmation.

Elle doit produire :
- une lecture marketing claire ;
- des segments prioritaires ;
- des segments à développer ;
- des recommandations de communication ;
- des recommandations d’offre ou de programmation.

Ce module doit alimenter :
- Persona client ;
- Profil client de l’édition ;
- Rapport post-événement ;
- Rapport partenaires / sponsors ;
- Recommandations marketing ;
- Prévision prochaine édition.

---

## 6. Module Invitations

Rôle :
Analyser les invitations, gratuités, accréditations et leur impact sur la performance.

L’IA doit analyser :
- nombre d’invitations ;
- invitations utilisées ;
- invitations non utilisées ;
- poids des invitations dans la fréquentation ;
- impact potentiel sur le chiffre d’affaires ;
- consommation des invités si disponible ;
- invitations par point de vente ou zone si disponible ;
- catégories d’invités ;
- partenaires ou profils invités ;
- surdistribution éventuelle ;
- manque à gagner potentiel ;
- rentabilité indirecte.

Elle doit identifier :
- invitations utiles ;
- invitations peu rentables ;
- surdistribution éventuelle ;
- manque de traçabilité ;
- pistes pour mieux piloter les invitations à la prochaine édition.

Ce module doit alimenter :
- Pertes invisibles ;
- Résumé exécutif ;
- Rapport post-événement ;
- Chiffres globaux du festival ;
- Rapport partenaires / sponsors ;
- Recommandations ;
- Prévision prochaine édition.

---

## 7. Module Stocks Édition+1

Rôle :
Préparer les besoins de stock pour l’édition suivante à partir des données de consommation.

L’IA doit analyser :
- produits consommés ;
- volumes vendus ;
- produits forts ;
- produits faibles ;
- stock théorique nécessaire ;
- risque de rupture ;
- risque de surstock ;
- recommandations de commandes ;
- ajustements par point de vente ou zone ;
- cohérence entre ventes passées et stock futur ;
- opportunités de rationalisation de l’offre produit.

Elle doit produire :
- recommandations de commande ;
- alertes sur surstock ou rupture ;
- recommandations par produit ;
- recommandations par zone ou point de vente si disponible.

Ce module doit alimenter :
- Prévision prochaine édition ;
- Recommandations ;
- Rapport post-événement ;
- Pertes invisibles ;
- Performance des points de vente.

---

## 8. Module Historique

Rôle :
Comparer les éditions entre elles lorsque les données sont disponibles.

L’IA doit analyser :
- évolution du chiffre d’affaires ;
- évolution de la fréquentation ;
- évolution de la billetterie ;
- évolution de la consommation ;
- évolution du panier moyen ;
- évolution des invitations ;
- évolution des profils clients ;
- progression ou recul par rapport aux éditions précédentes ;
- éléments stables ;
- ruptures ou changements forts.

Ce module doit alimenter :
- Résumé exécutif ;
- Rapport post-événement ;
- Prévision prochaine édition ;
- Recommandations ;
- Chiffres globaux du festival.

Règle :
Si aucun historique n’est disponible, l’IA doit le signaler clairement et ne pas inventer de comparaison.

---

# PAGE RESTITUTION PDF — RAPPORTS À GÉNÉRER

La page “Restitution PDF” doit permettre de sélectionner et générer les rapports suivants :

1. Résumé exécutif
2. Recommandations
3. Pertes invisibles
4. Persona client
5. Rapport post-événement
6. Prévision prochaine édition
7. Rapport partenaires / sponsors

Elle doit aussi permettre de générer les présentations PDF spécifiques suivantes :

8. Chiffres globaux du festival
9. Performance des points de vente
10. Profil client de l’édition

Chaque rapport doit être généré à partir des modules réellement disponibles et des données de l’édition active.

---

# TYPES DE RAPPORTS À GÉNÉRER

## 1. Résumé exécutif

Modules sources prioritaires :
- Vue Globale
- Billetterie
- Consommation
- Invitations
- Historique si disponible

Objectif :
Produire une synthèse décisionnelle courte, claire et directement exploitable par un organisateur, une direction, une DAF ou un comité de pilotage.

Contenu attendu :
- bilan global de l’édition ;
- niveau de performance ;
- chiffre d’affaires global ;
- fréquentation ;
- billetterie ;
- consommation ;
- panier moyen ;
- principaux points forts ;
- principales alertes ;
- enseignement central de l’édition ;
- 3 à 5 décisions prioritaires à prendre ;
- limites de données.

Ton :
- stratégique ;
- synthétique ;
- clair ;
- orienté décision ;
- accessible à un décideur non technique.

Structure recommandée :
1. Synthèse générale.
2. Chiffres clés.
3. Ce qui a bien fonctionné.
4. Ce qui doit alerter.
5. Priorités pour la prochaine édition.
6. Limites de l’analyse.

---

## 2. Recommandations

Modules sources prioritaires :
- Vue Globale
- Billetterie
- Consommation
- Profil Client
- Invitations
- Stocks Édition+1
- Historique si disponible

Objectif :
Produire une liste de priorités actionnables pour améliorer la prochaine édition.

Contenu attendu :
- 3 à 10 recommandations priorisées ;
- classement par priorité : haute, moyenne, basse ;
- lien entre chaque recommandation et un constat data ;
- action concrète à mettre en place ;
- impact attendu ;
- difficulté de mise en œuvre ;
- délai recommandé ;
- module concerné.

Chaque recommandation doit suivre cette structure :
- constat ;
- interprétation ;
- action recommandée ;
- impact attendu ;
- difficulté ;
- priorité.

Exemple de bonne recommandation :
“La billetterie semble concentrer une part importante de sa dynamique sur les dernières périodes de vente. Si cette tendance est confirmée par les données, la prochaine édition devrait renforcer les incitations early bird et structurer des relances commerciales plus tôt afin de sécuriser le chiffre d’affaires avant l’événement.”

---

## 3. Pertes invisibles

Modules sources prioritaires :
- Consommation
- Invitations
- Stocks Édition+1
- Billetterie
- Profil Client

Objectif :
Identifier les revenus manqués, coûts cachés et opportunités non exploitées.

L’IA doit détecter, lorsque les données le permettent :
- invitations peu rentables ;
- invitations utilisées sans consommation associée ;
- surdistribution d’accréditations ;
- produits sous-performants ;
- produits vendus mais peu rentables si marge disponible ;
- stocks mal calibrés ;
- ruptures potentielles ;
- surstocks ;
- canaux de vente faibles ;
- segments clients sous-exploités ;
- points de vente sous-performants ;
- périodes creuses ;
- baisse du panier moyen ;
- opportunités de pricing ;
- manque de conversion d’un segment client ;
- partenaires ou sponsors insuffisamment valorisés.

Structure attendue :
1. Type de perte invisible.
2. Constat data.
3. Impact potentiel.
4. Hypothèse d’explication.
5. Action corrective.
6. Niveau de priorité.

Règle importante :
Si l’impact financier ne peut pas être calculé précisément, l’IA doit l’indiquer clairement et parler d’impact potentiel ou d’opportunité à investiguer, sans inventer de montant.

---

## 4. Persona client

Modules sources prioritaires :
- Profil Client
- Consommation
- Billetterie

Objectif :
Produire une lecture marketing du public de l’édition.

L’IA doit analyser :
- âge ;
- genre si disponible ;
- localisation si disponible ;
- origine géographique si disponible ;
- comportement d’achat ;
- panier moyen ;
- consommation par segment ;
- préférence produit ;
- comportement horaire ;
- poids des différents segments ;
- segments les plus rentables ;
- segments sous-exploités ;
- implications pour communication, pricing, programmation et expérience événementielle.

Contenu attendu :
- profil type du participant ;
- persona principal ;
- personas secondaires ;
- segmentation des publics ;
- profils à forte valeur ;
- profils à développer ;
- comportements d’achat ;
- recommandations marketing ;
- recommandations commerciales ;
- recommandations expérience client.

Structure recommandée :
1. Persona principal.
2. Personas secondaires.
3. Segments à forte valeur.
4. Segments sous-exploités.
5. Implications marketing.
6. Recommandations pour la prochaine édition.

---

## 5. Rapport post-événement

Modules sources prioritaires :
- Vue Globale
- Billetterie
- Consommation
- Profil Client
- Invitations
- Stocks Édition+1
- Historique si disponible

Objectif :
Produire un rapport complet après l’événement, couvrant l’ensemble des dimensions de performance.

Contenu attendu :
- chiffre d’affaires global ;
- fréquentation ;
- billetterie ;
- consommation ;
- panier moyen ;
- produits forts/faibles ;
- canaux de vente ;
- invitations ;
- profils clients ;
- stocks ;
- points de vente ;
- tendances horaires ;
- comparaison avec objectifs ou éditions précédentes si disponible ;
- points forts ;
- points faibles ;
- recommandations ;
- limites de données.

Ton :
- analytique ;
- professionnel ;
- structuré ;
- orienté apprentissage et amélioration continue.

Structure recommandée :
1. Synthèse exécutive.
2. Chiffres clés.
3. Analyse de la billetterie.
4. Analyse de la consommation.
5. Analyse des points de vente.
6. Analyse du profil client.
7. Analyse des invitations.
8. Analyse des stocks.
9. Pertes invisibles.
10. Recommandations.
11. Plan d’action prochaine édition.
12. Limites de l’analyse.

---

## 6. Prévision prochaine édition

Modules sources prioritaires :
- Consommation
- Stocks Édition+1
- Billetterie
- Profil Client
- Invitations
- Historique si disponible

Objectif :
Aider l’organisateur à préparer l’édition suivante à partir des données observées.

L’IA doit produire des recommandations prospectives sur :
- ventes attendues ;
- rythme de billetterie ;
- fréquentation probable ;
- stocks à prévoir ;
- produits à renforcer ;
- produits à réduire ;
- points de tension ;
- points de vente à optimiser ;
- horaires critiques ;
- pricing ;
- invitations ;
- communication ;
- segmentation client ;
- partenaires ;
- scénarios d’amélioration.

Structure attendue :
1. Hypothèses de départ.
2. Enseignements de l’édition analysée.
3. Points à reconduire.
4. Points à corriger.
5. Scénarios pour la prochaine édition.
6. Recommandations de stocks.
7. Recommandations billetterie.
8. Recommandations consommation.
9. Recommandations marketing.
10. Plan d’action avant prochaine édition.
11. Limites de prévision.

Règle importante :
L’IA doit distinguer clairement les prévisions calculées, les estimations et les hypothèses.

---

## 7. Rapport partenaires / sponsors

Modules sources prioritaires :
- Vue Globale
- Profil Client
- Consommation
- Invitations
- Historique si disponible

Objectif :
Générer un rapport valorisable auprès de partenaires, sponsors, financeurs ou collectivités.

L’IA doit produire une analyse orientée impact, visibilité et valeur générée.

Contenu attendu :
- fréquentation globale ;
- profil public ;
- segments touchés ;
- exposition potentielle ;
- indicateurs clés ;
- retombées mesurables ;
- niveau d’engagement ;
- contribution à l’expérience événementielle ;
- éléments valorisables pour renouvellement ;
- opportunités d’activation futures.

Ton :
- professionnel ;
- positif ;
- crédible ;
- valorisant sans exagération ;
- orienté partenaire.

Structure recommandée :
1. Contexte de l’événement.
2. Chiffres clés valorisables.
3. Profil du public touché.
4. Retombées et exposition.
5. Moments ou zones de forte visibilité.
6. Valeur générée pour les partenaires.
7. Recommandations pour renforcer l’activation partenaire.
8. Conclusion orientée renouvellement.
9. Limites de données.

Règle importante :
Ne pas survaloriser un partenaire si aucune donnée ne le justifie.  
Si les données partenaires sont insuffisantes, générer un rapport prudent basé sur les indicateurs disponibles.

---

# PRÉSENTATIONS PDF SPÉCIFIQUES À GÉNÉRER

La page Restitution PDF affiche aussi 3 présentations spécifiques :

1. Chiffres globaux du festival
2. Performance des points de vente
3. Profil client de l’édition

Ces présentations doivent être générées comme des livrables PDF professionnels, structurés en pages.

Chaque page doit contenir :
- un titre clair ;
- 1 à 3 messages clés ;
- les chiffres essentiels ;
- une lecture analytique ;
- une recommandation ou un enseignement ;
- éventuellement un emplacement graphique ou une visualisation recommandée.

---

## 8. Présentation PDF — Chiffres globaux du festival

Nombre cible :
3 pages.

Modules sources prioritaires :
- Vue Globale
- Billetterie
- Consommation
- Invitations
- Historique si disponible

Objectif :
Donner une vue synthétique de l’édition à partir des indicateurs globaux.

Contenu attendu :
- KPI globaux ;
- chiffre d’affaires consommation ;
- chiffre d’affaires billetterie ;
- chiffre d’affaires total si disponible ;
- nombre de festivaliers ;
- nombre de billets vendus ;
- nombre de transactions ;
- panier moyen ;
- tendance horaire ;
- invitations et accréditations ;
- faits marquants de l’édition ;
- recommandations générales.

Structure recommandée :

### Page 1 — Vue d’ensemble de l’édition
- titre de l’événement et de l’édition ;
- chiffres clés ;
- lecture synthétique de la performance globale.

### Page 2 — Tendances et dynamiques
- tendance horaire bars / consommation ;
- dynamique billetterie ;
- fréquentation ;
- pics d’activité ;
- périodes faibles.

### Page 3 — Enseignements et recommandations
- analyse invitations par point de vente si disponible ;
- principaux enseignements ;
- recommandations pour la prochaine édition.

L’IA doit produire :
- titres de pages ;
- textes de synthèse ;
- commentaires data ;
- recommandations ;
- éléments à mettre en avant visuellement ;
- visuels recommandés si les graphiques sont disponibles.

---

## 9. Présentation PDF — Performance des points de vente

Nombre cible :
7 pages.

Modules sources prioritaires :
- Consommation
- Profil Client si segmentation disponible
- Stocks Édition+1
- Invitations si données par point de vente disponibles

Objectif :
Analyser en détail la performance commerciale par bar, zone ou point de vente.

Contenu attendu :
- CA par point de vente ;
- analyse détaillée par bar et zone ;
- top points de vente ;
- points de vente sous-performants ;
- top produits par point de vente ;
- panier moyen par point de vente ;
- transactions par point de vente ;
- horaires de forte activité ;
- zones chaudes et zones faibles ;
- segmentation clients par tranche de dépense ;
- recommandations budgétaires et opérationnelles.

Zones ou points de vente à prendre en compte si présents dans les données :
- Zone Nord ;
- Zone VIP ;
- Zone Sud ;
- Zone VIP Interne ;
- Zone Centrale ;
- Partenaire ;
- tout autre point de vente présent dans les données.

Structure recommandée :

### Page 1 — Synthèse des points de vente
- CA total par point de vente ;
- points de vente leaders ;
- points de vente faibles ;
- lecture globale.

### Page 2 — Analyse Zone Nord / Zone VIP / Zone Sud
- comparaison des zones ;
- écarts de performance ;
- hypothèses d’explication ;
- recommandations.

### Page 3 — Analyse Zone VIP Interne / Zone Centrale / Partenaire
- performance des zones spécifiques ;
- points forts ;
- points faibles ;
- recommandations.

### Page 4 — Produits les plus performants
- top produits ;
- contribution au CA ;
- différences entre zones ;
- produits à renforcer.

### Page 5 — Segmentation clients par tranche de dépense
- petits consommateurs ;
- consommateurs moyens ;
- gros consommateurs ;
- comportements par zone ;
- implications commerciales.

### Page 6 — Tensions horaires et flux
- pics de transactions ;
- horaires chauds ;
- creux ;
- implications staff / stock.

### Page 7 — Recommandations opérationnelles
- ajustement des stocks ;
- staffing ;
- implantation ;
- pricing ;
- offres packagées ;
- actions pour augmenter le panier moyen.

L’IA doit produire une analyse détaillée par point de vente, en évitant les généralités.

---

## 10. Présentation PDF — Profil client de l’édition

Nombre cible :
3 pages.

Modules sources prioritaires :
- Profil Client
- Consommation
- Billetterie

Objectif :
Analyser la démographie, les comportements d’achat, les préférences de consommation et les recommandations stratégiques par profil.

Contenu attendu :
- persona ;
- âge ;
- genre ;
- localisation si disponible ;
- comportement d’achat ;
- préférences de consommation ;
- poids du CA par tranche ;
- heures chaudes ;
- recommandations stratégiques par profil.

Structure recommandée :

### Page 1 — Persona et profil global
- persona principal ;
- répartition âge ;
- répartition genre ;
- profil dominant ;
- lecture marketing.

### Page 2 — Comportement d’achat
- chiffre d’affaires par tranche ;
- panier moyen par profil ;
- consommation par segment ;
- heures chaudes ;
- préférences de produits.

### Page 3 — Recommandations stratégiques par profil
- segments à fidéliser ;
- segments à développer ;
- messages marketing recommandés ;
- offres commerciales possibles ;
- implications programmation / expérience client.

L’IA doit produire :
- une lecture marketing claire ;
- des recommandations activables ;
- des hypothèses prudentes si les données sont incomplètes.

---

# IMAGE D’INSPIRATION OPTIONNELLE

La page Restitution PDF permet d’importer une image d’inspiration optionnelle.

Cette image peut être :
- une affiche d’événement ;
- un visuel de marque ;
- une charte graphique ;
- une référence esthétique ;
- un exemple de mise en page.

L’IA ou le système de génération doit utiliser cette image uniquement pour adapter :
- le ton visuel ;
- le style de mise en page ;
- l’ambiance graphique ;
- éventuellement les couleurs si elles peuvent être extraites ;
- la cohérence du livrable avec l’univers de l’événement.

Règle importante :
L’image d’inspiration ne doit pas remplacer les données.
Elle ne doit jamais influencer l’analyse chiffrée.
Elle sert uniquement à adapter la forme du rapport, pas le fond.

---

# EXPORT DES DONNÉES BRUTES

La page contient une fonctionnalité “Exporter données brutes (.txt)”.

Cette fonctionnalité doit permettre d’exporter les données structurées utilisées pour générer le rapport.

Le fichier exporté doit idéalement inclure :
- métadonnées de l’événement ;
- modules inclus ;
- KPI globaux ;
- données agrégées par module ;
- données de graphiques ;
- tendances calculées ;
- anomalies détectées ;
- limites de données ;
- prompt ou contexte envoyé à l’IA si pertinent.

Objectif :
Permettre :
- audit ;
- transparence ;
- debug ;
- amélioration des prompts ;
- réutilisation dans Claude, ChatGPT ou autre moteur IA.

---

# COMPORTEMENT DU BOUTON “GÉNÉRER”

Lorsque l’utilisateur sélectionne un type de rapport, le bouton doit s’adapter.

Exemples :
- “Générer — Résumé exécutif”
- “Générer — Recommandations”
- “Générer — Pertes invisibles”
- “Générer — Persona client”
- “Générer — Rapport post-événement”
- “Générer — Prévision prochaine édition”
- “Générer — Rapport partenaires / sponsors”
- “Générer — Chiffres globaux du festival”
- “Générer — Performance des points de vente”
- “Générer — Profil client de l’édition”

Au clic, le système doit :
1. identifier le rapport sélectionné ;
2. récupérer les données pertinentes ;
3. vérifier si les données nécessaires sont disponibles ;
4. construire le contexte IA ;
5. générer le contenu structuré ;
6. afficher le rapport dans l’interface ;
7. permettre l’export PDF si disponible ;
8. afficher une alerte claire si les données sont insuffisantes.

---

# STRUCTURE PROFESSIONNELLE DES RAPPORTS

Chaque rapport généré doit suivre une structure professionnelle.

Structure générale recommandée :

## 1. Titre du rapport

Exemple :
“Rapport de performance — ADI Music Festival 2026”

## 2. Synthèse exécutive

En 5 à 10 lignes :
- bilan global ;
- enseignement principal ;
- niveau de performance ;
- point d’attention majeur ;
- priorité prochaine édition.

## 3. Chiffres clés

Présenter les KPI majeurs :
- CA global ;
- fréquentation ;
- billets vendus ;
- CA consommation ;
- panier moyen ;
- nombre de transactions ;
- taux d’invitation si disponible ;
- taux de remplissage si disponible ;
- évolution vs édition précédente si disponible.

## 4. Analyse par module

Pour chaque module :
- faits observés ;
- interprétation ;
- implications ;
- recommandations ;
- limites.

## 5. Points forts

Liste des éléments qui ont bien fonctionné.

## 6. Points d’attention

Liste des risques, faiblesses ou zones à investiguer.

## 7. Pertes invisibles détectées

Exemples :
- invitations peu rentables ;
- produits sous-performants ;
- stocks mal calibrés ;
- canaux de vente faibles ;
- baisse du panier moyen ;
- zones ou périodes creuses.

## 8. Recommandations

Recommandations priorisées :
- priorité haute ;
- priorité moyenne ;
- priorité basse.

Chaque recommandation doit inclure :
- constat ;
- action proposée ;
- impact attendu ;
- difficulté de mise en œuvre.

## 9. Plan d’action prochaine édition

Plan clair en 5 à 10 actions.

## 10. Limites de l’analyse

Mentionner :
- données manquantes ;
- hypothèses ;
- limites méthodologiques ;
- données non disponibles.

---

# STYLE RÉDACTIONNEL ATTENDU

L’IA doit écrire comme un data analyst expert.

Le style doit être :
- clair ;
- professionnel ;
- analytique ;
- pédagogique ;
- orienté décision ;
- précis ;
- sans jargon inutile ;
- avec du storytelling data.

Éviter :
- les phrases génériques ;
- les banalités ;
- les répétitions ;
- les recommandations vagues ;
- les affirmations non justifiées par les données ;
- le ton robotique.

Exemple de mauvaise phrase :
“Les ventes sont bonnes et il faut continuer les efforts.”

Exemple de bonne phrase :
“La billetterie concentre l’essentiel de sa dynamique sur les dernières semaines avant l’événement, ce qui indique une forte dépendance aux achats tardifs. Pour réduire le risque de remplissage, la prochaine édition devrait renforcer les incitations early bird et structurer des relances commerciales plus tôt dans le cycle de vente.”

---

# FORMAT JSON RECOMMANDÉ

L’IA ne doit pas retourner uniquement du texte brut.

Elle doit idéalement retourner une structure JSON exploitable par l’interface.

Format recommandé :

```json
{
  "report_type": "executive_summary",
  "report_title": "Résumé exécutif — Festival Client 2025",
  "target_audience": "Direction / comité de pilotage",
  "page_count": 3,
  "event_context": {
    "event_name": "Festival Client",
    "edition_name": "Festival Client 2025",
    "year": 2025,
    "available_modules": [
      "Vue Globale",
      "Billetterie",
      "Consommation",
      "Profil Client",
      "Invitations",
      "Stocks Édition+1",
      "Historique"
    ],
    "data_limits": []
  },
  "executive_summary": "...",
  "key_metrics": [
    {
      "label": "Chiffre d'affaires consommation",
      "value": 0,
      "unit": "EUR",
      "commentary": "..."
    }
  ],
  "module_analyses": [
    {
      "module": "Billetterie",
      "summary": "...",
      "observed_facts": ["...", "..."],
      "interpretations": ["...", "..."],
      "risks": ["..."],
      "recommendations": [
        {
          "priority": "high",
          "observation": "...",
          "action": "...",
          "expected_impact": "...",
          "implementation_difficulty": "medium"
        }
      ],
      "limits": []
    }
  ],
  "sections": [
    {
      "title": "Performance globale",
      "summary": "...",
      "key_findings": ["...", "..."],
      "recommendations": ["...", "..."]
    }
  ],
  "slides": [
    {
      "page": 1,
      "title": "Vue d’ensemble de l’édition",
      "main_message": "...",
      "key_metrics": ["...", "..."],
      "analysis_text": "...",
      "recommended_visuals": [
        {
          "title": "Évolution horaire de la consommation",
          "chart_type": "line",
          "data_source": "consumption_by_hour",
          "message": "..."
        }
      ]
    }
  ],
  "invisible_losses": [
    {
      "type": "Stock mal calibré",
      "observation": "...",
      "impact": "...",
      "recommendation": "..."
    }
  ],
  "global_recommendations": [
    {
      "priority": "high",
      "title": "...",
      "description": "...",
      "expected_impact": "...",
      "difficulty": "medium"
    }
  ],
  "next_edition_action_plan": [
    {
      "step": 1,
      "action": "...",
      "owner": "...",
      "timing": "..."
    }
  ],
  "analysis_limits": [
    "Certaines données de stock ne sont pas disponibles."
  ]
}