import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '../../lib/cn'

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('ui-panel', className)} {...props} />
}

export function PanelInset({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-panel-inset', className)} {...props} />
}

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('ui-eyebrow', className)} {...props} />
}

export function StatusBadge({ tone = 'neutral', className, children, ...props }: PropsWithChildren<HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'info' | 'warning' | 'positive' | 'danger' }>) {
  const toneClass = {
    neutral: 'border-[var(--color-border)] bg-[var(--color-surface-inset)] text-[var(--color-text-muted)]',
    info: 'border-[color:rgba(120,218,228,0.42)] bg-[color:rgba(120,218,228,0.1)] text-[var(--color-info)]',
    warning: 'border-[color:rgba(240,199,102,0.42)] bg-[color:rgba(240,199,102,0.1)] text-[var(--color-warning)]',
    positive: 'border-[color:rgba(255,253,152,0.42)] bg-[color:rgba(255,253,152,0.1)] text-[var(--color-positive)]',
    danger: 'border-[color:rgba(255,77,115,0.48)] bg-[color:rgba(255,77,115,0.1)] text-[var(--color-danger)]',
  }[tone]

  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none tracking-[0.08em]', toneClass, className)} {...props}>{children}</span>
}

export function ActionButton({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  const variantClass = variant === 'primary'
    ? 'border-transparent bg-[var(--color-action)] text-[var(--color-text)] hover:bg-[var(--color-action-hover)]'
    : 'border-[var(--color-border)] bg-[var(--color-surface-inset)] text-[var(--color-text)] hover:border-[color:rgba(120,218,228,0.42)] hover:bg-[var(--color-surface-raised)]'

  return <button className={cn('ui-interactive inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold', variantClass, className)} {...props} />
}

export function Metric({ label, value, detail, className }: { label: string, value: string, detail?: string, className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-faint)]">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tracking-tight text-[var(--color-text)]">{value}</p>
      {detail ? <p className="mt-1 truncate text-xs text-[var(--color-text-subtle)]">{detail}</p> : null}
    </div>
  )
}
