# Matrice des rôles

Les quatre rôles sont conservés car ils répondent à des responsabilités distinctes.

| Capacité | Propriétaire | Administrateur | Manager | Employé |
|---|---:|---:|---:|---:|
| Représenter l’entreprise et gérer le forfait | Oui | Non | Non | Non |
| Consulter l’historique des paiements | Oui | Non | Non | Non |
| Inviter un administrateur | Oui | Non | Non | Non |
| Inviter un manager ou un employé | Oui | Oui | Non | Non |
| Modifier ou désactiver des comptes | Oui | Oui, sauf propriétaire | Non | Non |
| Consulter les collaborateurs | Oui | Oui | Oui | Non |
| Créer et gérer les équipes | Oui | Oui | Oui | Non |
| Créer et assigner des tâches à l’organisation | Oui | Oui | Oui | Non |
| Créer une tâche personnelle | Oui | Oui | Oui | Oui |
| Traiter ses tâches et commenter | Oui | Oui | Oui | Oui |
| Administrer toutes les entreprises | Non | Non | Non | Non |

Le super-administrateur est un rôle de plateforme séparé. Il supervise les
entreprises, abonnements et paiements, mais les statuts d’abonnement sont
calculés automatiquement et ne sont pas modifiés manuellement.

## Règles structurelles

- Une entreprise conserve exactement un propriétaire actif.
- Le propriétaire ne peut pas être désactivé ou rétrogradé depuis l’interface.
- Un administrateur ne peut pas modifier le propriétaire.
- Un manager consulte les collaborateurs mais ne gère pas leurs accès.
- Les employés ne voient que les parcours opérationnels nécessaires à leur travail.
- Toutes les ressources restent cloisonnées par entreprise.
