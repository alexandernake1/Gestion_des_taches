# Matrice des rôles

Une entreprise possède trois rôles métier. Le super-administrateur reste un rôle de plateforme séparé.

| Capacité | Propriétaire | Manager | Employé |
|---|---:|---:|---:|
| Gérer le forfait et consulter les paiements | Oui | Non | Non |
| Inviter un manager | Oui | Non | Non |
| Inviter un employé | Oui | Oui | Non |
| Modifier, archiver ou réactiver un manager | Oui | Non | Non |
| Modifier, archiver ou réactiver un employé | Oui | Oui | Non |
| Consulter les collaborateurs | Oui | Oui | Non |
| Créer et gérer les équipes | Oui | Oui | Non |
| Créer et gérer les projets | Oui | Oui | Non |
| Créer et assigner des tâches à l’organisation | Oui | Oui | Non |
| Créer une tâche personnelle | Oui | Oui | Oui |
| Traiter les tâches visibles et commenter | Oui | Oui | Oui |
| Valider les demandes de clôture ou de report | Oui | Oui | Non |
| Administrer toutes les entreprises | Non | Non | Non |

Le super-administrateur supervise les entreprises, les forfaits et les incidents de plateforme. Il doit sélectionner explicitement une entreprise avant d’accéder à ses ressources métier.

## Règles structurelles

- Une entreprise conserve exactement un propriétaire actif.
- Le propriétaire ne peut pas être désactivé ou rétrogradé depuis l’interface.
- Un manager ne peut administrer que les comptes employés de son entreprise.
- Un employé ne peut pas consulter directement les utilisateurs, équipes, projets, paiements ou tableaux de bord de gestion.
- Les espaces personnels ne comportent ni collaborateurs, ni équipes, ni projets partagés.
- Toutes les ressources et les recherches d’objets restent cloisonnées par entreprise côté API.
