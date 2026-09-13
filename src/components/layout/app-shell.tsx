import type { PropsWithChildren } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { initClickTracking, trackPageview } from '../../lib/analytics'
import { cn } from '../../lib/cn'
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
    <div className="flex min-h-screen flex-col bg-[var(--color-page)] text-[var(--color-text)]" data-testid="app-shell">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border-subtle)] bg-[color:rgba(36,40,43,0.94)] backdrop-blur" data-testid="navbar">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-2 px-4 py-3 sm:flex sm:justify-between sm:gap-4 sm:px-5">
          <div className="min-w-0" data-testid="navbar-brand">
            <Link to="/" className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-[var(--color-text)] sm:text-lg" data-testid="navbar-home-link">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-info)] shadow-[0_0_12px_rgba(120,218,228,0.75)]" aria-hidden="true" />
              Convex Vote
            </Link>
            <p className="hidden truncate text-xs text-[var(--color-text-subtle)] md:block">
              Convex gauge voting and Votium incentive analytics.
            </p>
          </div>

          <nav className="flex w-full items-center justify-center gap-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-inset)] p-1 sm:w-auto" aria-label="Primary navigation">
            <NavLink to="/" active={location.pathname === '/'}>
              Dashboard
            </NavLink>
            <NavLink to="/claims" active={location.pathname.startsWith('/claims')}>
              Claims
            </NavLink>
          </nav>

          <div className="justify-self-end sm:justify-self-auto" data-testid="rainbowkit-connect-button">
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-5 sm:px-5 sm:py-6" data-testid="app-main">
        {children}
      </main>

      <Footer />
    </div>
  )
}

function NavLink({ to, active, children }: { to: string, active: boolean, children: string }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)] shadow-sm'
          : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]',
      )}
    >
      {children}
    </Link>
  )
}
