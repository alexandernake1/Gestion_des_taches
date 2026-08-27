import type React from 'react'
import {
  Sparkles,
  BarChart3,
  Play,
  ShieldCheck,
  BellRing,
  ListTodo,
  Users,
  FolderKanban,
  CreditCard,
  CalendarRange,
  Bell,
  Building2,
  UserCheck,
  FileCheck2,
  Clock,
  Briefcase,
} from 'lucide-react'
import type { Role, WorkspaceType } from '@/domain/types'

export type GuideCategory = 'tasks' | 'projects' | 'approvals' | 'teams' | 'planning' | 'billing' | 'personal'
export type GuideRoute =
  | '/tasks'
  | '/projects'
  | '/teams'
  | '/approvals'
  | '/planning'
  | '/notifications'
  | '/subscription'
  | '/onboarding'
  | '/settings'
  | '/dashboard'

export interface GuideUserContext {
  isPersonalWorkspace: boolean
  role?: Role | string
  isSuperuser?: boolean
  hasCompany?: boolean
  featureFlags?: Record<string, boolean>
}

export interface AdaptiveTourStep {
  id: string
  icon: React.ElementType
  badge: string
  title: string
  description: string
  highlights: string[]
  shortcutAction?: {
    label: string
    route: '/dashboard' | '/tasks' | '/approvals' | '/settings' | '/subscription' | '/projects' | '/teams'
  }
}

export interface AdaptiveGuideTopic {
  id: string
  title: string
  category: GuideCategory
  icon: React.ElementType
  summary: string
  steps: string[]
  tip?: string
  actionLabel?: string
  route?: GuideRoute
  // Filtering constraints:
  allowedWorkspaceTypes?: WorkspaceType[]
  allowedRoles?: Role[]
  requiredFeature?: string
  requiresCompanyAdmin?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// TOUR STEPS PER PROFILE / CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

export function getAdaptiveTourSteps(context: GuideUserContext): AdaptiveTourStep[] {
  const { isPersonalWorkspace, role, isSuperuser, featureFlags = {} } = context
  const isEmployee = role === 'employee' && !isSuperuser
  const isManager = role === 'manager' && !isSuperuser
  const hasProjects = isSuperuser || Boolean(featureFlags.has_projects)

  // 1. Parcours COMPTE PERSONNEL
  if (isPersonalWorkspace) {
    return [
      {
        id: 'personal-welcome',
        icon: Sparkles,
        badge: 'Étape 1 sur 4 • Bienvenue',
        title: 'Bienvenue dans votre espace personnel',
        description:
          'Activity Control vous offre un espace individuel clair, rapide et sans superflu pour gérer toutes vos activités personnelles en toute autonomie.',
        highlights: [
          'Espace personnel dédié et sécurisé',
          'Gestion sans friction ni hiérarchie',
          'Possibilité de créer une structure d’équipe quand votre activité grandit',
        ],
      },
      {
        id: 'personal-dashboard',
        icon: BarChart3,
        badge: 'Étape 2 sur 4 • Tableau de bord',
        title: 'Un aperçu direct de vos priorités',
        description:
          'Suivez en un coup d’œil vos tâches en cours, celles à traiter aujourd’hui et vos échéances à venir grâce à vos indicateurs personnalisés.',
        highlights: [
          'Compteurs de tâches en retard et du jour',
          'Taux d’accomplissement personnel',
          'Filtres rapides par statut et priorité',
        ],
        shortcutAction: {
          label: 'Voir mon Tableau de bord',
          route: '/dashboard',
        },
      },
      {
        id: 'personal-tasks',
        icon: Play,
        badge: 'Étape 3 sur 4 • Gestion des tâches',
        title: 'Organisez et démarrez vos tâches en 1 clic',
        description:
          'Créez des tâches avec sous-tâches, pièces jointes et dates limites. Dès qu’une tâche est prête, cliquez sur « Commencer la tâche » pour la passer immédiatement en cours.',
        highlights: [
          'Bouton direct « Commencer la tâche »',
          'Découpage en sous-tâches et liste de contrôle',
          'Modèles de tâches pour gagner du temps',
        ],
        shortcutAction: {
          label: 'Créer mes tâches',
          route: '/tasks',
        },
      },
      {
        id: 'personal-notifications',
        icon: BellRing,
        badge: 'Étape 4 sur 4 • Rappels & Paramètres',
        title: 'Restez alerté de vos échéances',
        description:
          'Recevez des rappels avant chaque échéance. Personnalisez vos alertes et créez une structure collaborative quand vous souhaitez travailler en équipe.',
        highlights: [
          'Rappels automatiques par notification',
          'Configuration des préférences dans vos Paramètres',
          'Évolution simple vers une structure d’équipe',
        ],
        shortcutAction: {
          label: 'Explorer les Paramètres',
          route: '/settings',
        },
      },
    ]
  }

  // 2. Parcours COLLABORATEUR EN STRUCTURE
  if (isEmployee) {
    return [
      {
        id: 'employee-welcome',
        icon: Sparkles,
        badge: 'Étape 1 sur 4 • Bienvenue',
        title: 'Bienvenue dans l’espace de votre structure',
        description:
          'Retrouvez facilement toutes les activités confiées par vos responsables au sein de votre équipe, vos priorités et le suivi de vos réalisations.',
        highlights: [
          'Vue claire sur vos missions et équipes',
          'Échanges et commentaires centralisés',
          'Communication directe avec vos managers',
        ],
      },
      {
        id: 'employee-dashboard',
        icon: BarChart3,
        badge: 'Étape 2 sur 4 • Vos priorités',
        title: 'Votre tableau de bord de travail',
        description:
          'Identifiez instantanément vos tâches prioritaires du jour, vos échéances proches et les retours de validation de vos livrables.',
        highlights: [
          'Tâches confiées et échéances du jour',
          'Suivi de vos validations en attente',
          'Capacité de travail hebdomadaire',
        ],
        shortcutAction: {
          label: 'Consulter mon Tableau de bord',
          route: '/dashboard',
        },
      },
      {
        id: 'employee-tasks',
        icon: Play,
        badge: 'Étape 3 sur 4 • Réalisation & Validations',
        title: 'Passez à l’action et livrez vos résultats',
        description:
          'Utilisez le bouton « Commencer la tâche » dès le démarrage. Joignez vos livrables et sollicitez une validation ou demandez un report motivé si un imprévu survient.',
        highlights: [
          'Action rapide « Commencer la tâche »',
          'Dépôt de pièces jointes et demande de validation',
          'Demande de report d’échéance avec justification',
        ],
        shortcutAction: {
          label: 'Mes tâches confiées',
          route: '/tasks',
        },
      },
      {
        id: 'employee-notifications',
        icon: BellRing,
        badge: 'Étape 4 sur 4 • Alertes & Accompagnement',
        title: 'Notifications en direct et centre d’aide',
        description:
          'Soyez alerté en temps réel de chaque nouvelle assignation ou décision de validation. Le centre d’aide reste disponible à tout instant dans la barre supérieure.',
        highlights: [
          'Alertes temps réel via WebSocket',
          'Carillon sonore discret pour les notifications',
          'Centre d’aide avec guides pratiques à tout moment',
        ],
        shortcutAction: {
          label: 'Voir mes Paramètres',
          route: '/settings',
        },
      },
    ]
  }

  // 3. Parcours MANAGER EN STRUCTURE
  if (isManager) {
    const steps: AdaptiveTourStep[] = [
      {
        id: 'manager-welcome',
        icon: Sparkles,
        badge: 'Étape 1 sur 5 • Bienvenue Manager',
        title: 'Pilotez l’activité de vos équipes',
        description:
          'Coordonnez les collaborateurs, assignez les tâches, suivez la charge de travail et assurez la qualité des livrables de votre équipe.',
        highlights: [
          'Supervision opérationnelle des équipes',
          'Attribution claire des responsabilités',
          'Contrôle qualité systématique avant clôture',
        ],
      },
      {
        id: 'manager-dashboard',
        icon: BarChart3,
        badge: 'Étape 2 sur 5 • Pilotage & Charge',
        title: 'Tableau de bord de pilotage d’équipe',
        description:
          'Surveillez le taux d’achèvement, la charge hebdomadaire par collaborateur et anticipez les risques de retard ou de surcharge.',
        highlights: [
          'Indicateurs d’activité et taux de complétion',
          'Charge de travail par collaborateur',
          'Filtres par équipe et période',
        ],
        shortcutAction: {
          label: 'Ouvrir le Tableau de bord',
          route: '/dashboard',
        },
      },
      {
        id: 'manager-tasks',
        icon: Play,
        badge: 'Étape 3 sur 5 • Tâches & Dépendances',
        title: 'Distribution et suivi des tâches',
        description:
          'Assignez des tâches à des collaborateurs ou des équipes entières, configurez des dépendances critiques et exigez une validation avant achèvement.',
        highlights: [
          'Assignation nominative ou par équipe',
          'Chaînage de dépendances préalables',
          'Modèles de tâches d’équipe réutilisables',
        ],
        shortcutAction: {
          label: 'Gérer les Tâches',
          route: '/tasks',
        },
      },
      {
        id: 'manager-approvals',
        icon: ShieldCheck,
        badge: 'Étape 4 sur 5 • Validations & Reports',
        title: 'Circuit d’approbation des livrables',
        description:
          'Examinez les livrables déposés par vos collaborateurs. Approuvez ou refusez avec motif obligatoire, et arbitrez les demandes de report d’échéance.',
        highlights: [
          'Validation avec consultation des pièces jointes',
          'Motif obligatoire en cas de refus',
          'Compteurs de validation en temps réel',
        ],
        shortcutAction: {
          label: 'Espace Validations',
          route: '/approvals',
        },
      },
      {
        id: 'manager-teams-projects',
        icon: hasProjects ? FolderKanban : Users,
        badge: 'Étape 5 sur 5 • Organisation',
        title: hasProjects ? 'Projets et coordination d’équipe' : 'Coordination des équipes',
        description: hasProjects
          ? 'Regroupez les activités sous des projets structurés avec jalons et suivez l’avancement des équipes participantes.'
          : 'Consultez la composition de vos équipes et l’annuaire des collaborateurs pour une répartition optimale.',
        highlights: hasProjects
          ? [
              'Pilotage de projets multi-équipes',
              'Indicateurs de santé et avancement',
              'Planification coordonnée',
            ]
          : [
              'Annuaire et équipes de la structure',
              'Capacité horaire par collaborateur',
              'Suivi de la disponibilité',
            ],
        shortcutAction: {
          label: hasProjects ? 'Voir les Projets' : 'Voir les Équipes',
          route: hasProjects ? '/projects' : '/teams',
        },
      },
    ]
    return steps
  }

  // 4. Parcours ADMINISTRATEUR / PROPRIÉTAIRE (Owner ou Superuser)
  return [
    {
      id: 'owner-welcome',
      icon: Sparkles,
      badge: 'Étape 1 sur 5 • Bienvenue Administrateur',
      title: 'Centre de contrôle de votre structure',
      description:
        'Administrez l’ensemble de votre organisation : gouvernance des équipes, collaborateurs, projets, circuits de validation et forfait d’abonnement.',
      highlights: [
        'Supervision globale de la structure',
        'Gestion des rôles (manager, collaborateur)',
        'Paramétrage complet de l’abonnement SaaS',
      ],
    },
    {
      id: 'owner-dashboard',
      icon: BarChart3,
      badge: 'Étape 2 sur 5 • Tableau de bord stratégique',
      title: 'Indicateurs d’activité globale',
      description:
        'Visualisez la performance opérationnelle, la complétion des tâches et les délais moyens d’exécution à l’échelle de l’entreprise.',
      highlights: [
        'Taux de complétion global et retards',
        'Charge de travail consolidée',
        'Filtres transversaux par projet et équipe',
      ],
      shortcutAction: {
        label: 'Consulter le Tableau de bord',
        route: '/dashboard',
      },
    },
    {
      id: 'owner-teams',
      icon: Users,
      badge: 'Étape 3 sur 5 • Équipes & Collaborateurs',
      title: 'Structurez vos équipes opérationnelles',
      description:
        'Invitez de nouveaux membres, attribuez les rôles clés et constituez des équipes managées pour organiser la collaboration.',
      highlights: [
        'Invitation sécurisée de collaborateurs',
        'Création d’équipes avec manager désigné',
        'Définition des capacités horaires hebdomadaires',
      ],
      shortcutAction: {
        label: 'Gérer les Équipes',
        route: '/teams',
      },
    },
    {
      id: 'owner-approvals',
      icon: ShieldCheck,
      badge: 'Étape 4 sur 5 • Validations & Contrôle',
      title: 'Qualité et traçabilité des livrables',
      description:
        'Consultez l’ensemble des validations de tâches et des reports accordés. L’historique immuable garantit un suivi sans faille.',
      highlights: [
        'Supervision des validations de clôture',
        'Arbitrage des demandes sensibles',
        'Historique d’audit des actions',
      ],
      shortcutAction: {
        label: 'Ouvrir les Validations',
        route: '/approvals',
      },
    },
    {
      id: 'owner-subscription',
      icon: CreditCard,
      badge: 'Étape 5 sur 5 • Abonnement & Facturation',
      title: 'Gestion de l’offre et calcul au prorata',
      description:
        'Ajustez votre formule selon l’évolution de vos effectifs. Les montées en gamme et ajouts d’équipes appliquent automatiquement un calcul au prorata équitable.',
      highlights: [
        'Changement d’offre immédiat et calcul au prorata',
        'Suivi des quotas d’utilisateurs et d’équipes',
        'Historique des règlements et factures',
      ],
      shortcutAction: {
        label: 'Gérer l’Abonnement',
        route: '/subscription',
      },
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// GUIDES PER PROFILE / CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_GUIDES: AdaptiveGuideTopic[] = [
  // ── Guides Compte Personnel ──
  {
    id: 'personal-tasks-guide',
    title: 'Organiser ses tâches personnelles',
    category: 'personal',
    icon: ListTodo,
    summary: 'Structurer vos activités privées avec priorités, sous-tâches et rappels.',
    steps: [
      'Cliquez sur « Nouvelle tâche » depuis votre tableau de bord ou la vue Tâches.',
      'Renseignez le titre, la date limite et le niveau de priorité.',
      'Ajoutez des sous-tâches pour découper les activités complexes en étapes faciles.',
      'Cliquez sur « Commencer la tâche » pour l’activer et suivre votre temps sans intermédiaire.',
    ],
    tip: 'Enregistrez vos routines fréquentes comme modèles de tâche pour les recréer en 1 clic.',
    actionLabel: 'Gérer mes tâches',
    route: '/tasks',
    allowedWorkspaceTypes: ['personal'],
  },
  {
    id: 'personal-to-company-guide',
    title: 'Créer une structure collaborative',
    category: 'personal',
    icon: Building2,
    summary: 'Comment passer d’un usage individuel à une organisation d’équipe.',
    steps: [
      'Ouvrez le menu « Créer une structure » dans la barre latérale.',
      'Renseignez la dénomination de votre entreprise et vos coordonnées professionnelles.',
      'Choisissez le forfait adapté à votre taille d’équipe (Starter, Pro, Entreprise).',
      'Une fois la structure créée, vous pourrez inviter des collaborateurs et créer vos premières équipes.',
    ],
    tip: 'Vos tâches personnelles restent privées et ne seront jamais partagées avec les membres de votre future structure.',
    actionLabel: 'Créer une structure',
    route: '/onboarding',
    allowedWorkspaceTypes: ['personal'],
  },

  // ── Guides Tâches (Général et Collaborateurs) ──
  {
    id: 'create-task',
    title: 'Créer et démarrer une tâche',
    category: 'tasks',
    icon: ListTodo,
    summary: 'Comment structurer une tâche et utiliser l’action rapide de démarrage.',
    steps: [
      'Cliquez sur « Nouvelle tâche » depuis le tableau de bord ou la vue Tâches.',
      'Renseignez le titre, la description, la date d’échéance et assignez un collaborateur ou une équipe.',
      'Optionnel : ajoutez des sous-tâches ou liez des dépendances requises avant clôture.',
      'À la réception de la tâche ou d’un rappel, cliquez directement sur « Commencer la tâche » pour la passer à l’état « En cours ».',
    ],
    tip: 'Vous pouvez aussi sauvegarder n’importe quelle tâche complexe comme modèle réutilisable.',
    actionLabel: 'Ouvrir les tâches',
    route: '/tasks',
    allowedWorkspaceTypes: ['company'],
  },
  {
    id: 'employee-deliverable-guide',
    title: 'Soumettre un livrable pour validation',
    category: 'approvals',
    icon: FileCheck2,
    summary: 'Comment joindre des pièces et demander l’approbation de fin à votre manager.',
    steps: [
      'Ouvrez la fiche de la tâche sur laquelle vous avez travaillé.',
      'Ajoutez vos fichiers livrables dans l’onglet « Pièces jointes ».',
      'Cliquez sur « Demander la validation » avec un commentaire explicatif.',
      'Votre manager reçoit une alerte immédiate et statuera sur votre travail.',
    ],
    tip: 'Si une validation est refusée, vous recevrez une notification avec le motif précis du manager pour ajuster votre livrable.',
    actionLabel: 'Voir mes tâches',
    route: '/tasks',
    allowedWorkspaceTypes: ['company'],
    allowedRoles: ['employee'],
  },
  {
    id: 'employee-deferral-guide',
    title: 'Demander un report d’échéance motivé',
    category: 'approvals',
    icon: Clock,
    summary: 'Comment formuler une demande de report en cas d’imprévu ou de blocage.',
    steps: [
      'Depuis la fiche tâche, sélectionnez « Demander un report ».',
      'Sélectionnez la nouvelle date souhaitée.',
      'Saisissez obligatoirement le motif précis justifiant ce décalage.',
      'Dès validation par votre manager, la date de la tâche est actualisée automatiquement.',
    ],
    tip: 'Un motif clair et précis accélère la prise de décision de votre responsable.',
    actionLabel: 'Voir mes tâches',
    route: '/tasks',
    allowedWorkspaceTypes: ['company'],
    allowedRoles: ['employee'],
  },

  // ── Guides Projets (Selon forfait / habilitation) ──
  {
    id: 'create-project',
    title: 'Créer et piloter un projet',
    category: 'projects',
    icon: FolderKanban,
    summary: 'Regroupez les tâches, les équipes et les échéances autour d’un objectif commun.',
    steps: [
      'Ouvrez Projets puis cliquez sur « Nouveau projet ».',
      'Donnez un nom clair, choisissez le manager et les équipes participantes.',
      'Ajoutez une période et vérifiez le récapitulatif avant de confirmer la création.',
      'Depuis la fiche projet, suivez la progression, les tâches en retard et les points de vigilance.',
    ],
    tip: 'Commencez par un objectif concret et mesurable : il rend les indicateurs plus utiles.',
    actionLabel: 'Ouvrir les projets',
    route: '/projects',
    allowedWorkspaceTypes: ['company'],
    requiredFeature: 'has_projects',
  },

  // ── Guides Équipes (Managers et Owners) ──
  {
    id: 'create-team',
    title: 'Créer une équipe opérationnelle',
    category: 'teams',
    icon: Users,
    summary: 'Constituez une équipe avec un manager et au moins un collaborateur.',
    steps: [
      'Ouvrez Équipes puis sélectionnez « Nouvelle équipe ».',
      'Saisissez une identité claire pour l’équipe et sa mission.',
      'Ajoutez un manager et au moins un autre collaborateur.',
      'Vérifiez la composition avant de confirmer la création.',
    ],
    tip: 'Une équipe ne peut pas être créée avec une seule personne : cela garantit une vraie organisation collaborative.',
    actionLabel: 'Ouvrir les équipes',
    route: '/teams',
    allowedWorkspaceTypes: ['company'],
    allowedRoles: ['owner', 'manager'],
  },
  {
    id: 'manage-users-seats',
    title: 'Inviter des collaborateurs et gérer les accès',
    category: 'teams',
    icon: UserCheck,
    summary: 'Gérer les comptes, les capacités horaires et les quotas de membres.',
    steps: [
      'Ouvrez Utilisateurs et cliquez sur « Inviter un utilisateur ».',
      'Renseignez les coordonnées et choisissez le rôle approprié (Manager ou Collaborateur).',
      'Définissez la capacité horaire hebdomadaire contractuelle pour le calcul de charge.',
      'Un mot de passe temporaire est généré pour la première connexion du membre.',
    ],
    tip: 'Les comptes peuvent être désactivés sans supprimer leur historique de tâches.',
    actionLabel: 'Gérer les utilisateurs',
    route: '/users' as GuideRoute,
    allowedWorkspaceTypes: ['company'],
    allowedRoles: ['owner', 'manager'],
  },

  // ── Guides Validations (Managers et Owners) ──
  {
    id: 'approvals-flow-manager',
    title: 'Traiter les validations et demandes de report',
    category: 'approvals',
    icon: ShieldCheck,
    summary: 'Approuver les livrables finis et arbitrer les reports de vos équipes.',
    steps: [
      'Ouvrez la section « Validations » pour consulter les demandes en attente de décision.',
      'Pour une validation de fin : vérifiez les livrables joints, puis approuvez ou refusez avec motif explicite.',
      'Pour un report d’échéance : consultez la nouvelle date proposée et la justification avant d’accepter ou de rejeter.',
      'Les compteurs de notification et badges de menu se synchronisent instantanément.',
    ],
    tip: 'Un motif de refus obligatoire est exigé par la plateforme pour assurer la traçabilité.',
    actionLabel: 'Ouvrir les validations',
    route: '/approvals',
    allowedWorkspaceTypes: ['company'],
    allowedRoles: ['owner', 'manager'],
  },

  // ── Guides Planification & Charge (Managers et Owners) ──
  {
    id: 'planning-capacity',
    title: 'Planification et charge de travail',
    category: 'planning',
    icon: CalendarRange,
    summary: 'Suivez la capacité hebdomadaire de vos équipes et anticipez les surcharges.',
    steps: [
      'Ouvrez Planification pour visualiser le calendrier hebdomadaire et la répartition des heures prévues.',
      'Chaque collaborateur dispose d’une jauge de capacité calculée par rapport à ses heures contractuelles.',
      'Un indicateur d’alerte signale instantanément une surcharge (> 100 % de capacité).',
      'Réassignez ou rééchelonnez les tâches directement pour équilibrer la charge du groupe.',
    ],
    tip: 'Configurez la capacité horaire hebdomadaire de chaque membre dans la gestion des collaborateurs.',
    actionLabel: 'Ouvrir la planification',
    route: '/planning',
    allowedWorkspaceTypes: ['company'],
    allowedRoles: ['owner', 'manager'],
  },

  // ── Guides Notifications (Tous profils) ──
  {
    id: 'notifications-alerts',
    title: 'Notifications et alertes en direct',
    category: 'tasks',
    icon: Bell,
    summary: 'Restez informé des assignations, échéances et décisions instantanément.',
    steps: [
      'Les notifications s’affichent en temps réel grâce à la connexion WebSocket.',
      'Activez les signaux sonores et les notifications système depuis vos Paramètres.',
      'Filtrez vos alertes par statut (toutes ou non lues) et marquez-les en un clic.',
      'Cliquez sur une notification pour accéder immédiatement à la tâche ou validation concernée.',
    ],
    tip: 'Autorisez les notifications dans votre navigateur pour recevoir les alertes même quand l’onglet est réduit.',
    actionLabel: 'Ouvrir les notifications',
    route: '/notifications',
  },

  // ── Guides Rôles & Gouvernance ──
  {
    id: 'roles-workspaces',
    title: 'Comprendre les rôles et espaces de travail',
    category: 'teams',
    icon: Briefcase,
    summary: 'La distinction entre compte individuel et structure collaborative.',
    steps: [
      'Compte personnel : dédié à vos tâches privées autonomes, gratuit et sans hiérarchie.',
      'Espace de structure : active le travail d’équipe avec projets, équipes et approbations.',
      'Rôle Propriétaire / Administrateur : gère l’abonnement, les équipes et les paramètres.',
      'Rôle Manager : supervise les tâches de ses équipes, approuve les livrables et valide les reports.',
      'Rôle Collaborateur : réalise ses tâches confiées, échange des commentaires et sollicite des validations.',
    ],
    actionLabel: 'En savoir plus',
    route: '/settings',
  },

  // ── Guides Facturation (Propriétaire de structure uniquement) ──
  {
    id: 'billing-prorata',
    title: 'Facturation, changements d’offres et crédits',
    category: 'billing',
    icon: CreditCard,
    summary: 'Comment fonctionne le calcul au prorata et le solde créditeur.',
    steps: [
      'Lors d’un changement d’offre ou ajout d’équipe, le système calcule automatiquement le prorata temporis restant sur la période actuelle.',
      'Si le changement génère un trop-perçu, un excédent de crédit est conservé sur le compte de votre structure.',
      'Cet excédent est automatiquement déduit de votre prochain renouvellement sans action manuelle requise.',
    ],
    tip: 'Vous pouvez simuler un devis d’évolution à tout moment avant de confirmer.',
    actionLabel: 'Voir mon abonnement',
    route: '/subscription',
    allowedWorkspaceTypes: ['company'],
    allowedRoles: ['owner'],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// FILTERING HELPER
// ─────────────────────────────────────────────────────────────────────────────

export function getAdaptiveGuides(context: GuideUserContext): AdaptiveGuideTopic[] {
  const { isPersonalWorkspace, role, isSuperuser, featureFlags = {} } = context
  const currentWorkspaceType: WorkspaceType = isPersonalWorkspace ? 'personal' : 'company'

  return ALL_GUIDES.filter((guide) => {
    // 1. Workspace filter
    if (guide.allowedWorkspaceTypes && !guide.allowedWorkspaceTypes.includes(currentWorkspaceType)) {
      return false
    }

    // 2. Role filter (Superuser bypasses role restrictions)
    if (!isSuperuser && guide.allowedRoles && role && !guide.allowedRoles.includes(role as Role)) {
      return false
    }

    // 3. Feature flag filter
    if (guide.requiredFeature && !isSuperuser) {
      const isFeatureActive = Boolean(featureFlags[guide.requiredFeature])
      if (!isFeatureActive) return false
    }

    // 4. Company admin restriction
    if (guide.requiresCompanyAdmin && !isSuperuser && role !== 'owner') {
      return false
    }

    return true
  })
}

export const ALL_GUIDE_CATEGORIES: Array<{ id: 'all' | GuideCategory; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'personal', label: 'Espace perso' },
  { id: 'tasks', label: 'Tâches' },
  { id: 'projects', label: 'Projets' },
  { id: 'teams', label: 'Équipes' },
  { id: 'approvals', label: 'Validations' },
  { id: 'planning', label: 'Planification' },
  { id: 'billing', label: 'Abonnement' },
]

export function getAvailableCategories(guides: AdaptiveGuideTopic[]): Array<{ id: 'all' | GuideCategory; label: string }> {
  const presentCategoryIds = new Set<GuideCategory>(guides.map((g) => g.category))
  return ALL_GUIDE_CATEGORIES.filter((cat) => cat.id === 'all' || presentCategoryIds.has(cat.id))
}
