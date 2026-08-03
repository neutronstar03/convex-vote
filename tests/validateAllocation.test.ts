import { describe, expect, it } from 'bun:test'
import { validateAllocation } from '../src/features/voting/validateAllocation'

const validBase = {
  isConnected: true,
  proposalActive: true,
  votingPower: undefined,
}

describe('validateAllocation', () => {
  it('accepts a complete positive ballot', () => {
    expect(validateAllocation({
      ...validBase,
      allocations: { gaugeA: 60, gaugeB: 40 },
    })).toBeNull()
  })

  it('rejects selected gauges with no weight', () => {
    expect(validateAllocation({
      ...validBase,
      allocations: { gaugeA: 100, gaugeB: 0 },
    })).toEqual({
      type: 'empty',
      message: 'Set a positive weight for every selected gauge, or remove it from the ballot.',
    })
  })

  it('requires a connected wallet only at review time', () => {
    expect(validateAllocation({
      ...validBase,
      isConnected: false,
      allocations: { gaugeA: 100 },
    })?.type).toBe('not_connected')
  })
})
