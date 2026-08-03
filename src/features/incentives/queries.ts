import type { GaugeRound } from '../proposal/types'
import { useQuery } from '@tanstack/react-query'
import { fetchEpoch, fetchLatestEpochForRound } from './api'

export function useEpochForRound(round?: Pick<GaugeRound, 'end'> | null) {
  return useQuery({
    queryKey: ['epoch', 'convex-onchain', round?.end],
    queryFn: () => fetchLatestEpochForRound(round!.end),
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
