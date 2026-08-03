import type { HexAddress } from '../proposal/types'

export interface LlamaRoundSummary {
  rounds: number[]
}

export interface LlamaBribe {
  pool: string
  token: string
  gauge: HexAddress
  amount: number
  amountDollars: number
}

export interface LlamaEpoch {
  id: string
  round: number
  proposal: string
  voteSource: 'convex-onchain'
  end: number
  scoresTotal: number
  bribed: Record<string, number>
  bribes: LlamaBribe[]
}
