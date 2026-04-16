export interface ActiveToken {
  value: `0x${string}`
  label: string
  symbol: string
  decimals: number
}

export interface FirebaseClaimEntry {
  amount: string
  index: number
  proof: `0x${string}`[]
}

export interface ClaimableToken {
  token: `0x${string}`
  symbol: string
  decimals: number
  amount: bigint
  amountFormatted: number
  index: number
  proof: `0x${string}`[]
  claimed: boolean | undefined
}

export interface ClaimableTokenPayload {
  token: `0x${string}`
  symbol: string
  decimals: number
  amount: string
  index: number
  proof: `0x${string}`[]
}

export interface ClaimableTokensResponse {
  address: `0x${string}`
  claims: ClaimableTokenPayload[]
}

export interface ClaimParam {
  token: `0x${string}`
  index: bigint
  amount: bigint
  merkleProof: `0x${string}`[]
}
