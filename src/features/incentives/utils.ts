import type { PoolRow, SnapshotProposal } from '../proposal/types'
import type { LlamaEpoch } from './types'

export interface BribeDataAnomaly {
  severity: 'info' | 'severe'
  currentBribedGaugeCount: number
  previousBribedGaugeCount: number
  currentBribesUsd: number
  previousBribesUsd: number
  gaugeCountDrop: number
  bribesUsdDrop: number
  roundProgress: number
  tooltip: string
}

const MIN_PREVIOUS_BRIBED_GAUGES = 10
const MIN_ROUND_PROGRESS = 0.2
const LOW_DATA_DROP_THRESHOLD = 0.5
const SEVERE_GAUGE_DROP_THRESHOLD = 0.75
const SEVERE_USD_DROP_THRESHOLD = 0.8
const TWO_DAYS_SECONDS = 48 * 60 * 60

function toSnapshotChoiceIndex(choice?: number) {
  if (typeof choice !== 'number' || choice < 0) {
    return undefined
  }

  return choice + 1
}

export function getBribedChoiceIndexes(epoch: LlamaEpoch | null) {
  return [...new Set(
    (epoch?.bribes ?? [])
      .map(bribe => toSnapshotChoiceIndex(bribe.choice))
      .filter((choice): choice is number => typeof choice === 'number' && choice > 0),
  )]
}

export function getBribedVotesTotal(proposal: SnapshotProposal, epoch: LlamaEpoch | null) {
  const bribedChoices = getBribedChoiceIndexes(epoch)

  if (bribedChoices.length === 0) {
    return proposal.scores_total
  }

  return bribedChoices.reduce((sum, choiceIndex) => sum + (proposal.scores[choiceIndex - 1] ?? 0), 0)
}

export function mergeProposalAndEpoch(proposal: SnapshotProposal, epoch: LlamaEpoch | null): PoolRow[] {
  const bribesByChoice = new Map<number, PoolRow['bribeTokens']>()
  const incentiveUsdByChoice = new Map<number, number>()
  const gaugeByChoice = new Map<number, string>()

  for (const bribe of epoch?.bribes ?? []) {
    const choiceIndex = toSnapshotChoiceIndex(bribe.choice)

    if (!choiceIndex)
      continue

    const tokens = bribesByChoice.get(choiceIndex) ?? []
    tokens.push({
      symbol: bribe.token,
      amount: bribe.amount,
      amountUsd: bribe.amountDollars,
    })
    bribesByChoice.set(choiceIndex, tokens)
    incentiveUsdByChoice.set(choiceIndex, (incentiveUsdByChoice.get(choiceIndex) ?? 0) + bribe.amountDollars)

    if (bribe.gauge) {
      gaugeByChoice.set(choiceIndex, bribe.gauge)
    }
  }

  return proposal.choices.map((label, index) => {
    const choiceIndex = index + 1
    const snapshotVotes = proposal.scores[index] ?? 0
    const incentiveUsd = incentiveUsdByChoice.get(choiceIndex)

    return {
      choiceIndex,
      choiceKey: String(choiceIndex),
      label,
      snapshotVotes,
      voteShare: proposal.scores_total > 0 ? snapshotVotes / proposal.scores_total : 0,
      incentiveUsd,
      rewardEfficiency: incentiveUsd && snapshotVotes > 0 ? incentiveUsd / snapshotVotes : undefined,
      gaugeAddress: gaugeByChoice.get(choiceIndex),
      bribeTokens: bribesByChoice.get(choiceIndex) ?? [],
    }
  })
}

export function getBribeDataAnomaly(
  proposal: SnapshotProposal,
  currentEpoch: LlamaEpoch | null,
  previousEpoch: LlamaEpoch | null,
  now = Date.now(),
): BribeDataAnomaly | null {
  if (proposal.state.toLowerCase() !== 'active' || !currentEpoch || !previousEpoch) {
    return null
  }

  const previousBribedGaugeCount = getBribedChoiceIndexes(previousEpoch).length
  const currentBribedGaugeCount = getBribedChoiceIndexes(currentEpoch).length

  if (previousBribedGaugeCount < MIN_PREVIOUS_BRIBED_GAUGES) {
    return null
  }

  const durationSeconds = proposal.end - proposal.start
  const elapsedSeconds = (now / 1000) - proposal.start
  const roundProgress = durationSeconds > 0 ? Math.min(Math.max(elapsedSeconds / durationSeconds, 0), 1) : 0
  const secondsRemaining = proposal.end - (now / 1000)

  if (roundProgress < MIN_ROUND_PROGRESS && secondsRemaining > TWO_DAYS_SECONDS) {
    return null
  }

  const currentBribesUsd = getEpochBribesUsd(currentEpoch)
  const previousBribesUsd = getEpochBribesUsd(previousEpoch)

  if (previousBribesUsd <= 0) {
    return null
  }

  const gaugeCountDrop = getDropRatio(currentBribedGaugeCount, previousBribedGaugeCount)
  const bribesUsdDrop = getDropRatio(currentBribesUsd, previousBribesUsd)

  if (gaugeCountDrop < LOW_DATA_DROP_THRESHOLD || bribesUsdDrop < LOW_DATA_DROP_THRESHOLD) {
    return null
  }

  const severity = gaugeCountDrop >= SEVERE_GAUGE_DROP_THRESHOLD || bribesUsdDrop >= SEVERE_USD_DROP_THRESHOLD
    ? 'severe'
    : 'info'

  return {
    severity,
    currentBribedGaugeCount,
    previousBribedGaugeCount,
    currentBribesUsd,
    previousBribesUsd,
    gaugeCountDrop,
    bribesUsdDrop,
    roundProgress,
    tooltip: `${currentBribedGaugeCount} bribed gauges vs ${previousBribedGaugeCount} last round. Active-round incentive data may still be updating.`,
  }
}

function getEpochBribesUsd(epoch: LlamaEpoch) {
  return epoch.bribes.reduce((sum, bribe) => sum + bribe.amountDollars, 0)
}

function getDropRatio(current: number, previous: number) {
  if (previous <= 0) {
    return 0
  }

  return Math.max(0, (previous - current) / previous)
}
