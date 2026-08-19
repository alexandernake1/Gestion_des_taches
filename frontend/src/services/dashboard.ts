import { api } from '@/utils/api'
import type { Task } from '@/domain/types'

export interface TrendPoint {
  date: string
  created: number
  completed: number
}

export interface TeamWorkload {
  team_id: number | string
  team_name: string
  total_tasks: number
  completed_tasks: number
  overdue_tasks: number
}

export interface MemberWorkload {
  user_id: number | string
  user_name: string
  total_tasks: number
  completed_tasks: number
  overdue_tasks: number
}

export interface AtRiskProject {
  project_id: number | string
  project_name: string
  total_tasks: number
  completed_tasks: number
  overdue_tasks: number
  progress: number
  health?: string
  due_date?: string | null
}

export interface CompanyStatistics {
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  open_tasks: number
  overdue_tasks: number
  deferred_tasks: number
  new_tasks_this_week: number
  completed_this_week: number
  created_in_period?: number
  completed_in_period?: number
  completion_rate: number
  on_time_completion_rate?: number
  avg_completion_time_hours?: number
  median_completion_time_hours?: number
  priority_breakdown: {
    urgent: number
    high: number
    normal: number
    low: number
  }
  status_breakdown: {
    todo: number
    in_progress: number
    on_hold: number
    deferred: number
    completed: number
  }
  trends?: TrendPoint[]
  team_workload?: TeamWorkload[]
  member_workload?: MemberWorkload[]
  at_risk_projects?: AtRiskProject[]
  approvals?: {
    pending: number
    approved: number
    rejected: number
  }
  date_from?: string
  date_to?: string
}

export interface UserStatistics {
  created: {
    total: number
    completed: number
    in_progress: number
    overdue: number
  }
  assigned: {
    total: number
    completed: number
    in_progress: number
    overdue: number
  }
  scope: {
    total: number
    completed: number
    in_progress: number
    overdue: number
    priority_breakdown: CompanyStatistics['priority_breakdown']
    status_breakdown: CompanyStatistics['status_breakdown']
  }
  my_day?: {
    overdue: number
    today: number
    in_progress: number
    upcoming: number
  }
  new_tasks_this_week: number
  completed_this_week: number
  completion_rate: number
  weekly_completion_rate?: number
  created_in_period?: number
  completed_in_period?: number
  trends?: TrendPoint[]
  pending_approvals_count?: number
  date_from?: string
  date_to?: string
}

export interface ActivityItem {
  id: number
  task_id: number
  task_title: string
  changed_by: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_at: string
}

export interface PerformanceMetrics {
  avg_completion_time_hours: number
  median_completion_time_hours?: number
  on_time_completion_rate: number
  total_tasks_in_period?: number
  total_tasks_last_30_days: number
  completed_in_period?: number
  completed_last_30_days: number
}

export interface DailyFocus {
  date: string
  overdue: Task[]
  today: Task[]
  in_progress: Task[]
  upcoming: Task[]
}

export interface DashboardFilterParams {
  team_id?: number | string
  project_id?: number | string
  assignee_id?: number | string
  date_from?: string
  date_to?: string
  limit?: number
}

export const dashboardService = {
  async getCompanyStatistics(params?: DashboardFilterParams) {
    return params ? api.get<CompanyStatistics>('/dashboard/company/', { params }) : api.get<CompanyStatistics>('/dashboard/company/')
  },

  async getUserStatistics(params?: { date_from?: string; date_to?: string }) {
    return params ? api.get<UserStatistics>('/dashboard/user/', { params }) : api.get<UserStatistics>('/dashboard/user/')
  },

  async getRecentActivity(limit = 10, teamId?: number | string) {
    const params = teamId === undefined ? { limit } : { limit, team_id: teamId }
    return api.get<ActivityItem[]>('/dashboard/activity/', { params })
  },

  async getPerformanceMetrics(params?: DashboardFilterParams) {
    return params ? api.get<PerformanceMetrics>('/dashboard/performance/', { params }) : api.get<PerformanceMetrics>('/dashboard/performance/')
  },

  async getDailyFocus() {
    return api.get<DailyFocus>('/tasks/daily-focus/')
  },
}
