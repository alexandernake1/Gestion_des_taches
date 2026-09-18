# Préproduction VPS et passage à Taskina

Cette procédure décrit l’ancien accès de test par IP et le passage actuel à `taskina.net`. L’accès public final doit utiliser HTTPS ; le mode HTTP par IP ne sert plus qu’au diagnostic.

## Configuration actuelle du domaine

Les serveurs DNS officiels d’OVH et la résolution publique annoncent désormais `taskina.net` et `www.taskina.net` vers `152.228.233.72`. Le VPS doit encore être rétabli : les ports 22, 80 et 443 ne répondent pas lors du contrôle du 17 septembre 2026.

```dotenv
SITE_ADDRESS=taskina.net, www.taskina.net
ALLOWED_HOSTS=taskina.net,www.taskina.net
CORS_ALLOWED_ORIGINS=https://taskina.net
CSRF_TRUSTED_ORIGINS=https://taskina.net
APP_FRONTEND_URL=https://taskina.net
JWT_COOKIE_SECURE=True
SECURE_SSL_REDIRECT=True
```

Caddy doit recevoir les ports TCP 80/443 et UDP 443. Il obtient les certificats des deux noms et redirige `www.taskina.net` vers `https://taskina.net`.

## Configuration

1. Copier `.env.example` vers `.env` sur le serveur. Pour un diagnostic temporaire par IP uniquement, définir `SITE_ADDRESS=http://:80`.
2. Générer une clé Django longue et unique pour `SECRET_KEY`.
3. Remplacer l'IP d'exemple dans `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` et `APP_FRONTEND_URL` par l'IP publique réelle du VPS.
4. Renseigner la même origine dans `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` et `APP_FRONTEND_URL`.
5. Pour activer la connexion Google, renseigner le même client OAuth Web dans `GOOGLE_OAUTH_CLIENT_ID` et `VITE_GOOGLE_CLIENT_ID`.
6. Pour rendre la protection anti-robot obligatoire, renseigner la paire Cloudflare Turnstile dans `TURNSTILE_SECRET_KEY` et `VITE_TURNSTILE_SITE_KEY`.

Les domaines de préproduction et de production doivent être autorisés dans les consoles Google et Cloudflare avant le déploiement. Sans ces clés, l'authentification email reste disponible et les intégrations externes restent masquées.
7. Conserver temporairement `JWT_COOKIE_SECURE=False` et `SECURE_SSL_REDIRECT=False` tant que le site est servi en HTTP par IP.
8. Laisser `WEBSOCKET_ALLOW_QUERY_TOKEN=False` et `USE_IN_MEMORY_CHANNEL_LAYER=False`.
9. Laisser `PAYMENT_PROVIDER=disabled` tant qu’un prestataire réel n’est pas intégré.
10. Choisir un mot de passe PostgreSQL long et unique pour `DB_PASSWORD` ainsi que pour le service PostgreSQL du fichier Compose.

Ne jamais ajouter le fichier `.env` au dépôt.

## Démarrage

```bash
docker compose --profile development up -d --build
docker compose ps
docker compose exec backend python manage.py check_preproduction --allow-http
docker compose logs -f backend celery_worker celery_beat
```

Le conteneur backend applique les migrations et collecte les fichiers statiques avant de démarrer. Seule la passerelle Caddy publie les ports web ; Mailpit est lié à `127.0.0.1` par le profil `development`, et PostgreSQL, Redis, Nginx ainsi que Django restent sur le réseau Docker interne.

## Données de recette

Créer les comptes réels de test depuis le super-admin, ou générer un jeu de démonstration uniquement sur ce VPS de préproduction :

```bash
docker compose exec backend python manage.py seed_demo --password "un-mot-de-passe-de-test-long"
```

Le mot de passe est obligatoire afin d'éviter tout compte de démonstration avec un identifiant connu. Modifier ou supprimer les comptes de démonstration avant tout lancement public.

## Recette avant partage

- connexion propriétaire, manager et employé ;
- création d'entreprise, équipes, utilisateurs, projets et tâches ;
- assignation à une personne et à une équipe ;
- demandes de validation et notifications ;
- archivage manager puis suppression propriétaire ;
- exports, filtres, calendrier et journal d'audit ;
- déconnexion puis reconnexion ;
- test depuis un téléphone en réseau mobile.

## Pare-feu

N'autoriser que SSH et HTTP pendant cette phase. Ne pas exposer les ports 5432, 6379 ni 8000. Lors de l'ajout du domaine, faire pointer le DNS vers le VPS, ouvrir TCP 443 et UDP 443, renseigner le domaine dans `SITE_ADDRESS`, puis passer les origines en HTTPS avec `JWT_COOKIE_SECURE=True` et `SECURE_SSL_REDIRECT=True`. Caddy demandera ensuite le certificat automatiquement.

## Sauvegarde et reprise

Suivre la procédure détaillée dans [`operations.md`](operations.md). Une sauvegarde PostgreSQL et un test de restauration sur un environnement isolé sont obligatoires avant tout partage public.
