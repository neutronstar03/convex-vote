import { afterEach, describe, expect, it } from 'bun:test'
import { proxyConvexProposal } from '../functions/api/convex/proposal/[id]'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Convex historical proxy', () => {
  it.each([undefined, [], '../current', '1/tally', '-1', '1.5', '9999999999999999999'])('rejects invalid id %p before fetching', async (id) => {
    let calls = 0
    globalThis.fetch = (() => {
      calls++
      throw new Error('Unexpected fetch')
    }) as typeof fetch
    expect((await proxyConvexProposal(id)).status).toBe(400)
    expect(calls).toBe(0)
  })

  it('uses only the fixed official origin and preserves provider errors', async () => {
    let target = ''
    globalThis.fetch = ((url: string) => {
      target = url
      return Promise.resolve(Response.json({ error: 'Unavailable' }, { status: 503 }))
    }) as typeof fetch
    expect((await proxyConvexProposal('6', true)).status).toBe(503)
    expect(target).toBe('https://www.convexfinance.com/api/vote/weights/curve/proposal/6/tally')
    globalThis.fetch = (() => {
      throw new Error('network')
    }) as typeof fetch
    expect((await proxyConvexProposal('6')).status).toBe(502)
  })
})
