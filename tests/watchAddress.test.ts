import { describe, expect, it } from 'bun:test'
import { resolveWatchAddress } from '../src/lib/watch-address'

const connected = '0x1111111111111111111111111111111111111111'
const watched = '0x2222222222222222222222222222222222222222'
describe('watched wallet isolation', () => {
  it('uses the connected wallet only after watch mode is explicitly removed', () => {
    expect(resolveWatchAddress(new URLSearchParams(), connected).activeAddress).toBe(connected)
    expect(resolveWatchAddress(new URLSearchParams({ watch: watched }), connected)).toMatchObject({ activeAddress: watched, isWatchMode: true, isInvalid: false })
    expect(resolveWatchAddress(new URLSearchParams({ watch: watched }))).toMatchObject({ activeAddress: watched, isWatchMode: true })
  })
  it.each(['', ' ', 'bad', '0x1234'])('never falls back to the connected wallet for invalid watch %p', (watch) => {
    expect(resolveWatchAddress(new URLSearchParams({ watch }), connected)).toMatchObject({ activeAddress: undefined, isInvalid: true, isWatchMode: true })
  })
})
