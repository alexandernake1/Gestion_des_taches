import { Task, Status } from '@/domain/types'
import { useState, useMemo } from 'react'
import {
  addDays,
  differenceInDays,
  eachDayOfInterval,
  format,
  isSameMonth,
  max,
  min,
  parseISO,
  startOfMonth,
  endOfMonth,
  isToday,
  isWeekend
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { Lock } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

interface TimelineViewProps {
  tasks: Task[]
}

export function TimelineView({ tasks }: TimelineViewProps) {
  const navigate = useNavigate()
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)

  // 1. Filtrer et préparer les tâches (seulement celles avec au moins une date)
  const scheduledTasks = useMemo(() => {
    return tasks
      .filter((t) => t.start_date || t.due_date)
      .map((t) => {
        const endDate = t.due_date ? parseISO(t.due_date) : parseISO(t.start_date!)
        const startDate = t.start_date ? parseISO(t.start_date) : endDate
        return {
          ...t,
          parsedStart: startDate,
          parsedEnd: endDate,
        }
      })
      .sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime())
  }, [tasks])

  // 2. Déterminer la plage de dates globale
  const { timelineStart, days } = useMemo(() => {
    if (scheduledTasks.length === 0) {
      const start = startOfMonth(new Date())
      const end = endOfMonth(new Date())
      return {
        timelineStart: start,
        days: eachDayOfInterval({ start, end })
      }
    }

    const minDate = min(scheduledTasks.map((t) => t.parsedStart))
    const maxDate = max(scheduledTasks.map((t) => t.parsedEnd))

    // Ajouter un peu de marge (3 jours avant, 7 jours après)
    const start = addDays(minDate, -3)
    const end = addDays(maxDate, 7)

    return {
      timelineStart: start,
      days: eachDayOfInterval({ start, end })
    }
  }, [scheduledTasks])

  // 3. Organiser les mois pour l'en-tête
  const months = useMemo(() => {
    const result: { date: Date; span: number; label: string }[] = []
    if (days.length === 0) return result
    
    let currentMonthDate = days[0]
    let span = 1

    for (let i = 1; i < days.length; i++) {
      if (isSameMonth(days[i], currentMonthDate)) {
        span++
      } else {
        result.push({ date: currentMonthDate, span, label: format(currentMonthDate, 'MMMM yyyy', { locale: fr }) })
        currentMonthDate = days[i]
        span = 1
      }
    }
    result.push({ date: currentMonthDate, span, label: format(currentMonthDate, 'MMMM yyyy', { locale: fr }) })
    return result
  }, [days])

  // Helpers visuels
  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500 border-emerald-600'
      case 'in_progress': return 'bg-blue-500 border-blue-600'
      case 'on_hold': return 'bg-amber-500 border-amber-600'
      case 'deferred': return 'bg-slate-400 border-slate-500'
      case 'todo':
      default: return 'bg-indigo-500 border-indigo-600'
    }
  }

  // Calculer les dépendances pour l'effet de survol
  // hoveredTaskDependsOn: tâches dont dépend la tâche survolée (elle attend après elles)
  // hoveredTaskBlocks: tâches qui dépendent de la tâche survolée (elle les bloque)
  const { dependsOn, blocks } = useMemo(() => {
    if (!hoveredTaskId) return { dependsOn: new Set<string>(), blocks: new Set<string>() }
    
    const hoveredTask = tasks.find(t => String(t.id) === hoveredTaskId)
    const dependsOnSet = new Set<string>((hoveredTask?.dependencies || []).map(String))
    
    const blocksSet = new Set<string>()
    tasks.forEach(t => {
      if (t.dependencies?.map(String).includes(hoveredTaskId)) {
        blocksSet.add(String(t.id))
      }
    })
    
    return { dependsOn: dependsOnSet, blocks: blocksSet }
  }, [hoveredTaskId, tasks])

  if (scheduledTasks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50">
        <p className="text-slate-500 font-medium">Aucune tâche planifiée avec des dates pour afficher la chronologie.</p>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      
      {/* Légende rapide */}
      <div className="flex flex-wrap items-center gap-6 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-500 shrink-0">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-indigo-500"></div>À faire</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-blue-500"></div>En cours</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-emerald-500"></div>Terminée</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-amber-500"></div>En attente</div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
          Survolez une tâche pour voir ses dépendances
        </div>
      </div>

      <div className="overflow-auto flex-1 custom-scrollbar">
        <div className="min-w-max pb-8">
          
          {/* Header Grid */}
          <div 
            className="sticky top-0 z-20 grid border-b border-slate-200 bg-white shadow-sm"
            style={{ gridTemplateColumns: `300px repeat(${days.length}, minmax(40px, 1fr))` }}
          >
            {/* Colonne des noms de tâches */}
            <div className="sticky left-0 z-30 flex items-end border-r border-slate-200 bg-white p-3 font-bold text-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
              Tâches
            </div>

            {/* Colonnes des dates */}
            <div className="flex flex-col col-start-2" style={{ gridColumn: `2 / span ${days.length}` }}>
              
              {/* Ligne des Mois */}
              <div className="flex border-b border-slate-100">
                {months.map((m, idx) => (
                  <div 
                    key={idx} 
                    className="flex-shrink-0 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 capitalize"
                    style={{ width: `${m.span * 40}px`, borderRight: idx < months.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>

              {/* Ligne des Jours */}
              <div className="flex">
                {days.map((day, idx) => {
                  const today = isToday(day)
                  const weekend = isWeekend(day)
                  return (
                    <div 
                      key={idx} 
                      className={`flex flex-col items-center justify-center flex-shrink-0 border-r border-slate-100 py-1.5 text-xs ${
                        today ? 'bg-indigo-50 text-indigo-700 font-bold' : 
                        weekend ? 'bg-slate-50/50 text-slate-400' : 'text-slate-600'
                      }`}
                      style={{ width: '40px' }}
                    >
                      <span>{format(day, 'dd')}</span>
                      <span className="text-[9px] uppercase opacity-75">{format(day, 'EEE', { locale: fr })}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Body Grid */}
          <div className="relative">
            {/* Lignes de fond (colonnes des jours) */}
            <div 
              className="absolute inset-0 grid pointer-events-none"
              style={{ gridTemplateColumns: `300px repeat(${days.length}, 40px)` }}
            >
              <div className="border-r border-slate-200 bg-white"></div>
              {days.map((day, idx) => (
                <div 
                  key={idx} 
                  className={`border-r border-slate-100/50 ${isToday(day) ? 'bg-indigo-50/30' : isWeekend(day) ? 'bg-slate-50/30' : ''}`}
                ></div>
              ))}
            </div>

            {/* Tâches */}
            <div className="relative z-10 flex flex-col py-2">
              {scheduledTasks.map((task) => {
                const taskId = String(task.id)
                // Calculer la position
                const startOffset = differenceInDays(task.parsedStart, timelineStart)
                const duration = Math.max(1, differenceInDays(task.parsedEnd, task.parsedStart) + 1)
                
                // Limiter visuellement à la grille
                const colStart = Math.max(1, startOffset + 1)
                const visibleDuration = startOffset < 0 ? duration + startOffset : duration

                // Logique de survol et mise en évidence
                const isHovered = hoveredTaskId === taskId
                const isDependsOn = dependsOn.has(taskId)
                const isBlocks = blocks.has(taskId)
                
                let opacityClass = "opacity-100"
                if (hoveredTaskId && !isHovered && !isDependsOn && !isBlocks) {
                  opacityClass = "opacity-30 grayscale"
                }

                let ringClass = ""
                if (isHovered) ringClass = "ring-2 ring-indigo-400 ring-offset-2"
                if (isDependsOn) ringClass = "ring-2 ring-rose-400 ring-offset-1 animate-pulse" // Ce qui me bloque
                if (isBlocks) ringClass = "ring-2 ring-emerald-400 ring-offset-1" // Ce que je bloque

                return (
                  <div 
                    key={taskId}
                    className={`group relative grid transition-all duration-300 ease-in-out hover:bg-slate-50 ${opacityClass}`}
                    style={{ gridTemplateColumns: `300px repeat(${days.length}, 40px)` }}
                    onMouseEnter={() => setHoveredTaskId(taskId)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                  >
                    {/* Nom de la tâche */}
                    <div 
                      className="sticky left-0 z-20 flex items-center gap-2 border-r border-slate-200 bg-white group-hover:bg-slate-50 p-2 text-sm pl-4 pr-2 cursor-pointer transition-colors"
                      onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId } })}
                    >
                      <div className="truncate flex-1 font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                        {task.is_blocked && <Lock className="inline-block mr-1.5 h-3 w-3 text-rose-500 shrink-0" />}
                        {task.title}
                      </div>
                      {task.assigned_to_name && (
                        <div title={task.assigned_to_name} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-600 uppercase">
                          {task.assigned_to_name.substring(0, 2)}
                        </div>
                      )}
                    </div>

                    {/* Barre de la tâche */}
                    <div 
                      className="relative flex items-center py-1.5"
                      style={{ 
                        gridColumn: `${colStart + 1} / span ${visibleDuration}`,
                        // Empêcher le débordement si la tâche va au-delà de la grille
                        maxWidth: visibleDuration > days.length - startOffset ? `${(days.length - startOffset) * 40}px` : '100%' 
                      }}
                    >
                      <div 
                        onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId } })}
                        className={`
                          h-7 w-full min-w-[20px] rounded-md border shadow-sm cursor-pointer
                          transition-all duration-200 hover:shadow-md hover:brightness-110
                          flex items-center px-2 overflow-hidden
                          ${getStatusColor(task.status)}
                          ${ringClass}
                        `}
                      >
                        <span className="truncate text-[10px] font-bold text-white drop-shadow-sm">
                          {visibleDuration > 1 ? task.title : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  )
}
