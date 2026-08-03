import type { HexAddress } from '../proposal/types'
import type { LlamaEpoch, LlamaRoundSummary } from './types'
import { z } from 'zod'

// Keep browser requests same-origin. Vite and the Cloudflare Pages Function
// forward this fixed prefix to the Llama Airforce API.
const LLAMA_BASE_URL = import.meta.env.VITE_LLAMA_API_BASE_URL
  ?? '/api/llama/bribes/votium/cvx-crv'

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/)
const nonNegativeNumberSchema = z.number().finite().nonnegative()

const roundsResponseSchema = z.object({
  rounds: z.array(z.number().int().nonnegative()),
})

const epochResponseSchema = z.object({
  epoch: z.object({
    id: z.string().min(1),
    round: z.number().int().nonnegative(),
    proposal: z.string(),
    voteSource: z.literal('convex-onchain'),
    end: z.number().int().nonnegative(),
    scoresTotal: nonNegativeNumberSchema,
    bribed: z.record(z.string(), nonNegativeNumberSchema),
    bribes: z.array(z.object({
      pool: z.string().min(1),
      token: z.string().min(1),
      gauge: addressSchema,
      amount: nonNegativeNumberSchema,
      amountDollars: nonNegativeNumberSchema,
    })),
  }),
})

export function parseLlamaEpochResponse(input: unknown): LlamaEpoch {
  const { epoch } = epochResponseSchema.parse(input)

  return {
    ...epoch,
    bribes: epoch.bribes.map(bribe => ({
      ...bribe,
      gauge: bribe.gauge as HexAddress,
    })),
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok)
    throw new Error(`Llama request failed with ${response.status}`)

  return response.json()
}

export async function fetchRounds(): Promise<LlamaRoundSummary> {
  return roundsResponseSchema.parse(await fetchJson(`${LLAMA_BASE_URL}/rounds`))
}

export async function fetchEpoch(round: number) {
  return parseLlamaEpochResponse(await fetchJson(`${LLAMA_BASE_URL}/${round}`))
}

export async function fetchLatestEpoch() {
  const rounds = await fetchRounds()
  const latestRound = Math.max(...rounds.rounds)

  if (!Number.isFinite(latestRound))
    throw new TypeError('No Llama rounds found')

  return fetchEpoch(latestRound)
}

/**
 * Returns incentives only when the latest published on-chain Votium round is
 * the exact Convex voting window requested. This prevents stale bribes from a
 * previous round being displayed while the next Convex round is live.
 */
export async function fetchLatestEpochForRound(roundEnd: number): Promise<LlamaEpoch | null> {
  const epoch = await fetchLatestEpoch()
  return epoch.voteSource === 'convex-onchain' && epoch.end === roundEnd ? epoch : null
}
