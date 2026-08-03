import type { Address } from 'viem'
import { formatUnits } from 'viem'
import { useReadContract } from 'wagmi'
import {
  CONVEX_CURVE_GAUGE_VOTE_ABI,
  CONVEX_CURVE_GAUGE_VOTE_ADDRESS,
  CONVEX_GAUGE_WEIGHT_TOTAL,
} from '../../lib/abi/convex-gauge-vote'

export interface ConvexUserVote {
  gauges: Address[]
  weights: bigint[]
  weightByGauge: Record<string, bigint>
  allocationPercentages: Record<string, number>
  voted: boolean
  baseWeight: bigint
  adjustedWeight: bigint
  effectiveWeight: bigint
  baseVotingPower: number
  adjustedVotingPower: number
  votingPower: number
}

export function useConvexUserVote(proposalId?: bigint | number, account?: Address) {
  const enabled = proposalId !== undefined && account !== undefined

  return useReadContract({
    address: CONVEX_CURVE_GAUGE_VOTE_ADDRESS,
    abi: CONVEX_CURVE_GAUGE_VOTE_ABI,
    functionName: 'getVote',
    args: [BigInt(proposalId ?? 0), account ?? CONVEX_CURVE_GAUGE_VOTE_ADDRESS],
    chainId: 1,
    query: {
      enabled,
      select: parseConvexUserVote,
    },
  })
}

function parseConvexUserVote(result: readonly [readonly Address[], readonly bigint[], boolean, bigint, bigint]): ConvexUserVote {
  const [rawGauges, rawWeights, voted, baseWeight, adjustedWeight] = result
  const gauges = [...rawGauges]
  const weights = [...rawWeights]

  if (gauges.length !== weights.length) {
    throw new Error('Convex returned mismatched gauge and weight arrays.')
  }

  const weightByGauge: Record<string, bigint> = {}
  const allocationPercentages: Record<string, number> = {}

  gauges.forEach((gauge, index) => {
    const key = gauge.toLowerCase()
    const weight = weights[index]
    weightByGauge[key] = weight
    allocationPercentages[key] = Number(weight) / Number(CONVEX_GAUGE_WEIGHT_TOTAL) * 100
  })

  const effectiveWeight = baseWeight + adjustedWeight

  return {
    gauges,
    weights,
    weightByGauge,
    allocationPercentages,
    voted,
    baseWeight,
    adjustedWeight,
    effectiveWeight,
    baseVotingPower: Number(formatUnits(baseWeight, 18)),
    adjustedVotingPower: Number(formatUnits(adjustedWeight, 18)),
    votingPower: Number(formatUnits(effectiveWeight, 18)),
  }
}
