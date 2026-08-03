import { useCallback, useMemo, useState } from 'react'
import { validateAllocation } from './validateAllocation'

export interface AllocationChoice {
  key: string
  name: string
  searchText?: string
  subtitle?: string
}

interface AllocationEditorProps {
  choices: AllocationChoice[]
  isConnected: boolean
  proposalActive: boolean
  votingPower: number | undefined
  allocations: Record<string, number>
  isRevote: boolean
  onChange: (allocations: Record<string, number>) => void
  onSubmit: (allocations: Record<string, number>) => void
  isSubmitting: boolean
}

const MAX_VISIBLE_SEARCH_RESULTS = 80

export function AllocationEditor({
  choices,
  isConnected,
  proposalActive,
  votingPower,
  allocations,
  isRevote,
  onChange,
  onSubmit,
  isSubmitting,
}: AllocationEditorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isGaugeSearchOpen, setIsGaugeSearchOpen] = useState(false)
  const choiceNames = useMemo(() => new Map(choices.map(choice => [choice.key, choice.name])), [choices])
  const selectedKeys = useMemo(() => new Set(Object.keys(allocations)), [allocations])

  const filteredChoices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch)
      return choices

    return choices.filter(({ key, name, searchText }) => (
      `${name} ${key} ${searchText ?? ''}`.toLowerCase().includes(normalizedSearch)
    ))
  }, [choices, searchTerm])

  const visibleChoices = filteredChoices.slice(0, MAX_VISIBLE_SEARCH_RESULTS)
  const total = useMemo(
    () => Object.values(allocations).reduce((sum, value) => sum + value, 0),
    [allocations],
  )
  const validationError = useMemo(
    () => validateAllocation({ isConnected, proposalActive, votingPower, allocations }),
    [allocations, isConnected, proposalActive, votingPower],
  )
  const isWithinTolerance = total >= 99.9 && total <= 100.1
  const selectedEntries = Object.entries(allocations)
    .map(([key, value]) => ({ key, name: choiceNames.get(key) ?? key, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))

  const handleToggleGauge = useCallback((key: string) => {
    const next = { ...allocations }
    if (Object.hasOwn(next, key))
      delete next[key]
    else
      next[key] = 0
    onChange(next)
  }, [allocations, onChange])

  const handleAllocationChange = useCallback((key: string, value: string) => {
    const parsed = Number.parseFloat(value)
    onChange({ ...allocations, [key]: Number.isNaN(parsed) ? 0 : parsed })
  }, [allocations, onChange])

  const handleEqualWeight = useCallback(() => {
    const keys = Object.keys(allocations)
    if (keys.length === 0)
      return

    const weight = Number((100 / keys.length).toFixed(2))
    const next: Record<string, number> = Object.fromEntries(keys.map(key => [key, weight]))
    const currentTotal = weight * keys.length
    const lastKey = keys.at(-1)!
    next[lastKey] = Number((weight + (100 - currentTotal)).toFixed(2))
    onChange(next)
  }, [allocations, onChange])

  if (!proposalActive) {
    return (
      <div className="rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-6 text-center">
        <p className="text-[var(--dust-tint)]">This proposal is no longer active for voting.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--pearl-aqua)]">Your ballot</h3>
            <p className="mt-1 text-xs text-[var(--fog-tint)]">
              Add incentivized gauges directly from their cards below. Use search only for other eligible gauges.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleEqualWeight}
              disabled={selectedEntries.length === 0}
              className="rounded-md border border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/45 px-3 py-1.5 text-xs text-[var(--dust-tint)] transition hover:bg-[var(--gunmetal-mist)] disabled:opacity-40"
            >
              Equal split
            </button>
            <button
              type="button"
              onClick={() => onChange({})}
              disabled={selectedEntries.length === 0}
              className="rounded-md border border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/45 px-3 py-1.5 text-xs text-[var(--dust-tint)] transition hover:bg-[var(--gunmetal-mist)] disabled:opacity-40"
            >
              Clear ballot
            </button>
          </div>
        </div>

        {selectedEntries.length > 0
          ? (
              <div className="mt-4 space-y-2">
                {selectedEntries.map(({ key, name, value }) => (
                  <div key={key} className="flex items-center gap-3 rounded-md border border-[var(--steel-haze)]/60 bg-[var(--slate-machine)] px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--cloud-tint)]">{name}</span>
                    <label className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={value || ''}
                        onChange={event => handleAllocationChange(key, event.target.value)}
                        aria-label={`Allocation percentage for ${name}`}
                        className="w-20 rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-2 py-1.5 text-right text-sm text-[var(--cloud-tint)] outline-none"
                      />
                      <span className="text-xs text-[var(--fog-tint)]">%</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleToggleGauge(key)}
                      className="rounded-md px-2 py-1 text-xs text-[var(--fog-tint)] hover:bg-[var(--gunmetal-mist)] hover:text-[var(--hot-fuchsia)]"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--dust-tint)]">
                      Total across
                      {' '}
                      {selectedEntries.length}
                      {' '}
                      {selectedEntries.length === 1 ? 'gauge' : 'gauges'}
                    </span>
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

                {validationError
                  ? <p className="text-sm text-[var(--hot-fuchsia)]">{validationError.message}</p>
                  : null}

                <button
                  type="button"
                  onClick={() => onSubmit({ ...allocations })}
                  disabled={Boolean(validationError) || !isWithinTolerance || isSubmitting}
                  className="w-full rounded-md bg-[var(--hyper-magenta)] px-4 py-2.5 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
                >
                  {isSubmitting ? 'Submitting…' : isRevote ? 'Review updated vote' : 'Review vote'}
                </button>
              </div>
            )
          : (
              <div className="mt-4 rounded-md border border-dashed border-[var(--steel-haze)] px-4 py-5 text-center text-sm text-[var(--dust-tint)]">
                Your ballot is empty. Add a gauge from an incentive card below.
              </div>
            )}

        <button
          type="button"
          onClick={() => setIsGaugeSearchOpen(current => !current)}
          className="mt-4 w-full rounded-md border border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/45 px-3 py-2 text-sm text-[var(--dust-tint)] transition hover:bg-[var(--gunmetal-mist)]"
        >
          {isGaugeSearchOpen ? 'Hide all-gauge search' : 'Add another eligible gauge'}
        </button>

        {isGaugeSearchOpen
          ? (
              <div className="mt-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Search pool, token, chain, gauge address…"
                  className="w-full rounded-md border border-[var(--steel-haze)] bg-[var(--slate-machine)] px-3 py-2 text-sm text-[var(--cloud-tint)] outline-none placeholder:text-[var(--fog-tint)]"
                />
                <p className="mt-2 text-xs text-[var(--fog-tint)]">
                  {filteredChoices.length > MAX_VISIBLE_SEARCH_RESULTS
                    ? `Showing ${MAX_VISIBLE_SEARCH_RESULTS} of ${filteredChoices.length}; refine your search.`
                    : `${filteredChoices.length} eligible gauges found.`}
                </p>
                <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                  {visibleChoices.map(({ key, name, subtitle }) => {
                    const isSelected = selectedKeys.has(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleToggleGauge(key)}
                        className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition ${isSelected ? 'border-[var(--hyper-magenta)]/50 bg-[color:rgba(171,58,255,0.08)]' : 'border-transparent hover:bg-[var(--gunmetal-mist)]/30'}`}
                      >
                        <span className={`flex size-4 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-[var(--hyper-magenta)] bg-[var(--hyper-magenta)]' : 'border-[var(--steel-haze)]'}`}>
                          {isSelected ? <span className="text-[10px] text-white">✓</span> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate ${isSelected ? 'text-[var(--cloud-tint)]' : 'text-[var(--dust-tint)]'}`}>{name}</span>
                          {subtitle ? <span className="mt-0.5 block truncate text-[11px] text-[var(--fog-tint)]">{subtitle}</span> : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          : null}

        {votingPower !== undefined
          ? (
              <p className="mt-3 text-xs text-[var(--fog-tint)]">
                Your voting power:
                {votingPower.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                {' '}
                vlCVX
              </p>
            )
          : null}
      </div>
    </div>
  )
}
