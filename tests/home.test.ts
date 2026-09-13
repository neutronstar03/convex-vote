import { describe, expect, it } from 'bun:test'
import { getLlamaDataState } from '../src/routes/home'

describe('Home data source feedback', () => {
  it('does not present an incentive fetch error as zero incentives', () => {
    const state = getLlamaDataState({ hasData: false, isError: true, isPending: false })

    expect(state).toMatchObject({
      kind: 'error',
      label: 'Llama unavailable',
    })
    expect(state.detail).toContain('not a zero-incentive result')
  })

  it('distinguishes an unmatched round from a loaded empty snapshot', () => {
    const state = getLlamaDataState({ hasData: false, isError: false, isPending: false })

    expect(state.kind).toBe('unmatched')
    expect(state.detail).toContain('matches this Convex window')
  })
})
