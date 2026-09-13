import type { ReactNode } from 'react'
import type { GaugeRound } from '../types'
import { AlertTriangle, Check, Copy, Info, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { cn } from '../../../lib/cn'
import { formatCompactUsd } from '../../../lib/format'
import { formatRelativeTime, formatTimeRemaining } from './format'

export const FRESHNESS_TICK_MS = 5000
export const COUNTDOWN_TICK_MS = 30000
export const URGENT_SECONDS = 6 * 60 * 60

export type StatusTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral'

/**
 * Warning and success used to share the positive lime accent, so a data
 * problem read exactly like a confirmation. Warning now uses the dedicated
 * --color-warning token and keeps the lime reserved for success.
 */
export const STATUS_NOTE_TONE_CLASS: Record<StatusTone, string> = {
  info: 'border-[var(--color-info)]/40 bg-[var(--color-info)]/8',
  warning: 'border-[var(--color-warning)]/45 bg-[var(--color-warning)]/10',
  danger: 'border-[var(--color-danger)]/45 bg-[var(--color-danger)]/10',
  success: 'border-[var(--color-positive)]/38 bg-[var(--color-positive)]/7',
  neutral: 'border-[var(--color-border)] bg-[var(--color-surface-inset)]',
}

export const STATUS_NOTE_ICON_CLASS: Record<StatusTone, string> = {
  info: 'text-[var(--color-info)]',
  warning: 'text-[var(--color-warning)]',
  danger: 'text-[var(--color-danger)]',
  success: 'text-[var(--color-positive)]',
  neutral: 'text-[var(--color-text-faint)]',
}

export function StatusNote({
  tone,
  title,
  children,
  action,
}: {
  tone: StatusTone
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  const toneClass = STATUS_NOTE_TONE_CLASS[tone]
  const iconClass = STATUS_NOTE_ICON_CLASS[tone]
  const Icon = tone === 'danger' || tone === 'warning' ? AlertTriangle : tone === 'success' ? Check : Info

  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      data-tone={tone}
      className={cn('flex items-start gap-2.5 rounded-lg border p-3 text-sm text-[var(--color-text-muted)]', toneClass)}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[var(--color-text)]">{title}</p>
        {children !== undefined && children !== null
          ? <div className="mt-0.5 text-[13px] leading-relaxed">{children}</div>
          : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function Tag({ tone, children }: { tone: 'neutral' | 'info' | 'positive' | 'magenta' | 'danger', children: ReactNode }) {
  const toneClass = {
    neutral: 'border-[var(--color-border)] bg-[var(--color-surface-inset)] text-[var(--color-text-muted)]',
    info: 'border-[var(--color-info)]/42 bg-[var(--color-info)]/10 text-[var(--color-info)]',
    positive: 'border-[var(--color-positive)]/42 bg-[var(--color-positive)]/10 text-[var(--color-positive)]',
    magenta: 'border-[var(--hyper-magenta)]/55 bg-[var(--hyper-magenta)]/16 text-[var(--color-text)]',
    danger: 'border-[var(--color-danger)]/48 bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
  }[tone]

  return (
    <span className={cn('inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]', toneClass)}>
      {children}
    </span>
  )
}

export function TokenChip({ symbol, amountUsd, compact = false }: { symbol: string, amountUsd?: number, compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded border border-[var(--color-info)]/35 bg-[var(--color-info)]/8 font-medium text-[var(--color-info)]',
        compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
      )}
    >
      {symbol}
      {amountUsd !== undefined ? ` · ${formatCompactUsd(amountUsd)}` : ''}
    </span>
  )
}

export function MiniStat({ label, value, tone, detail }: { label: string, value: string, tone: 'aqua' | 'lime', detail?: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">{label}</p>
      <p className={cn('mt-0.5 text-sm font-semibold', tone === 'aqua' ? 'text-[var(--color-info)]' : 'text-[var(--color-positive)]')}>{value}</p>
      {detail ? <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-faint)]">{detail}</p> : null}
    </div>
  )
}

export function CopyButton({
  value,
  label,
  copiedLabel,
  onCopy,
}: {
  value: string
  label: string
  copiedLabel: string | null
  onCopy: (value: string, label: string) => void
}) {
  const state = copiedLabel === label ? 'copied' : copiedLabel === `Failed: ${label}` ? 'failed' : 'idle'
  const title = state === 'copied'
    ? `Copied ${label}`
    : state === 'failed'
      ? `Could not copy ${label}`
      : `Copy ${label}`
  const Icon = state === 'copied' ? Check : state === 'failed' ? X : Copy

  return (
    <button
      type="button"
      onClick={() => onCopy(value, label)}
      title={title}
      aria-label={title}
      className={cn(
        'ui-interactive inline-flex size-7 items-center justify-center rounded-md',
        state === 'copied'
          ? 'text-[var(--color-info)]'
          : state === 'failed'
            ? 'text-[var(--color-danger)]'
            : 'text-[var(--color-text-faint)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  )
}

export function DataFreshness({ label, updatedAt, isFetching, isError = false }: { label: string, updatedAt?: number, isFetching: boolean, isError?: boolean }) {
  const nowMs = useNowTick(FRESHNESS_TICK_MS)
  const status = isError
    ? 'unavailable'
    : isFetching && !updatedAt
      ? 'loading…'
      : isFetching
        ? 'refreshing…'
        : updatedAt
          ? `updated ${formatRelativeTime(updatedAt, nowMs)}`
          : 'waiting for data'

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', isError ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-faint)]')}>
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          isError ? 'bg-[var(--color-danger)]' : isFetching ? 'animate-pulse bg-[var(--color-info)]' : 'bg-[var(--color-border)]',
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
      <span className={isError ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}>{status}</span>
    </span>
  )
}

export function RoundCountdown({ end, state }: { end: number, state: GaugeRound['state'] }) {
  const nowMs = useNowTick(COUNTDOWN_TICK_MS)

  if (state !== 'active')
    return null

  const remaining = formatTimeRemaining(end, nowMs)

  if (!remaining)
    return null

  const secondsRemaining = end - Math.floor(nowMs / 1000)
  const isUrgent = secondsRemaining <= URGENT_SECONDS

  return (
    <Tag tone={isUrgent ? 'danger' : 'info'}>
      {isUrgent ? 'Closing in ' : 'Voting closes in '}
      {remaining}
    </Tag>
  )
}

export function WarningBadge({ message, align = 'left' }: { message: string, align?: 'center' | 'left' | 'right' }) {
  const [isOpen, setIsOpen] = useState(false)
  const tooltipId = useId()
  const positionClass = align === 'center'
    ? 'left-1/2 -translate-x-1/2'
    : align === 'right'
      ? 'right-0'
      : 'left-0'

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="inline-flex size-7 items-center justify-center rounded-full border border-[var(--color-warning)]/45 bg-[var(--color-warning)]/10 text-[var(--color-warning)] transition hover:bg-[var(--color-warning)]/16"
        aria-label="Show incentive data warning"
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(current => !current)}
      >
        <AlertTriangle className="size-3.5" aria-hidden="true" />
      </button>
      {isOpen
        ? (
            <span
              id={tooltipId}
              role="tooltip"
              className={cn('absolute top-full z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-[var(--color-warning)]/35 bg-[var(--color-surface-inset)] px-3 py-2 text-left text-xs leading-relaxed text-[var(--color-text-muted)] shadow-xl', positionClass)}
            >
              {message}
            </span>
          )
        : null}
    </span>
  )
}

export function useNowTick(intervalMs: number) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), intervalMs)

    return () => window.clearInterval(id)
  }, [intervalMs])

  return nowMs
}
