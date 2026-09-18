# Taskina

Plateforme SaaS de pilotage d’activité : espaces personnels ou de structure, projets, tâches, validations, équipes, notifications, rapports et abonnements.

> État au 18 septembre 2026 : `taskina.net` et `www.taskina.net` pointent vers le VPS. L’accès SSH est confirmé et le pare-feu autorise TCP 22/80/443 ainsi qu’UDP 443. Le serveur exécute encore l’ancien frontend HTTP sur le port 80 ; la livraison de cette version ajoutera Caddy et déclenchera l’émission du certificat. L’identité légale de DISCOM est intégrée. L’ouverture commerciale reste bloquée tant que la formalité CIL applicable, le SMTP transactionnel, les clés anti-robot et un exercice de restauration ne sont pas validés. Aucun paiement réel n’est intégré ; les offres payantes restent donc masquées et inactivables.

## Architecture

- Frontend : React 18, TypeScript, Vite 8, TanStack Router/Query, Tailwind CSS.
- Backend : Django 5.2 LTS, Django REST Framework, JWT en cookies HttpOnly, Daphne/Channels et Celery.
- Services : PostgreSQL 15, Redis 7, Nginx interne et Caddy comme passerelle HTTP/HTTPS.
- Stockage : volume local persistant ou stockage S3 compatible.

Les règles d’autorisation sont décrites dans [docs/ROLES.md](docs/ROLES.md). L’exploitation, les sauvegardes et la reprise sont décrites dans [docs/operations.md](docs/operations.md).

## Démarrage Docker local

Prérequis : Docker avec Compose.

```powershell
Copy-Item .env.development.example .env
docker compose --profile development up -d --build
docker compose ps
```

L’application répond sur `http://localhost` et Mailpit sur `http://localhost:8025`. Les bases PostgreSQL/Redis et Django ne publient aucun port sur l’hôte.

Pour arrêter sans supprimer les données :

```powershell
docker compose --profile development down
```

## Développement séparé

Backend :

```powershell
Set-Location backend
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

Frontend :

```powershell
Set-Location frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

Le frontend Vite répond sur `http://localhost:5173` et relaie `/api` vers Django sur le port 8000.

## Contrôles qualité

```powershell
# Backend
backend\.venv\Scripts\python.exe -m pytest backend --ds=config.settings_test -W error -q
backend\.venv\Scripts\python.exe backend\manage.py makemigrations --check --dry-run --settings=config.settings_test
backend\.venv\Scripts\python.exe -m pip_audit --local

# Frontend
Set-Location frontend
npm test
npm run lint
npx tsc --noEmit
npm run build
npm audit --audit-level=high
```

La CI exécute aussi les contrôles Django, la validation OpenAPI et le rendu de la configuration Compose.

## Passage au domaine HTTPS

1. Copier `.env.example` vers `.env` sur le serveur et remplacer toutes les valeurs d’exemple.
2. Faire pointer `taskina.net` et `www.taskina.net` vers le VPS et ouvrir les ports TCP 80/443 et UDP 443.
3. Utiliser les valeurs Taskina déjà documentées dans `.env.example` ; l’origine canonique de l’application est `https://taskina.net`.
4. Configurer SMTP, Turnstile et les éventuelles intégrations Google/S3.
5. Exécuter les contrôles de [docs/operations.md](docs/operations.md), sauvegarder, construire puis vérifier les sondes de santé.

Caddy obtient et renouvelle automatiquement les certificats de `taskina.net` et `www.taskina.net`, puis redirige `www` vers le domaine nu. Ne pas activer `SECURE_HSTS_PRELOAD` avant d’avoir confirmé que le domaine et tous ses sous-domaines resteront exclusivement en HTTPS.
