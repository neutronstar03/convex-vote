import { formatCompactNumber, formatCompactUsd } from '../../lib/format'

interface VoteSummaryStatsProps {
  roundNumber?: number | null
  totalVotes: number
  totalIncentivesUsd?: number
}

export function VoteSummaryStats({ roundNumber, totalVotes, totalIncentivesUsd }: VoteSummaryStatsProps) {
  const dollarsPerVote = totalIncentivesUsd !== undefined && totalVotes > 0
    ? totalIncentivesUsd / totalVotes
    : undefined

  const items = [
    {
      label: 'Round Number',
      value: roundNumber ? String(roundNumber) : '—',
      detail: '',
      trailing: '',
      testId: 'summary-round-number',
    },
    {
      label: 'Votes',
      value: formatCompactNumber(totalVotes),
      detail: '',
      trailing: 'CVX',
      testId: 'summary-total-votes',
    },
    {
      label: 'Total',
      value: formatCompactUsd(totalIncentivesUsd),
      detail: '',
      trailing: '',
      testId: 'summary-total-incentives',
    },
    {
      label: '$/vlCVX',
      value: dollarsPerVote === undefined ? '—' : `$${dollarsPerVote.toFixed(5)}`,
      detail: '',
      trailing: '',
      testId: 'summary-reward-rate',
    },
  ]

  return (
    <section className="grid gap-3 md:grid-cols-4" data-testid="vote-summary-stats">
      {items.map(item => (
        <article
          key={item.label}
          className="rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-3"
          data-testid={item.testId}
        >
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-3xl font-semibold tracking-tight text-[var(--cloud-tint)]">{item.value}</p>
              {item.detail
                ? <p className="mt-1 text-sm text-[var(--pearl-aqua)]">{item.detail}</p>
                : null}
            </div>
            {item.trailing
              ? <span className="shrink-0 text-2xl font-semibold text-[var(--cloud-tint)]">{item.trailing}</span>
              : null}
          </div>
          <p className="mt-2 text-sm text-[var(--fog-tint)]">{item.label}</p>
        </article>
      ))}
    </section>
  )
}
