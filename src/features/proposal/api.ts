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

const proposalMetadataSchema = z.object({
  startTime: z.number().int().nonnegative(),
  endTime: z.number().int().nonnegative(),
  epoch: z.number().int().nonnegative(),
  proposalId: z.number().int().nonnegative(),
  platformId: z.literal('curve'),
})

const proposalSchema = proposalMetadataSchema.extend({
  totalVotedVlcvx: nonNegativeNumberSchema,
  voterCount: z.number().int().nonnegative(),
  allGaugeVotes: z.array(votedGaugeSchema),
})

const currentProposalResponseSchema = z.object({
  currentProposal: proposalSchema.nullable(),
  activeGaugesData: z.array(gaugeSchema),
})

const roundIdsSchema = z.array(z.number().int().nonnegative())
const currentMetadataResponseSchema = z.object({
  currentProposal: proposalMetadataSchema.passthrough().nullable(),
  activeGaugesData: z.array(gaugeSchema),
  pastProposalIds: roundIdsSchema,
})
const historicalResponseSchema = z.object({
  previousProposal: proposalSchema,
})
const tallySchema = z.object({
  proposalId: z.number().int().nonnegative(),
  totalVotedVlcvx: nonNegativeNumberSchema,
  voterCount: z.number().int().nonnegative(),
  gaugeVotes: z.record(addressSchema, nonNegativeNumberSchema),
})
const PROPOSAL_ID_PATTERN = /^(?:0|[1-9]\d*)$/

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

async function fetchConvexJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok)
    throw new Error(`Convex proposal request failed with ${response.status}`)
  return response.json()
}

async function fetchCurrentMetadataPayload() {
  return currentMetadataResponseSchema.parse(await fetchConvexJson(CONVEX_CURRENT_PROPOSAL_URL))
}

async function resolveCurrentPayload(payload: z.infer<typeof currentMetadataResponseSchema>) {
  if (payload.currentProposal === null)
    return { ...payload, currentProposal: null }

  // Convex publishes current metadata separately from the live vote tally.
  if ('allGaugeVotes' in payload.currentProposal)
    return { ...payload, currentProposal: proposalSchema.parse(payload.currentProposal) }

  const tally = tallySchema.parse(await fetchConvexJson(`/api/convex/proposal/${payload.currentProposal.proposalId}/tally`))
  if (tally.proposalId !== payload.currentProposal.proposalId)
    throw new Error('Convex tally does not match the requested round')
  const votes = new Map(Object.entries(tally.gaugeVotes).map(([key, value]) => [normalizeAddress(key), value]))
  return {
    ...payload,
    currentProposal: {
      ...payload.currentProposal,
      ...tally,
      allGaugeVotes: payload.activeGaugesData.map(gauge => ({
        ...gauge,
        votedVlcvx: votes.get(normalizeAddress(gauge.gaugeAddress)) ?? votes.get(normalizeAddress(gauge.rootGaugeAddress)) ?? 0,
      })),
    },
  }
}

export async function fetchCurrentGaugeRound() {
  return parseCurrentGaugeRound(await resolveCurrentPayload(await fetchCurrentMetadataPayload()))
}

export async function fetchRoundIds() {
  const payload = z.object({
    currentProposal: proposalMetadataSchema.nullable(),
    pastProposalIds: roundIdsSchema,
  }).parse(await fetchConvexJson(CONVEX_CURRENT_PROPOSAL_URL))
  return [...new Set([
    ...payload.pastProposalIds,
    ...(payload.currentProposal ? [payload.currentProposal.proposalId] : []),
  ])].sort((a, b) => b - a)
}

export async function fetchHistoricalGaugeRound(id: number) {
  if (!Number.isSafeInteger(id) || id < 0)
    throw new Error('Invalid Convex proposal id')
  const payload = historicalResponseSchema.parse(await fetchConvexJson(`/api/convex/proposal/${id}`))
  const previous = payload.previousProposal
  if (previous.proposalId !== id || previous.endTime > Date.now() / 1000)
    throw new Error('Convex historical response does not match a completed round')
  // Historical gauges come from the archived round, never today's catalogue.
  const round = parseCurrentGaugeRound({ currentProposal: previous, activeGaugesData: previous.allGaugeVotes })!
  return { ...round, state: 'closed' as const }
}

export async function fetchDashboardRound() {
  const payload = await resolveCurrentPayload(await fetchCurrentMetadataPayload())
  const current = parseCurrentGaugeRound(payload)
  if (current)
    return current
  const previousId = [...payload.pastProposalIds].sort((a, b) => b - a)[0]
  return previousId === undefined ? null : fetchHistoricalGaugeRound(previousId)
}

export async function fetchProposalById(id: string) {
  const payload = await fetchCurrentMetadataPayload()
  const current = payload.currentProposal
  if (current && (String(current.proposalId) === id || `convex-curve:${current.epoch}:${current.endTime}` === id))
    return parseCurrentGaugeRound(await resolveCurrentPayload(payload))!
  if (!PROPOSAL_ID_PATTERN.test(id))
    throw new Error('Invalid Convex proposal id')
  return fetchHistoricalGaugeRound(Number(id))
}
