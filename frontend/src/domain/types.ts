export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  avatar?: string;
  company?: number;
  company_name?: string;
  role: Role;
  role_display: string;
  is_active: boolean;
  is_superuser?: boolean;
  must_change_password: boolean;
  weekly_capacity_hours: number;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export type Role = 'owner' | 'manager' | 'employee';

export interface UserAuditLog {
  id: string;
  actor?: number;
  actor_name?: string;
  target: number;
  target_name: string;
  action: 'account_created' | 'account_updated' | 'password_reset' | 'account_deactivated' | 'account_activated';
  details: Record<string, unknown>;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  timezone: string;
  language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = 'trial' | 'active' | 'pending_verification' | 'past_due' | 'suspended' | 'cancelled';
export type BillingPeriod = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description?: string;
  price: number;
  billing_period: BillingPeriod;
  billing_period_display: string;
  max_users: number;
  max_teams: number;
  storage_limit_mb: number;
  feature_flags: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanySubscription {
  id: string;
  company: number;
  company_name: string;
  plan: number;
  plan_details: SubscriptionPlan;
  status: SubscriptionStatus;
  status_display: string;
  starts_at: string;
  ends_at?: string;
  trial_ends_at?: string;
  grace_ends_at?: string;
  seats_override?: number;
  effective_max_users: number;
  effective_max_teams: number;
  is_suspended: boolean;
  active_users_count: number;
  active_teams_count: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: number;
  reference: string;
  provider: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  status_display: string;
  plan: number;
  plan_name: string;
  company: number;
  company_name: string;
  failure_reason?: string;
  paid_at?: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  company?: number;
  leader?: number;
  leader_name?: string;
  members?: number[];
  member_details?: Array<Pick<User, 'id' | 'email' | 'full_name' | 'role' | 'is_active'>>;
  member_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Status = 'todo' | 'in_progress' | 'on_hold' | 'deferred' | 'completed';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: number;
  title: string;
  description?: string;
  company?: number;
  creator?: number;
  creator_name?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  team?: number;
  team_name?: string;
  team_leader_id?: number;
  parent?: number;
  dependencies?: number[];
  dependency_details?: Array<Pick<Task, 'id' | 'title' | 'status'>>;
  subtask_count?: number;
  progress_percent?: number;
  is_blocked?: boolean;
  priority: Priority;
  priority_display?: string;
  status: Status;
  status_display?: string;
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  is_active: boolean;
  archived_at?: string;
  recurrence_frequency?: RecurrenceFrequency | '';
  recurrence_interval?: number;
  recurrence_end_date?: string;
  next_occurrence?: number;
  estimated_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskHistory {
  id: number;
  task: number;
  changed_by: number;
  changed_by_name?: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  changed_at: string;
}

export interface TaskComment {
  id: number;
  task: number;
  author: number;
  author_name?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAttachment {
  id: number;
  task: number;
  uploaded_by: number;
  uploaded_by_name?: string;
  file?: string;
  file_url?: string;
  filename: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export type ReportStatus = 'pending' | 'approved' | 'rejected';

export interface TaskReport {
  id: number;
  task: number;
  task_title?: string;
  requested_by: number;
  requested_by_name?: string;
  reviewed_by?: number;
  reviewed_by_name?: string;
  old_due_date: string;
  new_due_date: string;
  reason: string;
  status: ReportStatus;
  review_comment?: string;
  created_at: string;
  reviewed_at?: string;
}

export type NotificationType =
  | 'new_task'
  | 'comment'
  | 'report_approved'
  | 'report_rejected'
  | 'new_assignment'
  | 'task_completed'
  | 'subscription_reminder'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'subscription_suspended'
  | 'task_due_soon'
  | 'task_overdue'
  | 'daily_digest';

export interface Notification {
  id: string;
  recipient: number;
  type: NotificationType;
  title: string;
  message: string;
  task?: number;
  task_title?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreference {
  assignments_enabled: boolean;
  comments_enabled: boolean;
  task_reminders_enabled: boolean;
  overdue_alerts_enabled: boolean;
  daily_digest_enabled: boolean;
  subscription_alerts_enabled: boolean;
  reminder_days_before: number;
  digest_hour: number;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
  phone?: string;
}

export interface CompanyRegistrationRequest extends RegisterRequest {
  company_name: string;
  company_slug?: string;
  website?: string;
  contact_email: string;
  contact_phone: string;
  address?: string;
  plan_code: string;
  accept_terms: boolean;
}

export interface CompanyRegistrationResponse extends LoginResponse {
  company: Company;
  subscription: CompanySubscription;
  payment: {
    reference: string;
    amount: number;
    currency: string;
    status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  } | null;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar?: string;
}

// Task request types
export interface TaskCreateRequest {
  title: string;
  description?: string;
  assigned_to?: number;
  team?: number;
  priority: Priority;
  status: Status;
  start_date?: string;
  due_date?: string;
  parent?: number;
  dependencies?: number[];
  recurrence_frequency?: RecurrenceFrequency | '';
  recurrence_interval?: number;
  recurrence_end_date?: string;
  estimated_hours?: number;
}

export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  assigned_to?: number;
  team?: number;
  priority?: Priority;
  status?: Status;
  start_date?: string;
  due_date?: string;
  is_active?: boolean;
  parent?: number;
  dependencies?: number[];
  recurrence_frequency?: RecurrenceFrequency | '';
  recurrence_interval?: number;
  recurrence_end_date?: string;
  estimated_hours?: number;
}

export interface TaskTemplate {
  id: number;
  name: string;
  title: string;
  description?: string;
  priority: Priority;
  default_duration_days?: number;
  estimated_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskCommentCreateRequest {
  content: string;
}

export interface TaskReportCreateRequest {
  new_due_date: string;
  reason: string;
}

// Company request types
export interface CompanyCreateRequest {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  website?: string;
  timezone: string;
  language: string;
}

export interface CompanyUpdateRequest {
  name?: string;
  logo?: string;
  description?: string;
  website?: string;
  timezone?: string;
  language?: string;
  is_active?: boolean;
}

// Team request types
export interface TeamCreateRequest {
  name: string;
  description?: string;
  leader: number;
  member_ids?: number[];
}

export interface TeamUpdateRequest {
  name?: string;
  description?: string;
  leader?: number;
  is_active?: boolean;
  member_ids?: number[];
}

export type AnnouncementType = 'info' | 'warning' | 'danger';
export type AnnouncementTarget = 'all' | 'owners';

export interface SystemAnnouncement {
  id: number;
  message: string;
  type: AnnouncementType;
  type_display: string;
  target_audience: AnnouncementTarget;
  target_audience_display: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

