import type { ActiveToken } from '../src/features/claim/types'
import { describe, expect, it, mock } from 'bun:test'
import { findClaimsForVoter } from '../src/features/claim/source'

const address = '0xAbCdEf0123456789aBcDeF0123456789abcdef01'
const token: ActiveToken = {
  value: '0x0000000000000000000000000000000000000001',
  label: 'Token',
  symbol: 'TOK',
  decimals: 18,
}
const entry = { amount: '1000000000000000000', index: 3, proof: [] }

describe('claim source wallet validation', () => {
  for (const invalid of ['', '   ', '0x1234', `0x${'g'.repeat(40)}`, `0x${'a'.repeat(41)}`, 'a'.repeat(40)]) {
    for (const tokens of [undefined, [token]]) {
      it(`rejects ${JSON.stringify(invalid)} before fetching with ${tokens ? 'provided' : 'remote'} tokens`, async () => {
        const fetcher = mock(async () => Response.json(null))
        await expect(findClaimsForVoter(fetcher as typeof fetch, invalid, tokens))
          .rejects
          .toThrow('Invalid wallet address')
        expect(fetcher).not.toHaveBeenCalled()
      })
    }
  }

  it('preserves original case before trying lowercase, without enforcing a checksum', async () => {
    const urls: string[] = []
    const fetcher = mock(async (input: RequestInfo | URL) => {
      urls.push(String(input))
      return Response.json(entry)
    })
    const claims = await findClaimsForVoter(fetcher as typeof fetch, `  ${address}  `, [token])
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(urls[0]).toContain(`/${address}.json`)
    expect(claims[0]?.amount).toBe(1000000000000000000n)
  })

  it('falls back to lowercase when the original-case fixture is absent', async () => {
    const urls: string[] = []
    const fetcher = mock(async (input: RequestInfo | URL) => {
      urls.push(String(input))
      return Response.json(urls.length === 1 ? null : entry)
    })
    const claims = await findClaimsForVoter(fetcher as typeof fetch, address, [token])
    expect(urls).toHaveLength(2)
    expect(urls[0]).toContain(`/${address}.json`)
    expect(urls[1]).toContain(`/${address.toLowerCase()}.json`)
    expect(claims[0]?.index).toBe(3)
  })

  it('fetches the registry and looks up a lowercase address once', async () => {
    const fetcher = mock(async (input: RequestInfo | URL) => Response.json(
      String(input).endsWith('/activeTokens.json') ? [token] : entry,
    ))
    const claims = await findClaimsForVoter(fetcher as typeof fetch, address.toLowerCase())
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(claims[0]?.symbol).toBe('TOK')
  })

  it('propagates genuine upstream failures', async () => {
    const fetcher = mock(async () => new Response(null, { status: 503 }))
    await expect(findClaimsForVoter(fetcher as typeof fetch, address)).rejects.toThrow('Request failed with 503')
  })
})
