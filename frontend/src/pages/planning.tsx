import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addWeeks, format, startOfWeek, subWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarRange, Clock3, UserRound, Users, UserPlus, Zap } from 'lucide-react'
import { useState } from 'react'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { requireManagement } from '@/router/auth'
import { tasksService } from '@/services/tasks'

export const Route = createFileRoute('/planning')({
  beforeLoad: requireManagement,
  component: PlanningPage,
})

const memberRoleLabels: Record<string, string> = {
  owner: 'Propriétaire',
  manager: 'Manager',
  employee: 'Employé',
}

function Metric({ icon: Icon, label, value, alert }: { icon: React.ElementType; label: string; value: string | number; alert?: boolean }) {
  return (
    <div className={`flex flex-col rounded-2xl p-4 transition-all duration-200 hover:shadow-card ${
      alert
        ? 'text-white shadow-cta'
        : 'border border-border bg-card text-foreground'
      }`}
      style={alert ? { background: 'linear-gradient(135deg, hsl(var(--destructive)) 0%, hsl(351 85% 45%) 100%)' } : {}}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            alert ? 'bg-white/20' : ''
          }`}
          style={!alert ? { background: 'hsl(var(--primary) / 0.10)' } : {}}
        >
          <Icon className="h-5 w-5" style={!alert ? { color: 'hsl(var(--primary))' } : {}} />
        </div>
        <p className={`text-sm font-semibold ${alert ? 'text-white/80' : 'text-muted-foreground'}`}>{label}</p>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight">{value}</p>
    </div>
  )
}

function CircularProgress({ percent, isOverloaded }: { percent: number, isOverloaded: boolean }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(percent, 100);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;
  
  const colorClass = isOverloaded ? 'text-rose-500' : percent >= 80 ? 'text-amber-500' : 'text-emerald-500';
  const trackColorClass = isOverloaded ? 'text-rose-200 dark:text-rose-900' : percent >= 80 ? 'text-amber-200 dark:text-amber-900' : 'text-emerald-200 dark:text-emerald-900';

  return (
    <div className="relative flex items-center justify-center">
      <svg className="h-24 w-24 -rotate-90 transform" viewBox="0 0 100 100">
        <circle
          className={`${trackColorClass} stroke-current`}
          strokeWidth="8"
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
        />
        <circle
          className={`${colorClass} stroke-current transition-all duration-1000 ease-out`}
          strokeWidth="8"
          strokeLinecap="round"
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className={`text-lg font-black leading-none ${isOverloaded ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
          {percent}%
        </span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Occupé</span>
      </div>
    </div>
  );
}

function PlanningPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [week, setWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showAllMembers, setShowAllMembers] = useState(false)
  const weekKey = format(week, 'yyyy-MM-dd')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['workload', weekKey],
    queryFn: () => tasksService.getWorkload(weekKey),
  })
  
  const assignMutation = useMutation({
    mutationFn: ({ taskId, userId }: { taskId: number; userId: number }) =>
      tasksService.update(taskId, { assigned_to: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workload'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const utilization = data?.total_capacity_hours
    ? Math.round((data.total_scheduled_hours * 100) / data.total_capacity_hours)
    : 0
  const members = data?.members || []
  const visibleMembers = showAllMembers ? members : members.slice(0, 12)

  return (
    <Layout title="Planification">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          {/* Decorative background gradients */}
          <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full opacity-20 blur-3xl" style={{ background: 'hsl(var(--primary))' }} />
          <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full opacity-15 blur-3xl" style={{ background: 'hsl(var(--accent))' }} />
          
          <div className="relative p-6 sm:p-10">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--primary))' }}>
                  <CalendarRange className="h-4 w-4" /> 
                  Vue Hebdomadaire
                </div>
                <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                  Charge de travail
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Visualisez et répartissez équitablement le travail. Assurez-vous que personne ne soit en surchauffe pour préserver l'efficacité de l'équipe.
                </p>
              </div>
              
              {/* Date Controller */}
              <div
                className="flex items-center rounded-2xl p-1.5 shadow-float"
                style={{ background: 'hsl(228 35% 12%)' }}
              >
                <button 
                  type="button" 
                  onClick={() => setWeek((date) => subWeeks(date, 1))} 
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" 
                  aria-label="Semaine précédente"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button 
                  type="button" 
                  onClick={() => setWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))} 
                  className="px-6 text-sm font-bold text-white transition-opacity hover:opacity-80"
                >
                  {format(week, "d MMM", { locale: fr })} – {format(addWeeks(week, 1), "d MMM yyyy", { locale: fr })}
                </button>
                <button 
                  type="button" 
                  onClick={() => setWeek((date) => addWeeks(date, 1))} 
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" 
                  aria-label="Semaine suivante"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Metric icon={Users} label="Collaborateurs" value={data?.members.length || 0} />
              <Metric icon={Clock3} label="Charge planifiée" value={`${data?.total_scheduled_hours || 0} h`} />
              <Metric icon={CalendarRange} label="Capacité totale" value={`${data?.total_capacity_hours || 0} h`} />
              <Metric icon={AlertTriangle} label="Occupation" value={`${utilization}%`} alert={utilization > 100} />
            </div>
          </div>
        </section>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="h-[500px] animate-pulse rounded-3xl bg-slate-200/50" />
        ) : (
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
            
            {/* Team Members Grid */}
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Users className="h-4 w-4" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Membres de l'équipe</h3>
              </div>
              
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
                {visibleMembers.map((member) => (
                  <div 
                    key={member.id} 
                    className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                      member.is_overloaded 
                        ? 'border-rose-300/60 bg-card shadow-rose-500/10'
                        : 'border-border bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-indigo-400/60 hover:shadow-indigo-500/10'
                    }`}
                  >
                    {/* Top alert bar if overloaded */}
                    {member.is_overloaded && (
                      <div className="absolute inset-x-0 top-0 flex h-1.5 items-center justify-center bg-rose-500" />
                    )}
                    
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${
                              member.is_overloaded ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors'
                            }`}>
                              <UserRound className="h-6 w-6" />
                            </div>
                            {member.overdue_tasks > 0 && (
                              <div className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm" title={`${member.overdue_tasks} tâche(s) en retard`}>
                                {member.overdue_tasks}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-lg font-bold text-foreground">{member.name}</p>
                            <p className="text-sm font-medium text-muted-foreground">{memberRoleLabels[member.role] || member.role}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Planifié</p>
                          <p className={`text-2xl font-black ${member.is_overloaded ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                            {member.scheduled_hours} <span className="text-base font-semibold text-slate-400">/ {member.capacity_hours}h</span>
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {member.remaining_hours > 0 ? `${member.remaining_hours}h disponibles` : 'Aucune dispo.'}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <CircularProgress 
                            percent={member.utilization_percent} 
                            isOverloaded={member.is_overloaded} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {members.length > 12 && (
                <div className="flex justify-center">
                  <Button variant="secondary" onClick={() => setShowAllMembers((visible) => !visible)}>
                    {showAllMembers ? 'Réduire la liste' : `Afficher les ${members.length - 12} autres membres`}
                  </Button>
                </div>
              )}
            </div>

            {/* Unassigned Tasks Pool */}
            <div className="w-full xl:w-[400px] xl:shrink-0 space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Zap className="h-4 w-4" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Tâches à assigner</h3>
              </div>
              
              <div className="rounded-3xl border border-border bg-card p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex items-center justify-between border-b border-border px-4 py-4">
                  <p className="text-sm font-bold text-foreground">Tâches prévues cette semaine</p>
                  <span className="flex h-6 items-center justify-center rounded-full bg-muted px-2.5 text-xs font-bold text-muted-foreground">
                    {data?.unassigned_tasks.length || 0}
                  </span>
                </div>
                
                <div className="flex max-h-[700px] flex-col gap-2 overflow-y-auto p-2">
                  {data?.unassigned_tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="group flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 shadow-sm transition-all hover:border-indigo-400/60 hover:shadow-md"
                    >
                      <button 
                        type="button" 
                        onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: String(task.id) } })} 
                        className="text-left"
                      >
                        <p className="font-bold text-foreground transition-colors group-hover:text-indigo-600">
                          {task.title}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-xs font-medium text-slate-500">
                          <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                            <Clock3 className="h-3 w-3" /> {task.estimated_hours || 1} h
                          </span>
                          <span>
                            Échéance : {task.due_date ? new Date(task.due_date).toLocaleDateString('fr-FR') : '--/--/----'}
                          </span>
                        </div>
                      </button>
                      
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                          <UserPlus className="h-4 w-4" />
                        </div>
                        <select 
                          defaultValue="" 
                          aria-label={`Assigner ${task.title}`} 
                          onChange={(event) => event.target.value && assignMutation.mutate({ taskId: task.id, userId: Number(event.target.value) })} 
                          className="h-8 flex-1 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="" disabled>Assigner à quelqu'un...</option>
                          {data.members
                            .filter((member) => !member.is_overloaded)
                            .sort((a, b) => a.utilization_percent - b.utilization_percent)
                            .map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name} ({member.remaining_hours}h libres)
                              </option>
                            ))
                          }
                        </select>
                      </div>
                    </div>
                  ))}
                  
                  {!data?.unassigned_tasks.length && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-slate-900">Aucune tâche en attente</p>
                      <p className="mt-1 text-xs text-slate-500">Toutes les tâches de la semaine ont un responsable.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </Layout>
  )
}
