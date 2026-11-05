import type { GaugeRound } from '../proposal/types'
import { useQuery } from '@tanstack/react-query'
import { fetchEpoch, fetchEpochForVotingRound } from './api'

export function useEpochForRound(round?: Pick<GaugeRound, 'end' | 'state'> | null) {
  return useQuery({
    queryKey: ['epoch', 'convex-onchain', round?.end, round?.state === 'closed'],
    queryFn: () => fetchEpochForVotingRound(round!.end, round!.state === 'closed'),
    enabled: round !== undefined && round !== null,
    refetchInterval: 60_000,
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
