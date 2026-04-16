import type { Dispatch, SetStateAction } from 'react'

interface ReviewModalProps {
  allocations: Record<string, number> // { "1": 60, "2": 30 }
  choiceNames: string[] // indexed 0-based, choice key "1" = index 0
  total: number
  isRevote: boolean
  isOpen: boolean
  isSubmitting: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
  setModalOpen: Dispatch<SetStateAction<boolean>>
}

export function ReviewModal({
  allocations,
  choiceNames,
  total,
  isRevote,
  isOpen,
  isSubmitting,
  error,
  onConfirm,
  onCancel,
}: ReviewModalProps) {
  if (!isOpen)
    return null

  const entries = Object.entries(allocations)
    .sort(([, a], [, b]) => b - a)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-[var(--cloud-tint)]">Confirm your vote</h2>

        {isRevote && (
          <p className="mt-2 text-sm text-[var(--hot-fuchsia)]">
            You have already voted. Submitting will replace your current vote.
          </p>
        )}

        <div className="mt-4 space-y-1">
          {entries.map(([key, weight]) => (
            <div key={key} className="flex items-center justify-between rounded-md bg-[var(--carbon-ink)] px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-[var(--cloud-tint)]">
                {choiceNames[Number(key) - 1] ?? `Choice ${key}`}
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
          <span className={`font-semibold ${(total >= 99.9 && total <= 100.1) ? 'text-[var(--lime-cream)]' : 'text-[var(--hot-fuchsia)]'}`}>
            {total.toFixed(1)}
            %
            {(total >= 99.9 && total <= 100.1) ? ' -- Valid' : ' -- Invalid'}
          </span>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-[var(--hot-fuchsia)]/40 bg-[color:rgba(255,22,84,0.1)] p-3 text-sm text-[var(--hot-fuchsia)]">
            {error}
          </div>
        )}

        {isSubmitting && (
          <div className="mt-4 flex items-center gap-3">
            <div className="size-5 animate-spin rounded-full border-2 border-[var(--pearl-aqua)] border-t-transparent" />
            <p className="text-sm text-[var(--cloud-tint)]">
              {error ? 'Retrying...' : 'Waiting for wallet signature...'}
            </p>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 rounded-md bg-[var(--hyper-magenta)] px-4 py-2.5 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110 disabled:opacity-40"
          >
            Sign in wallet
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

        <p className="mt-3 text-center text-xs text-[var(--fog-tint)]">
          This is an off-chain EIP-712 signature. No gas is required.
        </p>
      </div>
    </div>
  )
}
