import type { ClaimableToken } from '../src/features/claim/types'
import { describe, expect, it } from 'bun:test'
import { partitionClaimsByStatus } from '../src/features/claim/utils'

describe('partitionClaimsByStatus', () => {
  it('keeps unverified registry entries separate from claimable tokens', () => {
    const unclaimed = claim(1, false)
    const claimed = claim(2, true)
    const unverified = claim(3, undefined)

    expect(partitionClaimsByStatus([unclaimed, claimed, unverified])).toEqual({
      unclaimed: [unclaimed],
      claimed: [claimed],
      unverified: [unverified],
    })
  })
})

function claim(index: number, claimed: boolean | undefined): ClaimableToken {
  return {
    token: `0x${index.toString(16).padStart(40, '0')}`,
    symbol: `T${index}`,
    decimals: 18,
    amount: 1n,
    amountFormatted: 0.000000000000000001,
    index,
    proof: [],
    claimed,
  }
}
