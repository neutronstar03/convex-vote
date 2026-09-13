import type { ConvexUserVote } from '../../voting/use-convex-user-vote'
import type { GaugeVote, PoolRow } from '../types'
import { Eyebrow, Panel } from '../../../components/ui/primitives'
import { formatCompactUsd, formatNumber } from '../../../lib/format'
import { formatTokenAmount, shortAddress } from './format'
import { MiniStat, StatusNote, TokenChip } from './shared'
import { INLINE_BUTTON_CLASS } from './styles'

export interface WalletVoteRecapItem {
  choiceKey: string
  label: string
  weight: number
  estimatedVotes: number
  estimatedUsd?: number
  estimatedTokenSummary: string
}

/**
 * Turns an on-chain vote into per-gauge rows: what the wallet allocated, how
 * many votes that is, and what it is roughly worth against the current bribes.
 */
export function getWalletVoteRecap(vote: ConvexUserVote, gauges: GaugeVote[], poolRows: PoolRow[]): WalletVoteRecapItem[] {
  const poolRowsByChoiceKey = new Map(poolRows.map(row => [row.choiceKey, row]))
  const gaugeNames = new Map(gauges.map(gauge => [gauge.key, gauge.label]))

  return Object.entries(vote.allocationPercentages)
    .map(([choiceKey, weight]) => {
      const poolRow = poolRowsByChoiceKey.get(choiceKey)
      const estimatedVotes = vote.votingPower * (weight / 100)
      const userShareOfGauge = poolRow?.votes && poolRow.votes > 0
        ? estimatedVotes / poolRow.votes
        : undefined
      const estimatedUsd = userShareOfGauge !== undefined && poolRow
        ? poolRow.incentiveUsd * userShareOfGauge
        : undefined
      const estimatedTokens = userShareOfGauge !== undefined
        ? (poolRow?.bribeTokens ?? []).map(token => ({
            symbol: token.symbol,
            amount: token.amount * userShareOfGauge,
          }))
        : []

      return {
        choiceKey,
        label: gaugeNames.get(choiceKey) ?? shortAddress(choiceKey),
        weight,
        estimatedVotes,
        estimatedUsd,
        estimatedTokenSummary: estimatedTokens.length
          ? estimatedTokens.slice(0, 3).map(token => `~${formatTokenAmount(token.amount)} ${token.symbol}`).join(' + ')
          : 'No token estimate available',
      }
    })
    .sort((a, b) => b.weight - a.weight)
}

export interface WalletPositionRow {
  recap: WalletVoteRecapItem
  row?: PoolRow
}

export interface WalletPositionPanelProps {
  activeAddress: string
  isWatchMode: boolean
  voted: boolean
  votingPower?: number
  rows: WalletPositionRow[]
  isPending: boolean
  isError: boolean
  errorMessage?: string
  onRetry: () => void
}

export function WalletPositionPanel({
  activeAddress,
  isWatchMode,
  voted,
  votingPower,
  rows,
  isPending,
  isError,
  errorMessage,
  onRetry,
}: WalletPositionPanelProps) {
  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>Your proposal position</Eyebrow>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-text)]">Wallet-voted gauges</h2>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-faint)]">
          <span>
            {isWatchMode ? 'Watched wallet' : 'Wallet'}
            {' '}
            {shortAddress(activeAddress)}
          </span>
          {voted
            ? (
                <span>
                  {'· Voting power '}
                  <span className="font-semibold text-[var(--color-text)]">{formatNumber(votingPower ?? 0, 0)}</span>
                  {' vlCVX'}
                </span>
              )
            : null}
        </p>
      </div>

      {isPending
        ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <span className="size-3 animate-spin rounded-full border-2 border-[var(--color-info)] border-t-transparent" aria-hidden="true" />
              Reading your on-chain vote…
            </p>
          )
        : isError
          ? (
              <div className="mt-3">
                <StatusNote
                  tone="danger"
                  title="Could not read your on-chain vote"
                  action={(
                    <button type="button" onClick={onRetry} className={INLINE_BUTTON_CLASS}>
                      Retry
                    </button>
                  )}
                >
                  {errorMessage}
                </StatusNote>
              </div>
            )
          : rows.length > 0
            ? (
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {rows.map(({ recap, row }) => (
                    <article key={recap.choiceKey} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-semibold text-[var(--color-text)]">{recap.label}</p>
                        <p className="shrink-0 text-sm font-semibold text-[var(--color-positive)]">
                          {recap.weight.toFixed(2)}
                          %
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-faint)]">
                        Your voting weight
                        {' '}
                        {formatNumber(recap.estimatedVotes, 0)}
                        {' '}
                        vlCVX
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(row?.bribeTokens ?? []).map((token, index) => (
                          <TokenChip key={`${recap.choiceKey}-${token.symbol}-${index}`} symbol={token.symbol} compact />
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <MiniStat label="Total incentives" value={formatCompactUsd(row?.incentiveUsd)} tone="aqua" />
                        <MiniStat label="Your est. reward" value={formatCompactUsd(recap.estimatedUsd)} tone="lime" detail={recap.estimatedTokenSummary} />
                      </div>
                    </article>
                  ))}
                </div>
              )
            : (
                <div className="mt-3">
                  <StatusNote tone="neutral" title="No on-chain vote found for this wallet in this round">
                    Allocations appear here after the wallet submits a vote through Convex governance.
                  </StatusNote>
                </div>
              )}
    </Panel>
  )
}
