import { useQuery } from '@tanstack/react-query'
import { fetchEpoch, fetchEpochByProposalId } from './api'

export function useEpochForProposal(proposalId?: string) {
  return useQuery({
    queryKey: ['epoch', proposalId],
    queryFn: () => fetchEpochByProposalId(proposalId!),
    enabled: Boolean(proposalId),
  })
}

export function usePreviousEpoch(round?: number) {
  const previousRound = round ? round - 1 : undefined

  return useQuery({
    queryKey: ['epoch', 'previous', previousRound],
    queryFn: () => fetchEpoch(previousRound!),
    enabled: Boolean(previousRound && previousRound > 0),
  })
}
