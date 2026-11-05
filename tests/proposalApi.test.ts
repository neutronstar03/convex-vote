import { afterEach, describe, expect, it } from 'bun:test'
import {
  fetchCurrentGaugeRound,
  fetchDashboardRound,
  fetchHistoricalGaugeRound,
  fetchProposalById,
  fetchRoundIds,
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
      pastProposalIds: [],
    }), { status: 200 }))) as typeof fetch

    await expect(fetchCurrentGaugeRound()).resolves.toBeNull()
  })

  it('loads a requested historical round without merging the current gauge catalogue', async () => {
    const previous = { ...activePayload().currentProposal, proposalId: 127 }
    globalThis.fetch = ((url: string) => Promise.resolve(Response.json(
      url.endsWith('/127') ? { previousProposal: previous } : activePayload(),
    ))) as typeof fetch
    const result = await fetchProposalById('127')
    expect(result).toMatchObject({ proposalId: 127, state: 'closed' })
    expect(result.gauges).toHaveLength(1)
    expect(result.gauges[0].label).toBe('Gauge A vote entry')
  })

  it('can open historical data without fetching the current tally', async () => {
    const { allGaugeVotes: _votes, totalVotedVlcvx: _total, voterCount: _voters, ...metadata } = activePayload().currentProposal
    const paths: string[] = []
    globalThis.fetch = ((url: string) => {
      paths.push(url)
      return Promise.resolve(Response.json(url.endsWith('/127')
        ? { previousProposal: { ...activePayload().currentProposal, proposalId: 127 } }
        : { ...activePayload(), currentProposal: metadata }))
    }) as typeof fetch
    await expect(fetchProposalById('127')).resolves.toMatchObject({ state: 'closed' })
    expect(paths.some(path => path.endsWith('/tally'))).toBe(false)
  })

  it('keeps the latest completed round available between rounds', async () => {
    globalThis.fetch = ((url: string) => Promise.resolve(Response.json(
      url.endsWith('/128') ? { previousProposal: activePayload().currentProposal } : { currentProposal: null, activeGaugesData: [], pastProposalIds: [125, 128, 126] },
    ))) as typeof fetch
    await expect(fetchDashboardRound()).resolves.toMatchObject({ proposalId: 128, state: 'closed' })
  })

  it('returns null only when neither a current nor a previous round exists', async () => {
    globalThis.fetch = (() => Promise.resolve(Response.json({ currentProposal: null, activeGaugesData: [], pastProposalIds: [] }))) as typeof fetch
    await expect(fetchDashboardRound()).resolves.toBeNull()
  })

  it('uses the current round immediately when the next window opens', async () => {
    globalThis.fetch = (() => Promise.resolve(Response.json(activePayload()))) as typeof fetch
    await expect(fetchDashboardRound()).resolves.toMatchObject({ proposalId: 128 })
    await expect(fetchRoundIds()).resolves.toEqual([128, 127, 126])
  })

  it('combines current metadata with a matching separately published tally', async () => {
    const payload = activePayload()
    const { totalVotedVlcvx: _total, voterCount: _count, allGaugeVotes: _votes, ...metadata } = payload.currentProposal
    globalThis.fetch = ((url: string) => Promise.resolve(Response.json(
      url.endsWith('/tally')
        ? { proposalId: 128, totalVotedVlcvx: 99, voterCount: 4, gaugeVotes: { [GAUGE_A]: 99 } }
        : { ...payload, currentProposal: metadata },
    ))) as typeof fetch
    const result = await fetchCurrentGaugeRound()
    expect(result).toMatchObject({ totalVotes: 99, voterCount: 4 })
    expect(result?.gauges.map(gauge => gauge.votes)).toEqual([99, 0])
  })

  it('rejects a mismatched or non-completed historical response', async () => {
    globalThis.fetch = (() => Promise.resolve(Response.json({ previousProposal: activePayload().currentProposal }))) as typeof fetch
    await expect(fetchHistoricalGaugeRound(127)).rejects.toThrow('does not match')
    globalThis.fetch = (() => Promise.resolve(Response.json({ previousProposal: { ...activePayload().currentProposal, endTime: Math.ceil(Date.now() / 1000) + 1000 } }))) as typeof fetch
    await expect(fetchHistoricalGaugeRound(128)).rejects.toThrow('completed round')
  })

  it('does not mask upstream failures as an empty history', async () => {
    globalThis.fetch = (() => Promise.resolve(new Response('', { status: 503 }))) as typeof fetch
    await expect(fetchHistoricalGaugeRound(128)).rejects.toThrow('503')
  })
})

function activePayload() {
  return {
    pastProposalIds: [126, 127],
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
