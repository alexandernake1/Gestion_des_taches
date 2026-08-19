import { useEffect, useRef, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface DateInputProps {
  name: string
  defaultValue?: string
  className?: string
  disabled?: boolean
  min?: string
  max?: string
  required?: boolean
}

const weekdayLabels = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

/** A platform-native calendar picker, stored as an ISO date for form submissions. */
export function DateInput({ name, defaultValue = '', className, disabled, min, max, required }: DateInputProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const initialDate = parseDate(defaultValue)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate)
  const [visibleMonth, setVisibleMonth] = useState(initialDate || new Date())
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const nextDate = parseDate(defaultValue)
    setSelectedDate(nextDate)
    if (nextDate) setVisibleMonth(nextDate)
  }, [defaultValue])

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const calendarStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const serializedValue = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''

  const selectDate = (date: Date) => {
    const value = format(date, 'yyyy-MM-dd')
    if ((min && value < min) || (max && value > max)) return
    setSelectedDate(date)
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input name={name} type="hidden" value={serializedValue} required={required} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'group flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-left text-sm transition-all',
          'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60',
          isOpen && 'border-primary ring-2 ring-primary/20',
          className,
        )}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={cn('flex items-center gap-2.5', selectedDate ? 'text-foreground' : 'text-muted-foreground')}>
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarDays className="h-3.5 w-3.5" /></span>
          {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: fr }) : 'Choisir une date'}
        </span>
        <CalendarDays className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </button>

      {isOpen && (
        <div role="dialog" aria-label="Choisir une date" className="absolute left-0 z-[80] mt-2 w-[320px] rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-slate-950/15 animate-scale-in">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => setVisibleMonth((month) => subMonths(month, 1))} aria-label="Mois précédent" className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
            <p className="text-sm font-black capitalize text-foreground">{format(visibleMonth, 'MMMM yyyy', { locale: fr })}</p>
            <button type="button" onClick={() => setVisibleMonth((month) => addMonths(month, 1))} aria-label="Mois suivant" className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdayLabels.map((label) => <span key={label} className="pb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</span>)}
            {days.map((date) => {
              const value = format(date, 'yyyy-MM-dd')
              const unavailable = Boolean((min && value < min) || (max && value > max))
              const selected = !!selectedDate && isSameDay(date, selectedDate)
              return (
                <button
                  key={value}
                  type="button"
                  disabled={unavailable}
                  onClick={() => selectDate(date)}
                  className={cn(
                    'mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold transition-all',
                    !isSameMonth(date, visibleMonth) && 'text-muted-foreground/40',
                    isToday(date) && !selected && 'bg-primary/10 text-primary',
                    selected && 'bg-primary text-primary-foreground shadow-lg shadow-primary/25',
                    !selected && !unavailable && 'hover:bg-primary/10 hover:text-primary',
                    unavailable && 'cursor-not-allowed opacity-30',
                  )}
                >
                  {format(date, 'd')}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <button type="button" onClick={() => { setSelectedDate(undefined); setIsOpen(false) }} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-3.5 w-3.5" />Effacer</button>
            <button type="button" onClick={() => { const today = new Date(); setVisibleMonth(today); selectDate(today) }} className="rounded-lg px-2 py-1.5 text-xs font-bold text-primary hover:bg-primary/10">Aujourd’hui</button>
          </div>
        </div>
      )}
    </div>
  )
}

function parseDate(value: string): Date | undefined {
  if (!value) return undefined
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}
