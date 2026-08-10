# Préproduction VPS sans domaine

Cette procédure prépare une version de test accessible par l'IP du VPS. Elle est destinée aux essais internes ; l'HTTPS doit être activé dès qu'un domaine est disponible.

## Configuration

1. Copier `.env.example` vers `.env` sur le serveur.
2. Générer une clé Django longue et unique pour `SECRET_KEY`.
3. Remplacer l'IP d'exemple dans `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` et `APP_FRONTEND_URL` par l'IP publique réelle du VPS.
4. Conserver temporairement `JWT_COOKIE_SECURE=False` et `SECURE_SSL_REDIRECT=False` tant que le site est servi en HTTP par IP.
5. Choisir un mot de passe PostgreSQL long et unique pour `DB_PASSWORD` ainsi que pour le service PostgreSQL du fichier Compose.

Ne jamais ajouter le fichier `.env` au dépôt.

## Démarrage

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend
```

Le conteneur backend applique les migrations et collecte les fichiers statiques avant de démarrer. Seul le port HTTP 80 est publié ; PostgreSQL, Redis et Django restent sur le réseau Docker interne.

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

N'autoriser que SSH et HTTP pendant cette phase. Ne pas exposer les ports 5432, 6379 ni 8000. Lors de l'ajout du domaine, ouvrir 443, configurer HTTPS, puis passer `JWT_COOKIE_SECURE=True` et `SECURE_SSL_REDIRECT=True`.
