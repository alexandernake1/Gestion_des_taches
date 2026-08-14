# Recette fonctionnelle — amendements du rapport

Date : 14 août 2026
Branche : `stabilisation/preproduction`

## Résultat général

Les parcours personnel et entreprise ont été exécutés sur les services Docker locaux. La suite automatisée est verte : 103 tests backend, 13 tests frontend, lint et compilation de production réussis. La contre-recette visuelle a ensuite été réalisée sur desktop et sur un viewport mobile émulé de 390 × 844 px.

## Vérifications réalisées

| Amendement | Résultat | Preuve fonctionnelle |
| --- | --- | --- |
| Inscription sans entreprise | Conforme | Un compte est créé avec `company = null`, puis dirigé vers le choix d’usage. |
| Forfaits personnels | Conforme | Trois offres personnelles sont proposées et filtrées séparément des offres entreprise. |
| Espace personnel | Conforme | L’espace privé est créé sans équipe ; les tâches appartiennent automatiquement à l’utilisateur. |
| Formulaires personnels | Conforme | Les champs d’assignation, d’équipe et de validation sont masqués et neutralisés côté API. |
| Conversion vers une entreprise | Conforme | Le même espace est converti sans perte des tâches et le propriétaire conserve son rôle. |
| Statut initial d’une tâche | Conforme | Une nouvelle tâche est créée avec le statut `À faire`. |
| Équipe et responsable | Conforme | Une tâche liée à une équipe récupère automatiquement son responsable. |
| Cohérence projet/équipe | Conforme | Seules les équipes rattachées au projet sont acceptées. |
| Validation avant clôture | Conforme | L’employé ne peut pas clôturer directement ; il soumet, le responsable approuve, puis la tâche est terminée. |
| Historique d’approbation | Conforme | L’approbation, le responsable et la transition finale sont enregistrés. |
| Report d’une tâche | Conforme | La nouvelle échéance est obligatoire ; après approbation, l’ancienne et la nouvelle date sont conservées et la tâche reste reportée dans le projet. |
| Sous-tâches absentes | Conforme | Le taux d’avancement est `null` et l’interface n’affiche pas un faux 100 %. |
| Retards | Conforme | Le retard et la fin tardive sont calculés séparément du cycle de travail et affichés explicitement. |
| Mot de passe oublié | Conforme | Réponse non révélatrice, email HTML capturé dans Mailpit, lien valide et expiration d’une heure. |
| Conditions et confidentialité | Conforme | Les documents sont accessibles depuis l’inscription, la connexion et l’espace authentifié. |
| Se souvenir de moi | Conforme | Les cookies sont de session ou persistants selon le choix et la politique est conservée au renouvellement. |

## Anomalie corrigée pendant la recette

Un employé qui était simultanément responsable de la tâche et membre de l’équipe recevait deux notifications d’assignation. Le signal exclut désormais le responsable direct de la notification collective d’équipe.

Formulation retenue pour le destinataire :

> La tâche « Nom de la tâche » vous a été assignée.

La correction a été vérifiée sur l’API locale : une seule notification est créée pour le destinataire.

## Contre-recette visuelle et corrections

Les écrans publics et authentifiés ont été inspectés en modes clair et sombre, avec les profils propriétaire et employé. Les corrections suivantes ont été validées :

- aucun débordement horizontal à 390 px sur la connexion, l’inscription, les pages légales, le tableau de bord, les tâches, les utilisateurs, le planning et l’abonnement ;
- actions et onglets de la page Tâches utilisables sur mobile ;
- contrastes cohérents avec le thème sombre sur le tableau de bord, les utilisateurs et le planning ;
- pagination de la liste des utilisateurs et affichage progressif des membres du planning ;
- chargement complet de l’abonnement sans squelette persistant ;
- libellés de rôles affichés en français ;
- accès direct aux projets refusé aux employés et redirection vers le tableau de bord.

## Éléments volontairement différés

- Connexion Google : le code est prêt, mais nécessite un Client ID Google réel hors test local.
- Emails vers Internet : Mailpit reste utilisé localement ; un fournisseur SMTP transactionnel et un domaine professionnel seront configurés avant la préproduction publique.
- Turnstile : widget de démonstration en local ; paire de clés réelle obligatoire en préproduction.

## Consolidation technique avant préproduction

- CI rendue concurrente et bloquante sur les migrations, les contrôles Django de sécurité, le schéma OpenAPI, les tests, le lint, le build et la configuration Docker.
- Sondes publiques de vie et de disponibilité ajoutées ; la disponibilité vérifie PostgreSQL et Redis.
- Celery Worker et Beat intégrés au déploiement Docker pour les notifications et le cycle des abonnements.
- Authentification WebSocket migrée vers le cookie JWT HttpOnly, avec refus des jetons en URL et validation de l’origine.
- Accès API aux projets réservé au propriétaire et aux managers, avec tests d’isolation interentreprises.
- Paiement fictif bloqué quand le fournisseur est désactivé ; aucune transaction simulée ne peut être créée par erreur.
- Contrôle `check_preproduction` ajouté pour détecter les secrets factices, HTTP résiduel, cookies non sécurisés et intégrations externes incomplètes.
- Sauvegarde PostgreSQL testée avec archive lisible et somme SHA-256 valide ; procédure de restauration sécurisée documentée mais non exécutée sur la base active.

## Prochaine étape recommandée

Préparer un commit unique de stabilisation, puis déployer l’ensemble sur l’environnement de préproduction.
