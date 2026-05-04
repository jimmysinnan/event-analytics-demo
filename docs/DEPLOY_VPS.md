# Guide de déploiement VPS — Event Analytics

Procédure complète de déploiement d'une instance dédiée hébergée.

---

## Prérequis

| Élément | Recommandation |
|---|---|
| VPS | Hostinger Business (2 vCPU, 8 Go RAM, 100 Go NVMe) ~7€/mois |
| OS | Ubuntu 22.04 LTS |
| DNS | Cloudflare (gratuit) — enregistrement A par client |
| Domaine | eventanalytics.fr (ou votre domaine) |
| Accès | SSH root ou sudo |

Capacité estimée : 5 à 10 instances clients simultanées sur un VPS Business.

---

## Étape 0 — Commander le VPS

1. Hostinger → VPS Business → Ubuntu 22.04 LTS
2. Activer SSH key-based auth (désactiver password auth)
3. Pointer le DNS wildcard vers l'IP du VPS :
   ```
   A    demo.eventanalytics.fr        → <IP_VPS>
   A    adi.eventanalytics.fr         → <IP_VPS>
   A    *.eventanalytics.fr           → <IP_VPS>  (optionnel)
   ```
4. Attendre la propagation DNS (5-30 min)

---

## Étape 1 — Installation initiale (une seule fois)

```bash
# Se connecter au VPS
ssh root@<IP_VPS>

# Télécharger et exécuter le script d'installation
curl -fsSL https://raw.githubusercontent.com/jimmysinnan/event-analytics-demo/master/scripts/server/install-vps.sh -o install-vps.sh
sudo bash install-vps.sh
```

Ce script installe : Python 3, Node.js 20, Nginx, Certbot, sqlite3, apache2-utils, ufw, fail2ban.

Il crée la structure :
```
/var/www/eventanalytics/
├── app/               ← code source (git clone)
│   ├── backend/
│   └── frontend_build/
├── clients/           ← vide au départ
└── scripts/server/    ← scripts de gestion
```

---

## Étape 2 — Créer la première instance (démo)

```bash
/var/www/eventanalytics/scripts/server/create-client.sh \
  --name "Event Analytics Demo" \
  --slug demo \
  --domain demo.eventanalytics.fr \
  --port 8001 \
  --mode demo \
  --key sk-ant-...
```

Le script crée :
- `/var/www/eventanalytics/clients/demo/.env`
- Les dossiers data/ uploads/ exports/ logs/ backups/
- Le service systemd `ea-demo.service`
- La config Nginx `nginx-demo.conf`

---

## Étape 3 — Installer le service et Nginx

```bash
# Service systemd
sudo cp /var/www/eventanalytics/clients/demo/ea-demo.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ea-demo
sudo systemctl start ea-demo

# Vérifier le démarrage
sudo systemctl status ea-demo

# Nginx
sudo cp /var/www/eventanalytics/clients/demo/nginx-demo.conf /etc/nginx/sites-available/ea-demo.conf
sudo ln -s /etc/nginx/sites-available/ea-demo.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Étape 4 — Certificat SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d demo.eventanalytics.fr
```

Certbot modifie automatiquement le fichier Nginx pour ajouter le SSL.  
Renouvellement automatique via cron — aucune action requise.

---

## Étape 5 — Configurer Basic Auth

```bash
/var/www/eventanalytics/scripts/server/setup-basic-auth.sh demo
# → Saisir login + mot de passe pour ce client
```

Tester l'accès : ouvrir https://demo.eventanalytics.fr → un formulaire login/password s'affiche.

---

## Étape 6 — Créer une instance client production

```bash
/var/www/eventanalytics/scripts/server/create-client.sh \
  --name "ADI Events" \
  --slug adi \
  --domain adi.eventanalytics.fr \
  --port 8002 \
  --mode production \
  --key sk-ant-...

# Installer le service
sudo cp /var/www/eventanalytics/clients/adi/ea-adi.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable ea-adi && sudo systemctl start ea-adi

# Nginx
sudo cp /var/www/eventanalytics/clients/adi/nginx-adi.conf /etc/nginx/sites-available/ea-adi.conf
sudo ln -s /etc/nginx/sites-available/ea-adi.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d adi.eventanalytics.fr

# Auth
/var/www/eventanalytics/scripts/server/setup-basic-auth.sh adi
```

---

## Commandes quotidiennes

```bash
# Voir toutes les instances
/var/www/eventanalytics/scripts/server/list-clients.sh

# Sauvegarder un client
/var/www/eventanalytics/scripts/server/backup-client.sh adi

# Mettre à jour l'application
/var/www/eventanalytics/scripts/server/update-app.sh

# Voir les logs d'une instance
tail -f /var/www/eventanalytics/clients/adi/logs/app.log
journalctl -u ea-adi -f

# Redémarrer une instance
/var/www/eventanalytics/scripts/server/restart-client.sh adi
```

---

## Sauvegardes automatiques

Ajouter au crontab de root (`sudo crontab -e`) :

```cron
# Sauvegarde quotidienne de toutes les instances à 3h00
0 3 * * * for slug in $(ls /var/www/eventanalytics/clients/); do /var/www/eventanalytics/scripts/server/backup-client.sh $slug --keep 14 >> /var/log/ea-backup.log 2>&1; done
```

---

## Couper l'accès d'un client

```bash
# Désactiver le service
sudo systemctl stop ea-[slug]
sudo systemctl disable ea-[slug]

# Désactiver le vhost Nginx
sudo rm /etc/nginx/sites-enabled/ea-[slug].conf
sudo systemctl reload nginx

# Le dossier client et ses données sont conservés dans clients/[slug]/
```

---

## Mise à jour applicative

```bash
# 1. Mettre à jour le code et reconstruire
/var/www/eventanalytics/scripts/server/update-app.sh

# 2. Vérifier que toutes les instances sont actives
/var/www/eventanalytics/scripts/server/list-clients.sh
```

---

## Sécurité — Résumé V1

| Couche | Mécanisme | Statut |
|---|---|---|
| Accès SSH | Key-based uniquement | À configurer au setup VPS |
| Accès HTTP | Redirect HTTPS | Nginx (Let's Encrypt) |
| Accès application | Nginx Basic Auth | setup-basic-auth.sh |
| Isolation données | SQLite + dossiers par client | Via .env SQLITE_DB_PATH |
| Clé Anthropic | Backend uniquement (.env serveur) | Jamais dans le frontend |
| API interne | API_SECRET_TOKEN (défense en profondeur) | Obligatoire en production |
| Pare-feu | ufw (SSH + HTTP/HTTPS uniquement) | install-vps.sh |

---

## Limites V1 connues

- Basic Auth : credentials en clair dans les headers HTTP (mais chiffrés par HTTPS)
- Pas d'auth applicative (pas de gestion utilisateurs/sessions)
- Single VPS : pas de haute disponibilité
- SQLite : pas de multi-process concurrent (1 instance = 1 port = 1 process)
- Migration vers auth applicative et PostgreSQL = V2
