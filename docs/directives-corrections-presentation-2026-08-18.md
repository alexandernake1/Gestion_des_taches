# Directives de consolidation après présentation

Date de rédaction : 18 août 2026  
Projet : Activity Control — plateforme SaaS de pilotage d’activité  
Branche de travail : `stabilisation/preproduction`  
Destinataire principal : agent Antigravity  
Statut : spécification de référence pour la prochaine vague de corrections

## 1. Objet du document

Ce document transforme les remarques recueillies après la présentation en un plan d’exécution fonctionnel et technique complet. Il doit permettre à un nouvel agent de reprendre le projet au niveau exact atteint aujourd’hui, sans annuler les corrections récentes, sans casser les règles d’accès et sans introduire de logique de facturation dangereuse.

Les objectifs sont les suivants :

1. préserver le travail local non encore envoyé sur GitHub ;
2. harmoniser le vocabulaire et les parcours métier ;
3. sécuriser les suppressions et les changements de forfait ;
4. améliorer les statistiques et le tableau de bord ;
5. corriger les incohérences de données visibles ;
6. livrer chaque changement avec ses tests backend, frontend et fonctionnels.

Ce document est normatif : lorsqu’une ancienne documentation le contredit, les décisions ci-dessous prévalent, sous réserve d’une nouvelle décision explicite du responsable du produit.

### Traçabilité des notes de présentation

| Note recueillie | Directive de référence |
| --- | --- |
| Choisir le sort des tâches lors de la suppression d’un projet | F-01 |
| Calculer le reliquat lors du passage personnel vers structure | F-02 |
| Ne pas interrompre le forfait courant pendant le changement | F-02 |
| Interdire une équipe d’une seule personne | F-03 |
| Remplacer Employé par Collaborateur | F-04 |
| Remplacer Entreprise par Structure/Organisation | F-04 |
| Remplacer Propriétaire par Administrateur | F-04 |
| Sélectionner les tâches sur une période | F-05 |
| Produire des statistiques sur cette période | F-06 |
| Ajouter davantage de statistiques métier | F-06 |
| Corriger « Connexion : jamais » | F-07 |
| Retirer le stockage des offres | F-08 |
| Retirer l’identifiant d’espace à la création | F-09 |
| Améliorer l’affichage du tableau de bord | F-10 |
| Éliminer les textes corrompus et les mots anglais | F-11 |
| Remplacer les libellés de création et « Assignées à moi » | F-12 |

---

## 2. État exact du projet à préserver

### 2.1 Référence Git

- Branche active : `stabilisation/preproduction`
- Commit local et distant de référence : `3d79d31 feat: add contextual replies to task comments`
- `origin/stabilisation/preproduction` pointe également sur `3d79d31`.
- `main` et `origin/main` pointent sur `1fc8b03` et sont en retard sur la branche de stabilisation.
- Ne pas repartir de `main`.
- Ne pas lancer `git reset --hard`, `git checkout -- <fichier>`, un nettoyage massif ou un rebase avant d’avoir préservé les changements locaux.

Commits récents à connaître :

| Commit | Contenu |
| --- | --- |
| `3d79d31` | Réponses contextuelles aux commentaires de tâches, migration `tasks.0012` |
| `9fea0e9` | Désactivation du cache du shell SPA après déconnexion |
| `9529689` | Synchronisation de la branche et réparation des contrôles CI |
| `062d351` | Consolidation de la plateforme pour la préproduction |

### 2.2 Modifications locales non commitées

Au moment de cette passation, les fichiers suivants sont modifiés localement :

- `frontend/src/pages/index.tsx`
- `frontend/src/pages/projects.tsx`
- `frontend/src/pages/projects/$projectId.tsx`
- `frontend/src/pages/tasks.tsx`
- `backend/domain/tasks/views.py`
- `backend/tests/test_security_and_tasks.py`

Ces modifications contiennent déjà :

- une nouvelle page d’accueil publique moderne sur `/` ;
- le maintien de la redirection vers l’espace de travail pour un utilisateur déjà connecté ;
- l’accès en lecture des collaborateurs aux projets ;
- le maintien des créations, modifications et suppressions de projets aux rôles de pilotage ;
- le glisser-déposer Kanban dans la page d’un projet ;
- la fiabilisation du glisser-déposer dans le Kanban général ;
- le blocage visuel du déplacement des tâches bloquées ou en attente de validation ;
- un test de sécurité confirmant qu’un collaborateur lit les projets mais ne peut pas les administrer.

Ces changements ont été chargés dans les conteneurs Docker locaux. Ils ne sont pas sur le VPS et ne sont pas sur GitHub.

### 2.3 Action obligatoire avant toute nouvelle correction

Antigravity doit commencer par exécuter :

```powershell
git status --short
git branch --show-current
git rev-parse HEAD
git diff --stat
git diff --check
```

Résultat attendu : branche `stabilisation/preproduction`, HEAD `3d79d31`, six fichiers applicatifs modifiés, auxquels s’ajoute le présent document.

Ensuite :

1. lire les différences locales ;
2. vérifier qu’elles correspondent à la section 2.2 ;
3. créer un commit de sauvegarde clairement nommé avant les gros travaux ;
4. ne pousser ou déployer qu’après accord explicite du propriétaire du dépôt.

Si Antigravity travaille sur une autre machine, il doit recevoir un commit ou un patch contenant ces changements. Le dépôt distant seul ne permet pas de retrouver l’état local décrit ici.

### 2.4 État technique vérifié

- Frontend : React 18.3, TypeScript 5.5, Vite 5.4, TanStack Query/Router, Tailwind CSS.
- Runtime frontend CI/Docker : Node 24.
- Backend : Python 3.11, Django 5.0.7, DRF 3.15.1, PostgreSQL 15, Redis 7, Celery, Channels.
- Authentification : JWT en cookies HttpOnly, et non dans le stockage JavaScript.
- Tests les plus récents sur les changements locaux : 96 scénarios de sécurité/tâches réussis, lint frontend réussi, build frontend réussi.
- Services locaux : backend et frontend sains ; `/api/health/ready/` répond HTTP 200.
- Dernière migration tâches : `0012_taskcomment_parent_comment.py`.
- Dernière migration entreprises : `0011_workspace_types_and_personal_plans.py`.
- Dernière migration utilisateurs : `0010_user_legal_acceptance.py`.
- Dernière migration équipes : `0003_team_name_constraint.py`.

Les versions présentes dans `backend/requirements.txt` et `frontend/package-lock.json` sont la source de vérité. Utiliser `pip install -r backend/requirements.txt` et `npm ci`, sans modifier manuellement le fichier de verrouillage.

---

## 3. Décisions de vocabulaire

### 3.1 Vocabulaire affiché à l’utilisateur

| Terme actuel | Terme à afficher | Observation |
| --- | --- | --- |
| Entreprise | Structure | Terme principal dans les formulaires, menus et titres |
| Organisation | Organisation | Accepté dans les phrases génériques : « votre organisation » |
| Usage en entreprise | Usage en structure | Éviter l’alternance aléatoire entre plusieurs termes |
| Propriétaire / Owner | Administrateur de la structure | À distinguer du super-administrateur de plateforme |
| Manager | Responsable | Aucun mot anglais dans l’interface métier |
| Employé / Employee | Collaborateur | Partout dans les écrans, emails et messages API |
| Super admin | Super-administrateur de la plateforme | Réservé au rôle Django `is_superuser` |
| Créer et assigner une tâche | Créer une tâche | Le formulaire détermine ensuite si l’assignation est autorisée |
| Assignées à moi | Mes tâches | Libellé court dans les onglets et filtres |

### 3.2 Valeurs techniques à ne pas renommer

Ne pas renommer les valeurs persistées ou les contrats internes suivants :

- `Role.OWNER = "owner"`
- `Role.MANAGER = "manager"`
- `Role.EMPLOYEE = "employee"`
- `WorkspaceType.COMPANY = "company"`
- champs `company`, `company_id`, `company_slug`
- routes API contenant `/company/`
- clés de filtres comme `scope=assigned`

Un renommage technique provoquerait des migrations, des ruptures d’API, des problèmes de permissions et des incompatibilités avec les données existantes. Seuls les libellés humains, descriptions et messages doivent changer. Les `TextChoices` Django peuvent recevoir des libellés français sans modifier leur valeur stockée.

### 3.3 Centralisation obligatoire

Créer une source centralisée de libellés côté frontend, par exemple :

```ts
export const roleLabels = {
  owner: 'Administrateur de la structure',
  manager: 'Responsable',
  employee: 'Collaborateur',
}
```

Éviter les dictionnaires dupliqués actuellement présents dans `Header.tsx`, `Sidebar.tsx`, `users.tsx` et `planning.tsx`. Faire de même pour les types d’espace et les libellés de périmètre des tâches.

---

## 4. Matrice d’accès de référence

| Capacité | Administrateur de la structure (`owner`) | Responsable (`manager`) | Collaborateur (`employee`) |
| --- | ---: | ---: | ---: |
| Gérer le forfait et les paiements | Oui | Non | Non |
| Inviter un responsable | Oui | Non | Non |
| Inviter un collaborateur | Oui | Oui | Non |
| Gérer les comptes responsables | Oui | Non | Non |
| Gérer les comptes collaborateurs | Oui | Oui | Non |
| Créer et gérer les équipes | Oui | Oui | Non |
| Consulter les projets | Oui | Oui | Oui |
| Créer, modifier ou supprimer un projet | Oui | Oui | Non |
| Créer une tâche | Oui | Oui | Oui, auto-assignée selon les règles existantes |
| Assigner une tâche à une autre personne | Oui | Oui | Non, sauf règle existante du responsable de sous-tâche |
| Modifier le statut d’une tâche accessible | Oui | Oui | Oui selon attribution et validation |
| Traiter les validations | Oui | Oui | Non |
| Voir les statistiques de toute la structure | Oui | Oui | Non |
| Voir ses propres statistiques | Oui | Oui | Oui |

La documentation `docs/ROLES.md` et la recette du 14 août sont dépassées sur l’accès collaborateur aux projets. Elles doivent être mises à jour. Ne pas réintroduire la redirection des collaborateurs depuis `/projects` vers `/dashboard`.

---

## 5. Directives fonctionnelles et techniques détaillées

## F-01 — Suppression d’un projet avec choix du sort des tâches

### Constat actuel

Le champ `Task.project` utilise `on_delete=models.SET_NULL`. La suppression d’un projet conserve donc automatiquement ses tâches en retirant leur rattachement. La fenêtre actuelle informe seulement l’utilisateur de ce comportement et ne lui donne aucun choix.

### Comportement cible

La fenêtre de suppression doit proposer deux choix explicites :

1. **Conserver les tâches** — choix recommandé et sélectionné par défaut. Les tâches restent actives et leur champ `project` devient nul.
2. **Supprimer également les tâches du projet** — les tâches sont archivées logiquement selon la même politique que la suppression d’une tâche (`is_active=False`, `archived_at` renseigné), afin de préserver l’historique, les commentaires et les preuves d’activité.

Ne pas effectuer de suppression physique en cascade des tâches.

### Contrat backend recommandé

- Étendre la suppression de projet avec un paramètre validé `task_policy=detach|archive`.
- Valeur par défaut : `detach`, y compris pour les anciens clients API.
- Exécuter l’opération dans une transaction atomique.
- Verrouiller le projet et sélectionner uniquement ses tâches appartenant à la même structure.
- Pour `archive`, archiver les tâches actives et créer une entrée d’historique `archived_with_project`.
- Retourner HTTP 204 après succès.
- Refuser toute valeur inconnue avec HTTP 400.
- Conserver les permissions actuelles : administrateur de structure, responsable ou super-administrateur dans un contexte de structure.

### Interface

Remplacer la confirmation générique par une modale dédiée affichant :

- le nom du projet ;
- le nombre de tâches actives concernées ;
- les deux choix sous forme de cartes radio ;
- les conséquences de chaque choix ;
- une confirmation renforcée lorsque l’archivage des tâches est choisi.

### Tests d’acceptation

- Suppression avec `detach` : projet absent, tâches actives, `project=null`.
- Suppression avec `archive` : projet absent, tâches inactives, date d’archivage et historique présents.
- Les tâches d’un autre projet ou d’une autre structure ne changent pas.
- Un collaborateur reçoit HTTP 403.
- Une requête répétée ne modifie aucune autre ressource.

Fichiers probables :

- `backend/domain/tasks/views.py`
- `backend/domain/tasks/models.py` uniquement si une aide métier est nécessaire
- `frontend/src/services/projects.ts`
- `frontend/src/pages/projects.tsx`
- `backend/tests/test_security_and_tasks.py`

---

## F-02 — Conversion d’un forfait personnel vers une structure avec prorata

### Risque actuel

Le code de paiement fictif remplace le forfait et place l’abonnement en attente avant la réussite du paiement. La conversion de l’espace personnel modifie aussi immédiatement le type d’espace. Un paiement abandonné ou échoué peut donc interrompre ou dégrader un forfait personnel encore valable.

Le champ actuel `CompanySubscription.starts_at` correspond à la création initiale de l’abonnement et ne représente pas forcément le début de la période renouvelée. Il ne doit pas être utilisé aveuglément pour un prorata. Ajouter des bornes de période courante explicites ou les figer depuis la dernière transaction réussie.

Ce comportement doit être corrigé avant l’intégration de Ligdicash.

### Principe non négociable

Un changement de forfait ne doit jamais désactiver, raccourcir ou remplacer le forfait courant tant que le paiement complémentaire n’est pas confirmé.

### Parcours cible

1. L’utilisateur choisit « Passer à une structure ».
2. Il renseigne les informations de la structure et sélectionne un forfait compatible.
3. Le backend calcule un devis immuable et daté.
4. L’écran affiche : prix du nouveau forfait, crédit restant, complément à payer, nouvelle période et durée de validité du devis.
5. Le forfait personnel et l’espace personnel restent actifs pendant tout le paiement.
6. Après confirmation fiable du paiement, une transaction atomique :
   - convertit le même espace en structure ;
   - conserve toutes les tâches et tous les projets personnels ;
   - applique le nouveau forfait ;
   - positionne l’utilisateur comme `owner`, affiché « Administrateur de la structure » ;
   - fixe la nouvelle date d’échéance ;
   - journalise la conversion et le calcul financier.
7. Si le paiement échoue, expire ou est abandonné, rien ne change sur le forfait existant.

### Calcul recommandé

Utiliser `Decimal`, jamais des flottants.

```text
montant_effectivement_payé = montant de la dernière transaction réussie du forfait courant
durée_totale = fin_forfait_courant - début_de_période_courante
durée_restante = max(fin_forfait_courant - maintenant, 0)
crédit_non_consommé = montant_effectivement_payé × durée_restante / durée_totale
complément = max(prix_nouveau_forfait - crédit_non_consommé, 0)
```

Règles :

- arrondir à l’unité minimale de la devise avec `ROUND_HALF_UP` ;
- crédit nul pour un forfait gratuit ou une période expirée ;
- utiliser le montant réellement payé, pas le tarif actuel du catalogue ;
- figer le prix et les dates dans le devis pour éviter qu’une modification du catalogue change un paiement en cours ;
- si le complément vaut zéro, finaliser sans appel au prestataire et conserver la trace du crédit utilisé ;
- un éventuel crédit excédentaire doit être conservé dans un solde traçable ou explicitement plafonné par une règle produit documentée ; ne pas le perdre silencieusement.

### Modèle recommandé

Ajouter une entité de type `SubscriptionChangeQuote` ou `PlanChangeOrder` contenant au minimum :

- structure/espace ;
- utilisateur demandeur ;
- forfait source et forfait cible ;
- prix source réellement payé ;
- prix cible figé ;
- crédit calculé ;
- complément à payer ;
- devise ;
- début et fin de période source ;
- début et fin de période courante explicites sur l’abonnement, ou référence fiable à la transaction qui les a ouvertes ;
- nouvelle fin de période prévue ;
- statut `quoted`, `pending_payment`, `paid`, `applied`, `expired`, `cancelled`, `failed` ;
- date d’expiration ;
- identifiant d’idempotence ;
- détails du calcul en JSON à des fins d’audit.

La transaction `PaymentTransaction` doit référencer ce changement. Ne pas modifier `CompanySubscription.plan`, `status` ou `ends_at` dans la fonction qui démarre un paiement.

### Préparation à Ligdicash

- Garder un service de paiement indépendant du fournisseur.
- Le navigateur ne doit jamais déclarer seul un paiement réussi.
- La confirmation définitive viendra d’un webhook signé ou d’une vérification serveur-à-serveur.
- Rendre le webhook idempotent par la référence fournisseur.
- Conserver le fournisseur fictif uniquement pour les tests locaux.
- Ne pas implémenter de détail Ligdicash sans sa documentation officielle, ses clés de test et son contrat de signature.

### Tests obligatoires

- conversion au milieu d’un forfait mensuel et annuel ;
- forfait gratuit vers forfait payant ;
- complément nul ;
- paiement réussi, échoué, annulé, expiré et envoyé deux fois ;
- modification du tarif catalogue après émission du devis ;
- absence de transaction réussie antérieure ;
- préservation des tâches, projets, commentaires et pièces jointes ;
- maintien du forfait personnel pendant un paiement en attente ;
- isolation entre structures ;
- arrondis XOF.

Fichiers probables :

- `backend/domain/companies/models.py`
- nouvelle migration `companies`
- `backend/domain/companies/services.py`
- `backend/domain/companies/views.py`
- `backend/domain/companies/serializers.py`
- `backend/domain/users/serializers.py`
- `frontend/src/pages/onboarding.tsx`
- `frontend/src/pages/subscription.tsx`
- `frontend/src/services/subscriptions.ts`
- tests backend de facturation et tests frontend du devis

---

## F-03 — Interdire les équipes d’une seule personne

### Règle métier

Une équipe doit compter au moins deux personnes actives et distinctes, responsable compris.

Le responsable doit toujours être membre de l’équipe. L’ensemble réel est donc :

```text
membres_effectifs = member_ids ∪ {leader_id}
```

La création ou la modification est refusée si `len(membres_effectifs) < 2`.

### Backend

- Ajouter la validation aux serializers de création et de modification.
- Traduire les messages anglais actuellement présents dans `backend/domain/teams/serializers.py`.
- Ajouter automatiquement le responsable aux membres, ou imposer sa présence puis la garantir côté service. Le comportement doit être unique et testé.
- Appliquer la même contrainte aux endpoints d’ajout et de retrait d’un membre.
- Interdire le retrait qui ferait passer une équipe active sous deux personnes.
- Ne pas compter deux fois un responsable déjà coché.
- Conserver le cloisonnement par structure et le contrôle `is_active`.

### Données existantes

Ne pas ajouter arbitrairement un utilisateur à une équipe existante. Fournir un audit ou une commande listant les équipes actives de moins de deux personnes afin que l’administrateur les complète ou les désactive.

### Frontend

- Expliquer « Sélectionnez au moins deux personnes, responsable compris ».
- Afficher le compteur de membres effectifs.
- Empêcher la soumission tant que le minimum n’est pas atteint, tout en conservant la validation backend.
- Pré-cocher ou représenter clairement le responsable dans les membres.

### Tests

- zéro, une et deux personnes ;
- responsable déjà présent dans `member_ids` ;
- doublons ;
- collaborateur inactif ou d’une autre structure ;
- modification ou retrait faisant passer sous le minimum ;
- équipe existante conforme inchangée.

---

## F-04 — Harmoniser tous les rôles et libellés métier

Appliquer la table de la section 3 à :

- navigation, en-tête et profil ;
- page utilisateurs et filtres ;
- planning ;
- projets, équipes et tâches ;
- abonnement et onboarding ;
- pages d’administration de plateforme ;
- messages API et erreurs ;
- notifications et emails ;
- documents légaux et README ;
- exports Excel ;
- documentation OpenAPI ;
- données de démonstration visibles.

Ne pas effectuer un simple remplacement global aveugle : les noms de classes, champs, routes et valeurs techniques doivent rester stables.

Critère d’acceptation : aucune occurrence visible de « Owner », « Employee », « Employé », « Propriétaire », « Manager » ou « Entreprise » dans les parcours utilisateur, sauf texte historique explicitement conservé. Les termes techniques peuvent rester dans le code.

---

## F-05 — Filtrer les tâches par période

### Interface

Ajouter dans la page Tâches :

- date de début ;
- date de fin ;
- critère de période : « Échéance », « Création » ou « Achèvement » ;
- bouton de réinitialisation ;
- rappel clair de la période active ;
- conservation des filtres dans l’URL afin de partager ou retrouver la vue.

Valeur par défaut du critère : **Échéance**.

### API

Étendre `apply_task_filters` avec :

- `date_from=YYYY-MM-DD`
- `date_to=YYYY-MM-DD`
- `date_field=due|created|completed`

Règles :

- dates inclusives ;
- `date_from <= date_to` ;
- erreur HTTP 400 structurée en cas de date invalide ;
- limite recommandée de 366 jours pour les statistiques détaillées, sauf rôle de plateforme ;
- filtre appliqué après `accessible_tasks_for` pour éviter toute fuite ;
- mêmes paramètres sur la liste, les statistiques et l’export Excel ;
- index à évaluer sur `created_at` et `completed_at` si le volume le justifie.

### Export

L’export Excel doit reprendre exactement les filtres de l’écran, indiquer la période et conserver la limite de sécurité existante de 5 000 lignes.

### Tests

- bornes inclusives ;
- changement de critère ;
- tâche sans date ;
- période inversée ;
- fuseau horaire ;
- périmètres « Mes tâches », équipe et structure ;
- absence de fuite entre structures.

---

## F-06 — Statistiques sur une période et analytique enrichie

### Objectif

Les statistiques doivent aider une structure à décider, pas seulement afficher quatre compteurs généraux.

Étendre les services de tableau de bord, actuellement limités à « cette semaine » et aux 30 derniers jours, avec `date_from`, `date_to`, `team_id`, `project_id` et, pour les rôles autorisés, `assignee_id`.

### Indicateurs prioritaires

Pour la période sélectionnée :

- tâches créées ;
- tâches achevées ;
- tâches restant ouvertes à la fin de la période ;
- tâches en retard ;
- taux d’achèvement ;
- taux d’achèvement dans les délais ;
- durée moyenne et médiane d’achèvement ;
- répartition par statut et priorité ;
- évolution quotidienne ou hebdomadaire du flux créé/terminé ;
- charge estimée par équipe et collaborateur ;
- projets à risque et progression des projets ;
- tâches bloquées ;
- volume de validations en attente, acceptées et refusées.

### Définitions à documenter

Chaque métrique doit avoir une définition stable. Exemples :

- « achevée dans la période » signifie `completed_at` dans les bornes ;
- « dans les délais » signifie `completed_at::date <= due_date` ;
- une tâche sans échéance n’entre pas dans le dénominateur du taux de ponctualité ;
- la médiane est préférable à la moyenne pour les durées très dispersées ;
- aucun taux ne doit afficher `NaN` ou une division par zéro.

### Droits

- Administrateur de structure et responsable : statistiques globales, par équipe, projet et collaborateur.
- Collaborateur : uniquement ses tâches accessibles et ses propres tendances.
- Super-administrateur : uniquement après sélection explicite d’une structure.

### API recommandée

Créer un endpoint analytique cohérent, par exemple `/api/dashboard/analytics/`, plutôt que multiplier les calculs divergents dans le navigateur. Les agrégations doivent être réalisées en base de données lorsque cela est raisonnable.

### Performance

- Éviter une boucle Python par tâche pour calculer les statistiques.
- Utiliser `Count`, `Avg`, agrégations conditionnelles et troncature par jour/semaine.
- Ajouter des index uniquement après observation du plan de requête.
- Mettre un cache court par structure et filtre si nécessaire, invalidé ou expiré rapidement.

---

## F-07 — Corriger « Connexion : jamais »

### Cause identifiée

Le projet génère manuellement les JWT dans `authentication_response`. Le mécanisme Django qui met normalement `last_login` à jour n’est donc jamais appelé. Le serializer et l’interface lisent correctement le champ, mais la base conserve `NULL`.

### Correction

- Mettre `last_login` à jour côté serveur après toute authentification réussie : mot de passe, Google, inscription suivie d’une connexion automatique et autres parcours utilisant `authentication_response`.
- Utiliser la fonction Django `update_last_login` ou une mise à jour équivalente atomique.
- Effectuer la mise à jour avant de sérialiser l’utilisateur dans la réponse.
- Ne jamais mettre à jour `last_login` lors d’un simple rafraîchissement de jeton.
- Ne jamais le modifier après une tentative échouée.

### Affichage

Afficher date et heure, par exemple `18/08/2026 à 14:32`, et pas seulement la date. Réserver « Jamais » aux comptes n’ayant réellement jamais ouvert de session.

### Tests

- connexion mot de passe réussie ;
- mauvais mot de passe ;
- compte inactif ;
- connexion Google existante et création Google ;
- rafraîchissement JWT ;
- valeur exposée dans la liste des utilisateurs.

---

## F-08 — Retirer le stockage des offres commerciales

### Constat

`SubscriptionPlan.storage_limit_mb` est exposé dans les offres et sert aussi à refuser des pièces jointes. Le retirer uniquement de l’écran créerait une fausse correction.

### Décision

Le stockage ne doit plus être un différenciateur commercial entre forfaits. La plateforme doit néanmoins conserver des protections techniques globales contre les fichiers trop gros et les abus.

### Étapes sûres

1. Retirer le stockage de l’onboarding, de la page abonnement et de l’administration des forfaits.
2. Retirer `storage_limit_mb` des types et serializers publics de forfait.
3. Remplacer le quota par forfait dans le serializer des pièces jointes par :
   - une taille maximale par fichier configurable ;
   - une liste de types autorisés ;
   - éventuellement une limite technique globale indépendante du forfait.
4. Marquer le champ de base comme obsolète pendant une version si une compatibilité API est nécessaire.
5. Supprimer ensuite le champ via migration lorsque plus aucun code ne le lit.

Ne pas supprimer `django-storages`, `boto3` ou la configuration S3 uniquement à cause de cette décision : ils servent au stockage technique des médias, pas à la commercialisation d’un quota.

### Tests

- aucune mention de stockage dans les cartes de forfait ;
- création/modification d’un forfait sans champ stockage ;
- pièce jointe valide acceptée quel que soit le forfait ;
- fichier trop volumineux ou dangereux refusé ;
- migrations applicables sur une base existante.

---

## F-09 — Retirer l’identifiant d’espace de la création d’une structure

### Comportement cible

L’utilisateur ne saisit plus de slug ni d’« identifiant de l’espace ». Il renseigne uniquement le nom de sa structure. Le slug reste un identifiant interne généré automatiquement.

### Backend

- Retirer `company_slug` des formulaires publics et le rendre non nécessaire dans les serializers d’onboarding.
- Générer un slug depuis le nom avec `slugify`.
- Gérer automatiquement les collisions : `ma-structure`, `ma-structure-2`, `ma-structure-3`, etc.
- Protéger la génération contre les requêtes concurrentes avec contrainte unique et reprise contrôlée après `IntegrityError`.
- Ne jamais exposer une erreur « identifiant déjà utilisé » à l’utilisateur lors de la création normale.
- Conserver le slug dans le modèle, l’administration technique et les URLs internes qui en ont besoin.

### Frontend

- Supprimer le champ de `onboarding.tsx` et du type de formulaire public.
- Adapter les erreurs et tests.
- Dans l’administration de plateforme, le slug peut être affiché en lecture seule ou dans une section avancée, mais ne doit pas être présenté comme une notion métier.

---

## F-10 — Améliorer le tableau de bord

### Architecture d’écran recommandée

Le tableau de bord doit être adapté au rôle.

#### Collaborateur

1. salutation et sélecteur de période ;
2. « Ma journée » : retard, aujourd’hui, en cours et prochaines échéances ;
3. quatre indicateurs personnels : ouvertes, terminées, en retard, taux de réalisation ;
4. tendance de réalisation sur la période ;
5. tâches nécessitant une action ou une validation ;
6. activité récente limitée aux tâches accessibles.

#### Responsable et administrateur de structure

1. sélecteur de période ;
2. filtres structure, équipe et projet ;
3. indicateurs clés ;
4. évolution créé/terminé ;
5. répartition par statut et priorité ;
6. charge par équipe/collaborateur ;
7. projets à risque ;
8. validations en attente ;
9. activité récente.

### Exigences visuelles

- hiérarchie claire, peu de couleurs simultanées ;
- graphiques lisibles avec légende et valeurs accessibles ;
- responsive à 390 px sans débordement horizontal ;
- états de chargement, vide et erreur pour chaque bloc ;
- aucun chiffre factice ;
- pas de graphique décoratif sans définition métier ;
- mode sombre cohérent ;
- navigation clavier et contrastes suffisants.

Le projet n’a actuellement aucune bibliothèque de graphiques. Si une dépendance est ajoutée, la justifier, l’installer avec `npm install`, mettre à jour `package-lock.json`, vérifier le poids du bundle et couvrir les composants principaux. Une solution SVG/CSS légère reste acceptable pour les graphiques simples.

---

## F-11 — Qualité du français et encodage

### Encodage

Le code source est en UTF-8. L’affichage `Get-Content` dans certains terminaux Windows peut produire une représentation erronée sans que le fichier soit corrompu. Ne pas réencoder en masse sur la base du seul affichage du terminal.

Avant toute correction :

- rechercher les séquences typiques `Ã`, `Â`, `â€™`, `â€¦`, `ðŸ` dans les fichiers ;
- vérifier le rendu réel dans le navigateur ;
- corriger seulement les fichiers réellement touchés ;
- conserver UTF-8 sans BOM si le fichier l’utilise déjà.

Ajouter un contrôle CI qui échoue sur les séquences de mojibake connues dans les fichiers utilisateur, avec une liste d’exceptions explicites si nécessaire.

### Français

Auditer tous les textes visibles : frontend, erreurs API, emails, notifications et exports. Des messages anglais sont déjà présents dans `backend/domain/teams/serializers.py` et certaines réponses techniques.

Règles :

- aucun mot anglais visible lorsqu’un équivalent français existe ;
- terminologie centralisée ;
- apostrophes, accents et espaces insécables cohérents ;
- messages d’erreur actionnables ;
- ne pas traduire les identifiants techniques, noms de champs ou valeurs d’API.

Mettre à jour les tests qui vérifient les textes et ajouter un petit test de non-régression sur les principaux libellés.

---

## F-12 — Libellés de création et périmètres des tâches

Appliquer précisément :

- bouton principal : « Créer une tâche » pour tous les rôles ;
- onglet `assigned` : « Mes tâches » ;
- export correspondant : « Mes tâches » ;
- éviter la coexistence de « Mes tâches », « Assignées à moi » et « Tâches assignées à moi » pour le même périmètre ;
- conserver en interne `scope=assigned` ;
- expliquer dans le formulaire que les options d’assignation dépendent des droits, sans alourdir le bouton principal.

Vérifier la page Tâches, la barre latérale, le tableau de bord, les exports, les modèles de tâches et les notifications.

---

## 6. Exigences transversales

### 6.1 Sécurité et cloisonnement

- Toute requête métier doit utiliser la structure issue de `get_requested_company`.
- Toute statistique doit partir d’un queryset déjà limité par les droits.
- Ne jamais accepter un `company_id` du navigateur comme autorité suffisante.
- Le super-administrateur doit sélectionner explicitement une structure avant de voir ses données métier.
- Les collaborateurs ne doivent jamais obtenir de données globales via une nouvelle API de statistiques.

### 6.2 Transactions et idempotence

Utiliser `transaction.atomic` pour :

- suppression d’un projet et traitement des tâches ;
- application d’un changement de forfait ;
- confirmation de paiement ;
- conversion d’un espace personnel en structure.

Les webhooks de paiement et opérations financières doivent être idempotents.

### 6.3 Compatibilité

- Les anciennes requêtes de suppression de projet sans option doivent conserver les tâches.
- Les valeurs internes de rôles et d’espace restent inchangées.
- Les données existantes doivent survivre aux migrations.
- Les anciennes transactions de paiement restent consultables.

### 6.4 Observabilité

Journaliser sans secret :

- demande et application de changement de forfait ;
- calcul du crédit ;
- référence de paiement et transitions de statut ;
- suppression de projet et politique choisie ;
- changement de rôle ;
- échec d’une agrégation analytique.

---

## 7. Ordre d’implémentation recommandé

### Lot 0 — Sauvegarde du niveau actuel

1. vérifier le statut Git ;
2. relire les six fichiers locaux ;
3. lancer les tests actuels ;
4. créer un commit de point de reprise ;
5. mettre à jour `docs/ROLES.md` pour l’accès collaborateur aux projets.

### Lot 1 — Corrections courtes et à fort impact

1. vocabulaire centralisé ;
2. correction `last_login` ;
3. retrait du champ slug dans l’onboarding ;
4. minimum de deux personnes par équipe ;
5. libellés « Créer une tâche » et « Mes tâches » ;
6. audit français/encodage.

### Lot 2 — Sécurité des données

1. choix de conservation ou archivage des tâches à la suppression d’un projet ;
2. retrait complet du stockage comme caractéristique de forfait ;
3. limites techniques indépendantes pour les pièces jointes.

### Lot 3 — Facturation et conversion

1. modèle de devis de changement ;
2. calcul du crédit/prorata ;
3. paiement sans mutation prématurée de l’abonnement ;
4. conversion atomique après paiement ;
5. écran récapitulatif ;
6. préparation de l’adaptateur Ligdicash.

Ce lot doit rester séparé dans un commit ou une branche clairement identifiable. Ne pas mélanger une migration financière avec un simple changement visuel.

### Lot 4 — Périodes, statistiques et tableau de bord

1. filtres de période partagés ;
2. endpoint analytique ;
3. définitions et tests des métriques ;
4. tableau de bord par rôle ;
5. export de la période ;
6. validation mobile, sombre et performance.

### Lot 5 — Recette globale

1. tests automatisés complets ;
2. migrations à blanc ;
3. contrôle OpenAPI ;
4. recette administrateur, responsable et collaborateur ;
5. mise à jour de la documentation ;
6. commit puis, seulement sur demande, push et déploiement.

---

## 8. Stratégie de commits

Commits recommandés :

1. `chore: checkpoint landing projects and kanban fixes`
2. `refactor: harmonize french business terminology`
3. `fix: track successful user logins`
4. `feat: enforce viable team membership`
5. `feat: add project task deletion policy`
6. `refactor: remove storage from commercial plans`
7. `feat: quote prorated workspace upgrades`
8. `feat: add period analytics and dashboard filters`
9. `docs: update roles and functional acceptance`

Chaque commit doit être autonome, testable et ne contenir aucun secret ni fichier `.env`.

---

## 9. Matrice de recette minimale

### Comptes

- super-administrateur sans structure sélectionnée ;
- super-administrateur avec structure sélectionnée ;
- administrateur de structure ;
- responsable ;
- collaborateur ;
- utilisateur en espace personnel ;
- utilisateur convertissant son espace personnel.

### Parcours

| Parcours | Résultat attendu |
| --- | --- |
| Collaborateur ouvre Projets | Liste et détail accessibles, aucune action d’administration |
| Administrateur déplace une tâche Kanban | Changement persistant dans le Kanban général et celui du projet |
| Tâche bloquée ou en validation | Pas de déplacement direct, explication visible |
| Suppression projet + conservation | Tâches conservées sans projet |
| Suppression projet + archivage | Tâches archivées, historique conservé |
| Création équipe à une personne | Refus frontend et backend |
| Connexion réussie | `last_login` mis à jour et affiché avec heure |
| Connexion échouée | `last_login` inchangé |
| Conversion avec paiement en attente | Forfait personnel encore actif |
| Conversion avec paiement réussi | Structure créée, données conservées, nouveau forfait actif |
| Conversion avec paiement échoué | Aucune modification du forfait ou de l’espace |
| Filtre de période | Liste, statistiques et export cohérents |
| Collaborateur consulte les statistiques | Seulement son périmètre accessible |
| Offre affichée | Aucune mention de quota de stockage |
| Création d’une structure | Aucun champ slug/identifiant d’espace |
| Interface française | Aucun libellé métier anglais ou texte corrompu |

---

## 10. Commandes de validation obligatoires

### Backend

Depuis la racine :

```powershell
& '.\backend\.venv\Scripts\pytest.exe' '.\backend' -q
& '.\backend\.venv\Scripts\python.exe' '.\backend\manage.py' makemigrations --check --dry-run
& '.\backend\.venv\Scripts\python.exe' '.\backend\manage.py' check
& '.\backend\.venv\Scripts\python.exe' '.\backend\manage.py' spectacular --validate --file '.\backend\openapi.generated.yml'
```

Sous Linux/CI, utiliser les équivalents `python` et `pytest`.

### Frontend

```powershell
Set-Location frontend
npm ci
npm test -- --run --pool=threads --maxWorkers=1
npm run lint
npm run build
Set-Location ..
```

### Docker local

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Vérifier ensuite :

- `http://localhost/`
- `http://localhost/api/health/live/`
- `http://localhost/api/health/ready/`
- Mailpit sur `http://localhost:8025/`

### Préproduction

Ne pas déployer automatiquement. Le VPS public temporaire reste accessible par IP et ne possède pas encore le domaine/HTTPS final. Avant tout déploiement : sauvegarde PostgreSQL, commit identifié, migrations contrôlées, accord explicite et plan de retour arrière.

---

## 11. Définition de « terminé »

Une directive n’est terminée que si :

1. le comportement backend est correct et sécurisé ;
2. l’interface représente fidèlement ce comportement ;
3. les messages sont en français propre ;
4. les règles d’accès sont testées pour les trois rôles ;
5. les données d’une autre structure restent inaccessibles ;
6. les tests unitaires et d’intégration réussissent ;
7. le lint et le build réussissent ;
8. la migration est réversible ou sa stratégie de retour arrière est documentée ;
9. la documentation fonctionnelle et la matrice des rôles sont à jour ;
10. le parcours est vérifié localement sur ordinateur et mobile ;
11. aucun changement non lié n’a été écrasé ;
12. aucun secret, mot de passe ou fichier `.env` n’est commité.

---

## 12. Points d’attention particuliers pour Antigravity

- La source de vérité actuelle est le dossier local, pas uniquement GitHub.
- Ne pas se fier aveuglément à la recette du 14 août : le produit a évolué depuis.
- Ne pas renommer les valeurs techniques `owner`, `manager`, `employee` et `company`.
- Ne pas appliquer le nouveau forfait avant confirmation du paiement.
- Ne pas supprimer physiquement les tâches avec un projet.
- Ne pas retirer les protections techniques des pièces jointes en retirant le quota commercial.
- Ne pas calculer les statistiques dans le navigateur à partir d’une liste partielle ou paginée.
- Ne pas exposer les statistiques globales à un collaborateur.
- Ne pas corriger l’encodage par une conversion globale non vérifiée.
- Ne pas ajouter une personne au hasard pour réparer une équipe existante d’une seule personne.
- Ne pas pousser sur GitHub ni toucher au VPS sans demande explicite.

Ce document doit accompagner le code pendant toute la prochaine vague de consolidation et être mis à jour lorsque l’une des décisions produit évolue.
