import { useEffect, useId, useRef } from 'react'
import { formatNumber } from '../../lib/format'

interface ReviewModalProps {
  allocations: Record<string, number>
  choiceNames: Record<string, string>
  total: number
  votingPower?: number
  isRevote: boolean
  isOpen: boolean
  isSubmitting: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function ReviewModal({
  allocations,
  choiceNames,
  total,
  votingPower,
  isRevote,
  isOpen,
  isSubmitting,
  error,
  onConfirm,
  onCancel,
}: ReviewModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const isSubmittingRef = useRef(isSubmitting)
  const onCancelRef = useRef(onCancel)
  const isTotalValid = total >= 99.9 && total <= 100.1

  useEffect(() => {
    isSubmittingRef.current = isSubmitting
    onCancelRef.current = onCancel
  }, [isSubmitting, onCancel])

  useEffect(() => {
    if (!isOpen)
      return

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusableElements = () => [...(dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])]

    focusableElements()[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmittingRef.current) {
        event.preventDefault()
        onCancelRef.current()
        return
      }

      if (event.key !== 'Tab')
        return

      const elements = focusableElements()
      if (elements.length === 0) {
        event.preventDefault()
        dialog?.focus()
        return
      }

      const first = elements[0]
      const last = elements.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
      else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [isOpen])

  if (!isOpen)
    return null

  const entries = Object.entries(allocations)
    .sort(([, a], [, b]) => b - a)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="mx-4 w-full max-w-md rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-6 shadow-2xl"
      >
        <h2 id={titleId} className="text-xl font-semibold text-[var(--cloud-tint)]">Confirm your vote</h2>

        {isRevote && (
          <p className="mt-2 text-sm text-[var(--hot-fuchsia)]">
            You have already voted. Submitting will replace your current vote.
          </p>
        )}

        <div className="mt-4 max-h-[min(50vh,20rem)] space-y-1 overflow-y-auto pr-1">
          {entries.map(([key, weight]) => (
            <div key={key} className="flex items-center justify-between rounded-md bg-[var(--carbon-ink)] px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-[var(--cloud-tint)]">
                {choiceNames[key] ?? key}
              </span>
              <span className="ml-3 font-semibold text-[var(--pearl-aqua)]">
                {weight.toFixed(1)}
                %
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-[var(--dust-tint)]">Total</span>
          <span className="flex items-center gap-2">
            <span className={`font-semibold ${isTotalValid ? 'text-[var(--lime-cream)]' : 'text-[var(--hot-fuchsia)]'}`}>
              {total.toFixed(1)}
              %
            </span>
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${isTotalValid ? 'border-[var(--lime-cream)]/40 text-[var(--lime-cream)]' : 'border-[var(--hot-fuchsia)]/45 text-[var(--hot-fuchsia)]'}`}>
              {isTotalValid ? 'Valid' : 'Invalid'}
            </span>
          </span>
        </div>

        {isTotalValid && votingPower !== undefined
          ? (
              <p className="mt-1 text-right text-xs text-[var(--fog-tint)]">
                Estimated weight ≈
                {' '}
                {formatNumber(votingPower, 0)}
                {' vlCVX'}
              </p>
            )
          : null}

        {error && (
          <div className="mt-3 rounded-md border border-[var(--hot-fuchsia)]/40 bg-[color:rgba(255,22,84,0.1)] p-3 text-sm text-[var(--hot-fuchsia)]">
            {error}
          </div>
        )}

        {isSubmitting && (
          <div role="status" className="mt-4 flex items-start gap-3 rounded-md border border-[var(--pearl-aqua)]/35 bg-[var(--pearl-aqua)]/8 p-3">
            <div className="mt-0.5 size-4 shrink-0 animate-spin rounded-full border-2 border-[var(--pearl-aqua)] border-t-transparent" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--cloud-tint)]">
                {error ? 'Retrying the transaction' : 'Confirm the transaction in your wallet'}
              </p>
              <p className="mt-0.5 text-xs text-[var(--fog-tint)]">
                Keep this window open until Ethereum confirms the vote. Gas is paid in ETH.
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || !isTotalValid}
            className="flex-1 rounded-md bg-[var(--hyper-magenta)] px-4 py-2.5 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110 disabled:opacity-40"
          >
            Submit transaction
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2.5 text-sm font-medium text-[var(--cloud-tint)] transition hover:bg-[var(--gunmetal-mist)] disabled:opacity-40"
          >
            Cancel
          </button>
        </div>

        <p id={descriptionId} className="mt-3 text-center text-xs text-[var(--fog-tint)]">
          This submits an on-chain Ethereum transaction and requires gas.
        </p>
      </div>
    </div>
  )
}
