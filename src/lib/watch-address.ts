import type { Address } from 'viem'
import { isAddress } from 'viem'

export function resolveWatchAddress(params: URLSearchParams, connectedAddress?: Address) {
  const raw = params.get('watch')?.trim() ?? ''
  const isWatchMode = params.has('watch')
  const watchedAddress = raw && isAddress(raw) ? raw as Address : undefined
  return {
    isWatchMode,
    watchedAddress,
    isInvalid: isWatchMode && !watchedAddress,
    activeAddress: isWatchMode ? watchedAddress : connectedAddress,
  }
}
