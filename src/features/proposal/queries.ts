import { useQuery } from '@tanstack/react-query'
import { fetchCurrentGaugeRound, fetchProposalById } from './api'

export function useResolvedProposal(proposalId?: string) {
  return useQuery({
    queryKey: ['proposal', proposalId ?? 'latest'],
    queryFn: async () => {
      if (!proposalId || proposalId === 'latest') {
        return fetchCurrentGaugeRound()
      }

      return fetchProposalById(proposalId)
    },
    refetchInterval: 30_000,
  })
}
