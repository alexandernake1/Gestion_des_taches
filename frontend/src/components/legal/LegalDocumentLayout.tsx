import { ArrowLeft, Building2, CalendarDays, Mail } from 'lucide-react'
import type { ReactNode } from 'react'

export const LEGAL_VERSION = '13 août 2026'

interface LegalDocumentLayoutProps {
  title: string
  description: string
  current: 'privacy' | 'terms'
  toc: Array<{ id: string; label: string }>
  children: ReactNode
}

export function LegalDocumentLayout({ title, description, current, toc, children }: LegalDocumentLayoutProps) {
  return (
    <main className="app-surface min-h-screen text-slate-800">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="/login" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </span>
            <span><strong className="block text-sm text-slate-950">Activity Control</strong><span className="text-xs text-slate-500">Informations juridiques</span></span>
          </a>
          <nav aria-label="Documents juridiques" className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold sm:text-sm">
            <a href="/privacy" aria-current={current === 'privacy' ? 'page' : undefined} className={`rounded-lg px-3 py-2 ${current === 'privacy' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Confidentialité</a>
            <a href="/terms" aria-current={current === 'terms' ? 'page' : undefined} className={`rounded-lg px-3 py-2 ${current === 'terms' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Conditions</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <a href="/register" className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900">
          <ArrowLeft className="h-4 w-4" /> Retour à la création de compte
        </a>

        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Document public</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Version du {LEGAL_VERSION}</span>
            <a href="mailto:support@activity-tracker.com" className="inline-flex items-center gap-1.5 text-indigo-700 hover:underline"><Mail className="h-4 w-4" /> support@activity-tracker.com</a>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-6">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Sommaire</p>
            <ol className="mt-4 space-y-2.5 text-sm">
              {toc.map((item, index) => (
                <li key={item.id}><a href={`#${item.id}`} className="flex gap-2 text-slate-600 hover:text-indigo-700"><span className="font-bold text-slate-400">{index + 1}.</span><span>{item.label}</span></a></li>
              ))}
            </ol>
          </aside>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
            <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <strong>Préproduction :</strong> le nom légal, l’adresse et l’identifiant d’immatriculation de l’entité exploitante devront être complétés avant l’ouverture commerciale du service.
            </div>
            <div className="space-y-10">{children}</div>
          </article>
        </div>
      </div>
    </main>
  )
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 [&_a]:font-semibold [&_a]:text-indigo-700 [&_a]:underline [&_li]:pl-1 [&_strong]:font-bold [&_strong]:text-slate-800 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  )
}
