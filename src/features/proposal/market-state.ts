import type { SortKey } from './ui/gauge-market'
import { SORT_OPTIONS } from './ui/gauge-market'

export function readMarketState(params: URLSearchParams) {
  const sort = params.get('sort')
  return {
    sortKey: SORT_OPTIONS.some(option => option.value === sort) ? sort as SortKey : 'incentives' as SortKey,
    searchTerm: params.get('search') ?? '',
    rewardTokenFilter: params.get('token') || 'all',
    showOnlyWalletVotes: params.get('walletOnly') === '1',
  }
}

export function updateMarketState(params: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(params)
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === '')
      next.delete(key)
    else next.set(key, value)
  }
  return next
}
