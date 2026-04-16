import type { ClaimableToken, ClaimableTokensResponse } from './types'
import { deserializeClaimableToken, findClaimsForVoter } from './source'

const VOTIUM_CLAIMS_API_BASE = '/api/votium/claims' as const

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}: ${url}`)
  }

  return response.json() as Promise<T>
}

export async function fetchClaimableTokens(voterAddress: string): Promise<ClaimableToken[]> {
  if (import.meta.env.DEV) {
    return findClaimsForVoter(fetch, voterAddress)
  }

  const response = await fetchJson<ClaimableTokensResponse>(`${VOTIUM_CLAIMS_API_BASE}/${voterAddress}`)
  return response.claims.map(deserializeClaimableToken)
}
