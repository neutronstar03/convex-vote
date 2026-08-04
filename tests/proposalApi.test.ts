import { afterEach, describe, expect, it } from 'bun:test'
import {
  fetchCurrentGaugeRound,
  fetchProposalById,
  parseCurrentGaugeRound,
} from '../src/features/proposal/api'

const GAUGE_A = '0x0000000000000000000000000000000000000001'
const GAUGE_B = '0x0000000000000000000000000000000000000002'
const POOL_A = '0x0000000000000000000000000000000000000011'
const TOKEN_A = '0x0000000000000000000000000000000000000021'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('current Convex gauge proposal API', () => {
  it('treats a null currentProposal as a valid inter-round response', () => {
    expect(parseCurrentGaugeRound({
      currentProposal: null,
      activeGaugesData: [gauge({
        id: 1,
        name: 'Gauge A',
        gaugeAddress: GAUGE_A,
        rootGaugeAddress: GAUGE_A,
      })],
    })).toBeNull()
  })

  it('keeps the active gauge catalogue and defaults gauges without votes to zero', () => {
    const round = parseCurrentGaugeRound(activePayload())

    expect(round).not.toBeNull()
    expect(round?.proposalId).toBe(128)
    expect(round?.gauges).toHaveLength(2)
    expect(round?.gauges.map(item => ({ key: item.key, votes: item.votes }))).toEqual([
      { key: GAUGE_A, votes: 123.5 },
      { key: GAUGE_B, votes: 0 },
    ])
  })

  it('returns null from the latest-proposal request while between rounds', async () => {
    globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({
      currentProposal: null,
      activeGaugesData: [],
    }), { status: 200 }))) as typeof fetch

    await expect(fetchCurrentGaugeRound()).resolves.toBeNull()
  })

  it('does not resolve an explicit proposal id from an inter-round response', async () => {
    globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({
      currentProposal: null,
      activeGaugesData: [],
    }), { status: 200 }))) as typeof fetch

    await expect(fetchProposalById('128')).rejects.toThrow('No active gauge round')
  })

  it('continues to reject historical proposal ids when a different round is active', async () => {
    globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify(activePayload()), {
      status: 200,
    }))) as typeof fetch

    await expect(fetchProposalById('127')).rejects.toThrow('Historical gauge rounds are not available')
  })
})

function activePayload() {
  return {
    currentProposal: {
      startTime: 1_775_059_200,
      endTime: 1_775_491_200,
      epoch: 1_775_059_200,
      proposalId: 128,
      platformId: 'curve',
      totalVotedVlcvx: 123.5,
      voterCount: 2,
      allGaugeVotes: [gauge({
        id: 99,
        name: 'Gauge A vote entry',
        gaugeAddress: GAUGE_A,
        rootGaugeAddress: GAUGE_A,
        votedVlcvx: 123.5,
      })],
    },
    activeGaugesData: [
      gauge({
        id: 1,
        name: 'Gauge A',
        gaugeAddress: GAUGE_A,
        rootGaugeAddress: GAUGE_A,
        address: POOL_A,
      }),
      gauge({
        id: 2,
        name: 'Gauge B',
        gaugeAddress: GAUGE_B,
        rootGaugeAddress: GAUGE_B,
      }),
    ],
  }
}

function gauge({
  id,
  name,
  gaugeAddress,
  rootGaugeAddress,
  address,
  votedVlcvx,
}: {
  id: string | number
  name: string
  gaugeAddress: string
  rootGaugeAddress: string
  address?: string
  votedVlcvx?: number
}) {
  return {
    id,
    name,
    coins: [{
      address: TOKEN_A,
      symbol: 'TOK',
      blockchainId: 'ethereum',
    }],
    blockchainId: 'ethereum',
    gaugeAddress,
    rootGaugeAddress,
    address,
    poolUrls: { swap: ['https://curve.finance/'] },
    ...(votedVlcvx === undefined ? {} : { votedVlcvx }),
  }
}
