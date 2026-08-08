import { useQuery } from '@tanstack/react-query'
import { announcementsService } from '@/services/announcements'
import { AlertCircle, Info, AlertTriangle } from 'lucide-react'
import type { SystemAnnouncement } from '@/domain/types'

export function SystemAnnouncementsBanner() {
  const { data: announcements } = useQuery({
    queryKey: ['active-announcements'],
    queryFn: announcementsService.getActiveAnnouncements,
  })

  if (!announcements || announcements.length === 0) return null

  return (
    <div className="flex flex-col">
      {announcements.map((ann) => (
        <AnnouncementItem key={ann.id} announcement={ann} />
      ))}
    </div>
  )
}

function AnnouncementItem({ announcement }: { announcement: SystemAnnouncement }) {
  const isDanger = announcement.type === 'danger'
  const isWarning = announcement.type === 'warning'
  
  const Icon = isDanger ? AlertCircle : isWarning ? AlertTriangle : Info
  
  const bgClass = isDanger 
    ? 'bg-rose-50 border-rose-200 text-rose-800' 
    : isWarning 
    ? 'bg-amber-50 border-amber-200 text-amber-800' 
    : 'bg-blue-50 border-blue-200 text-blue-800'
    
  const iconClass = isDanger 
    ? 'text-rose-500' 
    : isWarning 
    ? 'text-amber-500' 
    : 'text-blue-500'

  return (
    <div className={`border-b px-4 py-3 sm:px-6 lg:px-8 flex items-start gap-3 ${bgClass}`}>
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconClass}`} />
      <p className="text-sm font-medium">{announcement.message}</p>
    </div>
  )
}
