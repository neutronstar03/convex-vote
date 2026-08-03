import type { Address, Hash } from 'viem'
import { getAddress, isAddress } from 'viem'
import { readContract, simulateContract, waitForTransactionReceipt, writeContract } from 'wagmi/actions'
import {
  CONVEX_CURVE_GAUGE_VOTE_ABI,
  CONVEX_CURVE_GAUGE_VOTE_ADDRESS,
  CONVEX_GAUGE_WEIGHT_TOTAL,
} from '../../lib/abi/convex-gauge-vote'
import { wagmiConfig } from '../wallet/wagmi'

const DECIMAL_PROPOSAL_ID_PATTERN = /^\d+$/

export interface SubmitVoteParams {
  proposalId: bigint | number | string
  proposalStart: bigint | number
  proposalEnd: bigint | number
  allocations: Record<string, number> // Gauge address -> percentage.
  account: Address
}

export interface SubmitVoteResult {
  id: Hash
  transactionHash: Hash
  blockNumber: bigint
}

export async function submitVote(params: SubmitVoteParams): Promise<SubmitVoteResult> {
  const { proposalId, proposalStart, proposalEnd, allocations, account } = params

  if (!isAddress(account)) {
    throw new Error('Invalid voting account address.')
  }

  const normalizedAllocations = normalizeGaugeAllocations(allocations)
  const displayedProposalId = parseProposalId(proposalId)
  const displayedStart = parseTimestamp(proposalStart)
  const displayedEnd = parseTimestamp(proposalEnd)

  if (displayedEnd <= displayedStart) {
    throw new Error('Invalid Convex proposal voting window.')
  }

  // vote() implicitly targets the contract's latest proposal. Check immediately
  // before simulation so a stale tab cannot submit against a different round.
  const proposalCount = await readContract(wagmiConfig, {
    address: CONVEX_CURVE_GAUGE_VOTE_ADDRESS,
    abi: CONVEX_CURVE_GAUGE_VOTE_ABI,
    functionName: 'proposalCount',
    chainId: 1,
  })

  if (proposalCount === 0n || displayedProposalId !== proposalCount - 1n) {
    throw new Error('This voting round is no longer current. Refresh the page before voting.')
  }

  const [onchainProposal, isFinalized, maxWeight] = await Promise.all([
    readContract(wagmiConfig, {
      address: CONVEX_CURVE_GAUGE_VOTE_ADDRESS,
      abi: CONVEX_CURVE_GAUGE_VOTE_ABI,
      functionName: 'proposals',
      args: [displayedProposalId],
      chainId: 1,
    }),
    readContract(wagmiConfig, {
      address: CONVEX_CURVE_GAUGE_VOTE_ADDRESS,
      abi: CONVEX_CURVE_GAUGE_VOTE_ABI,
      functionName: 'isFinalized',
      args: [displayedProposalId],
      chainId: 1,
    }),
    readContract(wagmiConfig, {
      address: CONVEX_CURVE_GAUGE_VOTE_ADDRESS,
      abi: CONVEX_CURVE_GAUGE_VOTE_ABI,
      functionName: 'max_weight',
      chainId: 1,
    }),
  ])

  if (BigInt(onchainProposal[0]) !== displayedStart || BigInt(onchainProposal[1]) !== displayedEnd) {
    throw new Error('The displayed voting window does not match the active Convex round. Refresh the page before voting.')
  }

  if (isFinalized) {
    throw new Error('This voting round has been finalized. Refresh the page to load the next round.')
  }

  if (maxWeight !== CONVEX_GAUGE_WEIGHT_TOTAL) {
    throw new Error('Convex voting parameters changed. Refresh the application before voting.')
  }

  const simulation = await simulateContract(wagmiConfig, {
    address: CONVEX_CURVE_GAUGE_VOTE_ADDRESS,
    abi: CONVEX_CURVE_GAUGE_VOTE_ABI,
    functionName: 'vote',
    args: [account, normalizedAllocations.map(item => item.gauge), normalizedAllocations.map(item => item.weight)],
    account,
    chainId: 1,
  })

  const transactionHash = await writeContract(wagmiConfig, simulation.request)
  const receipt = await waitForTransactionReceipt(wagmiConfig, {
    hash: transactionHash,
    chainId: 1,
  })

  if (receipt.status !== 'success') {
    throw new Error('The Convex vote transaction reverted.')
  }

  return {
    id: transactionHash,
    transactionHash,
    blockNumber: receipt.blockNumber,
  }
}

export interface NormalizedGaugeAllocation {
  gauge: Address
  weight: bigint
}

/**
 * Converts percentage-like values into the contract's 1,000,000 weight scale.
 * Largest-remainder rounding and address sorting make the result repeatable.
 */
export function normalizeGaugeAllocations(allocations: Record<string, number>): NormalizedGaugeAllocation[] {
  const allocationsByGauge = new Map<Address, number>()

  Object.entries(allocations).forEach(([gauge, allocation]) => {
    if (!Number.isFinite(allocation) || allocation < 0) {
      throw new Error(`Invalid allocation for gauge ${gauge}`)
    }

    if (allocation === 0) {
      return
    }

    if (!isAddress(gauge)) {
      throw new Error(`Invalid gauge address: ${gauge}`)
    }

    const normalizedGauge = getAddress(gauge)
    allocationsByGauge.set(normalizedGauge, (allocationsByGauge.get(normalizedGauge) ?? 0) + allocation)
  })

  const entries = Array.from(allocationsByGauge.entries(), ([gauge, allocation]) => ({ gauge, allocation }))
    .sort((a, b) => a.gauge.toLowerCase().localeCompare(b.gauge.toLowerCase()))

  if (entries.length === 0) {
    throw new Error('Select at least one gauge to vote for.')
  }

  const allocationTotal = entries.reduce((sum, entry) => sum + entry.allocation, 0)

  if (!Number.isFinite(allocationTotal) || allocationTotal <= 0) {
    throw new Error('The total gauge allocation must be greater than zero.')
  }

  const scaled = entries.map((entry) => {
    const exactWeight = (entry.allocation / allocationTotal) * Number(CONVEX_GAUGE_WEIGHT_TOTAL)
    const floorWeight = Math.floor(exactWeight)

    return {
      ...entry,
      floorWeight,
      remainder: exactWeight - floorWeight,
    }
  })
  const allocatedWeight = scaled.reduce((sum, entry) => sum + entry.floorWeight, 0)
  const remainingWeight = Number(CONVEX_GAUGE_WEIGHT_TOTAL) - allocatedWeight
  const remainderOrder = [...scaled].sort((a, b) => b.remainder - a.remainder
    || a.gauge.toLowerCase().localeCompare(b.gauge.toLowerCase()))
  const bonuses = new Map(remainderOrder.slice(0, remainingWeight).map(entry => [entry.gauge, 1]))

  return scaled.map(entry => ({
    gauge: entry.gauge,
    weight: BigInt(entry.floorWeight + (bonuses.get(entry.gauge) ?? 0)),
  }))
}

function parseProposalId(proposalId: SubmitVoteParams['proposalId']): bigint {
  if (typeof proposalId === 'bigint') {
    if (proposalId < 0n)
      throw new Error('Invalid Convex proposal id.')
    return proposalId
  }

  if (typeof proposalId === 'number') {
    if (!Number.isSafeInteger(proposalId) || proposalId < 0)
      throw new Error('Invalid Convex proposal id.')
    return BigInt(proposalId)
  }

  if (!DECIMAL_PROPOSAL_ID_PATTERN.test(proposalId)) {
    throw new Error('Invalid Convex proposal id.')
  }

  return BigInt(proposalId)
}

function parseTimestamp(value: bigint | number): bigint {
  if (typeof value === 'bigint') {
    if (value < 0n)
      throw new Error('Invalid Convex proposal timestamp.')
    return value
  }

  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('Invalid Convex proposal timestamp.')
  }

  return BigInt(value)
}
