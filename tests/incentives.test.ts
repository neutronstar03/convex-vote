import type { LlamaEpoch } from '../src/features/incentives/types'
import type { GaugeRound, HexAddress } from '../src/features/proposal/types'
import { afterEach, describe, expect, it } from 'bun:test'
import { fetchLatestEpochForRound } from '../src/features/incentives/api'
import { getBribeDataAnomaly, mergeProposalAndEpoch } from '../src/features/incentives/utils'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Llama incentive data', () => {
  it('only attaches the latest Llama epoch to the exact Convex voting window', async () => {
    mockLatestEpoch(epoch({ round: 131, end: 2_000, gaugeCount: 1, bribesUsd: 10 }))
    await expect(fetchLatestEpochForRound(2_000)).resolves.toMatchObject({ round: 131 })

    mockLatestEpoch(epoch({ round: 131, end: 2_000, gaugeCount: 1, bribesUsd: 10 }))
    await expect(fetchLatestEpochForRound(2_001)).resolves.toBeNull()
  })

  it('matches incentives by either gauge or root-gauge address', () => {
    const gauge = address(1)
    const rootGauge = address(2)
    const round = gaugeRound({ gauge, rootGauge })
    const currentEpoch = epoch({ round: 131, end: round.end, gaugeCount: 0, bribesUsd: 0 })
    currentEpoch.bribes = [bribe(rootGauge, 42)]

    expect(mergeProposalAndEpoch(round, currentEpoch)[0]).toMatchObject({
      incentiveUsd: 42,
      bribeTokens: [{ symbol: 'TEST', amountUsd: 42 }],
    })
  })

  it('reports a severe drop using distinct Llama bribe gauge addresses', () => {
    const proposal = gaugeRound({ start: 0, end: 500_000, state: 'active' })
    const current = epoch({ round: 131, end: proposal.end, gaugeCount: 3, bribesUsd: 90 })
    current.bribes.push(bribe(current.bribes[0].gauge, 10))
    const previous = epoch({ round: 130, end: 100_000, gaugeCount: 10, bribesUsd: 1_000 })

    expect(getBribeDataAnomaly(proposal, current, previous, 300_000_000)).toMatchObject({
      severity: 'severe',
      currentRound: 131,
      previousRound: 130,
      currentBribedGaugeCount: 3,
      previousBribedGaugeCount: 10,
      currentBribesUsd: 100,
      previousBribesUsd: 1_000,
    })
  })

  it('does not label a non-adjacent or chronologically invalid epoch as the previous round', () => {
    const proposal = gaugeRound({ start: 0, end: 500_000, state: 'active' })
    const current = epoch({ round: 131, end: proposal.end, gaugeCount: 3, bribesUsd: 90 })

    expect(getBribeDataAnomaly(
      proposal,
      current,
      epoch({ round: 129, end: 100_000, gaugeCount: 10, bribesUsd: 1_000 }),
      300_000_000,
    )).toBeNull()

    expect(getBribeDataAnomaly(
      proposal,
      current,
      epoch({ round: 130, end: 600_000, gaugeCount: 10, bribesUsd: 1_000 }),
      300_000_000,
    )).toBeNull()
  })

  it('suppresses the comparison early in a round with more than two days remaining', () => {
    const proposal = gaugeRound({ start: 0, end: 500_000, state: 'active' })
    const current = epoch({ round: 131, end: proposal.end, gaugeCount: 3, bribesUsd: 90 })
    const previous = epoch({ round: 130, end: 100_000, gaugeCount: 10, bribesUsd: 1_000 })

    expect(getBribeDataAnomaly(proposal, current, previous, 50_000_000)).toBeNull()
  })
})

function mockLatestEpoch(value: LlamaEpoch) {
  let request = 0
  globalThis.fetch = (() => {
    request += 1
    const body = request === 1
      ? { rounds: [value.round] }
      : { epoch: value }
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
  }) as typeof fetch
}

function gaugeRound({
  gauge = address(1),
  rootGauge = gauge,
  start = 1_000,
  end = 2_000,
  state = 'active',
}: {
  gauge?: HexAddress
  rootGauge?: HexAddress
  start?: number
  end?: number
  state?: GaugeRound['state']
} = {}): GaugeRound {
  return {
    id: `convex-curve:236:${end}`,
    source: 'convex',
    platform: 'curve',
    proposalId: 3,
    epoch: 236,
    title: 'Test round',
    state,
    start,
    end,
    totalVotes: 100,
    voterCount: 1,
    gauges: [{
      id: '1',
      key: rootGauge.toLowerCase(),
      label: 'Test gauge',
      blockchainId: 'ethereum',
      gaugeAddress: gauge,
      rootGaugeAddress: rootGauge,
      poolAddress: null,
      coins: [],
      poolUrls: [],
      votes: 100,
    }],
  }
}

function epoch({ round, end, gaugeCount, bribesUsd }: { round: number, end: number, gaugeCount: number, bribesUsd: number }): LlamaEpoch {
  const perGauge = gaugeCount > 0 ? bribesUsd / gaugeCount : 0
  return {
    id: `votium-cvx-crv-${round}`,
    round,
    proposal: String(round),
    voteSource: 'convex-onchain',
    end,
    scoresTotal: 100,
    bribed: {},
    bribes: Array.from({ length: gaugeCount }, (_, index) => bribe(address(index + 10), perGauge)),
  }
}

function bribe(gauge: HexAddress, amountDollars: number) {
  return {
    pool: 'Test pool',
    token: 'TEST',
    gauge,
    amount: amountDollars,
    amountDollars,
  }
}

function address(value: number): HexAddress {
  return `0x${value.toString(16).padStart(40, '0')}` as HexAddress
}
