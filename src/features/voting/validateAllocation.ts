export interface AllocationError {
  type: 'not_connected' | 'proposal_closed' | 'zero_vp' | 'total_not_100' | 'empty' | 'negative'
  message: string
}

export function validateAllocation(params: {
  isConnected: boolean
  proposalActive: boolean
  votingPower: number | undefined
  allocations: Record<string, number>
}): AllocationError | null {
  const { isConnected, proposalActive, votingPower, allocations } = params

  if (!isConnected) {
    return { type: 'not_connected', message: 'Connect your wallet to vote.' }
  }

  if (!proposalActive) {
    return { type: 'proposal_closed', message: 'This proposal is no longer active.' }
  }

  const values = Object.values(allocations)

  if (values.length === 0) {
    return { type: 'empty', message: 'Select at least one pool to allocate votes.' }
  }

  if (values.some(v => v < 0)) {
    return { type: 'negative', message: 'Allocation percentages cannot be negative.' }
  }

  const total = values.reduce((sum, v) => sum + v, 0)

  if (total < 99.9 || total > 100.1) {
    return { type: 'total_not_100', message: `Total allocation must equal 100%. Currently ${total.toFixed(1)}%.` }
  }

  if (votingPower !== undefined && votingPower === 0) {
    return { type: 'zero_vp', message: 'You may not have voting power for this space.' }
  }

  return null
}
