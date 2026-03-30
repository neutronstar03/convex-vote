import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Link } from 'react-router'
import type { PropsWithChildren } from 'react'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" data-testid="app-shell">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur" data-testid="navbar">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div data-testid="navbar-brand">
            <Link to="/" className="text-lg font-semibold tracking-tight text-white" data-testid="navbar-home-link">
              Convex Vote
            </Link>
            <p className="text-sm text-slate-400">
              Snapshot voting dashboard for cvx.eth gauge rounds.
            </p>
          </div>

          <div data-testid="rainbowkit-connect-button">
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-5" data-testid="app-main">
        {children}
      </main>
    </div>
  )
}
