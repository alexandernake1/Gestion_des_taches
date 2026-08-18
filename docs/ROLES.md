# Matrice des rôles

Une structure possède trois rôles métier. Le super-administrateur reste un rôle de plateforme séparé.

| Capacité | Administrateur de la structure (`owner`) | Responsable (`manager`) | Collaborateur (`employee`) |
|---|---:|---:|---:|
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
| Administrer toutes les structures | Non | Non | Non |

Le super-administrateur supervise les structures, les forfaits et les incidents de plateforme. Il doit sélectionner explicitement une structure avant d’accéder à ses ressources métier.

## Règles structurelles

- Une structure conserve exactement un administrateur actif.
- L’administrateur de la structure ne peut pas être désactivé ou rétrogradé depuis l’interface.
- Un responsable ne peut administrer que les comptes collaborateurs de sa structure.
- Un collaborateur peut consulter les projets et ses tâches assignées, mais ne peut pas administrer les utilisateurs, les équipes, les projets, les paiements ou les tableaux de bord globaux de gestion.
- Les espaces personnels ne comportent ni collaborateurs, ni équipes, ni projets partagés.
- Toutes les ressources et les recherches d’objets restent cloisonnées par structure côté API.

