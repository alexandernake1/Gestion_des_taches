# Audit complet de finition et de préparation à la production

Audit initial du 24 août 2026, repris et étendu les **15 et 17 septembre 2026**.

Branche examinée : `stabilisation/preproduction`.

Périmètre : application React/Vite, API Django/DRF, authentification, isolation des structures, abonnements, fichiers, dépendances, CI, Docker, domaine/HTTPS, exploitation, sauvegardes, conformité et dette technique.

## 1. Verdict

### Décision actuelle

- **Préproduction privée : GO conditionnel**, après construction réelle des images sur une machine dont Docker fonctionne.
- **Ouverture publique gratuite : NO-GO à cet instant**, jusqu’au rétablissement du VPS et à la validation du HTTPS, du SMTP, des clés Turnstile, des mentions juridiques définitives et d’une restauration de sauvegarde démontrée.
- **Ouverture commerciale avec offres payantes : NO-GO**, car aucun prestataire de paiement réel n’est intégré.

Le code est sensiblement plus sûr qu’au début de l’audit. Les défauts qui permettaient d’obtenir un forfait payant sans règlement sont corrigés et couverts par des tests. Tant que le paiement reste désactivé, le catalogue public ne montre que les forfaits gratuits.

### Synthèse des portes de lancement

| Domaine | État | Conclusion |
|---|---:|---|
| Tests backend | Vert | 143 tests réussis, avertissements traités comme erreurs, couverture globale 79 %. |
| Tests frontend | Vert | 14 fichiers et 37 tests réussis. |
| Lint et typage | Vert | ESLint sans avertissement et TypeScript sans erreur. |
| Build frontend | Vert avec réserve | Build réussi ; fragment principal de 550,83 kB minifié, à découper après stabilisation. |
| Dépendances | Vert | `pip-audit`, `npm audit` complet et audit npm production : 0 vulnérabilité connue. |
| Django | Vert | `check`, `check --deploy`, migrations et schéma OpenAPI valides. |
| Compose | Vert statique | Configurations standard et `development` valides. |
| Images/conteneurs | Images validées, runtime VPS non vérifié | Les images backend et frontend sont construites avec succès ; le backend utilise l’utilisateur `app`. La configuration Caddy est valide. La nouvelle pile n’a pas été substituée aux conteneurs locaux existants et le VPS reste inaccessible. |
| Domaine et TLS | DNS validé, TLS bloqué | `taskina.net` et `www.taskina.net` résolvent publiquement vers `152.228.233.72`. Le VPS ne répond toutefois pas sur 22/80/443 ; aucun certificat ni service web ne peut encore être validé. |
| Email et anti-robot | Bloquant | SMTP externe et paire Turnstile absents de la configuration locale auditée. |
| Paiement | Bloquant pour le payant | Aucun fournisseur réel ; simulateur strictement réservé au développement. |
| Juridique et confidentialité | Bloquant | Identité légale, adresse, immatriculation, droit applicable, prestataires et durées précises restent à compléter. |
| Sauvegarde/reprise | Procédure prête, preuve absente | Scripts et planification présents ; aucune preuve de copie hors site ni d’exercice de restauration du futur serveur. |

## 2. Méthode et preuves

L’audit a porté sur les 286 fichiers suivis au début de la revue, les fichiers ignorés présents localement, les dépendances directes et transitives, les routes publiques, les permissions, les flux JWT/cookies, les WebSockets, les paiements simulés, les fichiers téléversés, les paramètres Django, Nginx, Compose et la CI.

Contrôles exécutés :

```text
Backend
- pytest avec Django 5.2 et -W error                    143 réussis
- pytest-cov                                            79 % global
- django check                                          aucune anomalie
- django check --deploy --tag security                  aucune anomalie
- makemigrations --check --dry-run                      aucun changement
- spectacular --validate                                valide
- pip check                                             cohérent
- pip-audit --local                                     0 vulnérabilité connue

Frontend
- Vitest                                                14 fichiers / 37 tests réussis
- ESLint --max-warnings 0                               réussi
- TypeScript --noEmit                                   réussi
- Vite build                                            réussi
- npm audit complet                                     0 vulnérabilité connue
- npm audit --omit=dev                                  0 vulnérabilité connue

Déploiement
- docker compose config --quiet                         valide
- docker compose --profile development config --quiet   valide
- docker compose build                                  images backend/frontend construites
- caddy validate                                        configuration valide
```

La contre-vérification visuelle automatisée actuelle n’a pas pu être lancée, car le navigateur intégré était indisponible avant toute navigation. Les captures d’août conservées dans `artifacts/` restent des preuves historiques, pas une preuve visuelle du build du 17 septembre.

## 3. Corrections critiques réalisées

### 3.1 Abonnements et paiement

| Référence | Risque observé | Correction |
|---|---|---|
| PAY-01 | L’inscription à une structure pouvait simuler une transaction réussie et activer un forfait payant alors que `PAYMENT_PROVIDER=disabled`. | L’inscription payante est refusée hors simulateur explicitement activé ; la transaction atomique annule aussi la création de la structure et du compte. |
| PAY-02 | La route directe de changement de forfait pouvait affecter un forfait payant avant toute confirmation de paiement. | Toute somme restant due entraîne HTTP 402 et le forfait courant reste actif. |
| PAY-03 | Le démarrage d’un paiement de test modifiait immédiatement le forfait et les droits d’un abonnement existant. | Le forfait existant n’est modifié qu’après réussite confirmée de la transaction. |
| PAY-04 | Des offres payantes pouvaient être affichées alors qu’aucun paiement réel n’était possible. | Le catalogue public est limité aux forfaits gratuits lorsque le simulateur n’est pas activé. |
| PAY-05 | Une transaction de test pouvait encore être créée avec le simulateur désactivé. | Les routes de démarrage et de résultat simulé exigent désormais le fournisseur `test` et le drapeau du simulateur. |

Les passages sans nouveau débit restent possibles uniquement lorsque le crédit proratisé déjà acquis couvre intégralement le nouveau forfait. Ce cas enregistre une transaction de crédit à montant nul.

### 3.2 Authentification, sessions et autorisations

| Référence | Risque observé | Correction |
|---|---|---|
| AUTH-01 | Les JWT en cookies étaient acceptés sur des requêtes mutantes sans contrôle CSRF. | Un jeton CSRF lisible est émis à la connexion et renvoyé par le frontend dans `X-CSRFToken`. Le contrôle s’applique aux JWT issus des cookies ; l’authentification Bearer reste adaptée aux clients API. |
| AUTH-02 | Le changement de mot de passe ne lisait pas le refresh token HttpOnly et ne fermait pas réellement la session du navigateur. | Le refresh cookie courant est mis sur liste noire, les deux cookies sont supprimés et l’interface renvoie vers la connexion. |
| AUTH-03 | Les access tokens déjà émis restaient utilisables après changement de mot de passe. | `CHECK_REVOKE_TOKEN=True` lie les JWT à l’empreinte du mot de passe ; les anciens access et refresh tokens sont rejetés immédiatement. |
| AUTH-04 | Désactiver une structure ne coupait pas les sessions JWT ou WebSocket déjà ouvertes. | L’authentification HTTP et le middleware WebSocket rejettent une structure inactive, sauf contexte super-administrateur explicite. |
| AUTH-05 | Une ancienne route d’inscription renvoyait encore access et refresh tokens dans le JSON. | Les JWT ne sont plus exposés à JavaScript ; ils restent uniquement dans les cookies HttpOnly. |
| AUTH-06 | Le taux de connexion pouvait être contourné par un `X-Forwarded-For` forgé derrière les proxys. | `TRUSTED_PROXY_COUNT=2` fixe la chaîne Caddy → Nginx et stabilise la clé de limitation par IP. |
| AUTH-07 | Les pages Swagger, ReDoc et le schéma API étaient toujours publics. | `ENABLE_API_DOCS=False` les retire des routes hors développement. |

Le débit de connexion est ramené à 10 tentatives par minute et par adresse identifiée. Les sondes de santé restent volontairement publiques et non limitées, avec une réponse minimale.

### 3.3 Fichiers et stockage

| Référence | Risque observé | Correction |
|---|---|---|
| FILE-01 | Nginx servait directement `/media/task_attachments/`, contournant les permissions Django. | Ce chemin répond maintenant 404 ; une pièce jointe ne peut être téléchargée que par la route Django qui vérifie la tâche et la structure. |
| FILE-02 | Supprimer ou remplacer une pièce jointe, un avatar ou un logo laissait le fichier physique orphelin. | Des signaux suppriment le fichier après validation de la transaction de base de données. |
| FILE-03 | L’ancien réglage `DEFAULT_FILE_STORAGE` n’était plus adapté à Django 5.2. | Migration vers `STORAGES`, stockage local par défaut et backend S3 lorsque le bucket est renseigné. |
| FILE-04 | Des objets S3 risquaient d’être publics ou écrasés. | ACL publique désactivée, URL signées et écrasement de nom désactivé. |

Les pièces jointes sont limitées à 10 Mo, à une liste d’extensions, à un quota par forfait, et quelques signatures de fichiers sont contrôlées. Voir les réserves antivirus en section 6.

### 3.4 Dépendances et surface d’attaque

Situation initiale :

- 89 signalements connus répartis sur 9 paquets Python audités ;
- 7 vulnérabilités npm, dont 4 hautes et 3 modérées ;
- outils de test et de formatage installés dans l’image backend de production ;
- paquets déclarés mais sans aucun import applicatif.

Actions :

- passage de Django 5.0.7 à Django 5.2.17 LTS ;
- mises à jour de DRF, SimpleJWT, Daphne, Pillow, `python-dotenv`, Vite, Vitest et du plugin React ;
- création de `requirements-dev.txt` pour sortir pytest, couverture, audit et formatage de l’image de production ;
- suppression de `django-allauth`, `dj-rest-auth`, Pydantic, `pydantic-settings`, `python-decouple` et `django-redis`, inutilisés ;
- suppression de `react-hook-form`, Zod, `@hookform/resolvers` et `class-variance-authority`, inutilisés ;
- suppression du doublon de `tailwindcss-animate` ;
- ajout des audits dans la CI et de Dependabot mensuel pour pip, npm, Docker et GitHub Actions.

Résultat : aucun avis de sécurité connu lors des audits finaux du 15 septembre 2026.

### 3.5 Déploiement et exposition réseau

- Caddy est désormais l’unique point d’entrée public sur 80/443 et gère automatiquement émission, renouvellement et redirection du certificat lorsque `SITE_ADDRESS` contient le domaine.
- Nginx, Django, PostgreSQL et Redis restent uniquement sur le réseau Compose.
- Nginx transmet correctement le protocole HTTPS reçu de Caddy vers Django.
- Les en-têtes CSP, anti-iframe, anti-MIME, referrer et permissions sont configurés.
- Les polices Google externes et le monkey-patch global du DOM ont été retirés ; aucune règle `unsafe-inline` n’est nécessaire pour les scripts.
- HSTS est activé sans préchargement ni sous-domaines par défaut afin d’éviter un engagement irréversible prématuré.
- Le backend utilise un UID non privilégié `10001`.
- Les journaux Docker tournent avec cinq fichiers de 10 Mo maximum par service.
- Mailpit n’existe plus dans la pile normale ; il est réservé au profil `development` et lié à `127.0.0.1`.
- Les images backend/frontend du 17 septembre se construisent réellement et `caddy validate` accepte la configuration de `taskina.net` et `www.taskina.net`.

## 4. Nettoyage effectué

Éléments suivis supprimés :

- `backend/check_db.py`, script ponctuel de diagnostic ;
- `backend/openapi.generated.yml`, artefact généré de 6 822 lignes qui dérivait du code source.

Éléments simplifiés :

- README entièrement réaligné sur les commandes et l’architecture réellement présentes ;
- séparation nette des environnements d’exemple local et production ;
- favicon Vite inexistant remplacé par l’icône du produit ;
- accès legacy à un token en `localStorage` retiré du service d’authentification et des téléchargements ;
- avertissement Vite lié à `__dirname` supprimé ;
- contrainte Django migrée de l’argument déprécié `check` vers `condition`.

Les dossiers `artifacts/` n’ont pas été supprimés : ils contiennent les captures et rapports des audits visuels antérieurs, encore référencés par la documentation. Ils sont ignorés par Git et ne sont pas livrés dans les images.

## 5. Audit détaillé par domaine

### 5.1 Isolation multi-structure et rôles

Points satisfaisants :

- modèle utilisateur rattaché à une seule structure, contexte super-administrateur séparé ;
- fonctions centralisées pour récupérer la structure et les tâches accessibles ;
- tests inter-structures sur utilisateurs, équipes, projets, tâches, commentaires, pièces jointes et rapports ;
- suspension d’abonnement et désactivation de structure prises en compte dans les permissions ;
- traces d’audit utilisateur et plateforme conservées lors de la suppression d’un utilisateur.

Réserve :

- les fichiers `tasks/views.py` (environ 65 kB) et `users/views.py` (environ 37 kB) concentrent de nombreuses responsabilités. Leur taille augmente le risque de régression lors des évolutions de permissions. Une extraction par sous-domaine est recommandée après la mise en production initiale.

### 5.2 Données, rétention et sauvegardes

Points satisfaisants :

- PostgreSQL persistant, Redis en AOF `everysec`, volumes séparés ;
- sauvegarde PostgreSQL au format personnalisé, checksum SHA-256, permissions restrictives et rétention configurable ;
- restauration protégée par confirmation et sauvegarde préalable ;
- purge quotidienne des journaux d’audit de plus de 365 jours ;
- suppression physique des fichiers devenus orphelins.

Risques restants :

- aucun objectif RPO/RTO formel ;
- aucune preuve d’exercice de restauration ;
- aucune copie chiffrée hors du VPS démontrée ;
- sauvegarde du volume média à organiser si S3 versionné n’est pas activé ;
- les durées légales détaillées des comptes, tâches, pièces jointes, transactions et sauvegardes ne sont pas encore arrêtées.

### 5.3 Frontend, performance et accessibilité

Points satisfaisants :

- TypeScript strict, lint sans avertissement, tests DOM ciblés ;
- interface responsive déjà auditée en août sur desktop et mobile ;
- erreurs API normalisées, états de chargement et composants d’erreur présents ;
- suppression des polices tierces, réduisant les requêtes, le risque de confidentialité et la dépendance réseau ;
- HTML de départ réduit à 1,00 kB.

Réserves :

- fragment applicatif principal : 550,83 kB minifié / 122,88 kB gzip ;
- routes générées importées de façon synchrone : prévoir des imports paresseux par page ;
- `dashboard.tsx` atteint environ 76 kB, `tasks.tsx` 49 kB et la page d’accueil 45 kB ;
- aucune mesure Lighthouse/Web Vitals ni test automatisé axe-core sur le build actuel ;
- la contre-recette visuelle du 15 septembre reste à effectuer dès que le navigateur ou la pile Docker est disponible.

### 5.4 Observabilité et exploitation

Présent :

- logs console horodatés et niveau configurable ;
- sondes `/api/health/live/`, `/api/health/ready/` et compatibilité `/api/health/` ;
- santé PostgreSQL, Redis, backend, frontend et worker ;
- documentation d’incident, sauvegarde, restauration et rollback.

Manquant avant une exploitation sérieuse :

- sonde externe depuis Internet avec alertes ;
- agrégation centralisée des logs et politique d’accès ;
- suivi des erreurs applicatives, saturation disque, mémoire, CPU, latence et files Celery ;
- seuils d’alerte, astreinte et destinataires ;
- exercice documenté de perte PostgreSQL et de perte du volume média.

### 5.5 CI/CD et chaîne d’approvisionnement

La CI vérifie maintenant tests, audit pip/npm, compilation, migrations, OpenAPI, paramètres de sécurité et Compose. Dependabot est configuré.

Réserves :

- les images PostgreSQL, Redis, Node, Nginx, Mailpit et Caddy sont versionnées mais pas verrouillées par digest ;
- les dépendances Python sont épinglées mais sans fichier de hashes ;
- aucune signature d’image ni SBOM n’est produite ;
- aucun déploiement automatique n’est recommandé avant mise en place d’un environnement de staging et d’une approbation manuelle.

## 6. Risques restant à traiter

### B0 — bloquants avant ouverture publique

1. **VPS et HTTPS encore inaccessibles.** Le domaine est acquis et `taskina.net` comme `www.taskina.net` résolvent publiquement vers `152.228.233.72`, mais le VPS ne répond actuellement ni sur 80, ni sur 443, ni sur SSH 22. Certificat, redirection HTTPS et cookies Secure ne sont donc pas encore éprouvés depuis Internet.
2. **Identité légale incomplète.** Raison sociale, forme, siège, immatriculation, directeur de publication, hébergeur, droit applicable et juridiction manquent.
3. **Politique de confidentialité provisoire.** Liste/localisation des sous-traitants, transferts, autorité compétente et durées chiffrées restent à valider.
4. **Adresse support non confirmée.** L’interface utilise désormais `support@taskina.net`, mais la boîte doit encore être créée et sa réception vérifiée.
5. **SMTP transactionnel absent.** La réinitialisation et les invitations ne sont pas validées avec un domaine d’envoi SPF/DKIM/DMARC.
6. **Turnstile incomplet.** Sans paire de production, les formulaires publics reposent uniquement sur le throttling.
7. **Déploiement VPS non exécuté.** Les images locales se construisent et Caddy valide sa configuration, mais la nouvelle pile complète doit encore être démarrée sur le VPS, puis contrôlée avec ses vraies variables et ses volumes existants.
8. **Restauration non démontrée.** Une archive doit être créée, copiée hors site puis restaurée dans un environnement isolé.

### B0 — supplémentaire si des offres payantes sont lancées

9. **Prestataire de paiement réel absent.** Il faut une intégration côté serveur, signature des webhooks, idempotence, rapprochement, gestion des remboursements, facturation et recette sur sandbox. Ne jamais réactiver le simulateur en production.

### P1 — à planifier avant montée en charge ou données sensibles

1. **MFA absent** pour le super-administrateur et l’administration Django.
2. **Invitations par mot de passe temporaire.** Le mot de passe est envoyé par email et retourné à l’administrateur ; préférer un lien d’activation à usage unique sans révéler de secret.
3. **Analyse antivirus absente** pour les pièces jointes Office, PDF et images. Les fichiers sont forcés en téléchargement et protégés par `nosniff`, mais peuvent transporter un contenu malveillant.
4. **Avatars et logos servis directement** sous `/media/`. Les pièces jointes sont privées, mais la politique de visibilité des images personnelles doit être décidée ; S3 signé est préférable si elles ne sont pas publiques.
5. **CSP à observer en réel.** Passer d’abord par un mode de collecte/reporting si Google Identity ou Turnstile sont activés, puis ajuster uniquement les domaines nécessaires.
6. **Supervision externe et centralisation des erreurs absentes.**
7. **Couverture faible de Turnstile** (`users/security.py`) et des commandes planifiées ; ajouter des tests de timeout, refus distant et reprise.

### P2 — amélioration continue

1. Découper les routes frontend et les gros modules backend/frontend.
2. Migrer ESLint 8 et ses paquets transitifs obsolètes dans un chantier dédié.
3. Fixer un budget de bundle et un seuil minimal de couverture dans la CI.
4. Produire un SBOM, verrouiller les images par digest et tester régulièrement leur mise à jour.
5. Ajouter Lighthouse, axe-core et une vraie recette multi-navigateurs.

## 7. Configuration locale auditée

Le fichier `.env` local est ignoré par Git et n’a pas été modifié. Sans révéler ses secrets, il correspond à un environnement de développement :

- `DEBUG=True`, PostgreSQL local, origines HTTP par IP ;
- cookies Secure et redirection SSL désactivés ;
- Mailpit comme SMTP ;
- paiement `test` et simulateur actifs ;
- configuration Google absente ;
- clé publique Turnstile présente mais secret backend absent.

Cette configuration **ne doit pas être copiée en production**. Le nouveau `.env.example` est le modèle de déploiement sécurisé et `.env.development.example` le modèle local Docker.

## 8. Procédure d’activation de taskina.net

### Avant l’ouverture publique

1. Obtenir l’identité juridique, l’adresse support et la liste des prestataires validées.
2. Créer le SMTP transactionnel et publier SPF, DKIM et DMARC.
3. Créer les clés Turnstile pour le domaine exact.
4. Décider si Google OAuth est activé ; sinon le laisser vide et vérifier que le bouton reste masqué.
5. Choisir stockage local sauvegardé ou S3 privé/versionné.
6. Générer `SECRET_KEY` et `DB_PASSWORD` avec un gestionnaire de secrets.
7. Copier `.env.example` vers `.env` et remplacer chaque valeur d’exemple.

### DNS et lancement

1. La résolution `A` de `taskina.net` et `www.taskina.net` vers `152.228.233.72` est confirmée ; ne publier aucun `AAAA` sans IPv6 réellement configurée.
2. Ouvrir TCP 80/443 et UDP 443 ; garder 5432, 6379 et 8000 fermés.
3. Déployer les valeurs Taskina de `.env.example` : les deux noms dans `SITE_ADDRESS` et `ALLOWED_HOSTS`, avec `https://taskina.net` comme origine canonique.
4. Sauvegarder PostgreSQL et les médias.
5. Construire les images et corriger une fois le propriétaire des anciens volumes si nécessaire.
6. Exécuter migrations, collecte statique et contrôles de sécurité.
7. Vérifier le certificat, la redirection HTTP→HTTPS, HSTS, CSP, cookies et WebSocket depuis un réseau externe.
8. Tester inscription gratuite, connexion, mot de passe oublié, invitation, changement de mot de passe, upload/download, rôles, exports et emails réels.
9. Restaurer la sauvegarde dans un environnement isolé.
10. Activer les sondes et alertes avant communication publique.

Commandes de contrôle :

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose exec backend python manage.py check --deploy --tag security --fail-level WARNING
docker compose exec backend python manage.py check_preproduction
docker compose exec backend python manage.py check_preproduction --require-external-services
docker compose logs --tail=200 gateway backend celery_worker celery_beat
```

Le dernier contrôle restera volontairement en échec tant qu’aucun paiement réel n’est intégré. Pour un lancement gratuit assumé, documenter cette exception et confirmer que `PAYMENT_PROVIDER=disabled`, `ALLOW_TEST_PAYMENT_SIMULATOR=False` et le catalogue sans offre payante sont tous vérifiés.

## 9. Critères de GO final

Le GO public ne doit être donné que si toutes les cases suivantes sont vérifiées par une personne identifiée :

- [ ] identité légale, CGU et politique de confidentialité finalisées ;
- [x] domaine et DNS définitifs ;
- [ ] certificat public valide et renouvellement observé ;
- [ ] cookies Secure, redirection HTTPS et en-têtes contrôlés depuis Internet ;
- [ ] SMTP réel reçu sur plusieurs fournisseurs de messagerie ;
- [ ] Turnstile réel validé et comportement de panne testé ;
- [ ] images Docker construites et tous les services démarrés sans privilège inutile ;
- [ ] 143 tests backend, 37 tests frontend, lint, typage, build et audits toujours verts ;
- [ ] sauvegarde hors site et restauration réussie ;
- [ ] supervision et alertes actives ;
- [ ] recette propriétaire, manager, collaborateur et super-administrateur signée ;
- [ ] prestataire réel validé si un paiement est proposé.

## 10. Limites de cet audit

Il s’agit d’une revue de code, de configuration et de tests locaux, pas d’un pentest certifié ni d’un avis juridique. Aucun accès au VPS, au registrar, aux consoles SMTP/Cloudflare/Google, au futur stockage ou aux données de production n’a été fourni. Les résultats d’audit de dépendances reflètent les bases publiques disponibles le 15 septembre 2026 et doivent être réexécutés juste avant chaque déploiement.
