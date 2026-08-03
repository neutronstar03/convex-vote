import type { SubmitVoteParams } from './submitVote'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitVote } from './submitVote'

export function useSubmitVote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: SubmitVoteParams) => submitVote(params),
    onSuccess: () => {
      // Refresh both the app-level vote query and Wagmi contract reads.
      queryClient.invalidateQueries({ queryKey: ['vote'] })
      queryClient.invalidateQueries({ queryKey: ['readContract'] })
    },
  })
}
