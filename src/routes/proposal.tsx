import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { isAddress } from 'viem'
import { useAccount } from 'wagmi'
import { AppShell } from '../components/layout/app-shell'
import { VoteSummaryStats } from '../components/shared/vote-summary-stats'
import { useEpochForProposal } from '../features/incentives/queries'
import { mergeProposalAndEpoch } from '../features/incentives/utils'
import { useResolvedProposal, useUserVote } from '../features/proposal/queries'
import type { PoolRow, SnapshotProposal, SnapshotVote } from '../features/proposal/types'
import { formatCompactUsd, formatDateCompact, formatDateTime, formatNumber, formatPercent, getCurrentTimeZone } from '../lib/format'

type SortKey = 'incentives' | 'efficiency' | 'votes' | 'voteShare'

const SORT_OPTIONS: Array<{ value: SortKey, label: string }> = [
  { value: 'incentives', label: 'Total bribes' },
  { value: 'efficiency', label: 'Bribe efficiency' },
  { value: 'votes', label: 'Votes' },
  { value: 'voteShare', label: 'Vote share' },
]

export function ProposalRoute() {
  const { proposalId } = useParams()
  const { address } = useAccount()
  const [searchParams] = useSearchParams()
  const [sortKey, setSortKey] = useState<SortKey>('incentives')
  const proposalQuery = useResolvedProposal(proposalId)
  const epochQuery = useEpochForProposal(proposalQuery.data?.id)
  const watchParam = searchParams.get('watch')?.trim()
  const watchedAddress = watchParam && isAddress(watchParam) ? watchParam : undefined
  const activeAddress = watchedAddress ?? address
  const isWatchMode = Boolean(watchedAddress)
  const voteQuery = useUserVote(proposalQuery.data?.id, activeAddress)
  const timeZone = getCurrentTimeZone()
  const proposal = proposalQuery.data
  const epoch = epochQuery.data ?? null
  const totalIncentivesUsd = epoch?.bribes.reduce((sum, bribe) => sum + bribe.amountDollars, 0)
  const bribedRows = useMemo(
    () => proposal ? mergeProposalAndEpoch(proposal, epoch).filter(row => (row.incentiveUsd ?? 0) > 0 || row.bribeTokens.length > 0) : [],
    [epoch, proposal],
  )
  const sortedRows = useMemo(
    () => [...bribedRows].sort((a, b) => compareRows(a, b, sortKey)),
    [bribedRows, sortKey],
  )
  const walletVoteRecap = useMemo(
    () => proposal && voteQuery.data ? getWalletVoteRecap(voteQuery.data, proposal, bribedRows) : [],
    [bribedRows, proposal, voteQuery.data],
  )
  const walletChoiceKeys = useMemo(
    () => new Set(walletVoteRecap.map(item => item.choiceKey)),
    [walletVoteRecap],
  )
  const walletRows = useMemo(
    () => walletVoteRecap.map(item => ({
      recap: item,
      row: bribedRows.find(row => row.choiceKey === item.choiceKey),
    })),
    [bribedRows, walletVoteRecap],
  )
  const rewardRate = totalIncentivesUsd !== undefined && bribedRows.length > 0
    ? totalIncentivesUsd / bribedRows.reduce((sum, row) => sum + row.snapshotVotes, 0)
    : undefined

  if (proposalQuery.isPending) {
    return (
      <AppShell>
        <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-8 text-[var(--dust-tint)]">
          Loading proposal…
        </section>
      </AppShell>
    )
  }

  if (proposalQuery.isError) {
    return (
      <AppShell>
        <section className="rounded-lg border border-[var(--hot-fuchsia)]/40 bg-[color:rgba(255,22,84,0.1)] p-8 text-[var(--cloud-tint)]">
          Failed to load proposal: {proposalQuery.error.message}
        </section>
      </AppShell>
    )
  }

  const resolvedProposal = proposal!
  const statusLabel = resolvedProposal.state.toLowerCase() === 'closed'
    ? `Ended ${formatDateTime(resolvedProposal.end)}`
    : resolvedProposal.state.toLowerCase() === 'active'
        ? `Ends ${formatDateTime(resolvedProposal.end)}`
        : resolvedProposal.state

  return (
    <AppShell>
      <VoteSummaryStats
        roundNumber={epoch?.round}
        totalVotes={bribedRows.reduce((sum, row) => sum + row.snapshotVotes, 0)}
        totalIncentivesUsd={totalIncentivesUsd}
      />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--pearl-aqua)]">Proposal overview</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--cloud-tint)]">{resolvedProposal.title}</h1>
          <p className="mt-2 text-sm text-[var(--dust-tint)]">Window {formatDateCompact(resolvedProposal.start)} → {formatDateCompact(resolvedProposal.end)} · {timeZone}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Status" value={capitalize(resolvedProposal.state)} detail={statusLabel} tone="neutral" />
            <MetricCard label="Total votes" value={formatNumber(resolvedProposal.scores_total, 0)} detail="Full Snapshot proposal weight" tone="neutral" />
            <MetricCard label="Bribed gauges" value={String(bribedRows.length)} detail="Gauges with active bribes" tone="aqua" />
            <MetricCard label="Bribe efficiency" value={formatUsdRate(rewardRate)} detail="Average $/vote across bribed gauges" tone="lime" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <CompactInfoChip label="Bribes" value={formatCompactUsd(totalIncentivesUsd)} tone="aqua" />
            <CompactInfoChip label="Llama round" value={epoch ? String(epoch.round) : epochQuery.isPending ? 'Loading…' : 'Not matched'} tone="neutral" />
            <CompactInfoChip label="Snapshot id" value={`${resolvedProposal.id.slice(0, 10)}…`} tone="neutral" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to={`/?watch=${activeAddress ?? ''}`}
              className="inline-flex items-center rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110"
            >
              Back to dashboard
            </Link>
            <a
              href={`https://snapshot.box/#/cvx.eth/proposal/${resolvedProposal.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:bg-[var(--gunmetal-mist)]"
            >
              Open Snapshot proposal
            </a>
          </div>
        </article>

        <article className="rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--pearl-aqua)]">Round details</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--cloud-tint)]">Market + wallet context</h2>
            </div>
            {isWatchMode
              ? <span className="rounded-md border border-[var(--pearl-aqua)]/40 bg-[color:rgba(120,218,228,0.1)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--pearl-aqua)]">Watching wallet</span>
              : null}
          </div>

          <dl className="mt-4 space-y-3 text-sm text-[var(--dust-tint)]">
            <DetailRow label="Start" value={formatDateTime(resolvedProposal.start)} />
            <DetailRow label="End" value={formatDateTime(resolvedProposal.end)} />
            <DetailRow label="Reward tokens" value={summarizeRewardTokens(bribedRows)} />
            <DetailRow label="Wallet" value={activeAddress ? shortAddress(activeAddress) : 'Not selected'} />
          </dl>
        </article>
      </section>

      {activeAddress && (
        <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--pearl-aqua)]">Your proposal position</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--cloud-tint)]">Wallet-voted gauges</h2>
            </div>
            {voteQuery.data
              ? <p className="text-sm text-[var(--fog-tint)]">Voting power {formatNumber(voteQuery.data.vp, 0)}</p>
              : null}
          </div>

          {voteQuery.isPending
            ? <p className="mt-4 text-sm text-[var(--dust-tint)]">Loading wallet vote…</p>
            : walletRows.length > 0
              ? (
                  <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    {walletRows.map(({ recap, row }) => (
                      <article key={recap.choiceKey} className="rounded-md border border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/55 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-[var(--cloud-tint)]">{recap.label}</p>
                            <p className="mt-1 text-xs text-[var(--fog-tint)]">Your voting weight {formatNumber(recap.estimatedVotes, 0)}</p>
                          </div>
                          <span className="text-lg font-semibold text-[var(--lime-cream)]">{recap.weight.toFixed(2)}%</span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(row?.bribeTokens ?? []).map(token => (
                            <TokenChip key={`${recap.choiceKey}-${token.symbol}`} symbol={token.symbol} />
                          ))}
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <MiniStat label="Total bribes" value={formatCompactUsd(row?.incentiveUsd)} tone="aqua" />
                          <MiniStat label="Your est. reward" value={formatCompactUsd(recap.estimatedUsd)} tone="lime" detail={recap.estimatedTokenSummary} />
                        </div>
                      </article>
                    ))}
                  </div>
                )
              : <p className="mt-4 text-sm text-[var(--dust-tint)]">No wallet vote found for this proposal.</p>}
        </section>
      )}

      <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--pearl-aqua)]">Bribed gauge market</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--cloud-tint)]">All bribed gauges</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-[var(--fog-tint)]">{sortedRows.length} bribed gauges in this round.</p>
            <label className="flex items-center gap-2 text-sm text-[var(--dust-tint)]">
              Sort by
              <select
                value={sortKey}
                onChange={event => setSortKey(event.target.value as SortKey)}
                className="rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-3 py-2 text-sm text-[var(--cloud-tint)] outline-none"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {sortedRows.map(row => {
            const isWalletRow = walletChoiceKeys.has(row.choiceKey)

            return (
              <article
                key={row.choiceKey}
                className={`rounded-md border px-4 py-4 ${isWalletRow ? 'border-[var(--hyper-magenta)]/50 bg-[color:rgba(171,58,255,0.08)]' : 'border-[var(--steel-haze)] bg-[var(--carbon-ink)]'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[var(--cloud-tint)]">{row.label}</h3>
                      {isWalletRow
                        ? <span className="rounded-md border border-[var(--hyper-magenta)]/40 bg-[color:rgba(171,58,255,0.12)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--lime-cream)]">Your vote</span>
                        : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--fog-tint)]">Choice #{row.choiceIndex}{row.gaugeAddress ? ` · Gauge ${shortAddress(row.gaugeAddress)}` : ''}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {row.bribeTokens.length > 0
                        ? row.bribeTokens.map(token => (
                            <TokenChip key={`${row.choiceKey}-${token.symbol}`} symbol={token.symbol} amountUsd={token.amountUsd} />
                          ))
                        : <span className="text-xs text-[var(--fog-tint)]">No reward tokens detected</span>}
                    </div>
                  </div>

                  <div className="grid min-w-[260px] gap-2 text-right sm:grid-cols-2 xl:grid-cols-4 xl:text-left">
                    <DataPill label="Votes" value={formatNumber(row.snapshotVotes, 0)} tone="neutral" />
                    <DataPill label="Vote share" value={formatPercent(row.voteShare)} tone="neutral" />
                    <DataPill label="Total bribes" value={formatCompactUsd(row.incentiveUsd)} tone="aqua" />
                    <DataPill label="Bribe efficiency" value={formatUsdRate(row.rewardEfficiency)} tone="lime" />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </AppShell>
  )
}

function compareRows(a: PoolRow, b: PoolRow, sortKey: SortKey) {
  switch (sortKey) {
    case 'efficiency':
      return (b.rewardEfficiency ?? 0) - (a.rewardEfficiency ?? 0) || (b.incentiveUsd ?? 0) - (a.incentiveUsd ?? 0)
    case 'votes':
      return b.snapshotVotes - a.snapshotVotes || (b.incentiveUsd ?? 0) - (a.incentiveUsd ?? 0)
    case 'voteShare':
      return b.voteShare - a.voteShare || (b.incentiveUsd ?? 0) - (a.incentiveUsd ?? 0)
    case 'incentives':
    default:
      return (b.incentiveUsd ?? 0) - (a.incentiveUsd ?? 0) || b.snapshotVotes - a.snapshotVotes
  }
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: { label: string, value: string, detail?: string, tone: 'neutral' | 'aqua' | 'lime' }) {
  const valueClass = tone === 'aqua'
    ? 'text-[var(--pearl-aqua)]'
    : tone === 'lime'
        ? 'text-[var(--lime-cream)]'
        : 'text-[var(--cloud-tint)]'

  return (
    <div className="rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-4">
      <p className="text-sm text-[var(--fog-tint)]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</p>
      {detail
        ? <p className="mt-1 text-xs text-[var(--dust-tint)]">{detail}</p>
        : null}
    </div>
  )
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--steel-haze)]/60 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-[var(--fog-tint)]">{label}</dt>
      <dd className="text-right text-[var(--cloud-tint)]">{value}</dd>
    </div>
  )
}

function CompactInfoChip({ label, value, tone }: { label: string, value: string, tone: 'aqua' | 'lime' | 'neutral' }) {
  const toneClass = tone === 'aqua'
    ? 'border-[var(--pearl-aqua)]/25 bg-[color:rgba(120,218,228,0.08)] text-[var(--pearl-aqua)]'
    : tone === 'lime'
        ? 'border-[var(--lime-cream)]/25 bg-[color:rgba(231,255,122,0.08)] text-[var(--lime-cream)]'
        : 'border-[var(--steel-haze)] bg-[var(--carbon-ink)]/70 text-[var(--cloud-tint)]'

  return (
    <div className={`rounded-md border px-2.5 py-2 ${toneClass}`}>
      <p className="uppercase tracking-[0.14em] text-[10px] text-[var(--fog-tint)]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function TokenChip({ symbol, amountUsd }: { symbol: string, amountUsd?: number }) {
  return (
    <span className="rounded-md border border-[var(--pearl-aqua)]/35 bg-[color:rgba(120,218,228,0.08)] px-2 py-1 text-xs font-medium text-[var(--pearl-aqua)]">
      {symbol}
      {amountUsd !== undefined ? ` · ${formatCompactUsd(amountUsd)}` : ''}
    </span>
  )
}

function DataPill({ label, value, tone }: { label: string, value: string, tone: 'neutral' | 'aqua' | 'lime' }) {
  const valueClass = tone === 'aqua'
    ? 'text-[var(--pearl-aqua)]'
    : tone === 'lime'
        ? 'text-[var(--lime-cream)]'
        : 'text-[var(--cloud-tint)]'

  return (
    <div className="rounded-md border border-[var(--steel-haze)]/60 bg-[var(--gunmetal-mist)]/45 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--fog-tint)]">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  )
}

function MiniStat({ label, value, tone, detail }: { label: string, value: string, tone: 'aqua' | 'lime', detail?: string }) {
  const valueClass = tone === 'aqua' ? 'text-[var(--pearl-aqua)]' : 'text-[var(--lime-cream)]'

  return (
    <div className="rounded-md border border-[var(--steel-haze)]/40 bg-[var(--carbon-ink)]/45 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--fog-tint)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${valueClass}`}>{value}</p>
      {detail
        ? <p className="mt-1 text-[11px] text-[var(--fog-tint)]">{detail}</p>
        : null}
    </div>
  )
}

function getVoteRecap(vote: SnapshotVote, proposal: SnapshotProposal) {
  if (typeof vote.choice === 'number') {
    return [{ choiceKey: String(vote.choice), label: proposal.choices[vote.choice - 1] ?? `Choice ${vote.choice}`, weight: 100.00 }]
  }

  const entries = Object.entries(vote.choice)
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)

  if (total <= 0) {
    return []
  }

  return entries
    .map(([choiceKey, weight]) => ({
      choiceKey,
      label: proposal.choices[Number(choiceKey) - 1] ?? `Choice ${choiceKey}`,
      weight: Number(((weight / total) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.weight - a.weight)
}

type WalletVoteRecapItem = {
  choiceKey: string
  label: string
  weight: number
  estimatedVotes: number
  estimatedUsd?: number
  estimatedTokenSummary: string
}

function getWalletVoteRecap(vote: SnapshotVote, proposal: SnapshotProposal, poolRows: PoolRow[]): WalletVoteRecapItem[] {
  const poolRowsByChoiceKey = new Map(poolRows.map(row => [row.choiceKey, row]))

  return getVoteRecap(vote, proposal)
    .map((item) => {
      const poolRow = poolRowsByChoiceKey.get(item.choiceKey)
      const estimatedVotes = vote.vp * (item.weight / 100)
      const userShareOfGauge = poolRow?.snapshotVotes && poolRow.snapshotVotes > 0
        ? estimatedVotes / poolRow.snapshotVotes
        : undefined
      const estimatedUsd = userShareOfGauge !== undefined && poolRow?.incentiveUsd !== undefined
        ? poolRow.incentiveUsd * userShareOfGauge
        : undefined
      const estimatedTokens = userShareOfGauge !== undefined
        ? (poolRow?.bribeTokens ?? []).map(token => ({
            symbol: token.symbol,
            amount: token.amount * userShareOfGauge,
          }))
        : []

      return {
        choiceKey: item.choiceKey,
        label: item.label,
        weight: item.weight,
        estimatedVotes,
        estimatedUsd,
        estimatedTokenSummary: estimatedTokens.length
          ? estimatedTokens.slice(0, 3).map(token => `~${formatTokenAmount(token.amount)} ${token.symbol}`).join(' + ')
          : 'No token estimate available',
      }
    })
    .sort((a, b) => b.weight - a.weight)
}

function summarizeRewardTokens(rows: PoolRow[]) {
  const symbols = [...new Set(rows.flatMap(row => row.bribeTokens.map(token => token.symbol)))]

  if (symbols.length === 0) {
    return 'None'
  }

  if (symbols.length <= 4) {
    return symbols.join(', ')
  }

  return `${symbols.slice(0, 4).join(', ')} +${symbols.length - 4}`
}

function shortAddress(address?: string) {
  if (!address) {
    return 'Wallet'
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatTokenAmount(value: number) {
  if (value >= 100) {
    return formatNumber(value, 0)
  }

  if (value >= 1) {
    return formatNumber(value, 2)
  }

  return formatNumber(value, 4)
}

function formatUsdRate(value?: number) {
  if (value === undefined) {
    return '—'
  }

  if (value >= 1) {
    return `$${value.toFixed(2)}`
  }

  return `$${value.toFixed(5)}`
}
