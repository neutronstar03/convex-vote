import { describe, expect, it } from 'bun:test'
import { normalizeGaugeAllocations } from '../src/features/voting/submitVote'

const GAUGE_A = '0x0000000000000000000000000000000000000001'
const GAUGE_B = '0x0000000000000000000000000000000000000002'
const GAUGE_C = '0x0000000000000000000000000000000000000003'

describe('normalizeGaugeAllocations', () => {
  it('normalizes allocations to exactly 1,000,000', () => {
    const normalized = normalizeGaugeAllocations({
      [GAUGE_A]: 33.33,
      [GAUGE_B]: 33.33,
      [GAUGE_C]: 33.34,
    })

    expect(normalized.reduce((sum, item) => sum + item.weight, 0n)).toBe(1_000_000n)
    expect(normalized).toEqual([
      { gauge: GAUGE_A, weight: 333_300n },
      { gauge: GAUGE_B, weight: 333_300n },
      { gauge: GAUGE_C, weight: 333_400n },
    ])
  })

  it('uses address order as the deterministic tie-breaker', () => {
    const normalized = normalizeGaugeAllocations({
      [GAUGE_C]: 1,
      [GAUGE_B]: 1,
      [GAUGE_A]: 1,
    })

    expect(normalized).toEqual([
      { gauge: GAUGE_A, weight: 333_334n },
      { gauge: GAUGE_B, weight: 333_333n },
      { gauge: GAUGE_C, weight: 333_333n },
    ])
  })

  it('rejects malformed and negative allocations at the boundary', () => {
    expect(() => normalizeGaugeAllocations({ nope: 100 })).toThrow('Invalid gauge address')
    expect(() => normalizeGaugeAllocations({ [GAUGE_A]: Number.NaN })).toThrow('Invalid allocation')
    expect(() => normalizeGaugeAllocations({ [GAUGE_A]: -1 })).toThrow('Invalid allocation')
  })
})
