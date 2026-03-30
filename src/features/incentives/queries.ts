import { useQuery } from '@tanstack/react-query'
import { fetchEpochByProposalId } from './api'

export function useEpochForProposal(proposalId?: string) {
  return useQuery({
    queryKey: ['epoch', proposalId],
    queryFn: () => fetchEpochByProposalId(proposalId!),
    enabled: Boolean(proposalId),
  })
}
