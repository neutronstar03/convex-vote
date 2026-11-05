import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { onRequestGet } from '../functions/api/votium/claims/[address]'

const originalFetch = globalThis.fetch
const address = '0xabcdef0123456789abcdef0123456789abcdef01'

afterEach(() => {
  globalThis.fetch = originalFetch
})

async function request(value: string | string[] | undefined) {
  return await onRequestGet({ params: { address: value } } as unknown as Parameters<typeof onRequestGet>[0])
}

describe('claims proxy wallet validation', () => {
  for (const invalid of [undefined, [], '', '   ', '0x1234', `0x${'g'.repeat(40)}`, `0x${'a'.repeat(41)}`, 'a'.repeat(40), ['0x1234']]) {
    it(`returns 400 without upstream requests for ${JSON.stringify(invalid)}`, async () => {
      const fetcher = mock(async () => Response.json([]))
      globalThis.fetch = fetcher as typeof fetch
      const response = await request(invalid)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: invalid === undefined || (Array.isArray(invalid) && invalid.length === 0) || invalid === ''
          ? 'Missing wallet address'
          : 'Invalid wallet address',
      })
      expect(fetcher).not.toHaveBeenCalled()
    })
  }

  it('returns serialized claims for a valid address parameter', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => Response.json(
      String(input).endsWith('/activeTokens.json')
        ? [{ value: address, label: 'Token', symbol: 'TOK', decimals: 18 }]
        : { amount: '100', index: 2, proof: [] },
    )) as typeof fetch
    const response = await request([address])
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      address,
      claims: [{ token: address, symbol: 'TOK', decimals: 18, amount: '100', index: 2, proof: [] }],
    })
  })

  for (const failure of ['registry', 'firebase', 'network']) {
    it(`keeps ${failure} failures as 502`, async () => {
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        if (failure === 'network')
          throw new Error('Network unavailable')
        if (failure === 'firebase' && String(input).endsWith('/activeTokens.json'))
          return Response.json([{ value: address, label: 'Token', symbol: 'TOK', decimals: 18 }])
        return new Response(null, { status: 503 })
      }) as typeof fetch
      const log = spyOn(console, 'error').mockImplementation(() => {})
      try {
        const response = await request(address)
        expect(response.status).toBe(502)
        expect((await response.json() as { error: string }).error).toContain('Votium claim proxy error:')
      }
      finally {
        log.mockRestore()
      }
    })
  }
})
