import type { SnapshotProposal } from './types'

export function isMainGaugeProposal(proposal: SnapshotProposal) {
  return proposal.title.includes('Gauge Weight for Week of') && !proposal.title.startsWith('FXN ')
}

export function getActiveOrLatestMainGaugeProposal(proposals: SnapshotProposal[]) {
  const filtered = proposals.filter(isMainGaugeProposal)
  return filtered.find(proposal => proposal.state === 'active') ?? filtered[0] ?? null
}

export function getCountdownParts(timestamp: number) {
  const diff = Math.max(timestamp * 1000 - Date.now(), 0)
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  return { days, hours, minutes }
}
