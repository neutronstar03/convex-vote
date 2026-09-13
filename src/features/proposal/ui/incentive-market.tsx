import type { BribeDataAnomaly } from '../../incentives/utils'
import type { PoolRow } from '../types'
import type { MarketFiltersProps } from './gauge-market'
import { Eyebrow, Panel } from '../../../components/ui/primitives'
import { formatCompactUsd, formatNumber } from '../../../lib/format'
import { describeBribeDataAnomaly } from './format'
import { GaugeRow, MarketFilters, MarketListHeader } from './gauge-market'
import { StatusNote, WarningBadge } from './shared'
import { INLINE_BUTTON_CLASS } from './styles'

/** Where the incentive figures stand for the round currently on screen. */
export type IncentiveSourceState = 'loading' | 'error' | 'unmatched' | 'ready'

export interface IncentiveMarketPanelProps {
  incentiveState: IncentiveSourceState
  anomaly: BribeDataAnomaly | null
  /** One-line provenance summary shown under the section heading. */
  summary: string
  /** Every incentivized row for the round, before filters. */
  rows: PoolRow[]
  /** The filtered and sorted rows rendered by the list. */
  sortedRows: PoolRow[]
  totalIncentivesUsd?: number
  roundNumber?: number
  canVote: boolean
  walletChoiceKeys: ReadonlySet<string>
  isEditorOpen: boolean
  allocations: Record<string, number>
  copiedLabel: string | null
  filters: MarketFiltersProps
  ballot: {
    onAdd: (choiceKey: string) => void
    onRemove: (choiceKey: string) => void
    onWeightChange: (choiceKey: string, weight: number) => void
  }
  onCopy: (value: string, label: string) => void
  onRetryIncentives: () => void
}

export function IncentiveMarketPanel({
  incentiveState,
  anomaly,
  summary,
  rows,
  sortedRows,
  totalIncentivesUsd,
  roundNumber,
  canVote,
  walletChoiceKeys,
  isEditorOpen,
  allocations,
  copiedLabel,
  filters,
  ballot,
  onCopy,
  onRetryIncentives,
}: IncentiveMarketPanelProps) {
  const hasMarketRows = incentiveState === 'ready' && rows.length > 0

  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow>Votium incentive market</Eyebrow>
            {anomaly ? <WarningBadge message={anomaly.tooltip} /> : null}
          </div>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-text)] sm:text-2xl">Incentivized gauges</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{summary}</p>
        </div>
      </div>

      {anomaly?.severity === 'severe'
        ? (
            <div className="mt-3">
              <StatusNote tone="warning" title="Incentives are far below the previous round">
                {describeBribeDataAnomaly(anomaly)}
              </StatusNote>
            </div>
          )
        : null}

      {hasMarketRows
        ? (
            <>
              <MarketFilters {...filters} />
              <MarketListHeader canVote={canVote} />

              <div className="mt-2 space-y-2">
                {sortedRows.length === 0
                  ? (
                      <StatusNote
                        tone="neutral"
                        title="No gauges match these filters"
                        action={(
                          <button type="button" onClick={filters.onReset} className={INLINE_BUTTON_CLASS}>
                            Clear filters
                          </button>
                        )}
                      >
                        {formatNumber(sortedRows.length, 0)}
                        {' of '}
                        {formatNumber(rows.length, 0)}
                        {' incentivized gauges are shown.'}
                      </StatusNote>
                    )
                  : null}
                {sortedRows.map(row => (
                  <GaugeRow
                    key={row.choiceKey}
                    row={row}
                    isWalletRow={walletChoiceKeys.has(row.choiceKey)}
                    isBallotRow={isEditorOpen && Object.hasOwn(allocations, row.choiceKey)}
                    isReadOnly={!canVote}
                    ballotWeight={allocations[row.choiceKey]}
                    copiedLabel={copiedLabel}
                    onAddToBallot={ballot.onAdd}
                    onRemoveFromBallot={ballot.onRemove}
                    onWeightChange={ballot.onWeightChange}
                    onCopy={onCopy}
                  />
                ))}
              </div>
            </>
          )
        : null}

      {incentiveState === 'loading'
        ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <span className="size-3 animate-spin rounded-full border-2 border-[var(--color-info)] border-t-transparent" aria-hidden="true" />
              Loading Llama incentive data…
            </p>
          )
        : null}

      {incentiveState === 'error'
        ? (
            <div className="mt-3">
              <StatusNote
                tone="danger"
                title="Llama incentive data is unavailable"
                action={(
                  <button type="button" onClick={onRetryIncentives} className={INLINE_BUTTON_CLASS}>
                    Retry
                  </button>
                )}
              >
                The incentive feed did not respond. Convex vote data on this page is unaffected.
              </StatusNote>
            </div>
          )
        : null}

      {incentiveState === 'unmatched'
        ? (
            <div className="mt-3">
              <StatusNote tone="warning" title="No Llama round matched to this voting window yet">
                Llama Airforce has not published a Votium round for this Convex window. Incentive figures can appear while the vote is open.
              </StatusNote>
            </div>
          )
        : null}

      {incentiveState === 'ready' && rows.length === 0
        ? (
            <div className="mt-3">
              <StatusNote tone="warning" title="No incentivized gauges reported for this round">
                Llama Airforce reports
                {' '}
                {formatCompactUsd(totalIncentivesUsd)}
                {' across 0 gauges'}
                {roundNumber ? ` in round ${roundNumber}` : ''}
                . Incentives are often added while the vote is open, so it is worth checking again before the window closes.
              </StatusNote>
            </div>
          )
        : null}
    </Panel>
  )
}
