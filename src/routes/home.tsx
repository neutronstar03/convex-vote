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
    ? 'border-violet-400/30 bg-violet-500/15 text-violet-100'
    : voteWindow?.status === 'open'
        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
        : 'border-slate-400/20 bg-white/5 text-slate-200'

  return (
    <AppShell>
      {proposal
        ? (
            <VoteSummaryStats
              roundNumber={epochQuery.data?.round}
              totalVotes={summaryVotes}
              totalIncentivesUsd={totalIncentivesUsd}
              deadline={proposal.end}
              countdown={voteWindow?.timerValue ?? '—'}
            />
          )
        : null}

      <section className="grid gap-3 lg:grid-cols-[1.45fr_0.8fr]" data-testid="home-top-row">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-violet-950/10" data-testid="home-hero-pill">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-300" data-testid="home-current-vote-pill">
                  {proposalQuery.isPending ? 'Loading vote…' : currentVoteLabel}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${urgencyClass}`} data-testid="home-vote-status-pill">
                  {voteWindow?.label ?? 'Unavailable'}
                </span>
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white" data-testid="home-hero-title">
                  {proposal?.title ?? 'Loading current Convex vote…'}
                </h1>
                <p className="mt-2 text-sm text-slate-400" data-testid="home-local-time">
                  Local time {formatDateTimeMs(now)} · {timeZone}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/proposal/latest"
                data-testid="home-open-proposal-link"
                className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
              >
                Open proposal
                <ArrowRight className="size-4" />
              </Link>
              <a
                href={snapshotProposalUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="home-official-snapshot-link"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/5"
              >
                Official Snapshot
                <ExternalLink className="size-4" />
              </a>
            </div>
          </div>
        </div>

        {isConnected && (
          <aside className="rounded-3xl border border-white/10 bg-slate-900/80 p-4" data-testid="wallet-vote-recap-pill">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Current wallet vote</p>
            <p className="mt-2 text-sm font-medium text-white">{shortAddress(address)}</p>

            {voteQuery.isPending
              ? <p className="mt-3 text-sm text-slate-400">Loading your current vote…</p>
              : voteQuery.data
                ? (
                    <>
                      <p className="mt-3 text-sm text-slate-300">
                        Voting power: {formatNumber(voteQuery.data.vp, 0)}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-300" data-testid="wallet-vote-recap-list">
                        {voteRecap.slice(0, 4).map(item => (
                          <li key={item.label} className="flex items-start justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2">
                            <span className="min-w-0 truncate">{item.label}</span>
                            <span className="shrink-0 font-medium text-white">{item.weight.toFixed(2)}%</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                : <p className="mt-3 text-sm text-slate-400">No vote found yet for this wallet on the current proposal.</p>}
          </aside>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-4" data-testid="vote-timetable-pill">
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

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-4" data-testid="home-secondary-links">
        <div className="flex flex-wrap gap-3">
          <Link
            to="/proposal/latest"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5"
            data-testid="home-latest-proposal-link"
          >
            Full proposal analytics
          </Link>
          <a
            href="https://snapshot.box/#/cvx.eth"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5"
            data-testid="home-space-link"
          >
            cvx.eth space
          </a>
          <span className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm text-slate-400" data-testid="home-timezone-pill">
            {timeZone}
          </span>
        </div>
      </section>
    </AppShell>
  )
}

function TimetableItem({ label, value, detail, testId }: { label: string, value: string, detail: string, testId: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4" data-testid={testId}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <h2 className="mt-2 text-base font-semibold text-white">{value}</h2>
      <p className="mt-1 text-sm text-slate-400">{detail}</p>
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
