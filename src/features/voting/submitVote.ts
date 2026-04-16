import { Web3Provider } from '@ethersproject/providers'
import snapshot from '@snapshot-labs/snapshot.js'
import { SNAPSHOT_SPACE } from '../../lib/constants'

export interface SubmitVoteParams {
  proposalId: string
  allocations: Record<string, number> // { "1": 60, "2": 30, "3": 10 }
  account: string
}

export interface SubmitVoteResult {
  id: string // IPFS receipt hash
}

export async function submitVote(params: SubmitVoteParams): Promise<SubmitVoteResult> {
  const { proposalId, allocations, account } = params

  if (!window.ethereum) {
    throw new Error('No Ethereum provider found. Please connect your wallet.')
  }

  const web3 = new Web3Provider(window.ethereum)
  const client = new snapshot.Client712('https://hub.snapshot.org')

  const response = await client.vote(web3, account, {
    space: SNAPSHOT_SPACE,
    proposal: proposalId,
    type: 'weighted',
    choice: allocations,
    reason: '',
    app: 'convex-vote',
  })

  return { id: (response as { id: string }).id }
}
