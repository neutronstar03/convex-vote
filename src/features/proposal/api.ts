import type { SnapshotProposal, SnapshotProposalResponse } from './types'

const SNAPSHOT_GRAPHQL_URL = 'https://hub.snapshot.org/graphql'

async function snapshotRequest<T>(query: string): Promise<T> {
  const response = await fetch(SNAPSHOT_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query }),
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
    query ProposalById {
      proposal(id: "${id}") {
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

  if (!data.proposal) {
    throw new Error('Proposal not found')
  }

  return data.proposal
}
