export const ROLE_LABELS: Record<string, string> = {
  owner: 'Administrateur de la structure',
  manager: 'Manager',
  employee: 'Collaborateur',
}

export const ROLE_PLURAL_LABELS: Record<string, string> = {
  owner: 'Administrateurs de la structure',
  manager: 'Managers',
  employee: 'Collaborateurs',
}

export const WORKSPACE_LABELS: Record<string, string> = {
  company: 'Structure',
  personal: 'Personnel',
}

export const TASK_SCOPE_LABELS: Record<string, string> = {
  assigned: 'Mes tâches',
  all: 'Toutes les tâches',
  created: 'Tâches créées',
}

export function getRoleLabel(role?: string | null): string {
  if (!role) return ''
  return ROLE_LABELS[role] || role
}

export function getWorkspaceLabel(type?: string | null): string {
  if (!type) return ''
  return WORKSPACE_LABELS[type] || type
}
