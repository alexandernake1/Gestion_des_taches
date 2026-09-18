# Exploitation et reprise

## Contrôles avant déploiement

Depuis le conteneur backend :

```bash
sudo docker compose exec -T backend python manage.py check --deploy --tag security
sudo docker compose exec -T backend python manage.py check_preproduction
```

`--allow-http` est réservé à un environnement interne temporaire et ne doit plus être utilisé sur le VPS Taskina. Le contrôle vérifie également que `SITE_ADDRESS` couvre tous les domaines Django et que la chaîne de confiance comporte exactement deux proxys (`Caddy → Nginx`). Avant une ouverture commerciale, exécuter aussi :

Le contrôle Django affiche volontairement `security.W005` et `security.W021` tant que HSTS n’est pas appliqué à tous les futurs sous-domaines et que Taskina n’est pas soumis à la liste de préchargement des navigateurs. Ces deux options ne doivent être activées qu’après une décision explicite sur l’ensemble des sous-domaines ; les autres erreurs restent bloquées par `check_preproduction`.

```bash
sudo docker compose exec -T backend python manage.py check_preproduction --require-external-services
```

Ce dernier contrôle exige le SMTP transactionnel et Turnstile pour une ouverture publique. Google OAuth reste facultatif, mais ses identifiants frontend/backend doivent être présents ensemble et identiques s’il est activé. Pour un lancement gratuit, conserver `PAYMENT_PROVIDER=disabled`, vérifier que seules les offres gratuites sont publiées et consigner ce choix dans la décision de mise en production.

## Domaine et terminaison TLS

Caddy est l’unique service qui publie les ports 80 et 443. Avec les deux noms renseignés dans `SITE_ADDRESS`, il demande et renouvelle automatiquement leurs certificats, redirige `www.taskina.net` vers `taskina.net`, puis relaie vers Nginx. Le DNS doit déjà pointer vers le VPS et les ports TCP 80/443 ainsi que UDP 443 doivent être autorisés.

La configuration de production Taskina est :

```dotenv
SITE_ADDRESS=taskina.net, www.taskina.net
ALLOWED_HOSTS=taskina.net,www.taskina.net
CORS_ALLOWED_ORIGINS=https://taskina.net
CSRF_TRUSTED_ORIGINS=https://taskina.net
APP_FRONTEND_URL=https://taskina.net
```

Conserver `TRUSTED_PROXY_COUNT=2`, `JWT_COOKIE_SECURE=True` et `SECURE_SSL_REDIRECT=True`. Commencer avec `SECURE_HSTS_PRELOAD=False`; le préchargement HSTS est un engagement durable qui ne doit être activé qu’après validation de tous les sous-domaines.

## Santé et supervision

- `/api/health/live/` confirme que le processus HTTP répond.
- `/api/health/ready/` vérifie PostgreSQL et Redis et renvoie HTTP 503 si une dépendance est indisponible.
- `/api/health/` reste disponible comme sonde de compatibilité.
- `docker compose ps` doit indiquer `healthy` pour PostgreSQL, Redis, le backend, le frontend et le worker Celery, et `running` pour Caddy et Celery Beat.
- `celery_worker` et `celery_beat` doivent rester démarrés pour les notifications intelligentes et le cycle des abonnements.

Une sonde externe doit surveiller l’URL de disponibilité. Les journaux à consulter en priorité sont :

```bash
docker compose logs --tail=200 backend celery_worker celery_beat
```

## Sauvegarde PostgreSQL

Le script produit une archive PostgreSQL au format personnalisé et son SHA-256. Le dossier local `backups/` est ignoré par Git.

```bash
chmod +x ops/*.sh
sudo ./ops/backup-all.sh /var/backups/taskina
```

Cette commande sauvegarde PostgreSQL et le volume des médias, génère un SHA-256 pour chaque archive et applique une permission restrictive. Vérifier les deux chemins affichés avant de poursuivre un déploiement.

La durée de conservation par défaut est de 14 jours. Elle peut être modifiée avec `BACKUP_RETENTION_DAYS`. Le dossier cible peut être fourni en argument ou avec `BACKUP_DIR`.

### Planification quotidienne sur le VPS

Les unités fournies exécutent la sauvegarde quotidiennement entre 03:30 et 03:45 UTC dans `/var/backups/taskina`. Le service s’exécute en tant que `root`, car l’accès au socket Docker équivaut déjà à un accès administrateur et l’utilisateur `ubuntu` n’appartient volontairement pas au groupe Docker :

```bash
sudo cp ops/systemd/gestion-des-taches-backup.service /etc/systemd/system/
sudo cp ops/systemd/gestion-des-taches-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gestion-des-taches-backup.timer
sudo systemctl status gestion-des-taches-backup.timer
```

Pour lancer une sauvegarde immédiate et consulter son journal :

```bash
sudo systemctl start gestion-des-taches-backup.service
sudo journalctl -u gestion-des-taches-backup.service -n 50 --no-pager
```

Conserver une copie chiffrée hors du VPS. Les pièces jointes du volume `media_data` doivent être sauvegardées séparément ou placées dans un stockage objet versionné. Une sauvegarde qui n’est jamais restaurée en exercice ne doit pas être considérée comme fiable.

## Test de restauration

La restauration remplace le contenu de la base ciblée. Le script exige une confirmation explicite, valide l’archive et crée d’abord une sauvegarde de sécurité :

```bash
sudo ./ops/restore-postgres.sh --confirm-restore /var/backups/taskina/postgres/postgres-YYYYMMDDTHHMMSSZ.dump
```

Effectuer l’exercice sur un environnement isolé au moins une fois avant la préproduction publique, puis vérifier la connexion, les entreprises, les tâches, les pièces jointes et les journaux d’audit.

## Déploiement et retour arrière

1. Sauvegarder PostgreSQL.
2. Noter le commit ou tag actuellement déployé.
3. Construire les images et exécuter les contrôles de configuration.
4. Appliquer les migrations puis vérifier `/api/health/ready/`.
5. Exécuter la recette propriétaire, manager et employé.

Le backend s’exécute désormais avec l’UID non privilégié `10001`. Lors d’une première mise à niveau d’un serveur qui possède déjà les volumes `static_data` et `media_data`, corriger une fois leur propriétaire avant le redémarrage normal :

```bash
docker compose run --rm --user root backend chown -R 10001:10001 /app/staticfiles /app/media
```

En cas d’échec, redéployer le tag précédent. Ne restaurer la base que si une migration destructive ou une écriture incompatible l’impose ; une simple erreur applicative doit être corrigée par retour d’image.

## Gestion d’incident

Conserver pour chaque incident : heure UTC, environnement, identifiant de commit, comptes ou entreprises affectés, réponse HTTP, extraits de journaux sans secrets, mesures de confinement et validation du rétablissement. Révoquer immédiatement toute clé potentiellement exposée.
