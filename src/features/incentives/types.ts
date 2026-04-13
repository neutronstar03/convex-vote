export interface LlamaRoundSummary {
  rounds: number[]
}

export interface LlamaBribe {
  pool: string
  token: string
  gauge?: string
  choice?: number
  amount: number
  amountDollars: number
}

export interface LlamaEpoch {
  id: string
  round: number
  proposal: string
  end: number
  scoresTotal: number
  bribed: Record<string, number>
  bribes: LlamaBribe[]
}

export interface LlamaEpochResponse {
  epoch: LlamaEpoch
}
