import { formatCompactNumber, formatCompactUsd } from '../../lib/format'
import { Metric, Panel } from '../ui/primitives'

interface VoteSummaryStatsProps {
  roundNumber?: number | null
  totalVotes: number
  efficiencyVotes?: number
  totalIncentivesUsd?: number
}

export function VoteSummaryStats({ roundNumber, totalVotes, efficiencyVotes = totalVotes, totalIncentivesUsd }: VoteSummaryStatsProps) {
  const dollarsPerVote = totalIncentivesUsd !== undefined && efficiencyVotes > 0
    ? totalIncentivesUsd / efficiencyVotes
    : undefined

  const items: Array<{ label: string, value: string, detail?: string, testId: string }> = [
    {
      label: 'Round',
      value: roundNumber ? String(roundNumber) : '—',
      detail: 'Convex gauge vote',
      testId: 'summary-round-number',
    },
    {
      label: 'On-chain votes',
      value: formatCompactNumber(totalVotes),
      detail: 'vlCVX allocated',
      testId: 'summary-total-votes',
    },
    {
      label: 'Incentives',
      value: formatCompactUsd(totalIncentivesUsd),
      detail: 'Votium / Llama reported',
      testId: 'summary-total-incentives',
    },
    {
      label: 'Bribe efficiency',
      value: dollarsPerVote === undefined ? '—' : `$${dollarsPerVote.toFixed(5)}`,
      detail: 'USD per vlCVX',
      testId: 'summary-reward-rate',
    },
  ]

  return (
    <Panel className="grid gap-px overflow-hidden bg-[var(--color-border-subtle)] md:grid-cols-4" data-testid="vote-summary-stats">
      {items.map(item => (
        <div
          key={item.label}
          className="bg-[var(--color-surface)] px-4 py-4 sm:px-5"
          data-testid={item.testId}
        >
          <Metric label={item.label} value={item.value} detail={item.detail} />
        </div>
      ))}
    </Panel>
  )
}
