/* prettier-ignore-start */
/* eslint-disable */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols

// This file is manually maintained (TanStack Router file-based routing)

// Import Routes
import { Route as rootRoute } from './routes'
import { Route as IndexRouteImport } from '../pages/index'
import { Route as LoginRouteImport } from '../pages/login'
import { Route as RegisterRouteImport } from '../pages/register'
import { Route as ChangePasswordRouteImport } from '../pages/change-password'
import { Route as DashboardRouteImport } from '../pages/dashboard'
import { Route as TasksRouteImport } from '../pages/tasks'
import { Route as ProjectsRouteImport } from '../pages/projects'
import { Route as ProjectsProjectIdRouteImport } from '../pages/projects/$projectId'
import { Route as TeamsRouteImport } from '../pages/teams'
import { Route as PlanningRouteImport } from '../pages/planning'
import { Route as UsersRouteImport } from '../pages/users'
import { Route as NotificationsRouteImport } from '../pages/notifications'
import { Route as ApprovalsRouteImport } from '../pages/approvals'
import { Route as SubscriptionRouteImport } from '../pages/subscription'
import { Route as SettingsRouteImport } from '../pages/settings'
import { Route as AdminCompaniesRouteImport } from '../pages/admin/companies'
import { Route as AdminSubscriptionsRouteImport } from '../pages/admin/subscriptions'
import { Route as AdminPlansRouteImport } from '../pages/admin/plans'
import { Route as AdminAnnouncementsRouteImport } from '../pages/admin/announcements'
import { Route as AdminAuditRouteImport } from '../pages/admin/audit'
import { Route as TasksCreateRouteImport } from '../pages/tasks/create'
import { Route as TasksTaskIdRouteImport } from '../pages/tasks/$taskId'
import { Route as TasksTemplatesRouteImport } from '../pages/tasks/templates'

const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)
const LoginRoute = LoginRouteImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)
const RegisterRoute = RegisterRouteImport.update({
  id: '/register',
  path: '/register',
  getParentRoute: () => rootRoute,
} as any)
const ChangePasswordRoute = ChangePasswordRouteImport.update({
  id: '/change-password',
  path: '/change-password',
  getParentRoute: () => rootRoute,
} as any)
const DashboardRoute = DashboardRouteImport.update({
  id: '/dashboard',
  path: '/dashboard',
  getParentRoute: () => rootRoute,
} as any)
const TasksRoute = TasksRouteImport.update({
  id: '/tasks',
  path: '/tasks',
  getParentRoute: () => rootRoute,
} as any)
const ProjectsRoute = ProjectsRouteImport.update({
  id: '/projects',
  path: '/projects',
  getParentRoute: () => rootRoute,
} as any)
const ProjectsProjectIdRoute = ProjectsProjectIdRouteImport.update({
  id: '/projects/$projectId',
  path: '/projects/$projectId',
  getParentRoute: () => rootRoute,
} as any)
const TeamsRoute = TeamsRouteImport.update({
  id: '/teams',
  path: '/teams',
  getParentRoute: () => rootRoute,
} as any)
const PlanningRoute = PlanningRouteImport.update({
  id: '/planning',
  path: '/planning',
  getParentRoute: () => rootRoute,
} as any)
const UsersRoute = UsersRouteImport.update({
  id: '/users',
  path: '/users',
  getParentRoute: () => rootRoute,
} as any)
const NotificationsRoute = NotificationsRouteImport.update({
  id: '/notifications',
  path: '/notifications',
  getParentRoute: () => rootRoute,
} as any)
const ApprovalsRoute = ApprovalsRouteImport.update({
  id: '/approvals',
  path: '/approvals',
  getParentRoute: () => rootRoute,
} as any)
const SubscriptionRoute = SubscriptionRouteImport.update({
  id: '/subscription',
  path: '/subscription',
  getParentRoute: () => rootRoute,
} as any)
const SettingsRoute = SettingsRouteImport.update({
  id: '/settings',
  path: '/settings',
  getParentRoute: () => rootRoute,
} as any)
const AdminCompaniesRoute = AdminCompaniesRouteImport.update({
  id: '/admin/companies',
  path: '/admin/companies',
  getParentRoute: () => rootRoute,
} as any)
const AdminSubscriptionsRoute = AdminSubscriptionsRouteImport.update({
  id: '/admin/subscriptions',
  path: '/admin/subscriptions',
  getParentRoute: () => rootRoute,
} as any)
const AdminPlansRoute = AdminPlansRouteImport.update({
  id: '/admin/plans',
  path: '/admin/plans',
  getParentRoute: () => rootRoute,
} as any)
const AdminAnnouncementsRoute = AdminAnnouncementsRouteImport.update({
  id: '/admin/announcements',
  path: '/admin/announcements',
  getParentRoute: () => rootRoute,
} as any)
const AdminAuditRoute = AdminAuditRouteImport.update({
  id: '/admin/audit',
  path: '/admin/audit',
  getParentRoute: () => rootRoute,
} as any)
const TasksCreateRoute = TasksCreateRouteImport.update({
  id: '/tasks/create',
  path: '/tasks/create',
  getParentRoute: () => rootRoute,
} as any)
const TasksTaskIdRoute = TasksTaskIdRouteImport.update({
  id: '/tasks/$taskId',
  path: '/tasks/$taskId',
  getParentRoute: () => rootRoute,
} as any)
const TasksTemplatesRoute = TasksTemplatesRouteImport.update({
  id: '/tasks/templates',
  path: '/tasks/templates',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRoute
      parentRoute: typeof rootRoute
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginRoute
      parentRoute: typeof rootRoute
    }
    '/register': {
      id: '/register'
      path: '/register'
      fullPath: '/register'
      preLoaderRoute: typeof RegisterRoute
      parentRoute: typeof rootRoute
    }
    '/change-password': {
      id: '/change-password'
      path: '/change-password'
      fullPath: '/change-password'
      preLoaderRoute: typeof ChangePasswordRoute
      parentRoute: typeof rootRoute
    }
    '/dashboard': {
      id: '/dashboard'
      path: '/dashboard'
      fullPath: '/dashboard'
      preLoaderRoute: typeof DashboardRoute
      parentRoute: typeof rootRoute
    }
    '/tasks': {
      id: '/tasks'
      path: '/tasks'
      fullPath: '/tasks'
      preLoaderRoute: typeof TasksRoute
      parentRoute: typeof rootRoute
    }
    '/projects': {
      id: '/projects'
      path: '/projects'
      fullPath: '/projects'
      preLoaderRoute: typeof ProjectsRoute
      parentRoute: typeof rootRoute
    }
    '/projects/$projectId': {
      id: '/projects/$projectId'
      path: '/projects/$projectId'
      fullPath: '/projects/$projectId'
      preLoaderRoute: typeof ProjectsProjectIdRoute
      parentRoute: typeof rootRoute
    }
    '/teams': {
      id: '/teams'
      path: '/teams'
      fullPath: '/teams'
      preLoaderRoute: typeof TeamsRoute
      parentRoute: typeof rootRoute
    }
    '/planning': {
      id: '/planning'
      path: '/planning'
      fullPath: '/planning'
      preLoaderRoute: typeof PlanningRoute
      parentRoute: typeof rootRoute
    }
    '/users': {
      id: '/users'
      path: '/users'
      fullPath: '/users'
      preLoaderRoute: typeof UsersRoute
      parentRoute: typeof rootRoute
    }
    '/notifications': {
      id: '/notifications'
      path: '/notifications'
      fullPath: '/notifications'
      preLoaderRoute: typeof NotificationsRoute
      parentRoute: typeof rootRoute
    }
    '/approvals': {
      id: '/approvals'
      path: '/approvals'
      fullPath: '/approvals'
      preLoaderRoute: typeof ApprovalsRoute
      parentRoute: typeof rootRoute
    }
    '/subscription': {
      id: '/subscription'
      path: '/subscription'
      fullPath: '/subscription'
      preLoaderRoute: typeof SubscriptionRoute
      parentRoute: typeof rootRoute
    }
    '/settings': {
      id: '/settings'
      path: '/settings'
      fullPath: '/settings'
      preLoaderRoute: typeof SettingsRoute
      parentRoute: typeof rootRoute
    }
    '/admin/companies': {
      id: '/admin/companies'
      path: '/admin/companies'
      fullPath: '/admin/companies'
      preLoaderRoute: typeof AdminCompaniesRoute
      parentRoute: typeof rootRoute
    }
    '/admin/subscriptions': {
      id: '/admin/subscriptions'
      path: '/admin/subscriptions'
      fullPath: '/admin/subscriptions'
      preLoaderRoute: typeof AdminSubscriptionsRoute
      parentRoute: typeof rootRoute
    }
    '/admin/plans': {
      id: '/admin/plans'
      path: '/admin/plans'
      fullPath: '/admin/plans'
      preLoaderRoute: typeof AdminPlansRoute
      parentRoute: typeof rootRoute
    }
    '/admin/announcements': {
      id: '/admin/announcements'
      path: '/admin/announcements'
      fullPath: '/admin/announcements'
      preLoaderRoute: typeof AdminAnnouncementsRoute
      parentRoute: typeof rootRoute
    }
    '/admin/audit': {
      id: '/admin/audit'
      path: '/admin/audit'
      fullPath: '/admin/audit'
      preLoaderRoute: typeof AdminAuditRoute
      parentRoute: typeof rootRoute
    }
    '/tasks/create': {
      id: '/tasks/create'
      path: '/tasks/create'
      fullPath: '/tasks/create'
      preLoaderRoute: typeof TasksCreateRoute
      parentRoute: typeof rootRoute
    }
    '/tasks/$taskId': {
      id: '/tasks/$taskId'
      path: '/tasks/$taskId'
      fullPath: '/tasks/$taskId'
      preLoaderRoute: typeof TasksTaskIdRoute
      parentRoute: typeof rootRoute
    }
    '/tasks/templates': {
      id: '/tasks/templates'
      path: '/tasks/templates'
      fullPath: '/tasks/templates'
      preLoaderRoute: typeof TasksTemplatesRoute
      parentRoute: typeof rootRoute
    }
  }
}

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  LoginRoute,
  RegisterRoute,
  ChangePasswordRoute,
  DashboardRoute,
  TasksRoute,
  ProjectsRoute,
  ProjectsProjectIdRoute,
  TeamsRoute,
  PlanningRoute,
  UsersRoute,
  NotificationsRoute,
  ApprovalsRoute,
  SubscriptionRoute,
  SettingsRoute,
  AdminCompaniesRoute,
  AdminSubscriptionsRoute,
  AdminPlansRoute,
  AdminAnnouncementsRoute,
  AdminAuditRoute,
  TasksCreateRoute,
  TasksTaskIdRoute,
  TasksTemplatesRoute,
])

/* prettier-ignore-end */
