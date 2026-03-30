import { useParams } from 'react-router'
import { AppShell } from '../components/layout/app-shell'
import { useResolvedProposal } from '../features/proposal/queries'
import { useEpochForProposal } from '../features/incentives/queries'
import { mergeProposalAndEpoch } from '../features/incentives/utils'
import { formatDateTime, formatNumber, formatPercent, formatUsd } from '../lib/format'
import { getCountdownParts } from '../features/proposal/utils'

export function ProposalRoute() {
  const { proposalId } = useParams()
  const proposalQuery = useResolvedProposal(proposalId)
  const epochQuery = useEpochForProposal(proposalQuery.data?.id)

  if (proposalQuery.isPending) {
    return (
      <AppShell>
        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-300">
          Loading proposal…
        </section>
      </AppShell>
    )
  }

  if (proposalQuery.isError) {
    return (
      <AppShell>
        <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-red-100">
          Failed to load proposal: {proposalQuery.error.message}
        </section>
      </AppShell>
    )
  }

  const proposal = proposalQuery.data
  const epoch = epochQuery.data ?? null
  const rows = mergeProposalAndEpoch(proposal, epoch)
    .sort((a, b) => (b.incentiveUsd ?? 0) - (a.incentiveUsd ?? 0) || b.snapshotVotes - a.snapshotVotes)
    .slice(0, 12)
  const countdown = getCountdownParts(proposal.end)

  return (
    <AppShell>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 xl:col-span-2">
          <p className="text-sm uppercase tracking-[0.24em] text-violet-200">Live Snapshot round</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{proposal.title}</h1>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <MetricCard label="Status" value={proposal.state} />
            <MetricCard label="Ends in" value={`${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`} />
            <MetricCard label="Total votes" value={formatNumber(proposal.scores_total, 0)} />
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Round details</h2>
          <dl className="mt-4 space-y-3 text-sm text-slate-300">
            <DetailRow label="Snapshot id" value={proposal.id.slice(0, 10)} />
            <DetailRow label="Start" value={formatDateTime(proposal.start)} />
            <DetailRow label="End" value={formatDateTime(proposal.end)} />
            <DetailRow label="Llama round" value={epoch ? String(epoch.round) : epochQuery.isPending ? 'Loading…' : 'Not matched'} />
          </dl>
        </article>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-violet-200">Pool recap</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Top bribed pools</h2>
          </div>
          <p className="text-sm text-slate-400">Showing first 12 rows sorted by incentive USD.</p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">Pool</th>
                <th className="px-4 py-2 font-medium">Votes</th>
                <th className="px-4 py-2 font-medium">Vote share</th>
                <th className="px-4 py-2 font-medium">Incentives</th>
                <th className="px-4 py-2 font-medium">$/vote</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.choiceKey} className="rounded-2xl bg-white/5 text-slate-200">
                  <td className="rounded-l-2xl px-4 py-3 align-top">
                    <div className="font-medium text-white">{row.label}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Choice #{row.choiceIndex}
                      {row.bribeTokens.length > 0 ? ` · ${row.bribeTokens.map(token => token.symbol).join(', ')}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatNumber(row.snapshotVotes, 0)}</td>
                  <td className="px-4 py-3">{formatPercent(row.voteShare)}</td>
                  <td className="px-4 py-3">{formatUsd(row.incentiveUsd)}</td>
                  <td className="rounded-r-2xl px-4 py-3">{formatUsd(row.rewardEfficiency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}

function MetricCard({ label, value }: { label: string, value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right text-slate-100">{value}</dd>
    </div>
  )
}
