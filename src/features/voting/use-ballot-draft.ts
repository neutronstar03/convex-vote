import type { SetStateAction } from 'react'
import { useState } from 'react'

export interface BallotDraft {
  roundId: string | undefined
  account: string | undefined
  allocations: Record<string, number> | null
}

/** Carry an anonymous ballot into connection, but never into another round or account. */
export function resolveBallotDraft(draft: BallotDraft, roundId?: string, account?: string): BallotDraft {
  const normalizedAccount = account?.toLowerCase()
  if (draft.roundId === roundId && (draft.account === normalizedAccount || !draft.account))
    return { ...draft, account: normalizedAccount }

  return { roundId, account: normalizedAccount, allocations: null }
}

export function useBallotDraft(roundId: string | undefined, account: string | undefined, existingAllocations: Record<string, number>) {
  const [draft, setDraft] = useState<BallotDraft>({ roundId, account: account?.toLowerCase(), allocations: null })
  const current = resolveBallotDraft(draft, roundId, account)

  const setAllocations = (value: SetStateAction<Record<string, number>>) => {
    setDraft((previous) => {
      const scoped = resolveBallotDraft(previous, roundId, account)
      return {
        ...scoped,
        allocations: typeof value === 'function' ? value(scoped.allocations ?? existingAllocations) : value,
      }
    })
  }

  const initialize = () => {
    setDraft((previous) => {
      const scoped = resolveBallotDraft(previous, roundId, account)
      return { ...scoped, allocations: scoped.allocations ?? { ...existingAllocations } }
    })
  }

  const reset = () => setDraft({ roundId, account: account?.toLowerCase(), allocations: null })

  return { allocations: current.allocations ?? {}, setAllocations, initialize, reset }
}
