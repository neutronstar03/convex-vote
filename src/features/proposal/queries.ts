import { useQuery } from '@tanstack/react-query'
import { fetchDashboardRound, fetchProposalById, fetchRoundIds } from './api'

export function useResolvedProposal(proposalId?: string) {
  return useQuery({
    queryKey: ['proposal', proposalId ?? 'latest'],
    queryFn: async () => {
      if (!proposalId || proposalId === 'latest') {
        return fetchDashboardRound()
      }

      return fetchProposalById(proposalId)
    },
    refetchInterval: 30_000,
  })
}

export function useRoundHistory() {
  return useQuery({
    queryKey: ['convex-round-history'],
    queryFn: fetchRoundIds,
    refetchInterval: 30_000,
  })
}
