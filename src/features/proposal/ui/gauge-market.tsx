import type { PoolRow } from '../types'
import { Search, Trash2 } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { formatCompactUsd, formatNumber, formatPercent } from '../../../lib/format'
import { capitalize, formatUsdRate, shortAddress } from './format'
import { CopyButton, Tag, TokenChip } from './shared'
import { INLINE_BUTTON_CLASS, SECONDARY_ACTION_CLASS } from './styles'

export type SortKey = 'incentives' | 'efficiency' | 'votes' | 'voteShare'

export const SORT_OPTIONS: Array<{ value: SortKey, label: string }> = [
  { value: 'incentives', label: 'Total incentives' },
  { value: 'efficiency', label: 'Incentives per vote' },
  { value: 'votes', label: 'Votes' },
  { value: 'voteShare', label: 'Vote share' },
]

export const MAX_ROW_TOKENS = 3

/* Shared column widths keep the list header aligned with every gauge row. */
export const MARKET_METRIC_COLUMNS_CLASS = 'md:w-[21rem] md:shrink-0 md:grid-cols-4 md:gap-x-4'
export const MARKET_ACTION_COLUMN_CLASS = 'md:w-[9.5rem] md:shrink-0'
export const MARKET_ROW_CLASS = 'md:flex md:items-center md:gap-4'
export const MARKET_HEADER_CELL_CLASS = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-faint)]'

export function compareRows(a: PoolRow, b: PoolRow, sortKey: SortKey) {
  switch (sortKey) {
    case 'efficiency':
      return (b.rewardEfficiency ?? 0) - (a.rewardEfficiency ?? 0) || b.incentiveUsd - a.incentiveUsd
    case 'votes':
      return b.votes - a.votes || b.incentiveUsd - a.incentiveUsd
    case 'voteShare':
      return b.voteShare - a.voteShare || (b.incentiveUsd ?? 0) - (a.incentiveUsd ?? 0)
    case 'incentives':
    default:
      return b.incentiveUsd - a.incentiveUsd || b.votes - a.votes
  }
}

export interface MarketFiltersProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  rewardTokenFilter: string
  rewardTokenOptions: string[]
  onRewardTokenFilterChange: (value: string) => void
  sortKey: SortKey
  onSortKeyChange: (value: SortKey) => void
  showOnlyWalletVotes: boolean
  onShowOnlyWalletVotesChange: (value: boolean) => void
  /** Whether the watched wallet has voted gauges worth filtering on. */
  canFilterWalletVotes: boolean
  isFiltered: boolean
  onReset: () => void
}

/** Search, reward-token and sort controls for the incentive market list. */
export function MarketFilters({
  searchTerm,
  onSearchTermChange,
  rewardTokenFilter,
  rewardTokenOptions,
  onRewardTokenFilterChange,
  sortKey,
  onSortKeyChange,
  showOnlyWalletVotes,
  onShowOnlyWalletVotesChange,
  canFilterWalletVotes,
  isFiltered,
  onReset,
}: MarketFiltersProps) {
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="relative min-w-52 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-faint)]" aria-hidden="true" />
        <span className="sr-only">Search incentivized gauges</span>
        <input
          value={searchTerm}
          onChange={event => onSearchTermChange(event.target.value)}
          placeholder="Search pool, token or gauge address"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-inset)] py-2 pl-8 pr-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)]"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        Token
        <select
          value={rewardTokenFilter}
          onChange={event => onRewardTokenFilterChange(event.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-2 py-2 text-sm text-[var(--color-text)] outline-none"
        >
          {rewardTokenOptions.map(option => (
            <option key={option} value={option}>{option === 'all' ? 'All tokens' : option}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        Sort
        <select
          value={sortKey}
          onChange={event => onSortKeyChange(event.target.value as SortKey)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-2 py-2 text-sm text-[var(--color-text)] outline-none"
        >
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      {canFilterWalletVotes
        ? (
            <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={showOnlyWalletVotes}
                onChange={event => onShowOnlyWalletVotesChange(event.target.checked)}
              />
              Only my voted gauges
            </label>
          )
        : null}
      {isFiltered
        ? (
            <button type="button" onClick={onReset} className={INLINE_BUTTON_CLASS}>
              Clear filters
            </button>
          )
        : null}
    </div>
  )
}

/** Desktop-only column legend, kept in sync with GaugeRow via shared widths. */
export function MarketListHeader({ canVote }: { canVote: boolean }) {
  return (
    <div className="mt-3 hidden border-b border-[var(--color-border-subtle)] pb-1.5 md:flex md:items-center md:gap-4 md:px-4">
      <span className={cn('md:flex-1', MARKET_HEADER_CELL_CLASS)}>Pool · chain · gauge</span>
      <div className={cn('hidden md:grid', MARKET_METRIC_COLUMNS_CLASS)}>
        <span className={cn('text-right', MARKET_HEADER_CELL_CLASS)}>Votes</span>
        <span className={cn('text-right', MARKET_HEADER_CELL_CLASS)}>Vote share</span>
        <span className={cn('text-right', MARKET_HEADER_CELL_CLASS)}>Total incentives</span>
        <span className={cn('text-right', MARKET_HEADER_CELL_CLASS)}>Incentives / vote</span>
      </div>
      {canVote
        ? <span className={cn('text-right', MARKET_ACTION_COLUMN_CLASS, MARKET_HEADER_CELL_CLASS)}>Action</span>
        : null}
    </div>
  )
}

export interface GaugeRowProps {
  row: PoolRow
  isWalletRow: boolean
  isBallotRow: boolean
  isReadOnly: boolean
  ballotWeight: number | undefined
  copiedLabel: string | null
  onAddToBallot: (choiceKey: string) => void
  onRemoveFromBallot: (choiceKey: string) => void
  onWeightChange: (choiceKey: string, weight: number) => void
  onCopy: (value: string, label: string) => void
}

export function GaugeRow({
  row,
  isWalletRow,
  isBallotRow,
  isReadOnly,
  ballotWeight,
  copiedLabel,
  onAddToBallot,
  onRemoveFromBallot,
  onWeightChange,
  onCopy,
}: GaugeRowProps) {
  const gaugeCopyLabel = `the gauge address for ${row.label}`
  const poolCopyLabel = `the pool name ${row.label}`

  return (
    <article
      data-testid="gauge-row"
      className={cn(
        'rounded-lg border px-3 py-2 md:px-4 md:py-2.5',
        MARKET_ROW_CLASS,
        isBallotRow
          ? 'border-[var(--color-positive)]/50 bg-[var(--color-positive)]/6'
          : isWalletRow
            ? 'border-[var(--hyper-magenta)]/50 bg-[var(--hyper-magenta)]/10'
            : 'border-[var(--color-border)] bg-[var(--color-surface-inset)]',
      )}
    >
      <div className="min-w-0 md:flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">{row.label}</h3>
            {isWalletRow ? <Tag tone="magenta">Your vote</Tag> : null}
            {isBallotRow ? <Tag tone="positive">In ballot</Tag> : null}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <CopyButton value={row.gaugeAddress} label={gaugeCopyLabel} copiedLabel={copiedLabel} onCopy={onCopy} />
            <CopyButton value={row.label} label={poolCopyLabel} copiedLabel={copiedLabel} onCopy={onCopy} />
          </div>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[11px] text-[var(--color-text-faint)]">
            {capitalize(row.blockchainId)}
            {' · Gauge '}
            {shortAddress(row.gaugeAddress)}
          </span>
          {row.bribeTokens.length > 0
            ? (
                <>
                  {row.bribeTokens.slice(0, MAX_ROW_TOKENS).map((token, index) => (
                    <TokenChip key={`${row.choiceKey}-${token.symbol}-${index}`} symbol={token.symbol} amountUsd={token.amountUsd} compact />
                  ))}
                  {row.bribeTokens.length > MAX_ROW_TOKENS
                    ? (
                        <span className="text-[11px] text-[var(--color-text-faint)]">
                          +
                          {row.bribeTokens.length - MAX_ROW_TOKENS}
                          {' '}
                          more
                        </span>
                      )
                    : null}
                </>
              )
            : <span className="text-[11px] text-[var(--color-text-faint)]">No reward tokens detected</span>}
        </div>
      </div>

      <dl className={cn('mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5', MARKET_METRIC_COLUMNS_CLASS)}>
        <GaugeMetric label="Votes" value={formatNumber(row.votes, 0)} />
        <GaugeMetric label="Vote share" value={formatPercent(row.voteShare)} />
        <GaugeMetric label="Total incentives" value={formatCompactUsd(row.incentiveUsd)} tone="aqua" />
        <GaugeMetric label="Incentives / vote" value={formatUsdRate(row.rewardEfficiency ?? undefined)} tone="lime" />
      </dl>

      {isReadOnly
        ? null
        : (
            <div className={cn('mt-2 flex items-center justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-2 md:mt-0 md:border-0 md:pt-0', MARKET_ACTION_COLUMN_CLASS)}>
              {isBallotRow
                ? (
                    <>
                      <label className="flex items-center gap-1">
                        <span className="sr-only">
                          Weight for
                          {row.label}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={ballotWeight || ''}
                          onChange={event => onWeightChange(row.choiceKey, Number.parseFloat(event.target.value) || 0)}
                          aria-label={`Vote weight for ${row.label}`}
                          className="w-16 rounded-md border border-[var(--color-positive)]/40 bg-[var(--color-surface)] px-2 py-1 text-right text-sm text-[var(--color-text)] outline-none"
                        />
                        <span className="text-xs text-[var(--color-text-faint)]">%</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => onRemoveFromBallot(row.choiceKey)}
                        aria-label={`Remove ${row.label} from the ballot`}
                        className="ui-interactive inline-flex size-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-faint)] hover:border-[var(--color-danger)]/50 hover:text-[var(--color-danger)]"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </>
                  )
                : (
                    <button
                      type="button"
                      onClick={() => onAddToBallot(row.choiceKey)}
                      className={cn(SECONDARY_ACTION_CLASS, 'min-h-8 w-full px-3 text-xs md:w-auto')}
                    >
                      {isWalletRow ? 'Edit allocation' : 'Add to ballot'}
                    </button>
                  )}
            </div>
          )}
    </article>
  )
}

function GaugeMetric({ label, value, tone }: { label: string, value: string, tone?: 'aqua' | 'lime' }) {
  return (
    <div className="min-w-0 md:text-right">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-faint)] md:sr-only">{label}</dt>
      <dd className={cn('mt-0.5 truncate text-sm font-semibold md:mt-0', tone === 'aqua' ? 'text-[var(--color-info)]' : tone === 'lime' ? 'text-[var(--color-positive)]' : 'text-[var(--color-text)]')}>
        {value}
      </dd>
    </div>
  )
}
