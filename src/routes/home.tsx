import type { GaugeRound, GaugeVote, PoolRow } from '../features/proposal/types'
import type { ConvexUserVote } from '../features/voting/use-convex-user-vote'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { isAddress } from 'viem'
import { useAccount } from 'wagmi'
import { AppShell } from '../components/layout/app-shell'
import { VoteSummaryStats } from '../components/shared/vote-summary-stats'
import { Eyebrow, Panel, StatusBadge } from '../components/ui/primitives'
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
  const showWalletPanel = Boolean(activeAddress || hasInvalidWatchAddress || isConnected)
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

  if (proposalQuery.isError) {
    return (
      <AppShell>
        <Panel className="border-[var(--color-danger)]/40 bg-[color:rgba(255,77,115,0.1)] p-6 text-[var(--color-text)] sm:p-8" data-testid="home-proposal-error">
          <h1 className="text-xl font-semibold">Unable to check the current Convex vote</h1>
          <p className="mt-2 text-sm text-[var(--dust-tint)]">
            The app will retry automatically. You can also check Convex Governance directly.
          </p>
          <a
            href="https://www.convexfinance.com/vote/weights/curve"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:bg-[var(--gunmetal-mist)]"
          >
            Convex Governance
            <ExternalLink className="size-4" />
          </a>
        </Panel>
      </AppShell>
    )
  }

  if (proposalQuery.isSuccess && proposal === null) {
    return (
      <AppShell>
        <Panel className="p-6 sm:p-8" data-testid="home-no-active-round">
          <div className="max-w-2xl">
            <span className="rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--dust-tint)]">
              Between rounds
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[var(--cloud-tint)]">
              No active Convex gauge vote
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--dust-tint)]">
              The latest voting window has ended and Convex has not opened the next one yet. Voting controls will return here automatically when the next round becomes active.
            </p>
            <p className="mt-3 text-xs text-[var(--fog-tint)]">
              Checking Convex for a new round every 30 seconds.
            </p>
            <a
              href="https://www.convexfinance.com/vote/weights/curve"
              target="_blank"
              rel="noreferrer"
              data-testid="home-official-convex-link"
              className="mt-6 inline-flex items-center gap-2 rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:bg-[var(--gunmetal-mist)]"
            >
              Check Convex Governance
              <ExternalLink className="size-4" />
            </a>
          </div>
        </Panel>
      </AppShell>
    )
  }

  return (
    <AppShell>
      {proposal
        ? (
            <>
              <VoteSummaryStats
                roundNumber={epochQuery.data?.round}
                totalVotes={proposal.totalVotes}
                efficiencyVotes={summaryVotes}
                totalIncentivesUsd={totalIncentivesUsd}
              />
              <DataHealthStrip
                convexUpdatedAt={proposalQuery.dataUpdatedAt}
                convexState={getConvexDataState(proposalQuery)}
                llamaUpdatedAt={epochQuery.dataUpdatedAt}
                llamaState={getLlamaDataState({
                  hasData: epochQuery.data !== undefined && epochQuery.data !== null,
                  isError: epochQuery.isError,
                  isPending: epochQuery.isPending,
                })}
              />
            </>
          )
        : null}

      <section
        className={`grid gap-3 ${showWalletPanel ? (hasWalletVote ? 'lg:grid-cols-[1.15fr_0.75fr]' : 'lg:grid-cols-[1.45fr_0.8fr]') : ''}`}
        data-testid="home-top-row"
      >
        <Panel
          className={`min-w-0 ${hasWalletVote ? 'order-2 min-h-[200px] p-4' : 'order-1 p-5'}`}
          data-testid="home-hero-pill"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="neutral" className="uppercase tracking-[0.14em]" data-testid="home-current-vote-pill">
                  {proposalQuery.isPending ? 'Loading vote…' : currentVoteLabel}
                </StatusBadge>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${urgencyClass}`} data-testid="home-vote-status-pill">
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
        </Panel>

        {showWalletPanel && (
          <aside
            className={`ui-panel-inset ${hasWalletVote ? 'order-1 p-5' : 'order-2 p-4'}`}
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

      <Panel className="p-3 sm:p-4" data-testid="vote-timetable-pill">
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
      </Panel>

      <Panel className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="home-secondary-links">
        <div className="min-w-0">
          <Eyebrow>Data sources</Eyebrow>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Convex voting state and Votium incentive data are read separately.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link to="/proposal/latest" className="ui-interactive inline-flex items-center rounded-full border border-[var(--color-action)]/50 bg-[color:rgba(197,46,240,0.12)] px-3 py-2 font-semibold text-[var(--color-text)]" data-testid="home-latest-proposal-link">Full analytics →</Link>
          <a href="https://www.convexfinance.com/vote/weights/curve" target="_blank" rel="noreferrer" className="ui-interactive inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2 font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]" data-testid="home-convex-link">Convex Governance ↗</a>
          <a href="https://votium.app" target="_blank" rel="noreferrer" className="ui-interactive inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2 font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Votium ↗</a>
          <span className="inline-flex items-center rounded-full border border-[color:rgba(120,218,228,0.28)] bg-[color:rgba(120,218,228,0.08)] px-3 py-2 text-[var(--color-info)]" data-testid="home-timezone-pill">{timeZone}</span>
        </div>
      </Panel>
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

interface DataState {
  kind: 'pending' | 'error' | 'unmatched' | 'ready'
  label: string
  detail: string
}

export function getLlamaDataState({ hasData, isError, isPending }: { hasData: boolean, isError: boolean, isPending: boolean }): DataState {
  if (isPending) {
    return {
      kind: 'pending',
      label: 'Waiting for Llama',
      detail: 'Incentive data is still loading. Values are unavailable for now.',
    }
  }

  if (isError) {
    return {
      kind: 'error',
      label: 'Llama unavailable',
      detail: 'Could not load incentive data. This is not a zero-incentive result.',
    }
  }

  if (!hasData) {
    return {
      kind: 'unmatched',
      label: 'No matching Llama round',
      detail: 'No incentive snapshot matches this Convex window. This is not a zero-incentive result.',
    }
  }

  return {
    kind: 'ready',
    label: 'Llama updated',
    detail: 'Incentive data is matched to the current Convex window.',
  }
}

function getConvexDataState(query: { data: GaugeRound | null | undefined, isError: boolean, isPending: boolean }): DataState {
  if (query.isPending) {
    return {
      kind: 'pending',
      label: 'Checking Convex',
      detail: 'Loading the current on-chain voting window.',
    }
  }

  if (query.isError) {
    return {
      kind: 'error',
      label: 'Convex unavailable',
      detail: 'Could not load the current on-chain voting window.',
    }
  }

  if (!query.data) {
    return {
      kind: 'unmatched',
      label: 'Between rounds',
      detail: 'Convex has no active voting window right now.',
    }
  }

  return {
    kind: 'ready',
    label: 'Convex current',
    detail: 'On-chain voting data is loaded for the active window.',
  }
}

function DataHealthStrip({
  convexState,
  convexUpdatedAt,
  llamaState,
  llamaUpdatedAt,
}: {
  convexState: DataState
  convexUpdatedAt: number
  llamaState: DataState
  llamaUpdatedAt: number
}) {
  return (
    <Panel className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4" data-testid="home-data-health">
      <DataSourceStatus name="Convex on-chain" state={convexState} updatedAt={convexUpdatedAt} />
      <DataSourceStatus name="Llama incentives" state={llamaState} updatedAt={llamaUpdatedAt} />
    </Panel>
  )
}

function DataSourceStatus({ name, state, updatedAt }: { name: string, state: DataState, updatedAt: number }) {
  const tone = state.kind === 'error' ? 'danger' : state.kind === 'ready' ? 'info' : 'neutral'
  return (
    <div className="ui-panel-inset flex min-w-0 items-start justify-between gap-3 px-3 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-faint)]">{name}</p>
        <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{state.label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--color-text-subtle)]">{state.detail}</p>
        {state.kind === 'ready' && updatedAt > 0
          ? (
              <p className="mt-1 text-[11px] text-[var(--color-text-faint)]">
                Updated
                {' '}
                {formatDateTimeMs(updatedAt)}
              </p>
            )
          : null}
      </div>
      <StatusBadge tone={tone}>{state.kind === 'ready' ? 'Live' : state.kind === 'pending' ? 'Loading' : state.kind === 'error' ? 'Error' : 'Check'}</StatusBadge>
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
