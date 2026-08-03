export type HexAddress = `0x${string}`

export type GaugeRoundState = 'pending' | 'active' | 'closed'

export interface GaugeCoin {
  address: HexAddress
  symbol: string
  blockchainId: string
}

export interface GaugeVote {
  id: string
  key: string
  label: string
  blockchainId: string
  gaugeAddress: HexAddress
  rootGaugeAddress: HexAddress
  poolAddress: HexAddress | null
  coins: GaugeCoin[]
  poolUrls: string[]
  votes: number
}

export interface GaugeRound {
  id: string
  source: 'convex'
  platform: 'curve'
  proposalId: number
  epoch: number
  title: string
  state: GaugeRoundState
  start: number
  end: number
  totalVotes: number
  voterCount: number
  gauges: GaugeVote[]
}

export interface PoolRow {
  choiceKey: string
  label: string
  votes: number
  voteShare: number
  incentiveUsd: number
  rewardEfficiency: number | null
  gaugeAddress: HexAddress
  rootGaugeAddress: HexAddress
  poolAddress: HexAddress | null
  blockchainId: string
  poolUrls: string[]
  bribeTokens: Array<{
    symbol: string
    amount: number
    amountUsd: number
  }>
}
