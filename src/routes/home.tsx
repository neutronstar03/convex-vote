import { ArrowRight, BarChart3, Clock3, Vote } from 'lucide-react'
import { Link } from 'react-router'
import { AppShell } from '../components/layout/app-shell'

const cards = [
  {
    title: 'Vote timing',
    description: 'Current round status, countdown, and next-round estimate placeholder.',
    icon: Clock3,
  },
  {
    title: 'Pool recap',
    description: 'Merged Snapshot + Llama Airforce pool analytics table coming next.',
    icon: BarChart3,
  },
  {
    title: 'Weighted voting',
    description: 'Browser-based Snapshot vote builder with allocation validation.',
    icon: Vote,
  },
]

export function HomeRoute() {
  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-violet-950/20">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-violet-200">
            Milestone 1
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
            Custom Snapshot UI for Convex gauge votes.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300">
            The project foundation is now in place. Next up is wiring live Snapshot proposal data,
            Llama Airforce incentives, and the weighted vote builder while keeping wallet flow
            disabled until submission work starts.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/proposal/latest"
              className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-400"
            >
              Open proposal route
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="https://snapshot.box/#/cvx.eth"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/5"
            >
              View cvx.eth on Snapshot
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Foundation checklist</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>• Vite + React + TypeScript wired</li>
            <li>• React Router and React Query providers added</li>
            <li>• Wallet connection intentionally disabled for now</li>
            <li>• Dark dashboard shell and route placeholders created</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map(({ title, description, icon: Icon }) => (
          <article key={title} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-200">
              <Icon className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          </article>
        ))}
      </section>
    </AppShell>
  )
}
