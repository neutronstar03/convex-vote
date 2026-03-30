export type SnapshotProposal = {
  id: string
  title: string
  state: string
  start: number
  end: number
  choices: string[]
  scores: number[]
  scores_total: number
}

export type SnapshotProposalResponse = {
  proposals: SnapshotProposal[]
}

export type SnapshotVote = {
  voter: string
  choice: number | Record<string, number>
  vp: number
  created: number
}

export type PoolRow = {
  choiceIndex: number
  choiceKey: string
  label: string
  snapshotVotes: number
  voteShare: number
  incentiveUsd?: number
  rewardEfficiency?: number
  gaugeAddress?: string
  bribeTokens: Array<{
    symbol: string
    amount: number
    amountUsd: number
  }>
}
