import { describe, expect, it } from 'bun:test'
import { resolveBallotDraft } from '../src/features/voting/use-ballot-draft'

const draft = { roundId: 'round-1', account: undefined, allocations: { gaugeA: 50, gaugeB: 50 } }

describe('ballot session boundaries', () => {
  it('keeps an anonymous allocation when a wallet connects', () => {
    expect(resolveBallotDraft(draft, 'round-1', '0xABC').allocations).toEqual(draft.allocations)
    expect(resolveBallotDraft(draft, 'round-1', '0xABC').account).toBe('0xabc')
  })

  it('does not carry allocations into a different round', () => {
    expect(resolveBallotDraft(draft, 'round-2').allocations).toBeNull()
  })

  it('does not assign one account\'s draft to another account or a disconnected session', () => {
    const connected = resolveBallotDraft(draft, 'round-1', '0xABC')
    expect(resolveBallotDraft(connected, 'round-1', '0xDEF').allocations).toBeNull()
    expect(resolveBallotDraft(connected, 'round-1').allocations).toBeNull()
    expect(resolveBallotDraft(connected, 'round-1', '0xabc').allocations).toEqual(draft.allocations)
  })

  it('keeps an explicitly discarded ballot empty when the editor resumes', () => {
    expect(resolveBallotDraft({ ...draft, allocations: {} }, 'round-1').allocations).toEqual({})
  })
})
