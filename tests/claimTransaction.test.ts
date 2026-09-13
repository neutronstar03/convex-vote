import { describe, expect, it } from 'bun:test'
import { getClaimReceiptOutcome } from '../src/features/claim/use-claim-tokens'

describe('claim receipt outcome', () => {
  it('confirms only a successful mined receipt', () => {
    expect(getClaimReceiptOutcome('success')).toBe('confirmed')
  })

  it('keeps a mined revert out of the success state', () => {
    expect(getClaimReceiptOutcome('reverted')).toBe('reverted')
  })

  it('does not treat a missing receipt status as success', () => {
    expect(getClaimReceiptOutcome(undefined)).toBe('pending')
  })
})
