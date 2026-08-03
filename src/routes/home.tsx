import type { GaugeVote, PoolRow } from '../features/proposal/types'
import type { ConvexUserVote } from '../features/voting/use-convex-user-vote'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { isAddress } from 'viem'
import { useAccount } from 'wagmi'
import { AppShell } from '../components/layout/app-shell'
import { VoteSummaryStats } from '../components/shared/vote-summary-stats'
import { useEpochForRound } from '../features/incentives/queries'
import { getBribedVotesTotal, mergeProposalAndEpoch } from '../features/incentives/utils'
import { useResolvedProposal } from '../features/proposal/queries'
import { getCountdownParts } from '../features/proposal/utils'
import { useConvexUserVote } from '../features/voting/use-convex-user-vote'
import { formatCompactUsd, formatDateCompact, formatDateTimeCompact, formatDateTimeMs, formatNumber, getCurrentTimeZone } from '../lib/format'

export function HomeRoute() {
  const { address, isConnected } = useAccount()
  const [searchParams] = useSearchParams()
  const proposalQuery = useResolvedProposal()
  const proposal = proposalQuery.data
  const epochQuery = useEpochForRound(proposal)
  const watchParam = searchParams.get('watch')?.trim()
  const watchedAddress = watchParam && isAddress(watchParam) ? watchParam : undefined
  const hasInvalidWatchAddress = Boolean(watchParam) && !watchedAddress
  const activeAddress = watchedAddress ?? address
  const isWatchMode = Boolean(watchedAddress)
  const voteQuery = useConvexUserVote(proposal?.proposalId, activeAddress)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  const timeZone = useMemo(() => getCurrentTimeZone(), [])
  const voteWindow = proposal ? getVoteWindowState(proposal.start, proposal.end, now) : null
  const currentVoteLabel = epochQuery.data?.round ? `Current vote ${epochQuery.data.round}` : 'Current vote'
  const totalIncentivesUsd = epochQuery.data?.bribes.reduce((sum, bribe) => sum + bribe.amountDollars, 0)
  const summaryVotes = proposal ? getBribedVotesTotal(proposal, epochQuery.data ?? null) : 0
  const rewardRate = totalIncentivesUsd !== undefined && summaryVotes > 0
    ? totalIncentivesUsd / summaryVotes
    : undefined
  const poolRows = useMemo(
    () => proposal ? mergeProposalAndEpoch(proposal, epochQuery.data ?? null) : [],
    [proposal, epochQuery.data],
  )
  const walletVoteRecap = useMemo(
    () => proposal && voteQuery.data?.voted ? getWalletVoteRecap(voteQuery.data, proposal.gauges, poolRows) : [],
    [poolRows, proposal, voteQuery.data],
  )
  const hasWalletVote = walletVoteRecap.length > 0
  const urgencyClass = voteWindow?.status === 'open' && voteWindow.totalHoursLeft !== undefined && voteWindow.totalHoursLeft < 6
    ? 'border-[var(--hot-fuchsia)]/50 bg-[color:rgba(255,22,84,0.12)] text-[var(--hot-fuchsia)]'
    : voteWindow?.status === 'open'
      ? 'border-[var(--pearl-aqua)]/50 bg-[color:rgba(120,218,228,0.12)] text-[var(--pearl-aqua)]'
      : 'border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/40 text-[var(--dust-tint)]'

  return (
    <AppShell>
      {proposal
        ? (
            <VoteSummaryStats
              roundNumber={epochQuery.data?.round}
              totalVotes={proposal.totalVotes}
              efficiencyVotes={summaryVotes}
              totalIncentivesUsd={totalIncentivesUsd}
            />
          )
        : null}

      <section
        className={`grid gap-3 ${hasWalletVote ? 'lg:grid-cols-[1.15fr_0.75fr]' : 'lg:grid-cols-[1.45fr_0.8fr]'}`}
        data-testid="home-top-row"
      >
        <div
          className={`rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] ${hasWalletVote ? 'order-2 min-h-[200px] p-4' : 'order-1 p-5'}`}
          data-testid="home-hero-pill"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--dust-tint)]" data-testid="home-current-vote-pill">
                  {proposalQuery.isPending ? 'Loading vote…' : currentVoteLabel}
                </span>
                <span className={`rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${urgencyClass}`} data-testid="home-vote-status-pill">
                  {voteWindow?.label ?? 'Unavailable'}
                </span>
              </div>

              <div>
                <h1 className={`${hasWalletVote ? 'text-2xl' : 'text-3xl'} font-semibold tracking-tight text-[var(--cloud-tint)]`} data-testid="home-hero-title">
                  {proposal?.title ?? 'Loading current Convex vote…'}
                </h1>
                <p className="mt-2 text-sm text-[var(--dust-tint)]" data-testid="home-local-time">
                  Local time
                  {' '}
                  {formatDateTimeMs(now)}
                  {' '}
                  ·
                  {' '}
                  {timeZone}
                </p>
                {hasWalletVote
                  ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <CompactInfoChip label="Bribes" value={formatCompactUsd(totalIncentivesUsd)} tone="aqua" />
                        <CompactInfoChip label="Bribe efficiency" value={rewardRate === undefined ? '—' : `$${rewardRate.toFixed(5)}`} tone="lime" />
                        <CompactInfoChip label="Window" value={proposal ? formatDateCompact(proposal.end) : '—'} tone="neutral" />
                      </div>
                    )
                  : null}
              </div>
            </div>

            <div className={`flex flex-wrap gap-2 ${hasWalletVote ? 'self-end' : ''}`}>
              <Link
                to="/proposal/latest"
                data-testid="home-open-proposal-link"
                className="inline-flex items-center gap-2 rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110"
              >
                Open proposal
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="https://www.convexfinance.com/vote/weights/curve"
                target="_blank"
                rel="noreferrer"
                data-testid="home-official-convex-link"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:bg-[var(--gunmetal-mist)]"
              >
                Convex Governance
                <ExternalLink className="size-4" />
              </a>
            </div>
          </div>
        </div>

        {(activeAddress || hasInvalidWatchAddress || isConnected) && (
          <aside
            className={`rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] ${hasWalletVote ? 'order-1 p-5' : 'order-2 p-4'}`}
            data-testid="wallet-vote-recap-pill"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--fog-tint)]">Current wallet vote</p>
              {isWatchMode
                ? <span className="rounded-md border border-[var(--pearl-aqua)]/40 bg-[color:rgba(120,218,228,0.1)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--pearl-aqua)]">Watching wallet</span>
                : null}
            </div>

            {hasInvalidWatchAddress
              ? (
                  <>
                    <p className="mt-3 text-sm font-medium text-[var(--hot-fuchsia)]">Invalid watch address</p>
                    <p className="mt-2 text-sm text-[var(--dust-tint)]">
                      The
                      {' '}
                      <code className="rounded bg-[var(--gunmetal-mist)] px-1 py-0.5 text-xs">watch</code>
                      {' '}
                      query param is not a valid EVM address.
                    </p>
                  </>
                )
              : (
                  <>
                    <p className="mt-2 text-sm font-medium text-[var(--cloud-tint)]">{shortAddress(activeAddress)}</p>
                    <p className="mt-2 text-sm text-[var(--dust-tint)]">
                      {isWatchMode
                        ? 'Read-only preview for the watched wallet, plus available incentive context and estimated rewards.'
                        : 'Your allocation across voted gauges, plus available incentive context and estimated rewards.'}
                    </p>

                    {voteQuery.isPending
                      ? <p className="mt-3 text-sm text-[var(--dust-tint)]">Loading current vote…</p>
                      : voteQuery.data?.voted
                        ? (
                            <>
                              <p className="mt-4 text-sm text-[var(--dust-tint)]">
                                Voting power:
                                {' '}
                                {formatNumber(voteQuery.data.votingPower, 0)}
                              </p>
                              <ul className={`mt-4 ${hasWalletVote ? 'space-y-3.5' : 'space-y-3'} text-sm text-[var(--dust-tint)]`} data-testid="wallet-vote-recap-list">
                                {walletVoteRecap.slice(0, 4).map(item => (
                                  <li key={item.label} className={`rounded-md border border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/55 ${hasWalletVote ? 'px-3.5 py-3.5' : 'px-3 py-3'}`}>
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-[15px] font-semibold text-[var(--cloud-tint)]">{item.label}</p>
                                        <p className="mt-1 text-xs leading-5 text-[var(--fog-tint)]">
                                          Your voting weight
                                          {' '}
                                          {formatNumber(item.estimatedVotes, 0)}
                                          {item.bribeTokenSummary ? ` · Rewards: ${item.bribeTokenSummary}` : ' · Rewards: none detected'}
                                        </p>
                                      </div>
                                      <span className="shrink-0 text-lg font-semibold text-[var(--lime-cream)]">
                                        {item.weight.toFixed(2)}
                                        %
                                      </span>
                                    </div>

                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--slate-machine)]">
                                      <div
                                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--hyper-magenta),var(--pearl-aqua))]"
                                        style={{ width: `${Math.min(item.weight, 100)}%` }}
                                      />
                                    </div>

                                    <div className={`mt-3 grid gap-2 text-xs text-[var(--dust-tint)] ${hasWalletVote ? 'xl:grid-cols-2' : 'sm:grid-cols-2'}`}>
                                      <div className="rounded-md border border-[var(--steel-haze)]/40 bg-[var(--carbon-ink)]/45 px-2.5 py-2">
                                        <p className="uppercase tracking-[0.16em] text-[var(--fog-tint)]">Total bribes</p>
                                        <p className="mt-1 text-lg font-semibold text-[var(--pearl-aqua)]">{formatCompactUsd(item.incentiveUsd)}</p>
                                        <p className="mt-1 text-[11px] text-[var(--fog-tint)]">{item.rewardRateLabel}</p>
                                      </div>

                                      <div className="rounded-md border border-[var(--steel-haze)]/40 bg-[var(--carbon-ink)]/45 px-2.5 py-2">
                                        <p className="uppercase tracking-[0.16em] text-[var(--fog-tint)]">Your est. reward</p>
                                        <p className="mt-1 text-lg font-semibold text-[var(--lime-cream)]">{formatCompactUsd(item.estimatedUsd)}</p>
                                        <p className="mt-1 text-[11px] text-[var(--fog-tint)]">{item.estimatedTokenSummary}</p>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>

                              <p className="mt-3 text-xs text-[var(--fog-tint)]">
                                Estimates assume rewards are distributed pro rata to final vote weight and may differ from final claimable amounts.
                              </p>
                            </>
                          )
                        : <p className="mt-3 text-sm text-[var(--dust-tint)]">No direct on-chain vote found for this wallet. Delegated allocations are not shown yet.</p>}
                  </>
                )}
          </aside>
        )}
      </section>

      <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-4" data-testid="vote-timetable-pill">
        <div className="grid gap-3 lg:grid-cols-[1fr_1.15fr_0.9fr]">
          <TimetableItem
            label="Current vote"
            value={epochQuery.data?.round ? `#${epochQuery.data.round}` : proposalQuery.isPending ? 'Loading…' : 'Unknown'}
            detail={proposal ? `${formatDateCompact(proposal.start)} → ${formatDateCompact(proposal.end)}` : 'Fetching latest proposal'}
            testId="current-vote-number"
          />
          <TimetableItem
            label="Window"
            value={proposal ? `${formatDateTimeCompact(proposal.start)} → ${formatDateTimeCompact(proposal.end)}` : '—'}
            detail={proposal ? `Shown in ${timeZone}` : 'Waiting for Convex data'}
            testId="current-vote-window"
          />
          <TimetableItem
            label="On-chain voters"
            value={proposal ? formatNumber(proposal.voterCount, 0) : '—'}
            detail={proposal ? `Convex epoch ${proposal.epoch}` : 'Waiting for Convex data'}
            testId="current-voter-count"
          />
        </div>
      </section>

      <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-4" data-testid="home-secondary-links">
        <div className="flex flex-wrap gap-3">
          <Link
            to="/proposal/latest"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm text-[var(--cloud-tint)] transition hover:bg-[var(--gunmetal-mist)]"
            data-testid="home-latest-proposal-link"
          >
            Full proposal analytics
          </Link>
          <a
            href="https://www.convexfinance.com/vote/weights/curve"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm text-[var(--cloud-tint)] transition hover:bg-[var(--gunmetal-mist)]"
            data-testid="home-convex-link"
          >
            Vote on Convex
          </a>
          <span className="inline-flex items-center rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm text-[var(--dust-tint)]" data-testid="home-timezone-pill">
            {timeZone}
          </span>
        </div>
      </section>
    </AppShell>
  )
}

function TimetableItem({ label, value, detail, testId }: { label: string, value: string, detail: string, testId: string }) {
  return (
    <article className="rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-4" data-testid={testId}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fog-tint)]">{label}</p>
      <h2 className="mt-2 text-base font-semibold text-[var(--cloud-tint)]">{value}</h2>
      <p className="mt-1 text-sm text-[var(--dust-tint)]">{detail}</p>
    </article>
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

function getVoteWindowState(start: number, end: number, now: number) {
  const nowSeconds = Math.floor(now / 1000)

  if (nowSeconds < start) {
    const countdown = getCountdownParts(start)
    return {
      status: 'upcoming',
      label: 'Upcoming',
      timerLabel: 'Opens in',
      timerValue: formatCountdown(countdown),
      timerDescription: 'Next vote window has not opened yet.',
      totalHoursLeft: (start - nowSeconds) / 3600,
    }
  }

  if (nowSeconds <= end) {
    const countdown = getCountdownParts(end)
    return {
      status: 'open',
      label: 'Open now',
      timerLabel: 'Time left',
      timerValue: formatCountdown(countdown),
      timerDescription: 'Voting is currently open.',
      totalHoursLeft: (end - nowSeconds) / 3600,
    }
  }

  return {
    status: 'closed',
    label: 'Closed',
    timerLabel: 'Time left',
    timerValue: 'Ended',
    timerDescription: 'The latest vote window has already closed.',
    totalHoursLeft: 0,
  }
}

function formatCountdown(countdown: ReturnType<typeof getCountdownParts>) {
  return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`
}

interface WalletVoteRecapItem {
  label: string
  weight: number
  estimatedVotes: number
  incentiveUsd?: number
  estimatedUsd?: number
  rewardRateLabel: string
  bribeTokenSummary: string
  estimatedTokenSummary: string
}

function getWalletVoteRecap(vote: ConvexUserVote, gauges: GaugeVote[], poolRows: PoolRow[]): WalletVoteRecapItem[] {
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
        label: gaugeNames.get(choiceKey) ?? shortAddress(choiceKey),
        weight,
        estimatedVotes,
        incentiveUsd: poolRow?.incentiveUsd,
        rewardRateLabel: poolRow?.rewardEfficiency != null
          ? `${formatCompactUsd(poolRow.rewardEfficiency, 2)}/vote at current totals`
          : 'No incentive efficiency available',
        bribeTokenSummary: poolRow?.bribeTokens.length
          ? poolRow.bribeTokens.map(token => token.symbol).join(', ')
          : '',
        estimatedUsd,
        estimatedTokenSummary: estimatedTokens.length
          ? estimatedTokens
              .slice(0, 3)
              .map(token => `~${formatTokenAmount(token.amount)} ${token.symbol}`)
              .join(' + ')
          : 'No token estimate available',
      }
    })
    .sort((a, b) => b.weight - a.weight)
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

function shortAddress(address?: string) {
  if (!address) {
    return 'Wallet'
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
