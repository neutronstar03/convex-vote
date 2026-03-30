import type { LlamaEpoch } from './types'
import type { PoolRow, SnapshotProposal } from '../proposal/types'

export function mergeProposalAndEpoch(proposal: SnapshotProposal, epoch: LlamaEpoch | null): PoolRow[] {
  const bribesByChoice = new Map<number, PoolRow['bribeTokens']>()
  const incentiveUsdByChoice = new Map<number, number>()
  const gaugeByChoice = new Map<number, string>()

  for (const bribe of epoch?.bribes ?? []) {
    if (!bribe.choice)
      continue

    const tokens = bribesByChoice.get(bribe.choice) ?? []
    tokens.push({
      symbol: bribe.token,
      amount: bribe.amount,
      amountUsd: bribe.amountDollars,
    })
    bribesByChoice.set(bribe.choice, tokens)
    incentiveUsdByChoice.set(bribe.choice, (incentiveUsdByChoice.get(bribe.choice) ?? 0) + bribe.amountDollars)

    if (bribe.gauge) {
      gaugeByChoice.set(bribe.choice, bribe.gauge)
    }
  }

  return proposal.choices.map((label, index) => {
    const choiceIndex = index + 1
    const snapshotVotes = proposal.scores[index] ?? 0
    const incentiveUsd = incentiveUsdByChoice.get(choiceIndex)

    return {
      choiceIndex,
      choiceKey: String(choiceIndex),
      label,
      snapshotVotes,
      voteShare: proposal.scores_total > 0 ? snapshotVotes / proposal.scores_total : 0,
      incentiveUsd,
      rewardEfficiency: incentiveUsd && snapshotVotes > 0 ? incentiveUsd / snapshotVotes : undefined,
      gaugeAddress: gaugeByChoice.get(choiceIndex),
      bribeTokens: bribesByChoice.get(choiceIndex) ?? [],
    }
  })
}
