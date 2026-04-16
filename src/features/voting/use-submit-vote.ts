import type { SubmitVoteParams } from './submitVote'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitVote } from './submitVote'

export function useSubmitVote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: SubmitVoteParams) => submitVote(params),
    onSuccess: () => {
      // Invalidate user vote query to refetch
      queryClient.invalidateQueries({ queryKey: ['vote'] })
    },
  })
}
