import type { GaugeRound, GaugeRoundState, GaugeVote, HexAddress } from './types'
import { z } from 'zod'
import { normalizeAddress } from './utils'

const CONVEX_CURRENT_PROPOSAL_URL = import.meta.env.VITE_CONVEX_CURRENT_PROPOSAL_URL
  ?? '/api/convex/current'

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/)
const nonNegativeNumberSchema = z.number().finite().nonnegative()

const coinSchema = z.object({
  address: addressSchema,
  symbol: z.string().min(1),
  blockchainId: z.string().min(1),
})

const gaugeSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().min(1),
  coins: z.array(coinSchema),
  blockchainId: z.string().min(1),
  gaugeAddress: addressSchema,
  rootGaugeAddress: addressSchema,
  address: addressSchema.nullish(),
  poolUrls: z.object({
    swap: z.array(z.string()),
  }).nullish(),
})

const votedGaugeSchema = gaugeSchema.extend({
  votedVlcvx: nonNegativeNumberSchema,
})

const currentProposalResponseSchema = z.object({
  currentProposal: z.object({
    startTime: z.number().int().nonnegative(),
    endTime: z.number().int().nonnegative(),
    epoch: z.number().int().nonnegative(),
    proposalId: z.number().int().nonnegative(),
    platformId: z.literal('curve'),
    totalVotedVlcvx: nonNegativeNumberSchema,
    voterCount: z.number().int().nonnegative(),
    allGaugeVotes: z.array(votedGaugeSchema),
  }).nullable(),
  activeGaugesData: z.array(gaugeSchema),
})

type RawGauge = z.infer<typeof gaugeSchema>
type RawVotedGauge = z.infer<typeof votedGaugeSchema>

function toHexAddress(address: string): HexAddress {
  return address as HexAddress
}

function getRoundState(start: number, end: number, now = Date.now() / 1000): GaugeRoundState {
  if (now < start)
    return 'pending'

  if (now < end)
    return 'active'

  return 'closed'
}

function getOrdinal(day: number) {
  const remainder100 = day % 100
  if (remainder100 >= 11 && remainder100 <= 13)
    return `${day}th`

  switch (day % 10) {
    case 1: return `${day}st`
    case 2: return `${day}nd`
    case 3: return `${day}rd`
    default: return `${day}th`
  }
}

function getRoundTitle(start: number) {
  const date = new Date(start * 1000)
  const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(date)
  return `Gauge Weight for Week of ${getOrdinal(date.getUTCDate())} ${month} ${date.getUTCFullYear()}`
}

function getGaugeLookupKeys(gauge: Pick<RawGauge, 'gaugeAddress' | 'rootGaugeAddress'>) {
  return [normalizeAddress(gauge.rootGaugeAddress), normalizeAddress(gauge.gaugeAddress)]
}

function toGaugeVote(gauge: RawGauge, votes: number): GaugeVote {
  return {
    id: gauge.id,
    key: normalizeAddress(gauge.rootGaugeAddress),
    label: gauge.name,
    blockchainId: gauge.blockchainId,
    gaugeAddress: toHexAddress(gauge.gaugeAddress),
    rootGaugeAddress: toHexAddress(gauge.rootGaugeAddress),
    poolAddress: gauge.address ? toHexAddress(gauge.address) : null,
    coins: gauge.coins.map(coin => ({
      address: toHexAddress(coin.address),
      symbol: coin.symbol,
      blockchainId: coin.blockchainId,
    })),
    poolUrls: [...(gauge.poolUrls?.swap ?? [])],
    votes,
  }
}

export function parseCurrentGaugeRound(input: unknown): GaugeRound | null {
  const payload = currentProposalResponseSchema.parse(input)
  const current = payload.currentProposal

  if (current === null)
    return null

  const votedByAddress = new Map<string, RawVotedGauge>()

  for (const gauge of current.allGaugeVotes) {
    for (const key of getGaugeLookupKeys(gauge))
      votedByAddress.set(key, gauge)
  }

  const gauges = payload.activeGaugesData.map((gauge) => {
    const votedGauge = getGaugeLookupKeys(gauge)
      .map(key => votedByAddress.get(key))
      .find((candidate): candidate is RawVotedGauge => candidate !== undefined)

    return toGaugeVote(gauge, votedGauge?.votedVlcvx ?? 0)
  })

  return {
    id: `convex-curve:${current.epoch}:${current.endTime}`,
    source: 'convex',
    platform: current.platformId,
    proposalId: current.proposalId,
    epoch: current.epoch,
    title: getRoundTitle(current.startTime),
    state: getRoundState(current.startTime, current.endTime),
    start: current.startTime,
    end: current.endTime,
    totalVotes: current.totalVotedVlcvx,
    voterCount: current.voterCount,
    gauges,
  }
}

export async function fetchCurrentGaugeRound() {
  const response = await fetch(CONVEX_CURRENT_PROPOSAL_URL, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok)
    throw new Error(`Convex current proposal request failed with ${response.status}`)

  return parseCurrentGaugeRound(await response.json())
}

export async function fetchProposalById(id: string) {
  const round = await fetchCurrentGaugeRound()

  if (round === null)
    throw new Error('No active gauge round is available; historical gauge rounds are not available')

  if (round.id !== id && String(round.proposalId) !== id)
    throw new Error('Historical gauge rounds are not available')

  return round
}
