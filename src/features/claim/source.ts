import type { ActiveToken, ClaimableToken, ClaimableTokenPayload, FirebaseClaimEntry } from './types'

export const VOTIUM_FIREBASE_DATABASE_URL = 'https://test-54f45-default-rtdb.firebaseio.com' as const
export const VOTIUM_GITHUB_RAW = 'https://raw.githubusercontent.com/oo-00/Votium/main/merkle' as const

type FetchLike = typeof fetch

function getAddressCandidates(address: string): `0x${string}`[] {
  const trimmed = address.trim()
  const candidates = [trimmed, trimmed.toLowerCase()]
  return [...new Set(candidates)] as `0x${string}`[]
}

async function fetchJson<T>(fetcher: FetchLike, url: string): Promise<T> {
  const response = await fetcher(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}: ${url}`)
  }

  return response.json() as Promise<T>
}

export async function fetchActiveTokens(fetcher: FetchLike = fetch): Promise<ActiveToken[]> {
  return fetchJson<ActiveToken[]>(fetcher, `${VOTIUM_GITHUB_RAW}/activeTokens.json`)
}

export function toClaimableToken(token: ActiveToken, claimEntry: FirebaseClaimEntry): ClaimableToken | null {
  const amount = BigInt(claimEntry.amount)
  if (amount === 0n) {
    return null
  }

  return {
    token: token.value,
    symbol: token.symbol,
    decimals: token.decimals,
    amount,
    amountFormatted: Number(amount) / 10 ** token.decimals,
    index: claimEntry.index,
    proof: claimEntry.proof,
    claimed: undefined,
  }
}

export function serializeClaimableToken(claim: ClaimableToken): ClaimableTokenPayload {
  return {
    token: claim.token,
    symbol: claim.symbol,
    decimals: claim.decimals,
    amount: claim.amount.toString(),
    index: claim.index,
    proof: claim.proof,
  }
}

export function deserializeClaimableToken(claim: ClaimableTokenPayload): ClaimableToken {
  const amount = BigInt(claim.amount)

  return {
    token: claim.token,
    symbol: claim.symbol,
    decimals: claim.decimals,
    amount,
    amountFormatted: Number(amount) / 10 ** claim.decimals,
    index: claim.index,
    proof: claim.proof,
    claimed: undefined,
  }
}

export async function fetchFirebaseClaimForToken(
  fetcher: FetchLike,
  token: ActiveToken,
  addresses: `0x${string}`[],
): Promise<ClaimableToken | null> {
  const tokenKey = token.value.toUpperCase()
  for (const address of addresses) {
    const url = `${VOTIUM_FIREBASE_DATABASE_URL}/claims/${tokenKey}/claims/${encodeURIComponent(address)}.json`
    const claimEntry = await fetchJson<FirebaseClaimEntry | null>(fetcher, url)

    if (claimEntry) {
      return toClaimableToken(token, claimEntry)
    }
  }

  return null
}

export async function findClaimsForVoter(
  fetcher: FetchLike,
  voterAddress: string,
  activeTokens?: ActiveToken[],
): Promise<ClaimableToken[]> {
  const addresses = getAddressCandidates(voterAddress)
  const tokens = activeTokens ?? await fetchActiveTokens(fetcher)

  const claims = await Promise.all(tokens.map(token => fetchFirebaseClaimForToken(fetcher, token, addresses)))

  return claims
    .filter((claim): claim is ClaimableToken => claim !== null)
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
}
