import type { SnapshotProposal, SnapshotProposalResponse, SnapshotVote } from './types'

const SNAPSHOT_GRAPHQL_URL = 'https://hub.snapshot.org/graphql'

async function snapshotRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(SNAPSHOT_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Snapshot request failed with ${response.status}`)
  }

  const payload = await response.json() as { data?: T, errors?: Array<{ message: string }> }

  if (payload.errors?.length) {
    throw new Error(payload.errors.map(error => error.message).join(', '))
  }

  if (!payload.data) {
    throw new Error('Snapshot returned no data')
  }

  return payload.data
}

export async function fetchRecentGaugeProposals() {
  const data = await snapshotRequest<SnapshotProposalResponse>(`
    query RecentGaugeProposals {
      proposals(
        first: 12
        skip: 0
        where: { space: "cvx.eth", title_contains: "Gauge Weight" }
        orderBy: "created"
        orderDirection: desc
      ) {
        id
        title
        state
        start
        end
        choices
        scores
        scores_total
      }
    }
  `)

  return data.proposals
}

export async function fetchProposalById(id: string) {
  const data = await snapshotRequest<{ proposal: SnapshotProposal | null }>(`
    query ProposalById($id: String!) {
      proposal(id: $id) {
        id
        title
        state
        start
        end
        choices
        scores
        scores_total
      }
    }
  `, { id })

  if (!data.proposal) {
    throw new Error('Proposal not found')
  }

  return data.proposal
}

export async function fetchUserVote(proposalId: string, voter: string) {
  const data = await snapshotRequest<{ votes: SnapshotVote[] }>(`
    query UserVote($proposalId: String!, $voter: String!) {
      votes(
        first: 1
        where: { proposal: $proposalId, voter: $voter }
        orderBy: "created"
        orderDirection: desc
      ) {
        voter
        choice
        vp
        created
      }
    }
  `, { proposalId, voter })

  return data.votes[0] ?? null
}
