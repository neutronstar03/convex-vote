import type { GaugeRound, GaugeVote, PoolRow } from '../proposal/types'
import type { LlamaBribe, LlamaEpoch } from './types'
import { normalizeAddress } from '../proposal/utils'

function getGaugeAddressKeys(gauge: Pick<GaugeVote, 'gaugeAddress' | 'rootGaugeAddress'>) {
  return [normalizeAddress(gauge.rootGaugeAddress), normalizeAddress(gauge.gaugeAddress)]
}

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

function getBribesByGauge(epoch: LlamaEpoch | null) {
  const result = new Map<string, LlamaBribe[]>()

  for (const bribe of epoch?.bribes ?? []) {
    const key = normalizeAddress(bribe.gauge)
    const bribes = result.get(key) ?? []
    bribes.push(bribe)
    result.set(key, bribes)
  }

  return result
}

export function getBribedGaugeKeys(epoch: LlamaEpoch | null) {
  return [...new Set((epoch?.bribes ?? []).map(bribe => normalizeAddress(bribe.gauge)))]
}

export function getBribedVotesTotal(round: GaugeRound, epoch: LlamaEpoch | null) {
  const bribedKeys = new Set(getBribedGaugeKeys(epoch))

  return round.gauges.reduce((total, gauge) => {
    const isBribed = getGaugeAddressKeys(gauge).some(key => bribedKeys.has(key))
    return total + (isBribed ? gauge.votes : 0)
  }, 0)
}

export function mergeProposalAndEpoch(round: GaugeRound, epoch: LlamaEpoch | null): PoolRow[] {
  const bribesByGauge = getBribesByGauge(epoch)

  return round.gauges.map((gauge) => {
    const bribes = getGaugeAddressKeys(gauge)
      .map(key => bribesByGauge.get(key))
      .find((candidate): candidate is LlamaBribe[] => candidate !== undefined) ?? []
    const incentiveUsd = bribes.reduce((sum, bribe) => sum + bribe.amountDollars, 0)

    return {
      choiceKey: gauge.key,
      label: gauge.label,
      votes: gauge.votes,
      voteShare: round.totalVotes > 0 ? gauge.votes / round.totalVotes : 0,
      incentiveUsd,
      rewardEfficiency: incentiveUsd > 0 && gauge.votes > 0 ? incentiveUsd / gauge.votes : null,
      gaugeAddress: gauge.gaugeAddress,
      rootGaugeAddress: gauge.rootGaugeAddress,
      poolAddress: gauge.poolAddress,
      blockchainId: gauge.blockchainId,
      poolUrls: gauge.poolUrls,
      bribeTokens: bribes.map(bribe => ({
        symbol: bribe.token,
        amount: bribe.amount,
        amountUsd: bribe.amountDollars,
      })),
    }
  })
}

export function getBribeDataAnomaly(
  proposal: GaugeRound,
  currentEpoch: LlamaEpoch | null,
  previousEpoch: LlamaEpoch | null,
  now = Date.now(),
): BribeDataAnomaly | null {
  if (proposal.state !== 'active' || !currentEpoch || !previousEpoch) {
    return null
  }

  const previousBribedGaugeCount = getBribedGaugeKeys(previousEpoch).length
  const currentBribedGaugeCount = getBribedGaugeKeys(currentEpoch).length

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
