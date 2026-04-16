import type { Hex } from 'viem'
import type { ClaimableToken } from './types'
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { MULTI_MERKLE_STASH_ABI } from '../../lib/abi/votium'
import { VOTIUM_MULTI_MERKLE_STASH } from '../../lib/constants'

export function useClaimTokens() {
  const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError, reset } = useWriteContract()

  const { isSuccess: isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  const claimMulti = (account: Hex, unclaimedTokens: ClaimableToken[]) => {
    if (unclaimedTokens.length === 0)
      return

    const claims = unclaimedTokens.map(claim => ({
      token: claim.token,
      index: BigInt(claim.index),
      amount: claim.amount,
      merkleProof: claim.proof,
    }))

    writeContract({
      address: VOTIUM_MULTI_MERKLE_STASH as `0x${string}`,
      abi: MULTI_MERKLE_STASH_ABI,
      functionName: 'claimMulti',
      args: [
        account,
        claims,
      ] as const,
    })
  }

  return {
    claimMulti,
    hash,
    isWritePending,
    isWriteError,
    writeError,
    isConfirming,
    isConfirmed,
    reset,
  }
}
