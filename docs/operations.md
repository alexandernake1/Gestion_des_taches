# Exploitation et reprise

## Contrôles avant déploiement

Depuis le conteneur backend :

```bash
docker compose exec backend python manage.py check --deploy --tag security --fail-level WARNING
docker compose exec backend python manage.py check_preproduction --allow-http
```

`--allow-http` est réservé à une préproduction interne accessible temporairement par IP. Dès qu’un domaine HTTPS est disponible, retirer cette option. Avant une ouverture publique, exécuter également :

```bash
docker compose exec backend python manage.py check_preproduction --require-external-services
```

Ce dernier contrôle reste volontairement bloquant tant que SMTP, Turnstile, Google OAuth et un fournisseur de paiement réel ne sont pas configurés.

## Santé et supervision

- `/api/health/live/` confirme que le processus HTTP répond.
- `/api/health/ready/` vérifie PostgreSQL et Redis et renvoie HTTP 503 si une dépendance est indisponible.
- `docker compose ps` doit indiquer `healthy` pour PostgreSQL, Redis, le backend et le frontend.
- Les services `celery_worker` et `celery_beat` doivent rester démarrés pour les notifications intelligentes et le cycle des abonnements.

Une sonde externe doit surveiller l’URL de disponibilité. Les journaux à consulter en priorité sont :

```bash
docker compose logs --tail=200 backend celery_worker celery_beat
```

## Sauvegarde PostgreSQL

Le script produit une archive PostgreSQL au format personnalisé et son SHA-256. Le dossier `backups/` est ignoré par Git.

```bash
chmod +x ops/backup-postgres.sh ops/restore-postgres.sh
./ops/backup-postgres.sh
```

Conserver les sauvegardes chiffrées en dehors du VPS. Recommandation initiale : une sauvegarde quotidienne, conservation de 7 quotidiennes et 4 hebdomadaires. Une sauvegarde non restaurée régulièrement n’est pas considérée comme fiable.

Les pièces jointes du volume `media_data` doivent être sauvegardées séparément ou placées dans un stockage objet versionné.

## Test de restauration

La restauration remplace le contenu de la base ciblée. Le script exige une confirmation explicite, valide l’archive et crée d’abord une sauvegarde de sécurité :

```bash
./ops/restore-postgres.sh --confirm-restore backups/postgres-YYYYMMDDTHHMMSSZ.dump
```

Effectuer l’exercice sur un environnement isolé au moins une fois avant la préproduction publique, puis vérifier la connexion, les entreprises, les tâches, les pièces jointes et les journaux d’audit.

## Déploiement et retour arrière

1. Sauvegarder PostgreSQL.
2. Noter le commit ou tag actuellement déployé.
3. Construire les images et exécuter les contrôles de configuration.
4. Appliquer les migrations puis vérifier `/api/health/ready/`.
5. Exécuter la recette propriétaire, manager et employé.

En cas d’échec, redéployer le tag précédent. Ne restaurer la base que si une migration destructive ou une écriture incompatible l’impose ; une simple erreur applicative doit être corrigée par retour d’image.

## Gestion d’incident

Conserver pour chaque incident : heure UTC, environnement, identifiant de commit, comptes ou entreprises affectés, réponse HTTP, extraits de journaux sans secrets, mesures de confinement et validation du rétablissement. Révoquer immédiatement toute clé potentiellement exposée.
