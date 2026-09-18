import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Gauge,
  ListChecks,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { TaskinaWordmark } from '@/components/brand/TaskinaBrand'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

const pillars = [
  {
    number: '01',
    icon: ListChecks,
    title: 'Le travail devient lisible',
    description: 'Une seule vue pour savoir quoi faire, qui s’en charge et ce qui mérite votre attention aujourd’hui.',
    note: 'Tâches · priorités · échéances',
  },
  {
    number: '02',
    icon: ShieldCheck,
    title: 'Les décisions sont tracées',
    description: 'Les demandes, validations et refus suivent un circuit clair, avec un historique consultable.',
    note: 'Validation · motifs · historique',
  },
  {
    number: '03',
    icon: Gauge,
    title: 'Le pilotage devient concret',
    description: 'Des indicateurs utiles révèlent les retards, les charges et les points de blocage sans ajouter de bruit.',
    note: 'Délais · charge · progression',
  },
]

const workflow = [
  ['Cadrer', 'Créez la tâche, la priorité et le résultat attendu.'],
  ['Attribuer', 'Confiez le travail à la bonne personne ou à la bonne équipe.'],
  ['Suivre', 'Visualisez l’avancement et les blocages au fil de l’eau.'],
  ['Valider', 'Décidez, commentez et gardez une trace exploitable.'],
]

function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground selection:bg-accent/20">
      <header className="sticky top-0 z-40 border-b border-border bg-[hsl(var(--background)/0.96)]">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="/" aria-label="Accueil Taskina">
            <TaskinaWordmark compact />
          </a>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Navigation principale">
            <a href="#produit" className="text-sm font-bold text-muted-foreground hover:text-foreground">Produit</a>
            <a href="#methode" className="text-sm font-bold text-muted-foreground hover:text-foreground">Méthode</a>
            <a href="#equipes" className="text-sm font-bold text-muted-foreground hover:text-foreground">Pour qui ?</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/login" className="hidden px-3 py-2 text-sm font-extrabold text-foreground hover:text-primary sm:inline-flex">
              Se connecter
            </a>
            <a href="/register" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-cta hover:bg-[hsl(var(--primary-dark))]">
              Essayer Taskina <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <section className="relative border-b border-border">
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--foreground)/0.025)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.025)_1px,transparent_1px)] bg-[size:32px_32px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)] lg:items-center lg:px-12 lg:py-28">
          <div>
            <div className="mb-8 flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">
              <span className="h-2.5 w-2.5 bg-accent" />
              Pilotage d’activité, sans brouillard
            </div>
            <h1 className="max-w-3xl text-[clamp(3.5rem,6.7vw,7rem)] font-extrabold leading-[0.88] tracking-[-0.065em]">
              Le travail
              <br />
              ne devrait
              <br />
              jamais être <span className="text-primary">flou.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Taskina donne à chaque équipe un cadre simple pour organiser le travail, tenir les délais et prendre les bonnes décisions.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="/register" className="group inline-flex h-12 items-center justify-between gap-8 rounded-lg bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-cta hover:bg-[hsl(var(--primary-dark))]">
                Créer mon espace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a href="#produit" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-extrabold hover:border-primary/40 hover:text-primary">
                Découvrir le produit
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-muted-foreground">
              {['Espace personnel gratuit', 'Installation immédiate', 'Données cloisonnées'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-accent" />{item}</span>
              ))}
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-white/15 px-5 sm:px-8 md:grid-cols-4 lg:px-12">
          {[
            ['1 espace', 'pour toute l’activité'],
            ['4 étapes', 'du cadrage à la validation'],
            ['Temps réel', 'pour suivre sans relancer'],
            ['Traçable', 'pour décider avec confiance'],
          ].map(([value, label]) => (
            <div key={label} className="px-4 py-7 first:pl-0 md:px-8">
              <p className="text-xl font-extrabold tracking-tight sm:text-2xl">{value}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/60">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="produit" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <SectionHeading
          eyebrow="Ce que Taskina met au clair"
          title="Moins d’interface. Plus de maîtrise."
          text="Chaque écran sert une décision ou une action. L’information reste dense, lisible et directement exploitable."
        />
        <div className="mt-14 grid border-y border-border lg:grid-cols-3 lg:divide-x lg:divide-border">
          {pillars.map(({ number, icon: Icon, title, description, note }) => (
            <article key={number} className="group border-b border-border py-8 last:border-b-0 lg:border-b-0 lg:px-8 lg:first:pl-0 lg:last:pr-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold tracking-[0.18em] text-accent">{number}</span>
                <Icon className="h-6 w-6 text-primary transition-transform group-hover:-translate-y-1" />
              </div>
              <h3 className="mt-10 max-w-xs text-2xl font-extrabold leading-tight tracking-[-0.035em]">{title}</h3>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
              <p className="mt-8 border-l-2 border-accent pl-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">{note}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="methode" className="bg-[hsl(var(--primary-light))] py-20 sm:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <SectionHeading
            eyebrow="Un rythme simple"
            title="Quatre gestes. Une équipe alignée."
            text="Taskina accompagne le travail du besoin initial jusqu’à la décision finale, sans multiplier les outils."
          />
          <ol className="mt-14 grid gap-px overflow-hidden border border-primary/15 bg-primary/15 md:grid-cols-2 xl:grid-cols-4">
            {workflow.map(([title, text], index) => (
              <li key={title} className="relative min-h-[230px] bg-[hsl(var(--primary-light))] p-7">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent">Étape {index + 1}</span>
                <h3 className="mt-12 text-2xl font-extrabold tracking-[-0.035em]">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
                {index < workflow.length - 1 && <ArrowRight className="absolute bottom-7 right-7 h-5 w-5 text-primary/40" />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="equipes" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionHeading
            eyebrow="Pensé pour le terrain"
            title="La même vérité, adaptée à chaque rôle."
            text="Les collaborateurs se concentrent sur l’action. Les responsables voient l’ensemble et interviennent au bon moment."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <AudienceCard icon={UsersRound} title="Pour les équipes" items={['Priorités du jour', 'Responsabilités explicites', 'Notifications utiles']} />
            <AudienceCard icon={FolderKanban} title="Pour les managers" items={['Charge et avancement', 'Validations centralisées', 'Retards visibles']} featured />
            <AudienceCard icon={BellRing} title="Pour les opérations" items={['Échéances maîtrisées', 'Historique consultable', 'Actions relancées']} />
            <AudienceCard icon={ShieldCheck} title="Pour les dirigeants" items={['Indicateurs consolidés', 'Décisions traçables', 'Accès sécurisés']} />
          </div>
        </div>
      </section>

      <section className="mx-5 mb-5 overflow-hidden bg-[hsl(var(--sidebar-bg))] text-white sm:mx-8 sm:mb-8 lg:mx-12 lg:mb-12">
        <div className="mx-auto flex max-w-[1344px] flex-col justify-between gap-10 px-7 py-14 sm:px-12 lg:flex-row lg:items-end lg:py-16">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--accent))]">Prêt à clarifier le travail ?</p>
            <h2 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[0.98] tracking-[-0.05em] sm:text-6xl">Votre équipe sait enfin où elle va.</h2>
          </div>
          <a href="/register" className="group inline-flex h-12 shrink-0 items-center justify-between gap-10 rounded-lg bg-accent px-5 text-sm font-extrabold text-white hover:brightness-105">
            Commencer gratuitement <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <TaskinaWordmark compact />
          <div className="flex flex-wrap gap-5 text-xs font-bold text-muted-foreground">
            <a href="/privacy" className="hover:text-primary">Confidentialité</a>
            <a href="/terms" className="hover:text-primary">Conditions d’utilisation</a>
            <a href="/login" className="hover:text-primary">Connexion</a>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Taskina</p>
        </div>
      </footer>
    </main>
  )
}

function ProductPreview() {
  const tasks = [
    ['Finaliser la proposition commerciale', 'Aujourd’hui', 'Prioritaire', 72],
    ['Valider le budget de campagne', 'Demain', 'En validation', 48],
    ['Préparer le point hebdomadaire', 'Vendredi', 'En cours', 31],
  ] as const

  return (
    <div className="relative lg:pl-8">
      <div className="absolute -left-2 top-12 hidden h-[72%] w-3 bg-accent lg:block" aria-hidden="true" />
      <div className="border border-border bg-card shadow-[0_24px_60px_rgba(24,45,38,0.13)]">
        <div className="flex h-12 items-center justify-between border-b border-border px-4 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 bg-accent" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em]">Aujourd’hui</span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">Jeudi · 18 septembre</span>
        </div>
        <div className="grid border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-border">
          {[
            ['12', 'tâches actives'],
            ['04', 'à valider'],
            ['86%', 'dans les délais'],
          ].map(([value, label]) => (
            <div key={label} className="border-b border-border px-5 py-5 last:border-b-0 sm:border-b-0">
              <p className="text-3xl font-extrabold tracking-[-0.05em] text-primary">{value}</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Mon plan de travail</h2>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">Vue d’ensemble</span>
          </div>
          <div className="space-y-2">
            {tasks.map(([title, due, status, progress], index) => (
              <div key={title} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-border bg-background/55 p-3.5">
                <span className={`flex h-7 w-7 items-center justify-center ${index === 0 ? 'bg-accent text-white' : 'bg-primary/10 text-primary'}`}>
                  {index === 0 ? <Clock3 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold sm:text-sm">{title}</p>
                  <div className="mt-2 h-1.5 bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-extrabold text-foreground">{due}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border bg-[hsl(var(--primary-light))] px-5 py-3 text-[10px] font-bold text-muted-foreground">
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />Synchronisé à l’instant</span>
          <span>taskina.net</span>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="max-w-3xl">
      <p className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent">
        <span className="h-px w-10 bg-accent" />{eyebrow}
      </p>
      <h2 className="mt-6 text-4xl font-extrabold leading-[0.98] tracking-[-0.05em] sm:text-6xl">{title}</h2>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}

function AudienceCard({ icon: Icon, title, items, featured = false }: { icon: typeof UsersRound; title: string; items: string[]; featured?: boolean }) {
  return (
    <article className={`border p-6 ${featured ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>
      <Icon className={`h-6 w-6 ${featured ? 'text-[hsl(var(--accent))]' : 'text-primary'}`} />
      <h3 className="mt-8 text-xl font-extrabold tracking-[-0.025em]">{title}</h3>
      <ul className={`mt-5 space-y-3 text-sm ${featured ? 'text-white/75' : 'text-muted-foreground'}`}>
        {items.map((item) => <li key={item} className="flex items-center gap-2"><Check className={`h-4 w-4 ${featured ? 'text-[hsl(var(--accent))]' : 'text-accent'}`} />{item}</li>)}
      </ul>
    </article>
  )
}
