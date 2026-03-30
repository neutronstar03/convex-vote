import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { Link } from 'react-router'
import { useAccount } from 'wagmi'
import { AppShell } from '../components/layout/app-shell'
import { VoteSummaryStats } from '../components/shared/vote-summary-stats'
import { useEpochForProposal } from '../features/incentives/queries'
import { getBribedVotesTotal } from '../features/incentives/utils'
import { useRecentGaugeProposals, useResolvedProposal, useUserVote } from '../features/proposal/queries'
import { getCountdownParts, getEstimatedNextVoteStart } from '../features/proposal/utils'
import type { SnapshotProposal, SnapshotVote } from '../features/proposal/types'
import { formatDateCompact, formatDateTimeCompact, formatDateTimeMs, formatNumber, getCurrentTimeZone } from '../lib/format'

export function HomeRoute() {
  const { address, isConnected } = useAccount()
  const proposalQuery = useResolvedProposal()
  const recentProposalsQuery = useRecentGaugeProposals()
  const epochQuery = useEpochForProposal(proposalQuery.data?.id)
  const voteQuery = useUserVote(proposalQuery.data?.id, address)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  const timeZone = useMemo(() => getCurrentTimeZone(), [])
  const proposal = proposalQuery.data
  const voteWindow = proposal ? getVoteWindowState(proposal.start, proposal.end, now) : null
  const nextVoteStart = proposal && recentProposalsQuery.data
    ? getEstimatedNextVoteStart(recentProposalsQuery.data, proposal)
    : null
  const currentVoteLabel = epochQuery.data?.round ? `Current vote ${epochQuery.data.round}` : 'Current vote'
  const snapshotProposalUrl = proposal ? `https://snapshot.box/#/cvx.eth/proposal/${proposal.id}` : 'https://snapshot.box/#/cvx.eth'
  const voteRecap = proposal && voteQuery.data ? getVoteRecap(voteQuery.data, proposal) : []
  const totalIncentivesUsd = epochQuery.data?.bribes.reduce((sum, bribe) => sum + bribe.amountDollars, 0)
  const summaryVotes = proposal ? getBribedVotesTotal(proposal, epochQuery.data ?? null) : 0
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
              totalVotes={summaryVotes}
              totalIncentivesUsd={totalIncentivesUsd}
              start={proposal.start}
              deadline={proposal.end}
              countdown={voteWindow?.timerValue ?? '—'}
            />
          )
        : null}

      <section className="grid gap-3 lg:grid-cols-[1.45fr_0.8fr]" data-testid="home-top-row">
        <div className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-5" data-testid="home-hero-pill">
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
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--cloud-tint)]" data-testid="home-hero-title">
                  {proposal?.title ?? 'Loading current Convex vote…'}
                </h1>
                <p className="mt-2 text-sm text-[var(--dust-tint)]" data-testid="home-local-time">
                  Local time {formatDateTimeMs(now)} · {timeZone}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/proposal/latest"
                data-testid="home-open-proposal-link"
                className="inline-flex items-center gap-2 rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110"
              >
                Open proposal
                <ArrowRight className="size-4" />
              </Link>
              <a
                href={snapshotProposalUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="home-official-snapshot-link"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:bg-[var(--gunmetal-mist)]"
              >
                Official Snapshot
                <ExternalLink className="size-4" />
              </a>
            </div>
          </div>
        </div>

        {isConnected && (
          <aside className="rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-4" data-testid="wallet-vote-recap-pill">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--fog-tint)]">Current wallet vote</p>
            <p className="mt-2 text-sm font-medium text-[var(--cloud-tint)]">{shortAddress(address)}</p>

            {voteQuery.isPending
              ? <p className="mt-3 text-sm text-[var(--dust-tint)]">Loading your current vote…</p>
              : voteQuery.data
                ? (
                    <>
                      <p className="mt-3 text-sm text-[var(--dust-tint)]">
                        Voting power: {formatNumber(voteQuery.data.vp, 0)}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-[var(--dust-tint)]" data-testid="wallet-vote-recap-list">
                        {voteRecap.slice(0, 4).map(item => (
                          <li key={item.label} className="flex items-start justify-between gap-3 rounded-md border border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/55 px-3 py-2">
                            <span className="min-w-0 truncate">{item.label}</span>
                            <span className="shrink-0 font-medium text-[var(--lime-cream)]">{item.weight.toFixed(2)}%</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                : <p className="mt-3 text-sm text-[var(--dust-tint)]">No vote found yet for this wallet on the current proposal.</p>}
          </aside>
        )}
      </section>

      <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-4" data-testid="vote-timetable-pill">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <TimetableItem
            label="Current vote"
            value={epochQuery.data?.round ? `#${epochQuery.data.round}` : proposalQuery.isPending ? 'Loading…' : 'Unknown'}
            detail={proposal ? `${formatDateCompact(proposal.start)} → ${formatDateCompact(proposal.end)}` : 'Fetching latest proposal'}
            testId="current-vote-number"
          />
          <TimetableItem
            label="Window"
            value={proposal ? `${formatDateTimeCompact(proposal.start)} → ${formatDateTimeCompact(proposal.end)}` : '—'}
            detail={proposal ? `Shown in ${timeZone}` : 'Waiting for Snapshot data'}
            testId="current-vote-window"
          />
          <TimetableItem
            label={voteWindow?.timerLabel ?? 'Time left'}
            value={voteWindow?.timerValue ?? '—'}
            detail={voteWindow?.timerDescription ?? 'Current vote timer unavailable'}
            testId="current-vote-timer"
          />
          <TimetableItem
            label="Next vote"
            value={nextVoteStart ? formatDateTimeCompact(nextVoteStart) : 'Unknown'}
            detail={nextVoteStart ? 'Estimated from previous gauge cadence' : 'Not enough recent cadence data'}
            testId="next-vote-estimate"
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
            href="https://snapshot.box/#/cvx.eth"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm text-[var(--cloud-tint)] transition hover:bg-[var(--gunmetal-mist)]"
            data-testid="home-space-link"
          >
            cvx.eth space
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

function getVoteRecap(vote: SnapshotVote, proposal: SnapshotProposal) {
  if (typeof vote.choice === 'number') {
    return [{ label: proposal.choices[vote.choice - 1] ?? `Choice ${vote.choice}`, weight: 100.00 }]
  }

  const entries = Object.entries(vote.choice)
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)

  if (total <= 0) {
    return []
  }

  return entries
    .map(([choiceKey, weight]) => ({
      label: proposal.choices[Number(choiceKey) - 1] ?? `Choice ${choiceKey}`,
      weight: Number(((weight / total) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.weight - a.weight)
}

function shortAddress(address?: string) {
  if (!address) {
    return 'Wallet'
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
