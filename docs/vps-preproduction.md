# Préproduction VPS et passage à Taskina

Cette procédure décrit l’ancien accès de test par IP et le passage actuel à `taskina.net`. L’accès public final doit utiliser HTTPS ; le mode HTTP par IP ne sert plus qu’au diagnostic.

## Configuration actuelle du domaine

Les serveurs DNS officiels d’OVH et la résolution publique annoncent `taskina.net` et `www.taskina.net` vers `152.228.233.72`. Le 18 septembre 2026, l’accès SSH au VPS a été confirmé et UFW a été configuré pour autoriser TCP 22/80/443 et UDP 443. L’ancien déploiement publie encore directement Nginx sur le port 80 ; aucun processus n’écoute sur 443 tant que la nouvelle pile avec Caddy n’a pas été livrée.

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

1. Sauvegarder le `.env` existant, puis le comparer à `.env.example` sans jamais l’ajouter au dépôt.
2. Générer une clé Django longue et unique pour `SECRET_KEY`.
3. Utiliser `taskina.net,www.taskina.net` dans `ALLOWED_HOSTS` et les deux adresses dans `SITE_ADDRESS`.
4. Utiliser l’origine canonique `https://taskina.net` dans `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` et `APP_FRONTEND_URL`.
5. Pour activer la connexion Google, renseigner le même client OAuth Web dans `GOOGLE_OAUTH_CLIENT_ID` et `VITE_GOOGLE_CLIENT_ID`.
6. Pour rendre la protection anti-robot obligatoire, renseigner la paire Cloudflare Turnstile dans `TURNSTILE_SECRET_KEY` et `VITE_TURNSTILE_SITE_KEY`.

Les domaines de préproduction et de production doivent être autorisés dans les consoles Google et Cloudflare avant le déploiement. Sans ces clés, l'authentification email reste disponible et les intégrations externes restent masquées.
7. Conserver `JWT_COOKIE_SECURE=True` et `SECURE_SSL_REDIRECT=True` pour le déploiement par domaine.
8. Laisser `WEBSOCKET_ALLOW_QUERY_TOKEN=False` et `USE_IN_MEMORY_CHANNEL_LAYER=False`.
9. Laisser `PAYMENT_PROVIDER=disabled` tant qu’un prestataire réel n’est pas intégré.
10. Choisir un mot de passe PostgreSQL long et unique pour `DB_PASSWORD` ainsi que pour le service PostgreSQL du fichier Compose.

Ne jamais ajouter le fichier `.env` au dépôt.

## Démarrage

Depuis `/home/ubuntu/Gestion_des_taches`, après mise à jour du code et du `.env` :

```bash
sudo docker compose config --quiet
sudo ./ops/backup-all.sh /var/backups/taskina
sudo docker compose build
sudo docker compose run --rm --no-deps --user root --entrypoint chown backend -R 10001:10001 /app/staticfiles /app/media
sudo docker compose up -d --remove-orphans
sudo docker compose ps
sudo docker compose exec -T backend python manage.py check --deploy --tag security
sudo docker compose exec -T backend python manage.py check_preproduction
```

Ne pas utiliser le profil `development` sur le VPS : il démarrerait Mailpit. Ne pas exécuter `docker compose down -v`, qui supprimerait les volumes de données.

Le conteneur backend applique les migrations et collecte les fichiers statiques avant de démarrer. Seule la passerelle Caddy publie les ports web ; Mailpit est lié à `127.0.0.1` par le profil `development`, et PostgreSQL, Redis, Nginx ainsi que Django restent sur le réseau Docker interne.

## Données de recette

Créer les comptes réels de test depuis le super-admin, ou générer un jeu de démonstration uniquement sur ce VPS de préproduction :

```bash
sudo docker compose exec backend python manage.py seed_demo --password "un-mot-de-passe-de-test-long"
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

UFW autorise uniquement SSH et les entrées web publiques : TCP 22/80/443 et UDP 443. Ne jamais exposer les ports 5432, 6379, 8000, 8025 ou 1025. Caddy demandera le certificat automatiquement dès que la nouvelle pile sera démarrée avec les valeurs HTTPS ci-dessus.

## Sauvegarde et reprise

Suivre la procédure détaillée dans [`operations.md`](operations.md). Une sauvegarde PostgreSQL et un test de restauration sur un environnement isolé sont obligatoires avant tout partage public.
