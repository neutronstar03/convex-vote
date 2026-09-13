import { Link } from 'react-router'
import { AppShell } from '../components/layout/app-shell'

export function NotFoundRoute() {
  return (
    <AppShell>
      <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-8 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--pearl-aqua)]">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--cloud-tint)]">Page not found</h1>
        <p className="mt-3 text-sm text-[var(--dust-tint)]">This route does not exist in Convex Vote.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110"
        >
          Return to dashboard
        </Link>
      </section>
    </AppShell>
  )
}
