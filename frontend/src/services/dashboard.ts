import { api } from '@/utils/api'
import type { Task } from '@/domain/types'

export interface CompanyStatistics {
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  overdue_tasks: number
  deferred_tasks: number
  new_tasks_this_week: number
  completed_this_week: number
  completion_rate: number
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
  new_tasks_this_week: number
  completed_this_week: number
  completion_rate: number
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
  on_time_completion_rate: number
  total_tasks_last_30_days: number
  completed_last_30_days: number
}

export interface DailyFocus {
  date: string
  overdue: Task[]
  today: Task[]
  in_progress: Task[]
  upcoming: Task[]
}

export const dashboardService = {
  async getCompanyStatistics(teamId?: number | string) {
    return api.get<CompanyStatistics>('/dashboard/company/', { params: { team_id: teamId } })
  },

  async getUserStatistics() {
    return api.get<UserStatistics>('/dashboard/user/')
  },

  async getRecentActivity(limit = 10, teamId?: number | string) {
    return api.get<ActivityItem[]>('/dashboard/activity/', { params: { limit, team_id: teamId } })
  },

  async getPerformanceMetrics(teamId?: number | string) {
    return api.get<PerformanceMetrics>('/dashboard/performance/', { params: { team_id: teamId } })
  },

  async getDailyFocus() {
    return api.get<DailyFocus>('/tasks/daily-focus/')
  }
}
