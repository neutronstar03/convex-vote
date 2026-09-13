import type { Hex } from 'viem'
import type { ClaimableToken } from './types'
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { MULTI_MERKLE_STASH_ABI } from '../../lib/abi/votium'
import { VOTIUM_MULTI_MERKLE_STASH } from '../../lib/constants'

export type ClaimReceiptOutcome = 'pending' | 'confirmed' | 'reverted'

/** Treat receipt retrieval as success only when the EVM receipt says success. */
export function getClaimReceiptOutcome(status: 'success' | 'reverted' | undefined): ClaimReceiptOutcome {
  if (status === 'success')
    return 'confirmed'
  if (status === 'reverted')
    return 'reverted'
  return 'pending'
}

export function useClaimTokens() {
  const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError, reset } = useWriteContract()

  const {
    data: receipt,
    isSuccess: isReceiptFetched,
    isError: isReceiptError,
    error: receiptError,
    isLoading: isConfirming,
    refetch: refetchReceipt,
  } = useWaitForTransactionReceipt({
    hash,
  })

  // `useWaitForTransactionReceipt.isSuccess` means that a receipt was fetched,
  // not that the EVM execution succeeded. Only a mined receipt with status
  // `success` is a completed claim; a `reverted` receipt is a terminal failure.
  const receiptOutcome = getClaimReceiptOutcome(receipt?.status)
  const isConfirmed = isReceiptFetched && receiptOutcome === 'confirmed'
  const isReceiptReverted = isReceiptFetched && receiptOutcome === 'reverted'
  const isWriteRejected = isWriteError && isUserRejectedError(writeError)

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
    isWriteRejected,
    isConfirming,
    isConfirmed,
    isReceiptError,
    receiptError,
    isReceiptReverted,
    refetchReceipt,
    reset,
  }
}

function isUserRejectedError(error: Error | null) {
  if (!error)
    return false

  const candidate = error as Error & {
    code?: number
    shortMessage?: string
    cause?: { code?: number, name?: string, shortMessage?: string }
  }
  const message = `${candidate.name} ${candidate.message} ${candidate.shortMessage ?? ''} ${candidate.cause?.name ?? ''} ${candidate.cause?.shortMessage ?? ''}`.toLowerCase()

  return candidate.code === 4001
    || candidate.cause?.code === 4001
    || message.includes('userrejected')
    || message.includes('user rejected')
    || message.includes('user denied')
    || message.includes('rejected the request')
}
