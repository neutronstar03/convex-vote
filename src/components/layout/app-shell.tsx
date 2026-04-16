import type { PropsWithChildren } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { initClickTracking, trackPageview } from '../../lib/analytics'
import { Footer } from './footer'

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation()

  useEffect(() => {
    trackPageview(location.pathname + location.search)
  }, [location.pathname, location.search])

  useEffect(() => {
    initClickTracking()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-[var(--ash-graphite)] text-[var(--cloud-tint)]" data-testid="app-shell">
      <header className="border-b border-[var(--steel-haze)] bg-[var(--slate-machine)]/95 backdrop-blur" data-testid="navbar">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div data-testid="navbar-brand">
            <Link to="/" className="text-lg font-semibold tracking-tight text-[var(--cloud-tint)]" data-testid="navbar-home-link">
              Convex Vote
            </Link>
            <p className="text-sm text-[var(--dust-tint)]">
              Snapshot voting dashboard for cvx.eth gauge rounds.
            </p>
          </div>

          <nav className="flex items-center gap-5">
            <Link to="/" className="text-sm text-[var(--dust-tint)] transition hover:text-[var(--cloud-tint)]">
              Dashboard
            </Link>
            <Link to="/claims" className="text-sm text-[var(--dust-tint)] transition hover:text-[var(--cloud-tint)]">
              Claims
            </Link>
          </nav>

          <div data-testid="rainbowkit-connect-button">
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-5 py-5" data-testid="app-main">
        {children}
      </main>

      <Footer />
    </div>
  )
}
