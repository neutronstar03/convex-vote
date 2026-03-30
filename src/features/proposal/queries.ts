import { useQuery } from '@tanstack/react-query'
import { fetchProposalById, fetchRecentGaugeProposals } from './api'
import { getActiveOrLatestMainGaugeProposal } from './utils'

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
