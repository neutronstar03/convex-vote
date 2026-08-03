import type { GaugeRound, GaugeVote, PoolRow } from '../proposal/types'
import type { LlamaBribe, LlamaEpoch } from './types'
import { normalizeAddress } from '../proposal/utils'

function getGaugeAddressKeys(gauge: Pick<GaugeVote, 'gaugeAddress' | 'rootGaugeAddress'>) {
  return [normalizeAddress(gauge.rootGaugeAddress), normalizeAddress(gauge.gaugeAddress)]
}

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
