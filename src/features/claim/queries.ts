import type { ClaimableToken } from './types'
import { useQuery } from '@tanstack/react-query'
import { useReadContracts } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { MULTI_MERKLE_STASH_ABI } from '../../lib/abi/votium'
import { VOTIUM_MULTI_MERKLE_STASH } from '../../lib/constants'
import { fetchClaimableTokens } from './api'

export function useClaimableTokens(voterAddress?: string) {
  return useQuery({
    queryKey: ['claimableTokens', voterAddress],
    queryFn: async () => {
      if (!voterAddress)
        return []

      return fetchClaimableTokens(voterAddress)
    },
    enabled: Boolean(voterAddress),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useIsClaimedBatch(claims: ClaimableToken[]) {
  const claimsForContracts = claims.filter(claim => claim.token && claim.index !== undefined)

  const contracts = claimsForContracts
    .map(claim => ({
      address: VOTIUM_MULTI_MERKLE_STASH as `0x${string}`,
      abi: MULTI_MERKLE_STASH_ABI,
      functionName: 'isClaimed' as const,
      args: [claim.token, BigInt(claim.index)] as const,
      chainId: mainnet.id,
    }))

  const result = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      staleTime: 5 * 60 * 1000,
    },
  })

  // Map the results back to claims
  const claimedMap = new Map<string, boolean | undefined>()

  if (result.data && contracts.length > 0) {
    result.data.forEach((data, index) => {
      const claim = claimsForContracts[index]
      if (claim) {
        const key = `${claim.token}-${claim.index}`
        claimedMap.set(key, data.status === 'success' ? data.result as boolean : undefined)
      }
    })
  }

  return {
    ...result,
    claimedMap,
    // Merge claimed status into claims
    enrichedClaims: claims.map(claim => ({
      ...claim,
      claimed: claimedMap.get(`${claim.token}-${claim.index}`) ?? claim.claimed,
    })),
  }
}
