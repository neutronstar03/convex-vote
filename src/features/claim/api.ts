import type { ClaimableToken } from './types'
import { findClaimsForVoter } from './source'

export async function fetchClaimableTokens(voterAddress: string): Promise<ClaimableToken[]> {
  return findClaimsForVoter(fetch, voterAddress)
}
