# Limites V1 — Event Analytics

Ce document liste honnêtement ce qui est prêt, ce qui est partiel et ce qui est prévu.

---

## ✅ Fonctionnalités prêtes

| Fonctionnalité | État |
|---|---|
| Import billetterie multi-source (12 plateformes) | ✅ Opérationnel |
| Import consommation (Weezpay/cashless) | ✅ Opérationnel |
| Déduplication automatique par ID de commande | ✅ Opérationnel |
| Rollback d'un import | ✅ Opérationnel |
| Historique des imports | ✅ Opérationnel |
| Suivi live billetterie (snapshots) | ✅ Opérationnel |
| Gestion multi-événements / multi-éditions | ✅ Opérationnel |
| Canaux de vente par édition | ✅ Opérationnel |
| Thème visuel par édition | ✅ Opérationnel |
| Génération IA 7 types de rapports (streaming) | ✅ Opérationnel |
| Image d'inspiration pour les rapports IA | ✅ Opérationnel |
| Export données brutes .txt | ✅ Opérationnel |
| Navigation propre, sidebar claire | ✅ |
| Sélecteur d'année cohérent sur tous les modules | ✅ |
| Mode démo / mode production (APP_MODE) | ✅ |
| Script d'installation client (setup-client.bat) | ✅ |

---

## ⚠️ Fonctionnalités partiellement prêtes

### Modules analytiques (Vue Globale, Billetterie, Consommation)
Les données affichées sont **représentatives** en mode démo mais ne proviennent pas encore automatiquement des fichiers importés.

**En mode production :** ces modules affichent les données importées pour les KPIs disponibles. Les graphiques détaillés (CA horaire, top articles) sont disponibles uniquement si le fichier Weezpay 2025 enrichi est importé.

**Limitation :** pas de calcul dynamique des graphiques depuis les imports — les visualisations complexes sont encore statiques en démo.

### Profil Client
Les données démographiques (âge, genre) nécessitent un fichier Weezpay avec enrichissement activé ou un formulaire participant. Si non disponible → état vide affiché.

### PDF — Génération
Les PDFs générés utilisent les données de démonstration intégrées, pas les données importées du client. Un badge **DÉMO** est visible sur le bouton.

**En V2 :** génération PDF dynamique depuis les données réelles du client.

### PDF — Consultation
Le bouton "Consulter" nécessite de configurer `PDF_SOURCE_DIR` dans `.env`. Sans cette configuration, le bouton retourne une erreur 503 explicite.

---

## 🚫 Fonctionnalités désactivées

| Fonctionnalité | Raison | Alternative |
|---|---|---|
| Module Historique | Non finalisé | La comparaison historique est intégrée dans les rapports IA |
| Génération PDF dynamique depuis données client | En développement V2 | Utiliser les rapports IA (streaming) |
| Consultation PDF sans PDF_SOURCE_DIR configuré | Chemin à configurer | Voir README section PDF_SOURCE_DIR |

---

## 🔮 Prévu V2

- Génération PDF dynamique depuis les données importées par le client
- Module Historique : comparatif complet inter-éditions avec graphiques
- Mode SaaS multi-utilisateurs
- Invitations : import dynamique (actuellement données démo statiques)
- Stocks : calcul automatique depuis données consommation importées
- Export PDF depuis n'importe quel module ("Exporter cette vue")
- Connexion directe API billetterie (Weezevent, Bizouk)

---

## Formats d'import supportés

### Fichiers
| Format | Extension |
|---|---|
| Excel moderne | `.xlsx`, `.xlsm` |
| Excel ancien | `.xls` (incluant fichiers corrompus) |
| Excel binaire | `.xlsb` |
| CSV / TSV | `.csv`, `.tsv`, `.txt` |
| Parquet | `.parquet` |
| JSON | `.json`, `.jsonl` |

### Sources billetterie détectées automatiquement
Weezevent · Bizouk · BilletWeb · Eventbrite · HelloAsso · Yurplan · Shotgun · Stripe · SumUp · Shopify · Système de caisse · CSV/Excel générique

---

## Limites de la génération IA

- **Données requises :** l'IA analyse ce qui est disponible. Si aucun fichier n'est importé, le rapport sera générique. Plus les données sont complètes, meilleur est le rapport.
- **Hallucinations :** Claude Sonnet 4.6 peut formuler des hypothèses. Les rapports distinguent explicitement faits observés / interprétations / hypothèses.
- **Clé API requise :** la génération IA nécessite une clé API Anthropic valide dans `backend/.env`.
- **Connexion internet requise** pour appeler l'API Claude (les données restent sur votre poste).
- **Temps de génération :** 15 à 45 secondes selon le type de rapport.

---

## Limites du stockage

- **Base de données :** SQLite local (`backend/data.db`). Non prévu pour du multi-utilisateurs simultané.
- **Pas de sauvegarde automatique :** sauvegarder manuellement `backend/data.db` pour conserver les imports.
- **Pas de synchronisation cloud** dans cette version.
- **localStorage :** la configuration (événements, éditions, canaux, thèmes) est stockée dans le navigateur. Vider le cache supprime cette configuration.

---

## Limites du déploiement

- Conçu pour une installation **single-machine** (poste local ou serveur dédié).
- Déploiement cloud possible mais nécessite : reverse proxy, HTTPS, variable `CORS_ORIGINS`, et migration SQLite → PostgreSQL recommandée pour production multi-utilisateurs.
