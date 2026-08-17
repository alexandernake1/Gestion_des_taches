import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Clock, Edit3, ArrowRight, MessageSquare, Send, Trash2, Edit2, Reply, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useConfirmation } from '@/components/ui/confirmation'
import type { TaskHistory, TaskComment } from '@/domain/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksService } from '@/services/tasks'

interface TaskActivityFeedProps {
  taskId: number
  history: TaskHistory[]
  comments: TaskComment[]
  currentUserId?: number | string
}

type ActivityItem = 
  | { type: 'history'; data: TaskHistory; date: Date }
  | { type: 'comment'; data: TaskComment; date: Date }

const FIELD_LABELS: Record<string, string> = {
  status: 'Statut',
  priority: 'Priorité',
  title: 'Titre',
  description: 'Description',
  assigned_to: 'Assignation',
  team: 'Équipe',
  due_date: 'Date d\'échéance',
  start_date: 'Date de début',
  progress_percent: 'Progression',
  created: 'Création',
  created_from_template: 'Créé depuis un modèle',
  duplicated_from: 'Duplication',
  restored: 'Restauration',
  archived: 'Archivage',
  parent: 'Tâche parente',
  is_blocked: 'Blocage',
  estimated_hours: 'Temps estimé',
  recurrence_frequency: 'Récurrence',
}

function formatValue(field: string, value?: string) {
  if (!value) return 'Vide'
  
  if (field === 'status') {
    const statuses: Record<string, string> = {
      todo: 'À faire',
      in_progress: 'En cours',
      on_hold: 'En pause',
      deferred: 'Reportée',
      completed: 'Terminée'
    }
    return statuses[value] || value
  }
  
  if (field === 'priority') {
    const priorities: Record<string, string> = {
      low: 'Faible',
      normal: 'Normale',
      high: 'Haute',
      urgent: 'Urgente'
    }
    return priorities[value] || value
  }

  return value
}

export function TaskActivityFeed({ taskId, history, comments, currentUserId }: TaskActivityFeedProps) {
  const queryClient = useQueryClient()
  const confirmAction = useConfirmation()
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<TaskComment | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')

  // Mutations
  const commentMutation = useMutation({
    mutationFn: ({ content, parentCommentId }: { content: string; parentCommentId?: number }) =>
      tasksService.createComment(taskId, {
        content,
        ...(parentCommentId ? { parent_comment: parentCommentId } : {}),
      }),
    onSuccess: () => {
      setCommentText('')
      setReplyingTo(null)
      queryClient.invalidateQueries({ queryKey: ['task-comments', String(taskId)] })
    },
  })

  const editCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) => 
      tasksService.updateComment(taskId, commentId, { content }),
    onSuccess: () => {
      setEditingCommentId(null)
      setEditContent('')
      queryClient.invalidateQueries({ queryKey: ['task-comments', String(taskId)] })
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => tasksService.deleteComment(taskId, commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-comments', String(taskId)] }),
  })

  // Combine and sort
  const feed: ActivityItem[] = [
    ...history.map(h => ({ type: 'history' as const, data: h, date: new Date(h.changed_at) })),
    ...comments.map(c => ({ type: 'comment' as const, data: c, date: new Date(c.created_at) }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()) // Newest first

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      publishComment()
    }
  }

  const publishComment = () => {
    const content = commentText.trim()
    if (!content) return
    commentMutation.mutate({ content, parentCommentId: replyingTo?.id })
  }

  return (
    <div className="flex flex-col">
      {/* Comment Input */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm p-1 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
        {replyingTo && (
          <div className="mx-2 mt-2 flex items-start justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
            <div className="min-w-0">
              <p className="font-semibold">Réponse à {replyingTo.author_name || 'ce commentaire'}</p>
              <p className="mt-0.5 truncate text-indigo-700">{replyingTo.content}</p>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="rounded p-1 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-800"
              title="Annuler la réponse"
              aria-label="Annuler la réponse"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={replyingTo ? `Répondre à ${replyingTo.author_name || 'ce commentaire'}... (Ctrl+Enter pour envoyer)` : 'Ajouter un commentaire... (Ctrl+Enter pour envoyer)'}
          className="w-full resize-none bg-transparent p-3 text-sm outline-none placeholder:text-slate-400 min-h-[80px]"
          aria-label="Nouveau commentaire"
        />
        <div className="flex justify-end p-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
          <Button 
            onClick={publishComment}
            disabled={!commentText.trim() || commentMutation.isPending}
            size="sm"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {replyingTo ? 'Répondre' : 'Commenter'}
          </Button>
        </div>
        {commentMutation.isError && (
          <p className="px-3 pb-2 text-xs text-rose-600">Impossible de publier le commentaire.</p>
        )}
      </div>

      {/* Timeline */}
      {feed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 border-dashed bg-slate-50 py-12 text-center">
          <MessageSquare className="mb-2 h-8 w-8 text-slate-300" />
          <h3 className="text-sm font-medium text-slate-900">Aucune activité</h3>
          <p className="mt-1 text-xs text-slate-500">
            Soyez le premier à commenter cette tâche.
          </p>
        </div>
      ) : (
        <div className="flow-root px-2">
          <ul role="list" className="-mb-8">
            {feed.map((item, itemIdx) => {
              const isLast = itemIdx === feed.length - 1
              
              if (item.type === 'history') {
                const event = item.data
                return (
                  <li key={`hist-${event.id}`}>
                    <div className="relative pb-8">
                      {!isLast && <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 ring-8 ring-white">
                            {event.field_name === 'created' ? (
                              <Clock className="h-4 w-4 text-slate-500" />
                            ) : (
                              <Edit3 className="h-4 w-4 text-slate-500" />
                            )}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-slate-600">
                              <span className="font-medium text-slate-900">
                                {event.changed_by_name || 'Utilisateur inconnu'}
                              </span>{' '}
                              {event.field_name === 'created' ? 'a créé la tâche' : (
                                <>
                                  a modifié <span className="font-medium text-slate-900">{FIELD_LABELS[event.field_name] || event.field_name}</span>
                                </>
                              )}
                            </p>
                            {event.field_name !== 'created' && (
                              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                {event.old_value && (
                                  <span className="line-through opacity-70">
                                    {formatValue(event.field_name, event.old_value)}
                                  </span>
                                )}
                                {event.old_value && event.new_value && <ArrowRight className="h-3.5 w-3.5" />}
                                {event.new_value && (
                                  <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {formatValue(event.field_name, event.new_value)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="whitespace-nowrap text-right text-xs text-slate-500">
                            <time dateTime={item.date.toISOString()}>
                              {format(item.date, "d MMM yyyy 'à' HH:mm", { locale: fr })}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              }

              // Comment Item
              const comment = item.data
              const isAuthor = String(comment.author) === String(currentUserId)

              return (
                <li key={`com-${comment.id}`}>
                  <div className="relative pb-8">
                    {!isLast && <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />}
                    <div className="group relative flex space-x-3">
                      <div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 ring-8 ring-white text-xs font-bold text-indigo-700 shadow-sm">
                          {comment.author_name ? comment.author_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2) : 'C'}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{comment.author_name || 'Collaborateur'}</span>
                            <time className="text-xs text-slate-500">
                              {format(item.date, "d MMM 'à' HH:mm", { locale: fr })}
                            </time>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100" style={{ opacity: editingCommentId === comment.id ? 1 : undefined }}>
                            {!comment.parent_comment && (
                              <button
                                type="button"
                                onClick={() => { setReplyingTo(comment); setEditingCommentId(null) }}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                                title="Répondre"
                                aria-label={`Répondre à ${comment.author_name || 'ce commentaire'}`}
                              >
                                <Reply className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {isAuthor && (
                              <>
                              <button 
                                onClick={() => { setEditingCommentId(comment.id); setEditContent(comment.content); }}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                                title="Modifier"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={async () => {
                                  const { confirmed } = await confirmAction({
                                    title: 'Supprimer ce commentaire ?',
                                    description: 'Le commentaire sera supprimé définitivement de cette activité.',
                                    confirmLabel: 'Supprimer',
                                    tone: 'danger',
                                  })
                                  if (confirmed) deleteCommentMutation.mutate(comment.id)
                                }}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              </>
                            )}
                          </div>
                        </div>

                        {editingCommentId === comment.id ? (
                          <form className="mt-2" onSubmit={(e) => { e.preventDefault(); if(editContent.trim()) editCommentMutation.mutate({ commentId: comment.id, content: editContent.trim() }) }}>
                            <textarea 
                              value={editContent} 
                              onChange={(e) => setEditContent(e.target.value)} 
                              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                              rows={3} 
                              autoFocus
                            />
                            <div className="mt-2 flex gap-2">
                              <Button type="submit" size="sm" disabled={!editContent.trim() || editCommentMutation.isPending}>Enregistrer</Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingCommentId(null)}>Annuler</Button>
                            </div>
                          </form>
                        ) : (
                          <div className="mt-2">
                            <div className="rounded-2xl rounded-tl-none bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-slate-100">
                              {comment.parent_comment && (
                                <div className="mb-3 rounded-lg border-l-2 border-indigo-300 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                                  <p className="font-semibold">En réponse à {comment.parent_comment_author_name || 'un commentaire'}</p>
                                  <p className="mt-0.5 line-clamp-2 text-indigo-700">{comment.parent_comment_content || 'Commentaire indisponible'}</p>
                                </div>
                              )}
                              {comment.content.split('\n').map((line, i) => <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
