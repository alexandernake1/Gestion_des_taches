import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  Layers3,
  ListChecks,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react'
import { redirectAuthenticatedUser } from '@/router/auth'

export const Route = createFileRoute('/')({
  beforeLoad: redirectAuthenticatedUser,
  component: LandingPage,
})

const capabilities = [
  {
    icon: ListChecks,
    title: 'Des tâches qui restent claires',
    description: 'Centralisez les priorités, échéances, responsables et étapes de chaque action.',
  },
  {
    icon: UsersRound,
    title: 'Une équipe mieux synchronisée',
    description: 'Attribuez les responsabilités, échangez dans le contexte et gardez chacun informé.',
  },
  {
    icon: ShieldCheck,
    title: 'Des validations maîtrisées',
    description: 'Faites valider les livrables avant clôture et conservez un historique fiable.',
  },
]

const steps = [
  ['01', 'Organisez', 'Créez vos projets, répartissez les tâches et posez un cadre clair dès le départ.'],
  ['02', 'Collaborez', 'Commentez, répondez, suivez l’avancement et recevez les mises à jour utiles.'],
  ['03', 'Pilotez', 'Validez les résultats, anticipez les retards et gardez une vision d’ensemble.'],
]

const workspaces = [
  {
    icon: CalendarDays,
    title: 'Ce qui compte aujourd’hui',
    description: 'Les priorités, échéances et décisions à prendre sont réunies dans une vue simple à parcourir.',
    detail: 'À traiter en premier',
  },
  {
    icon: MessageCircle,
    title: 'Des échanges dans leur contexte',
    description: 'Les commentaires et réponses restent liés à la tâche concernée : l’équipe retrouve immédiatement le fil.',
    detail: 'Une discussion, une action',
  },
  {
    icon: FileCheck2,
    title: 'Des validations qui ne se perdent pas',
    description: 'Les livrables attendus, les décisions et leur historique restent accessibles au bon endroit.',
    detail: 'Un suivi fiable',
  },
]

function Brand() {
  return (
    <a href="/" className="inline-flex items-center gap-3" aria-label="Activity Control — Accueil">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
        <Building2 className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-[15px] font-extrabold tracking-tight text-slate-950">Activity Control</span>
        <span className="block text-[11px] font-medium text-slate-500">Pilotage d’activité</span>
      </span>
    </a>
  )
}

function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <section className="relative isolate overflow-hidden bg-[#090b1b] pb-16 text-white sm:pb-24">
        <div className="absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.055)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="absolute -left-32 -top-20 -z-10 h-[28rem] w-[28rem] rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute right-0 top-48 -z-10 h-[26rem] w-[26rem] rounded-full bg-violet-500/20 blur-3xl" />

        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <a href="/" className="inline-flex items-center gap-3" aria-label="Activity Control — Accueil">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
              <Building2 className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[15px] font-extrabold tracking-tight text-white">Activity Control</span>
              <span className="block text-[11px] font-medium text-slate-400">Pilotage d’activité</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex" aria-label="Navigation principale">
            <a href="#fonctionnalites" className="hover:text-white">Fonctionnalités</a>
            <a href="#fonctionnement" className="hover:text-white">Fonctionnement</a>
            <a href="#commencer" className="hover:text-white">Commencer</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/login" className="rounded-xl px-3 py-2 text-sm font-bold text-white hover:bg-white/10 sm:px-4">
              Se connecter
            </a>
            <a href="/register" className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5 sm:px-4">
              <span className="hidden sm:inline">Créer un compte</span><span className="sm:hidden">S’inscrire</span>
            </a>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_.98fr] lg:gap-10 lg:px-10 lg:pt-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-bold text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              Le pilotage de vos équipes, enfin réuni
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.06] tracking-[-.045em] text-white sm:text-5xl lg:text-6xl">
              Donnez à chaque équipe une direction <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">claire.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Activity Control transforme les projets, tâches, validations et échanges en un espace de travail simple à suivre et agréable à utiliser.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:brightness-110">
                Créer mon compte gratuitement <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#fonctionnalites" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/10">
                Découvrir la plateforme <ChevronRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-300">
              {['Espace personnel ou entreprise', 'Rôles et permissions', 'Historique des actions'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />{item}</span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[620px] lg:ml-auto">
            <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/35 to-violet-500/10 blur-2xl" />
            <div className="absolute -right-3 -top-4 z-10 hidden items-center gap-2 rounded-full border border-white/15 bg-slate-900/90 px-3 py-2 text-[11px] font-bold text-white shadow-xl shadow-black/30 backdrop-blur sm:flex">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>
              Équipe synchronisée
            </div>
            <div className="rounded-[1.5rem] border border-white/15 bg-slate-950/70 p-2 shadow-2xl shadow-black/40 backdrop-blur sm:rounded-[1.75rem] sm:p-3">
              <div className="overflow-hidden rounded-[1.15rem] border border-white/10 bg-slate-900">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span className="ml-1 hidden text-[10px] font-semibold text-slate-500 sm:inline">Activity Control</span></div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-semibold text-slate-400">Vue d’ensemble</span>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-[1.15fr_.85fr] sm:p-5">
                  <div className="rounded-xl border border-white/10 bg-white/[.035] p-4">
                    <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-400">Projet en cours</p><p className="mt-1 text-sm font-bold text-white">Lancement opérationnel</p></div><span className="rounded-lg bg-indigo-400/15 px-2 py-1 text-[10px] font-bold text-indigo-200">En cours</span></div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68%] rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" /></div>
                    <div className="mt-3 flex justify-between text-[11px] text-slate-400"><span>Progression</span><span className="font-bold text-white">68%</span></div>
                    <div className="mt-5 space-y-2.5">
                      {[
                        ['Préparer la réunion équipe', 'Aujourd’hui', 'bg-emerald-400'],
                        ['Valider le planning', 'Demain', 'bg-amber-300'],
                        ['Partager le compte rendu', 'Cette semaine', 'bg-indigo-400'],
                      ].map(([title, due, color]) => (
                        <div key={title} className="flex items-center gap-3 rounded-lg bg-white/[.045] px-3 py-2.5"><span className={`h-2 w-2 rounded-full ${color}`} /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-slate-200">{title}</p><p className="mt-0.5 text-[10px] text-slate-500">{due}</p></div><Check className="h-3.5 w-3.5 text-slate-500" /></div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-white/10 bg-white/[.035] p-4"><div className="flex items-center gap-2 text-xs font-bold text-white"><BellRing className="h-4 w-4 text-indigo-300" />À suivre</div><div className="mt-4 space-y-3"><p className="text-[11px] leading-5 text-slate-400">Une validation attend votre décision.</p><button type="button" className="w-full rounded-lg bg-indigo-400/15 px-3 py-2 text-[11px] font-bold text-indigo-200 transition-colors hover:bg-indigo-400/25">Voir les validations</button></div></div>
                    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-violet-400/15 to-indigo-400/5 p-4"><div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-300/20 text-[10px] font-bold text-violet-100">AM</span><p className="text-[11px] font-semibold text-violet-200">Aïcha a répondu</p></div><p className="mt-2 text-[11px] leading-5 text-slate-400">Le compte rendu est prêt pour validation.</p></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-white/15 bg-white/95 p-3 shadow-xl shadow-black/20 backdrop-blur sm:flex sm:items-center sm:gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><UserRoundCheck className="h-4 w-4" /></span><span><span className="block text-[11px] font-extrabold text-slate-900">Responsabilités claires</span><span className="block text-[10px] font-medium text-slate-500">Chacun sait quoi faire</span></span></div>
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="scroll-mt-8 px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.16em] text-indigo-600">Tout au même endroit</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.035em] text-slate-950 sm:text-4xl">Un cadre simple pour avancer avec confiance.</h2><p className="mt-4 text-base leading-7 text-slate-600">Chaque fonctionnalité sert un objectif concret : mieux organiser le travail, faciliter les échanges et prendre les bonnes décisions.</p></div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {capabilities.map((capability, index) => {
              const Icon = capability.icon
              return <article key={capability.title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/5"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${index === 1 ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600'}`}><Icon className="h-5 w-5" /></span><h3 className="mt-5 text-lg font-extrabold tracking-tight text-slate-950">{capability.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{capability.description}</p></article>
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-100/70 px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.82fr_1.18fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.16em] text-indigo-600">Une information utile</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-.035em] text-slate-950 sm:text-4xl">Moins de relances.<br />Plus de clarté.</h2>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-600">Activity Control rassemble les signaux importants pour que les responsables puissent agir au bon moment, sans chercher l’information dans plusieurs outils.</p>
            <a href="/register" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-indigo-600 transition-colors hover:text-indigo-800">Découvrir mon espace <ArrowRight className="h-4 w-4" /></a>
          </div>
          <div className="grid gap-3">
            {workspaces.map((workspace, index) => {
              const Icon = workspace.icon
              return <article key={workspace.title} className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-950/5 sm:items-center sm:p-6">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${index === 1 ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600'}`}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-base font-extrabold tracking-tight text-slate-950">{workspace.title}</h3><span className="text-[11px] font-bold text-indigo-600">{workspace.detail}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{workspace.description}</p></div>
              </article>
            })}
          </div>
        </div>
      </section>

      <section id="fonctionnement" className="scroll-mt-8 border-y border-slate-200 bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div><div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"><Layers3 className="h-6 w-6" /></div><p className="mt-6 text-sm font-bold uppercase tracking-[.16em] text-indigo-600">Un flux naturel</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.035em] text-slate-950 sm:text-4xl">Du premier brief à la validation finale.</h2><p className="mt-4 max-w-md text-base leading-7 text-slate-600">Pas besoin de multiplier les outils : l’équipe suit une même méthode, à son rythme.</p></div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map(([number, title, description]) => <li key={number} className="relative rounded-2xl bg-slate-50 p-5"><span className="text-xs font-extrabold text-indigo-600">{number}</span><h3 className="mt-8 text-lg font-extrabold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 py-10 text-white shadow-2xl shadow-indigo-500/20 sm:px-10 sm:py-14 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-14">
          <div><p className="inline-flex items-center gap-2 text-sm font-bold text-indigo-100"><Clock3 className="h-4 w-4" />Vos priorités restent visibles</p><h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Un espace de travail prêt à évoluer avec votre organisation.</h2><p className="mt-4 max-w-xl text-base leading-7 text-indigo-100">Démarrez simplement, puis structurez vos équipes, projets et habitudes de pilotage au fil de votre croissance.</p></div>
          <div id="commencer" className="mt-8 flex flex-col gap-3 lg:mt-0 lg:items-end"><a href="/register" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-extrabold text-indigo-700 shadow-lg transition-transform hover:-translate-y-0.5 sm:w-auto">Créer un compte gratuitement <ArrowRight className="h-4 w-4" /></a><a href="/login" className="inline-flex h-10 items-center justify-center gap-2 text-sm font-bold text-white/90 hover:text-white">J’ai déjà un compte <ChevronRight className="h-4 w-4" /></a></div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><Brand /><div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500"><a href="/privacy" className="hover:text-indigo-600">Politique de confidentialité</a><a href="/terms" className="hover:text-indigo-600">Conditions d’utilisation</a><a href="/login" className="hover:text-indigo-600">Se connecter</a></div></div>
      </footer>
    </main>
  )
}
