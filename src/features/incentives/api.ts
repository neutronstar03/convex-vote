import type { LlamaEpoch, LlamaEpochResponse, LlamaRoundSummary } from './types'

const LLAMA_BASE_URL = import.meta.env.VITE_LLAMA_API_BASE_URL
  ?? (import.meta.env.DEV
    ? '/api/llama/bribes/votium/cvx-crv'
    : 'https://api.llama.airforce/bribes/votium/cvx-crv')

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function fetchRounds() {
  return fetchJson<LlamaRoundSummary>(`${LLAMA_BASE_URL}/rounds`)
}

export async function fetchEpoch(round: number) {
  const response = await fetchJson<LlamaEpochResponse>(`${LLAMA_BASE_URL}/${round}`)
  return response.epoch
}

export async function fetchLatestEpoch() {
  const rounds = await fetchRounds()
  const latestRound = Math.max(...rounds.rounds)

  if (!Number.isFinite(latestRound)) {
    throw new Error('No Llama rounds found')
  }

  return fetchEpoch(latestRound)
}

export async function fetchEpochByProposalId(proposalId: string): Promise<LlamaEpoch | null> {
  const rounds = await fetchRounds()

  for (const round of [...rounds.rounds].sort((a, b) => b - a)) {
    const epoch = await fetchEpoch(round)
    if (epoch.proposal === proposalId) {
      return epoch
    }
  }

  return null
}
