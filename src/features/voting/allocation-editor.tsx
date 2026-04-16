import { useCallback, useMemo, useState } from 'react'
import { validateAllocation } from './validateAllocation'

interface AllocationEditorProps {
  choices: string[] // pool names, indexed by choice number (1-based)
  isConnected: boolean
  proposalActive: boolean
  votingPower: number | undefined
  existingAllocations?: Record<string, number> // from current vote, e.g. { "1": 60, "2": 30 }
  onSubmit: (allocations: Record<string, number>) => void
  isSubmitting: boolean
}

export function AllocationEditor({
  choices,
  isConnected,
  proposalActive,
  votingPower,
  existingAllocations,
  onSubmit,
  isSubmitting,
}: AllocationEditorProps) {
  // Initialize allocations from existing vote or empty
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    if (existingAllocations && Object.keys(existingAllocations).length > 0) {
      return { ...existingAllocations }
    }
    return {}
  })

  const [selectedPools, setSelectedPools] = useState<Set<string>>(() => {
    if (existingAllocations && Object.keys(existingAllocations).length > 0) {
      return new Set(Object.keys(existingAllocations))
    }
    return new Set<string>()
  })

  const [searchTerm, setSearchTerm] = useState('')

  const filteredChoices = useMemo(() => {
    if (!searchTerm.trim())
      return choices.map((name, i) => ({ key: String(i + 1), name }))
    const lower = searchTerm.toLowerCase()
    return choices
      .map((name, i) => ({ key: String(i + 1), name }))
      .filter(({ name }) => name.toLowerCase().includes(lower))
  }, [choices, searchTerm])

  const total = useMemo(
    () => Object.values(allocations).reduce((sum, v) => sum + v, 0),
    [allocations],
  )

  const validationError = useMemo(
    () => validateAllocation({ isConnected, proposalActive, votingPower, allocations }),
    [isConnected, proposalActive, votingPower, allocations],
  )

  const isWithinTolerance = total >= 99.9 && total <= 100.1

  const handleTogglePool = useCallback((key: string) => {
    setSelectedPools((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        setAllocations((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
      else {
        next.add(key)
      }
      return next
    })
  }, [])

  const handleAllocationChange = useCallback((key: string, value: string) => {
    const num = Number.parseFloat(value)
    if (Number.isNaN(num)) {
      setAllocations(prev => ({ ...prev, [key]: 0 }))
    }
    else {
      setAllocations(prev => ({ ...prev, [key]: num }))
    }
  }, [])

  const handleEqualWeight = useCallback(() => {
    const keys = [...selectedPools]
    if (keys.length === 0)
      return
    const weight = Number((100 / keys.length).toFixed(2))
    const newAllocations: Record<string, number> = {}
    for (const key of keys) {
      newAllocations[key] = weight
    }
    // Fix rounding: adjust last item so total = 100
    const currentTotal = weight * keys.length
    const lastKey = keys.at(-1)!
    newAllocations[lastKey] = Number((weight + (100 - currentTotal)).toFixed(2))
    setAllocations(newAllocations)
  }, [selectedPools])

  const handleClearAll = useCallback(() => {
    setAllocations({})
    setSelectedPools(new Set())
  }, [])

  const handleSubmit = () => {
    if (validationError || !isWithinTolerance)
      return
    // Normalize allocations to exactly total 100
    const normalizedAllocations: Record<string, number> = {}
    for (const [key, value] of Object.entries(allocations)) {
      normalizedAllocations[key] = value
    }
    onSubmit(normalizedAllocations)
  }

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-6 text-center">
        <p className="text-[var(--dust-tint)]">Connect your wallet to vote on this proposal.</p>
      </div>
    )
  }

  if (!proposalActive) {
    return (
      <div className="rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-6 text-center">
        <p className="text-[var(--dust-tint)]">This proposal is no longer active for voting.</p>
      </div>
    )
  }

  const selectedEntries = Array.from(selectedPools, key => ({ key, name: choices[Number(key) - 1] ?? `Choice ${key}`, value: allocations[key] ?? 0 }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-4">
      {/* Pool selector */}
      <div className="rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--pearl-aqua)]">Select pools</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleEqualWeight}
              disabled={selectedPools.size === 0}
              className="rounded-md border border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/45 px-3 py-1.5 text-xs text-[var(--dust-tint)] transition hover:bg-[var(--gunmetal-mist)] disabled:opacity-40"
            >
              Equal weight
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={selectedPools.size === 0}
              className="rounded-md border border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/45 px-3 py-1.5 text-xs text-[var(--dust-tint)] transition hover:bg-[var(--gunmetal-mist)] disabled:opacity-40"
            >
              Clear all
            </button>
          </div>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search pools..."
          className="mt-3 w-full rounded-md border border-[var(--steel-haze)] bg-[var(--slate-machine)] px-3 py-2 text-sm text-[var(--cloud-tint)] outline-none placeholder:text-[var(--fog-tint)]"
        />

        <div className="mt-3 max-h-64 overflow-y-auto space-y-1">
          {filteredChoices.map(({ key, name }) => {
            const isSelected = selectedPools.has(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTogglePool(key)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${isSelected ? 'border border-[var(--hyper-magenta)]/50 bg-[color:rgba(171,58,255,0.08)]' : 'border border-transparent hover:bg-[var(--gunmetal-mist)]/30'}`}
              >
                <span className={`flex size-4 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-[var(--hyper-magenta)] bg-[var(--hyper-magenta)]' : 'border-[var(--steel-haze)]'}`}>
                  {isSelected && <span className="text-[10px] text-white">✓</span>}
                </span>
                <span className={`min-w-0 truncate ${isSelected ? 'text-[var(--cloud-tint)]' : 'text-[var(--dust-tint)]'}`}>{name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Allocation inputs */}
      {selectedEntries.length > 0 && (
        <div className="rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-4">
          <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--pearl-aqua)]">Set weights</h3>

          <div className="mt-3 space-y-2">
            {selectedEntries.map(({ key, name, value }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--cloud-tint)]">{name}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={value || ''}
                    onChange={e => handleAllocationChange(key, e.target.value)}
                    className="w-20 rounded-md border border-[var(--steel-haze)] bg-[var(--slate-machine)] px-2 py-1.5 text-right text-sm text-[var(--cloud-tint)] outline-none"
                  />
                  <span className="text-xs text-[var(--fog-tint)]">%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--dust-tint)]">Total</span>
              <span className={`font-semibold ${isWithinTolerance ? 'text-[var(--lime-cream)]' : total > 100 ? 'text-[var(--hot-fuchsia)]' : 'text-[var(--dust-tint)]'}`}>
                {total.toFixed(1)}
                %
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--slate-machine)]">
              <div
                className={`h-full rounded-full transition-all ${isWithinTolerance ? 'bg-[var(--lime-cream)]' : total > 100 ? 'bg-[var(--hot-fuchsia)]' : 'bg-[var(--pearl-aqua)]'}`}
                style={{ width: `${Math.min(total, 100)}%` }}
              />
            </div>
          </div>

          {/* Validation error */}
          {validationError && (
            <p className="mt-3 text-sm text-[var(--hot-fuchsia)]">{validationError.message}</p>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!!validationError || !isWithinTolerance || isSubmitting}
            className="mt-4 w-full rounded-md bg-[var(--hyper-magenta)] px-4 py-2.5 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
          >
            {isSubmitting ? 'Submitting…' : existingAllocations && Object.keys(existingAllocations).length > 0 ? 'Update your vote' : 'Cast your vote'}
          </button>

          {votingPower !== undefined && (
            <p className="mt-2 text-xs text-[var(--fog-tint)]">
              Your voting power:
              {' '}
              {votingPower.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
