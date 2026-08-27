import { describe, it, expect } from 'vitest'
import {
  getAdaptiveTourSteps,
  getAdaptiveGuides,
  getAvailableCategories,
  type GuideUserContext,
} from '@/components/tutorial/guideData'

describe('guideData - getAdaptiveTourSteps', () => {
  it('returns a tailored 4-step tour for personal workspace without team or approval jargon', () => {
    const context: GuideUserContext = {
      isPersonalWorkspace: true,
      role: 'owner',
    }

    const steps = getAdaptiveTourSteps(context)
    expect(steps.length).toBe(4)

    const titles = steps.map((s) => s.title)
    expect(titles).toContain('Bienvenue dans votre espace personnel')
    expect(titles).toContain('Un aperçu direct de vos priorités')
    expect(titles).toContain('Organisez et démarrez vos tâches en 1 clic')
    expect(titles).toContain('Restez alerté de vos échéances')

    // Verify no shortcut points to company-only approvals
    const routes = steps.map((s) => s.shortcutAction?.route).filter(Boolean)
    expect(routes).not.toContain('/approvals')
    expect(routes).not.toContain('/teams')
  })

  it('returns a tailored 4-step tour for company employees focusing on assigned tasks and deliverables', () => {
    const context: GuideUserContext = {
      isPersonalWorkspace: false,
      role: 'employee',
      hasCompany: true,
    }

    const steps = getAdaptiveTourSteps(context)
    expect(steps.length).toBe(4)

    const titles = steps.map((s) => s.title)
    expect(titles).toContain('Bienvenue dans l’espace de votre structure')
    expect(titles).toContain('Votre tableau de bord de travail')
    expect(titles).toContain('Passez à l’action et livrez vos résultats')
  })

  it('returns a tailored 5-step tour for company managers including approvals and team coordination', () => {
    const context: GuideUserContext = {
      isPersonalWorkspace: false,
      role: 'manager',
      hasCompany: true,
      featureFlags: { has_projects: true },
    }

    const steps = getAdaptiveTourSteps(context)
    expect(steps.length).toBe(5)

    const titles = steps.map((s) => s.title)
    expect(titles).toContain('Pilotez l’activité de vos équipes')
    expect(titles).toContain('Circuit d’approbation des livrables')
    expect(titles).toContain('Projets et coordination d’équipe')
  })

  it('returns a tailored 5-step tour for company owners including billing and team setup', () => {
    const context: GuideUserContext = {
      isPersonalWorkspace: false,
      role: 'owner',
      hasCompany: true,
    }

    const steps = getAdaptiveTourSteps(context)
    expect(steps.length).toBe(5)

    const titles = steps.map((s) => s.title)
    expect(titles).toContain('Centre de contrôle de votre structure')
    expect(titles).toContain('Structurez vos équipes opérationnelles')
    expect(titles).toContain('Gestion de l’offre et calcul au prorata')

    const routes = steps.map((s) => s.shortcutAction?.route).filter(Boolean)
    expect(routes).toContain('/subscription')
    expect(routes).toContain('/teams')
  })
})

describe('guideData - getAdaptiveGuides', () => {
  it('filters out team, project and billing guides for personal workspace', () => {
    const context: GuideUserContext = {
      isPersonalWorkspace: true,
      role: 'owner',
    }

    const guides = getAdaptiveGuides(context)
    const ids = guides.map((g) => g.id)

    expect(ids).toContain('personal-tasks-guide')
    expect(ids).toContain('personal-to-company-guide')
    expect(ids).toContain('notifications-alerts')
    expect(ids).toContain('roles-workspaces')

    // Personal user must NEVER see company-only team creation or billing guides
    expect(ids).not.toContain('create-team')
    expect(ids).not.toContain('create-project')
    expect(ids).not.toContain('manage-users-seats')
    expect(ids).not.toContain('billing-prorata')
    expect(ids).not.toContain('approvals-flow-manager')
    expect(ids).not.toContain('employee-deliverable-guide')
  })

  it('shows collaborator guides and hides team creation and billing for employees', () => {
    const context: GuideUserContext = {
      isPersonalWorkspace: false,
      role: 'employee',
      hasCompany: true,
    }

    const guides = getAdaptiveGuides(context)
    const ids = guides.map((g) => g.id)

    expect(ids).toContain('create-task')
    expect(ids).toContain('employee-deliverable-guide')
    expect(ids).toContain('employee-deferral-guide')
    expect(ids).toContain('notifications-alerts')

    expect(ids).not.toContain('create-team')
    expect(ids).not.toContain('manage-users-seats')
    expect(ids).not.toContain('billing-prorata')
    expect(ids).not.toContain('personal-tasks-guide')
  })

  it('shows team management and approval review for managers', () => {
    const context: GuideUserContext = {
      isPersonalWorkspace: false,
      role: 'manager',
      hasCompany: true,
      featureFlags: { has_projects: true },
    }

    const guides = getAdaptiveGuides(context)
    const ids = guides.map((g) => g.id)

    expect(ids).toContain('create-team')
    expect(ids).toContain('manage-users-seats')
    expect(ids).toContain('approvals-flow-manager')
    expect(ids).toContain('planning-capacity')
    expect(ids).toContain('create-project')

    expect(ids).not.toContain('billing-prorata')
    expect(ids).not.toContain('employee-deliverable-guide')
  })

  it('hides project guide when plan has_projects is disabled', () => {
    const contextWithoutProjects: GuideUserContext = {
      isPersonalWorkspace: false,
      role: 'manager',
      hasCompany: true,
      featureFlags: { has_projects: false },
    }

    const guides = getAdaptiveGuides(contextWithoutProjects)
    const ids = guides.map((g) => g.id)

    expect(ids).not.toContain('create-project')
  })

  it('shows billing and full company administration for owners', () => {
    const context: GuideUserContext = {
      isPersonalWorkspace: false,
      role: 'owner',
      hasCompany: true,
    }

    const guides = getAdaptiveGuides(context)
    const ids = guides.map((g) => g.id)

    expect(ids).toContain('billing-prorata')
    expect(ids).toContain('create-team')
    expect(ids).toContain('manage-users-seats')
    expect(ids).toContain('approvals-flow-manager')
  })
})

describe('guideData - getAvailableCategories', () => {
  it('only presents categories that have active guides for the given user', () => {
    const personalGuides = getAdaptiveGuides({
      isPersonalWorkspace: true,
      role: 'owner',
    })

    const categories = getAvailableCategories(personalGuides)
    const categoryIds = categories.map((c) => c.id)

    expect(categoryIds).toContain('all')
    expect(categoryIds).toContain('personal')
    expect(categoryIds).toContain('tasks')
    expect(categoryIds).not.toContain('billing')
    expect(categoryIds).not.toContain('planning')
  })
})
