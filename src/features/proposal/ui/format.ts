import type { BribeDataAnomaly } from '../../incentives/utils'
import type { PoolRow } from '../types'
import { formatCompactUsd, formatNumber } from '../../../lib/format'

export function shortAddress(address?: string) {
  if (!address) {
    return 'Wallet'
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…`
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatTokenAmount(value: number) {
  if (value >= 100) {
    return formatNumber(value, 0)
  }

  if (value >= 1) {
    return formatNumber(value, 2)
  }

  return formatNumber(value, 4)
}

export function formatUsdRate(value?: number) {
  if (value === undefined) {
    return '—'
  }

  if (value >= 1) {
    return `$${value.toFixed(2)}`
  }

  return `$${value.toFixed(5)}`
}

export function formatRelativeTime(updatedAt: number, nowMs: number) {
  if (!updatedAt) {
    return 'not loaded yet'
  }

  const seconds = Math.max(0, Math.round((nowMs - updatedAt) / 1000))

  if (seconds < 5) {
    return 'just now'
  }

  if (seconds < 60) {
    return `${seconds}s ago`
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours}h ${minutes % 60}m ago`
  }

  return `${Math.floor(hours / 24)}d ago`
}

export function formatTimeRemaining(endSeconds: number, nowMs: number) {
  const remaining = endSeconds - Math.floor(nowMs / 1000)

  if (remaining <= 0) {
    return null
  }

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }

  return `${seconds}s`
}

export function describeBribeDataAnomaly(anomaly: BribeDataAnomaly) {
  const currentCount = formatNumber(anomaly.currentBribedGaugeCount, 0)
  const previousCount = formatNumber(anomaly.previousBribedGaugeCount, 0)
  const currentUsd = formatCompactUsd(anomaly.currentBribesUsd)
  const previousUsd = formatCompactUsd(anomaly.previousBribesUsd)

  return `Llama currently reports ${currentCount} incentivized gauges in active Votium round ${anomaly.currentRound} (${currentUsd}), versus ${previousCount} in completed round ${anomaly.previousRound} (${previousUsd}). Convex is the vote source; Llama Airforce is the incentive source, and its active-round data can change.`
}

/** Reward-token symbols carried by the given rows, capped for a one-line summary. */
export function summarizeRewardTokens(rows: PoolRow[]) {
  const symbols = [...new Set(rows.flatMap(row => row.bribeTokens.map(token => token.symbol)))]

  if (symbols.length === 0) {
    return 'None'
  }

  if (symbols.length <= 4) {
    return symbols.join(', ')
  }

  return `${symbols.slice(0, 4).join(', ')} +${symbols.length - 4}`
}
