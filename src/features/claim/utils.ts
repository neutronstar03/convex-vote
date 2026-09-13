import type { ClaimableToken } from './types'

export function partitionClaimsByStatus(claims: ClaimableToken[]) {
  return {
    unclaimed: claims.filter(claim => claim.claimed === false),
    claimed: claims.filter(claim => claim.claimed === true),
    unverified: claims.filter(claim => claim.claimed === undefined),
  }
}
