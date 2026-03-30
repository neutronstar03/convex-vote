import { useQuery } from '@tanstack/react-query'
import { fetchProposalById, fetchRecentGaugeProposals, fetchUserVote } from './api'
import { getActiveOrLatestMainGaugeProposal } from './utils'

export function useRecentGaugeProposals() {
  return useQuery({
    queryKey: ['proposals', 'recent-gauge'],
    queryFn: fetchRecentGaugeProposals,
  })
}

export function useResolvedProposal(proposalId?: string) {
  return useQuery({
    queryKey: ['proposal', proposalId ?? 'latest'],
    queryFn: async () => {
      if (!proposalId || proposalId === 'latest') {
        const proposals = await fetchRecentGaugeProposals()
        const proposal = getActiveOrLatestMainGaugeProposal(proposals)

        if (!proposal) {
          throw new Error('No gauge proposal found')
        }

        return proposal
      }

      return fetchProposalById(proposalId)
    },
  })
}

export function useUserVote(proposalId?: string, voter?: string) {
  return useQuery({
    queryKey: ['vote', proposalId, voter],
    queryFn: () => fetchUserVote(proposalId!, voter!),
    enabled: Boolean(proposalId && voter),
  })
}
