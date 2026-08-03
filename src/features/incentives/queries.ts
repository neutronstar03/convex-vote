import type { GaugeRound } from '../proposal/types'
import { useQuery } from '@tanstack/react-query'
import { fetchLatestEpochForRound } from './api'

export function useEpochForRound(round?: Pick<GaugeRound, 'end'> | null) {
  return useQuery({
    queryKey: ['epoch', 'convex-onchain', round?.end],
    queryFn: () => fetchLatestEpochForRound(round!.end),
    enabled: round !== undefined && round !== null,
    refetchInterval: 60_000,
  })
}
