export type LlamaRoundSummary = {
  rounds: number[]
}

export type LlamaBribe = {
  pool: string
  token: string
  gauge?: string
  choice?: number
  amount: number
  amountDollars: number
}

export type LlamaEpoch = {
  id: string
  round: number
  proposal: string
  end: number
  scoresTotal: number
  bribed: Record<string, number>
  bribes: LlamaBribe[]
}

export type LlamaEpochResponse = {
  epoch: LlamaEpoch
}
