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

export function getEstimatedNextVoteStart(proposals: SnapshotProposal[], currentProposal?: SnapshotProposal | null) {
  if (!currentProposal) {
    return null
  }

  const filtered = proposals.filter(isMainGaugeProposal)
  const currentIndex = filtered.findIndex(proposal => proposal.id === currentProposal.id)

  if (currentIndex === -1) {
    return null
  }

  const current = filtered[currentIndex]
  const previous = filtered[currentIndex + 1]

  if (!current || !previous) {
    return null
  }

  const cadence = current.start - previous.start

  if (cadence <= 0) {
    return null
  }

  return current.start + cadence
}
