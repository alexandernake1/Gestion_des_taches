import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileCheck2,
  FolderGit2,
  Kanban,
  Layers,
  MessageSquare,
  Play,
  Rocket,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
  Share2,
} from 'lucide-react'
import { redirectAuthenticatedUser } from '@/router/auth'
import { useTutorial } from '@/context/TutorialContext'
import { SharePlatformModal } from '@/components/common/SharePlatformModal'

export const Route = createFileRoute('/')({
  beforeLoad: redirectAuthenticatedUser,
  component: LandingPage,
})

function LandingPage() {
  const { openShareModal } = useTutorial()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'approvals' | 'kanban' | 'collab'>('dashboard')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const faqs = [
    {
      q: 'Quelle est la différence entre un espace personnel et une entreprise ?',
      a: 'L’espace personnel vous permet de gérer vos tâches individuelles en toute autonomie et gratuitement. Dès que vous créez une organisation, vous débloquez le mode multi-utilisateurs avec équipes, rôles hiérarchiques (Managers, Employés), circuits de validation et tableau de bord exécutif.',
    },
    {
      q: 'Comment fonctionnent les validations et reports d’échéance ?',
      a: 'Lorsqu’un collaborateur termine une tâche sensible ou nécessite un délai supplémentaire, il déclenche une demande de validation ou un report d’échéance motivé. Les managers sont instantanément notifiés et peuvent approuver ou refuser en un clic.',
    },
    {
      q: 'Comment fonctionne la facturation au prorata et le crédit ?',
      a: 'Si vous changez d’offre ou passez à un plan supérieur, le temps non consommé sur votre période actuelle est automatiquement crédité sur votre solde. Cet excédent est déduit de vos prochains règlements.',
    },
    {
      q: 'Les notifications sont-elles transmises en temps réel ?',
      a: 'Oui. Grâce à notre moteur WebSockets et notifications push, toute assignation, rappel d’échéance ou validation apparaît instantanément avec un signal sonore discret et un bouton d’action rapide « Commencer la tâche ».',
    },
  ]

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* ── BACKGROUND AMBIENT GLOWS ───────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-600/20 blur-[130px]" />
        <div className="absolute top-[25%] right-[-10%] h-[650px] w-[650px] rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" className="flex items-center gap-3 group" aria-label="Accueil Activity Control">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 transition-transform group-hover:scale-105">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white">Activity Control</span>
                <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                  PRO
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">Pilotage d’activité & projets</span>
            </div>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-300 md:flex">
            <a href="#apercu" className="hover:text-white transition-colors">Aperçu interactif</a>
            <a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#methode" className="hover:text-white transition-colors">Méthode</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              Se connecter
            </a>
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 hover:shadow-indigo-500/40"
            >
              <span>Démarrer l’expérience</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ───────────────────────────────────────── */}
      <section className="relative px-5 pt-14 pb-20 sm:px-8 sm:pt-24 sm:pb-32 lg:px-10">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold text-indigo-300 backdrop-blur-md shadow-inner">
            <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span>Pilotage opérationnel & gouvernance collaborative</span>
          </div>

          <h1 className="mt-8 text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl lg:leading-[1.1]">
            Pilotez vos activités avec une <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
              clarté absolue.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-300 sm:text-lg sm:leading-relaxed">
            Centralisez vos projets, fluidifiez les validations hiérarchiques et éliminez les retards dans un espace de travail moderne, structuré et performant.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
            <a
              href="/register"
              className="inline-flex h-13 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 px-8 text-base font-bold text-white shadow-xl shadow-indigo-600/35 transition-all hover:scale-[1.02] hover:shadow-indigo-600/50 sm:w-auto"
            >
              <span>Commencer gratuitement</span>
              <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="#apercu"
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 text-sm font-bold text-slate-200 backdrop-blur transition-colors hover:bg-white/10 sm:w-auto"
            >
              <Play className="h-4 w-4 fill-current text-indigo-400" />
              <span>Explorer la démo interactive</span>
            </a>
            <button
              type="button"
              onClick={openShareModal}
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 text-sm font-bold text-indigo-300 backdrop-blur transition-all hover:bg-indigo-500/20 sm:w-auto"
            >
              <Share2 className="h-4 w-4" />
              <span>Partager</span>
            </button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-400">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Espace Personnel & Entreprise
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Validation & Reports en 1 clic
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Notifications en direct
            </span>
          </div>
        </div>

        {/* ── INTERACTIVE PRODUCT PREVIEW ──────────────────────── */}
        <div id="apercu" className="mx-auto mt-16 max-w-6xl scroll-mt-24">
          {/* Tabs Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6">
            {[
              { id: 'dashboard', label: 'Tableau de bord & KPIs', icon: BarChart3 },
              { id: 'approvals', label: 'Validations & Reports', icon: ShieldCheck },
              { id: 'kanban', label: 'Flux de tâches & Priorités', icon: Kanban },
              { id: 'collab', label: 'Collaboration & Alertes', icon: BellRing },
            ].map((tab) => {
              const Icon = tab.icon
              const isCurrent = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                    isCurrent
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400/50'
                      : 'border border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Screen Showcase Container */}
          <div className="relative rounded-[2rem] border border-white/15 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-3 shadow-2xl shadow-black/80 backdrop-blur-2xl sm:p-4">
            <div className="absolute -top-3 right-6 hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-300 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Système synchronisé en temps réel</span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
              {/* Window Bar */}
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 text-xs font-bold text-slate-400">Activity Control Console</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 text-[11px] font-bold text-indigo-300">
                    Mode Organisation
                  </span>
                </div>
              </div>

              {/* Dynamic View based on Tab */}
              <div className="p-5 sm:p-8">
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                        <p className="text-xs font-semibold text-slate-400">Tâches en cours</p>
                        <p className="mt-2 text-2xl font-black text-white">24</p>
                        <span className="mt-2 inline-flex items-center text-[11px] font-bold text-emerald-400">
                          <TrendingUp className="h-3 w-3 mr-1" /> +12% cette semaine
                        </span>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                        <p className="text-xs font-semibold text-slate-400">Validations en attente</p>
                        <p className="mt-2 text-2xl font-black text-amber-400">3</p>
                        <span className="mt-2 inline-block text-[11px] font-medium text-slate-400">Délai moyen : 1.4 jour</span>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                        <p className="text-xs font-semibold text-slate-400">Taux de complétion</p>
                        <p className="mt-2 text-2xl font-black text-indigo-400">96.8%</p>
                        <span className="mt-2 inline-block text-[11px] font-medium text-emerald-400">Excellente cadence</span>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                        <p className="text-xs font-semibold text-slate-400">Collaborateurs actifs</p>
                        <p className="mt-2 text-2xl font-black text-white">18</p>
                        <span className="mt-2 inline-block text-[11px] font-medium text-slate-400">4 équipes synchronisées</span>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                          <span>Progression des projets clés</span>
                          <span className="text-xs text-indigo-400 font-normal">4 actifs</span>
                        </h4>
                        <div className="space-y-4">
                          {[
                            { name: 'Refonte Plateforme Client', progress: 85, color: 'from-indigo-500 to-cyan-400', manager: 'Marc K.' },
                            { name: 'Audit Financier Trimestriel', progress: 60, color: 'from-violet-500 to-indigo-500', manager: 'Sarah D.' },
                            { name: 'Déploiement API Mobile', progress: 42, color: 'from-emerald-500 to-teal-400', manager: 'Alex N.' },
                          ].map((proj) => (
                            <div key={proj.name} className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-200">{proj.name}</span>
                                <span className="font-bold text-white">{proj.progress}%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                <div className={`h-full rounded-full bg-gradient-to-r ${proj.color}`} style={{ width: `${proj.progress}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
                        <h4 className="text-sm font-bold text-white mb-4">Flux des activités récentes</h4>
                        <div className="space-y-3">
                          {[
                            { user: 'Sarah D.', action: 'a validé la tâche', task: 'Rapport annuel 2026', time: 'Il y a 10 min' },
                            { user: 'Marc K.', action: 'a demandé un report sur', task: 'Maquettes Dashboard', time: 'Il y a 35 min' },
                            { user: 'Alex N.', action: 'a terminé la sous-tâche', task: 'Tests d’intégration', time: 'Il y a 1h' },
                          ].map((act, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-[10px] font-bold text-indigo-300">
                                {act.user.substring(0, 2)}
                              </div>
                              <div className="min-w-0 flex-1 text-xs">
                                <p className="text-slate-300">
                                  <span className="font-bold text-white">{act.user}</span> {act.action} <span className="text-indigo-300 font-semibold">{act.task}</span>
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{act.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'approvals' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white">Circuit de validation & Reports</h3>
                        <p className="text-xs text-slate-400">Validez les livrables avant clôture ou approuvez les reports d’échéances motivés.</p>
                      </div>
                      <span className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400">
                        2 approbations requises
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="rounded-lg bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                            Validation de fin
                          </span>
                          <span className="text-xs text-slate-400">Aujourd’hui 14:30</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">Clôture Audit Sécurité Q3</h4>
                          <p className="text-xs text-slate-400 mt-1">Soumis par Michel T. avec 2 pièces jointes (rapport_final.pdf)</p>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-white/10">
                          <button type="button" className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-bold text-white transition-colors">
                            Approuver la tâche
                          </button>
                          <button type="button" className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors">
                            Refuser / Corriger
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                            Demande de report
                          </span>
                          <span className="text-xs text-slate-400">Hier 17:15</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">Intégration Passerelle Mobile Money</h4>
                          <p className="text-xs text-amber-200/90 mt-1 italic">« Attente des clés de production côté opérateur télécom. »</p>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-white/10">
                          <button type="button" className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2 text-xs font-bold text-white transition-colors">
                            Reporter au 25 Août
                          </button>
                          <button type="button" className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors">
                            Refuser
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'kanban' && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      {
                        title: 'À faire',
                        count: 4,
                        tasks: [
                          { title: 'Définir la charte graphique V2', tag: 'Design', priority: 'Haute', color: 'bg-rose-500/20 text-rose-300' },
                          { title: 'Préparer contrat prestataire', tag: 'Juridique', priority: 'Normale', color: 'bg-indigo-500/20 text-indigo-300' },
                        ],
                      },
                      {
                        title: 'En cours',
                        count: 3,
                        tasks: [
                          { title: 'Développement WebSockets Live', tag: 'Tech', priority: 'Urgent', color: 'bg-rose-500/20 text-rose-300', startBtn: true },
                          { title: 'Revue budgétaire trimestrielle', tag: 'Finance', priority: 'Normale', color: 'bg-indigo-500/20 text-indigo-300' },
                        ],
                      },
                      {
                        title: 'Validé & Terminé',
                        count: 8,
                        tasks: [
                          { title: 'Validation architecture serveur', tag: 'DevOps', priority: 'Terminée', color: 'bg-emerald-500/20 text-emerald-300' },
                          { title: 'Onboarding 5 nouveaux employés', tag: 'RH', priority: 'Terminée', color: 'bg-emerald-500/20 text-emerald-300' },
                        ],
                      },
                    ].map((col) => (
                      <div key={col.title} className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">{col.title}</span>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">{col.count}</span>
                        </div>
                        <div className="space-y-3">
                          {col.tasks.map((task, idx) => (
                            <div key={idx} className="rounded-xl border border-white/10 bg-slate-950/80 p-3.5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold ${task.color}`}>
                                  {task.tag}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">{task.priority}</span>
                              </div>
                              <p className="text-xs font-bold text-slate-200">{task.title}</p>
                              {task.startBtn && (
                                <div className="pt-1">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                    <Play className="h-3 w-3 fill-current" /> Commencée en 1 clic
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'collab' && (
                  <div className="grid gap-5 sm:grid-cols-2 items-center">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                          <BellRing className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Alertes instantanées & audio chime</h4>
                          <p className="text-xs text-slate-400">Notification en direct dès qu’une action vous concerne.</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-indigo-500/30 bg-slate-950 p-4 space-y-2 shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-indigo-400" />
                            Rappel d’échéance
                          </span>
                          <span className="text-[10px] text-slate-500">À l’instant</span>
                        </div>
                        <p className="text-xs text-slate-300">
                          La tâche « Validation rapport audit » arrive à échéance aujourd’hui à 18h00.
                        </p>
                        <div className="pt-1 flex gap-2">
                          <button type="button" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">
                            Commencer la tâche
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 flex items-center gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
                          <MessageSquare className="h-5 w-5" />
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white">Fils de discussion contextualisés</h4>
                          <p className="text-xs text-slate-400">Tous les échanges restent attachés à la tâche concernée.</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 flex items-center gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                          <Shield className="h-5 w-5" />
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white">Rôles stricts & sécurité des données</h4>
                          <p className="text-xs text-slate-400">Droits spécifiques pour Managers, Employés et Propriétaires.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── KEY METRICS / IMPACT BAR ───────────────────────────── */}
      <section className="border-y border-white/10 bg-slate-900/40 py-12 px-5 sm:px-8">
        <div className="mx-auto max-w-7xl grid grid-cols-2 gap-8 lg:grid-cols-4 text-center">
          <div>
            <p className="text-3xl font-black text-white sm:text-4xl">99.4%</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">Respect des délais</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white sm:text-4xl">3.5x</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-violet-400">Validations accélérées</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white sm:text-4xl">100%</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">Traçabilité des actions</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white sm:text-4xl">0</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-cyan-400">Tâche oubliée</p>
          </div>
        </div>
      </section>

      {/* ── BENTO FEATURES GRID ────────────────────────────────── */}
      <section id="fonctionnalites" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Fonctionnalités avancées</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Tout ce dont une organisation moderne a besoin.
            </h2>
            <p className="mt-4 text-base text-slate-400 leading-relaxed">
              Une suite d’outils intégrés pensée pour simplifier la vie des managers et donner aux collaborateurs les moyens d’exceller.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {/* Big Card 1 */}
            <div className="md:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-colors" />
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 mb-6">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-extrabold text-white">Circuit d’approbation & Validation hiérarchique</h3>
              <p className="mt-3 text-sm text-slate-400 max-w-xl leading-relaxed">
                Ne laissez plus les livrables être clôturés sans confirmation. Les managers examinent les pièces jointes, formulent des retours et approuvent ou refusent directement.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-indigo-300">
                <span className="rounded-lg bg-indigo-500/15 px-3 py-1.5">Historique certifié</span>
                <span className="rounded-lg bg-indigo-500/15 px-3 py-1.5">Motif obligatoire en cas de refus</span>
                <span className="rounded-lg bg-indigo-500/15 px-3 py-1.5">Mise à jour instantanée</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 shadow-xl relative overflow-hidden group">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-400 mb-6">
                <Clock className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-extrabold text-white">Demandes de report motivées</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Un imprévu ? Les collaborateurs peuvent solliciter un report d’échéance avec justification pour un pilotage sans zones d’ombre.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 shadow-xl relative overflow-hidden group">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 mb-6">
                <Zap className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-extrabold text-white">Action « Commencer la tâche »</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                À la réception d’une notification ou d’un rappel, un clic direct sur « Commencer la tâche » change son statut en cours sans délai.
              </p>
            </div>

            {/* Big Card 4 */}
            <div className="md:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-48 w-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-colors" />
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-6">
                <BarChart3 className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-extrabold text-white">Indicateurs de performance & Charge d’équipe</h3>
              <p className="mt-3 text-sm text-slate-400 max-w-xl leading-relaxed">
                Visualisez la répartition du travail par collaborateur, les délais moyens d’exécution, les taux de complétion et anticipez les goulets d’étranglement.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-emerald-300">
                <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5">Délais moyens par équipe</span>
                <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5">Charge par collaborateur</span>
                <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5">Rapports exportables</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WORKFLOW METHOD ────────────────────────────────────── */}
      <section id="methode" className="scroll-mt-24 border-y border-white/10 bg-slate-900/30 px-5 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Un cycle fluide</p>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Comment fonctionne Activity Control ?</h2>
            <p className="mt-3 text-sm text-slate-400">Trois étapes limpides pour passer de l’intention au résultat certifié.</p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3 relative">
            {[
              {
                num: '01',
                title: 'Créez & Assignez',
                desc: 'Définissez les tâches, échéances, priorités, dépendances et assignez les membres d’équipe responsables.',
                icon: FolderGit2,
              },
              {
                num: '02',
                title: 'Exécutez & Échangez',
                desc: 'Commencez les tâches en un clic, commentez dans le contexte et recevez des alertes sonores et push en direct.',
                icon: Layers,
              },
              {
                num: '03',
                title: 'Validez & Clôturez',
                desc: 'Soumettez pour validation hiérarchique, consolidez les rapports et alimentez votre tableau de bord stratégique.',
                icon: FileCheck2,
              },
            ].map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.num}
                  className="rounded-3xl border border-white/10 bg-slate-950/70 p-8 relative flex flex-col justify-between hover:border-indigo-500/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400 font-black">
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="text-3xl font-black text-slate-700">{step.num}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="text-center max-w-xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Questions courantes</p>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Tout ce que vous devez savoir</h2>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden transition-colors hover:border-white/20"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-white"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-400' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm leading-relaxed text-slate-400 border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────────────── */}
      <section className="px-5 pb-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-indigo-500/30 bg-gradient-to-br from-indigo-900/60 via-slate-900 to-slate-950 p-8 sm:p-14 relative shadow-2xl shadow-indigo-950/50">
          <div className="absolute top-0 right-0 h-96 w-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
              <Rocket className="h-3.5 w-3.5" />
              <span>Passez à la vitesse supérieure</span>
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Donnez à votre organisation les moyens de ses ambitions.
            </h2>
            <p className="mt-4 text-base text-slate-300 leading-relaxed">
              Rejoignez les équipes qui ont fait le choix de la clarté, de la fluidité et de la responsabilité opérationnelle.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center">
              <a
                href="/register"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105"
              >
                <span>Démarrer maintenant</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/login"
                className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
              >
                Déjà membre ? Se connecter →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-slate-950 py-12 px-5 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-white">Activity Control</p>
              <p className="text-xs text-slate-500">Plateforme de pilotage et de suivi d’activité</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-xs font-semibold text-slate-400">
            <button type="button" onClick={openShareModal} className="hover:text-white transition-colors flex items-center gap-1.5 text-indigo-300">
              <Share2 className="h-3.5 w-3.5" />
              <span>Partager</span>
            </button>
            <a href="/privacy" className="hover:text-white transition-colors">Politique de confidentialité</a>
            <a href="/terms" className="hover:text-white transition-colors">Conditions d’utilisation</a>
            <a href="/login" className="hover:text-white transition-colors">Espace Connexion</a>
            <a href="/register" className="hover:text-white transition-colors">Inscription</a>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Tous les services sont opérationnels</span>
          </div>
        </div>
      </footer>
      <SharePlatformModal />
    </main>
  )
}
