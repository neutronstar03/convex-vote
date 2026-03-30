import { Link } from 'react-router'
import type { PropsWithChildren } from 'react'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Link to="/" className="text-lg font-semibold tracking-tight text-white">
              Convex Vote
            </Link>
            <p className="text-sm text-slate-400">
              Snapshot voting dashboard for cvx.eth gauge rounds.
            </p>
          </div>

          <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Wallet connection disabled for now
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        {children}
      </main>
    </div>
  )
}
